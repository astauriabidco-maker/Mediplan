# Sprint 12 Phase 2 - Scenarios metier de recette

Date: 2026-05-04

## Objectif

Valider les parcours de recette preproduction qui prouvent que Mediplan sait:

- debloquer un planning avant publication par une correction manager;
- appliquer une politique RH service/grade;
- verifier une publication depuis les rapports et la chaine audit;
- exporter puis restaurer un tenant;
- autoriser une exception uniquement si elle est justifiee et tracee.

Les endpoints ci-dessous sont les endpoints backend reels. En environnement HTTP expose, ajouter le prefixe global `/api` configure dans `src/main.ts`. Exemple: `POST /planning/publish` cote test e2e devient `POST /api/planning/publish` cote client.

## Roles de recette

| Role | Permissions minimales | Usage |
| --- | --- | --- |
| Manager planning | `planning:read`, `planning:write`, `planning:publish` | Corriger, revalider, preview, publier |
| Manager habilite exception | `planning:read`, `planning:exceptions:approve` | Approuver une exception documentee |
| RH politiques | `hr-policies:read`, `hr-policies:write` | Lire et mettre a jour les politiques service/grade |
| RH gestionnaire | `hr-policies:manage` | Supprimer une politique si necessaire |
| Auditeur | `audit:read` | Lire audit, rapports, timeline, verifier la chaine |
| Exploitation | `backup:read`, `backup:write` | Exporter et importer un snapshot tenant |
| Super admin | `*` ou role `SUPER_ADMIN` | Selection explicite d'un tenant pour audit/support transverse |

## Donnees de depart

Preparer un tenant de recette, par exemple `tenant-a`, avec:

- un service hospitalier `2` et un grade `3`;
- deux agents actifs du meme service/grade: agent surcharge `10`, agent disponible `20`;
- un shift pending `90` sur `2026-06-12T08:00:00.000Z` -> `2026-06-12T16:00:00.000Z`;
- un historique d'heures qui provoque `WEEKLY_HOURS_LIMIT_EXCEEDED` pour l'agent `10`;
- une politique initiale permettant de reproduire le blocage ou une limite globale a `48h`;
- au moins un utilisateur auditeur et un utilisateur exploitation.

Preuves minimales a conserver pour chaque scenario:

- requetes executees et statuts HTTP;
- corps de reponse utile;
- identifiants de shift, rapport, audit ou snapshot;
- decision recette: `OK`, `KO`, `OK sous reserve`.

## Scenario 1 - Manager corrige un planning bloque

But: un manager identifie un shift bloquant, le reassigne, le revalide puis publie.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Ouvrir la file de correction sur la periode | `GET /api/planning/compliance/worklist?from=2026-06-12T00:00:00.000Z&to=2026-06-13T00:00:00.000Z` | `total >= 1`, item `shiftId=90`, `ruleCode=WEEKLY_HOURS_LIMIT_EXCEEDED` |
| 2 | Comprendre le blocage | `GET /api/planning/shifts/90/compliance` | `validation.isValid=false`, `blockingReasons` contient `WEEKLY_HOURS_LIMIT_EXCEEDED`, metadata avec `projected` et `limit` |
| 3 | Verifier que la publication est bloquee | `POST /api/planning/publish` | HTTP `400`, message `Planning publication blocked by compliance violations`, rapport avec `violations[0].shiftId=90` |
| 4 | Reassigner a l'agent disponible | `POST /api/planning/shifts/90/reassign` | HTTP `201`, `agent.id=20`, audit `REASSIGN_SHIFT` cree |
| 5 | Revalider le shift | `POST /api/planning/shifts/90/revalidate` | HTTP `201`, `validation.isValid=true`, `blockingReasons=[]` |
| 6 | Faire une preview publication | `POST /api/planning/publish/preview` | `publishable=true`, `violations=[]`, aucune mutation definitive |
| 7 | Publier | `POST /api/planning/publish` | HTTP `201`, `affected=1`, `report.validatedShiftIds=[90]`, audit `PUBLISH_PLANNING` non bloque |

Payloads:

```json
{
  "start": "2026-06-12T00:00:00.000Z",
  "end": "2026-06-13T00:00:00.000Z"
}
```

```json
{
  "agentId": 20,
  "reason": "Reequilibrage de charge apres recommandation manager",
  "recommendationId": "recommendation:shift_validation:shift:90:WEEKLY_HOURS_LIMIT_EXCEEDED"
}
```

Criteres d'acceptation:

- la publication avant correction est refusee;
- la correction exige un `reason` non vide;
- le shift corrige apparait comme publiable;
- l'audit permet de relier correction et publication.

Tests automatises associes:

- `test/planning-compliance.e2e-spec.ts`: `covers the manager journey: detect, understand, fix and publish`;
- `test/planning-shift-mutations.e2e-spec.ts`: publication bloquee puis publication conforme.

## Scenario 2 - RH met a jour une politique service/grade

But: un RH ajuste une contrainte service/grade, et la validation planning prend cette politique en compte.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Lire les politiques existantes | `GET /api/work-policies` | HTTP `200`, liste limitee au tenant authentifie |
| 2 | Creer une politique service/grade restrictive | `POST /api/work-policies` | HTTP `201`, `hospitalServiceId=2`, `gradeId=3`, acteur trace par le service |
| 3 | Tester un shift de garde trop long | `POST /api/planning/shifts` | HTTP `400`, message contient `MAX_GUARD_DURATION_EXCEEDED` |
| 4 | Assouplir la politique | `PUT /api/work-policies/:id` | HTTP `200`, nouvelles limites retournees |
| 5 | Relancer la creation ou revalidation planning | `POST /api/planning/shifts` ou `POST /api/planning/shifts/:id/revalidate` | validation conforme si aucune autre regle ne bloque |
| 6 | Controler le RBAC | `DELETE /api/work-policies/:id` avec RH write uniquement | HTTP `403`; suppression autorisee seulement avec `hr-policies:manage` ou admin |

Payload creation restrictive:

```json
{
  "hospitalServiceId": 2,
  "gradeId": 3,
  "restHoursAfterGuard": 12,
  "maxGuardDuration": 6,
  "maxWeeklyHours": 36,
  "onCallCompensationPercent": 0.5
}
```

Payload shift de controle:

```json
{
  "agentId": 10,
  "start": "2026-06-12T08:00:00.000Z",
  "end": "2026-06-12T16:00:00.000Z",
  "postId": "POLICY-RECETTE"
}
```

Criteres d'acceptation:

- `hr-policies:read` ne permet pas d'ecrire;
- `hr-policies:write` permet create/update mais pas delete;
- la politique service/grade est recherchee avec le tenant courant;
- une politique restrictive bloque effectivement la validation planning.

Tests automatises associes:

- `test/rbac-work-policies-isolation.e2e-spec.ts`;
- `test/planning-compliance.e2e-spec.ts`: `applies service+grade policy constraints at API level`.

## Scenario 3 - Auditeur verifie publication et chaine audit

But: l'auditeur reconstruit la decision de publication et confirme l'integrite de la chaine.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Lire les rapports de publication | `GET /api/planning/compliance/reports?from=2026-06-01T00:00:00.000Z&limit=10` | rapports `PUBLISH_PLANNING`, champs `blocked`, `affected`, `report` |
| 2 | Lire la timeline du shift | `GET /api/planning/compliance/timeline?shiftId=90&limit=50` | sequence diagnostic, correction, revalidation, publication si disponible |
| 3 | Filtrer l'audit planning | `GET /api/audit?action=UPDATE&entityType=PLANNING&detailAction=PUBLISH_PLANNING&limit=20` | logs limites au tenant courant |
| 4 | Filtrer l'action manager | `GET /api/audit?action=UPDATE&entityType=SHIFT&entityId=90&limit=20` | log `REASSIGN_SHIFT` ou `APPROVE_COMPLIANCE_EXCEPTION` |
| 5 | Exporter la preuve | `GET /api/audit/export?from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.999Z&limit=100` | export avec filtres et logs |
| 6 | Verifier la chaine | `GET /api/audit/verify` | `valid=true`, `issues=[]` |

Criteres d'acceptation:

- un admin classique ne peut pas forcer `tenantId=tenant-b`;
- un `SUPER_ADMIN` peut auditer explicitement `tenantId=tenant-b`;
- les rapports de publication exposent le statut bloque/non bloque;
- la chaine audit est valide apres correction et publication.

Tests automatises associes:

- `test/audit-isolation.e2e-spec.ts`;
- `test/planning-compliance.e2e-spec.ts`: lecture des rapports de conformite publication.

## Scenario 4 - Backup et restauration tenant

But: exploitation exporte un tenant, restaure dans un environnement isole et verifie le remapping.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Exporter le tenant courant | `GET /api/tenant-backups/export?from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.999Z` | snapshot `kind=tenant-business-backup`, `schemaVersion=1`, datasets metier |
| 2 | Verifier le contenu | Lecture snapshot | `datasets.agents`, `workPolicies`, `shifts`, `leaves`, `auditLogs`; `planningComplianceSnapshot` present |
| 3 | Restaurer en mode merge dans un bac a sable | `POST /api/tenant-backups/import?tenantId=tenant-restore` | HTTP `201`, compteurs `imported` coherents |
| 4 | Restaurer uniquement les donnees planning | `POST /api/tenant-backups/import?tenantId=tenant-restore` avec `mode=REPLACE_PLANNING_DATA` | suppression planning cible puis import remappe |
| 5 | Verifier l'isolation | Import cross-tenant par admin non super admin | HTTP `403` |
| 6 | Controler apres restore | `GET /api/planning/shifts`, `GET /api/work-policies`, `GET /api/audit/verify` | donnees sous `tenant-restore`, pas d'ID source reutilise comme garantie fonctionnelle |

Payload import:

```json
{
  "mode": "REPLACE_PLANNING_DATA",
  "snapshot": {
    "kind": "tenant-business-backup",
    "schemaVersion": 1,
    "exportedAt": "2026-05-04T10:00:00.000Z",
    "sourceTenantId": "tenant-a",
    "datasets": {
      "facilities": [],
      "hospitalServices": [],
      "grades": [],
      "agents": [],
      "workPolicies": [],
      "shifts": [],
      "leaves": [],
      "attendance": [],
      "auditLogs": []
    },
    "planningComplianceSnapshot": {
      "generatedAt": "2026-05-04T10:00:00.000Z",
      "period": {},
      "totals": {
        "shifts": 0,
        "approvedComplianceExceptions": 0,
        "pendingComplianceExceptions": 0,
        "workPolicies": 0,
        "complianceAuditEvents": 0
      },
      "shifts": [],
      "workPolicies": [],
      "complianceAuditEvents": []
    },
    "integrity": {
      "datasetCounts": {}
    }
  }
}
```

Criteres d'acceptation:

- le snapshot force le `tenantId` cible a l'import;
- les relations agent -> shift sont remappees;
- `REPLACE_PLANNING_DATA` nettoie attendance, leaves, shifts et work policies du tenant cible;
- un admin non super admin ne peut pas importer un snapshot dans un autre tenant.

Tests automatises associes:

- `src/backup/backup.controller.spec.ts`;
- `src/backup/backup.service.spec.ts`.

## Scenario 5 - Exception justifiee et tracee

But: une exception de conformite est impossible sans justification, puis visible dans audit/timeline.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Lire le diagnostic du shift | `GET /api/planning/shifts/:id/compliance` | violation bloquante expliquee |
| 2 | Tenter l'exception sans justification | `POST /api/planning/shifts/:id/exception` | HTTP `400`, DTO refuse `reason` vide ou absent |
| 3 | Approuver avec justification | `POST /api/planning/shifts/:id/exception` | HTTP `201`, exception approuvee |
| 4 | Relire la timeline | `GET /api/planning/compliance/timeline?shiftId=:id&limit=50` | evenement d'exception avec acteur et raison |
| 5 | Filtrer l'audit | `GET /api/audit?action=UPDATE&entityType=SHIFT&entityId=:id&limit=20` | details contenant l'action d'exception et la justification |
| 6 | Preview publication | `POST /api/planning/publish/preview` | le rapport distingue exception approuvee et violation non justifiee |

Payload exception:

```json
{
  "reason": "Maintien de la garde valide par cadre de permanence, absence de remplacant qualifie documentee.",
  "recommendationId": "recommendation:shift_validation:shift:90:WEEKLY_HOURS_LIMIT_EXCEEDED",
  "alertId": 44
}
```

Criteres d'acceptation:

- permission dediee `planning:exceptions:approve` obligatoire;
- la permission legacy `planning:exception` reste compatible si elle est deja attribuee;
- `reason` est obligatoire et non vide;
- l'auditeur retrouve l'acteur, le shift, la date et la justification;
- la publication ne masque pas les exceptions: elles restent visibles dans les rapports.

Tests automatises associes:

- `test/planning-security-isolation.e2e-spec.ts`: permission dediee et alias legacy;
- `frontend/src/components/ManagerGuidedActions.test.tsx`: justification requise cote UI;
- `test/planning-compliance.e2e-spec.ts` et `test/planning-shift-mutations.e2e-spec.ts` pour les mutations/audits planning.

## Matrice de validation finale

| Scenario | Preuve attendue | Decision |
| --- | --- | --- |
| Manager corrige planning bloque | rapport publication `affected=1`, audit `REASSIGN_SHIFT` puis `PUBLISH_PLANNING` | OK si publication impossible avant correction |
| RH politique service/grade | HTTP `400` sur contrainte restrictive, RBAC write/manage respecte | OK si impact planning visible |
| Auditeur publication | rapport, export audit, `verify.valid=true` | OK si decision reconstruite |
| Backup/restauration | snapshot exporte, import remappe, cross-tenant refuse | OK si tenant restaure isole |
| Exception justifiee | HTTP `400` sans raison, HTTP `201` avec raison, audit visible | OK si justification exploitable |

## Commandes de validation recommandees

```bash
npm run test:e2e -- planning-compliance.e2e-spec.ts planning-shift-mutations.e2e-spec.ts rbac-work-policies-isolation.e2e-spec.ts audit-isolation.e2e-spec.ts --runInBand
npm test -- backup.controller.spec.ts backup.service.spec.ts --runInBand
git diff --check
```

## References

- `docs/SPRINT_11_PRODUCTION_RUNBOOK.md`
- `docs/SPRINT_12_GO_NO_GO_CHECKLIST.md`
- `src/planning/planning.controller.ts`
- `src/planning/work-policies.controller.ts`
- `src/audit/audit.controller.ts`
- `src/backup/backup.controller.ts`
