# Sprint 14 Phase 3 - Recette auditeur

Date: 2026-05-04

## Objectif

Prouver qu'un auditeur peut reconstruire un parcours complet de conformite:

- lecture des rapports de publication et de la timeline;
- lecture et filtrage audit sur action de correction et publication;
- export audit exploitable comme preuve;
- verification de la chaine d'audit;
- reconstruction decision alerte -> action manager -> revalidation -> publication.

Les endpoints ci-dessous sont les endpoints backend reels. En environnement HTTP expose,
ajouter le prefixe global `/api` configure dans `src/main.ts`. Exemple:
`GET /audit/verify` cote test e2e devient `GET /api/audit/verify` cote client.

## Roles de recette

| Role | Permissions minimales | Usage |
| --- | --- | --- |
| Manager planning | `planning:read`, `planning:write`, `planning:publish` | Corriger, revalider, preview, publier |
| Auditeur | `audit:read`, `planning:read` | Lire rapports/timeline, filtrer audit, exporter, verifier la chaine |
| Super admin | `*` ou role `SUPER_ADMIN` | Selection explicite d'un tenant si recette multi-tenant |

## Donnees de depart

Preparer un tenant de recette, par exemple `tenant-sprint14-auditor`, avec:

- un manager planning actif;
- un auditeur actif;
- un shift pending `701` sur `2026-08-03T08:00:00.000Z` ->
  `2026-08-03T20:00:00.000Z`;
- un agent surcharge `101` qui provoque `WEEKLY_HOURS_LIMIT_EXCEEDED`;
- un agent relais disponible `102`;
- une alerte planning `9001` rattachee au shift `701`.

Preuves minimales a conserver:

- requetes executees et statuts HTTP;
- identifiants `tenantId`, `shiftId`, `alertId`, `recommendationId`;
- corps utiles des rapports, timeline, audit export et verify chain;
- decision recette: `OK`, `KO`, `OK sous reserve`.

## Scenario - Reconstruction auditeur de bout en bout

But: l'auditeur prouve qu'une publication a ete bloquee, corrigee, revalidee,
publiee, puis tracee dans une chaine audit valide.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Identifier l'alerte bloquante | `GET /api/planning/compliance/worklist?from=2026-08-03T00:00:00.000Z&to=2026-08-04T00:00:00.000Z` | item `alertId=9001`, `shiftId=701`, `ruleCode=WEEKLY_HOURS_LIMIT_EXCEEDED` |
| 2 | Lire le diagnostic shift | `GET /api/planning/shifts/701/compliance` | `validation.isValid=false`, `blockingReasons` contient `WEEKLY_HOURS_LIMIT_EXCEEDED` |
| 3 | Prouver le blocage avant correction | `POST /api/planning/publish` | HTTP `400`, rapport `publishable=false`, violation sur `shiftId=701` |
| 4 | Appliquer l'action manager | `POST /api/planning/shifts/701/reassign` | HTTP `201`, `agent.id=102`, trace avec `alertId=9001` et `recommendationId` |
| 5 | Revalider | `POST /api/planning/shifts/701/revalidate` | HTTP `201`, `blockingReasons=[]` |
| 6 | Preview publication | `POST /api/planning/publish/preview` | HTTP `201`, `publishable=true`, `violations=[]` |
| 7 | Publier | `POST /api/planning/publish` | HTTP `201`, `affected=1`, `validatedShiftIds=[701]` |
| 8 | Lire les rapports auditeur | `GET /api/planning/compliance/reports?from=2026-08-01T00:00:00.000Z&limit=10` | deux rapports: bloque puis non bloque |
| 9 | Lire la timeline auditeur | `GET /api/planning/compliance/timeline?shiftId=701&limit=50` | sequence `ALERT_RAISED`, `REASSIGN_SHIFT`, `REVALIDATE_SHIFT`, `PUBLISH_PLANNING` |
| 10 | Filtrer l'audit correction | `GET /api/audit?action=UPDATE&entityType=SHIFT&entityId=701&detailAction=REASSIGN_SHIFT&limit=10` | log unique avec `alertId=9001`, `afterAgentId=102` |
| 11 | Filtrer l'audit publication | `GET /api/audit?action=UPDATE&entityType=PLANNING&detailAction=PUBLISH_PLANNING&limit=10` | log publication avec rapport et `validatedShiftIds=[701]` |
| 12 | Exporter la preuve audit | `GET /api/audit/export?from=2026-08-01T00:00:00.000Z&to=2026-08-31T23:59:59.999Z&limit=100` | export avec filtres, logs et `chainVerification.valid=true` |
| 13 | Verifier la chaine | `GET /api/audit/verify` | `valid=true`, `issues=[]` |

Payload publication:

```json
{
  "start": "2026-08-03T00:00:00.000Z",
  "end": "2026-08-04T00:00:00.000Z"
}
```

Payload reassignation:

```json
{
  "agentId": 102,
  "reason": "Recette Sprint 14: decision manager apres alerte hebdomadaire",
  "recommendationId": "recommendation:shift_validation:shift:701:WEEKLY_HOURS_LIMIT_EXCEEDED",
  "alertId": 9001
}
```

## Criteres d'acceptation

- l'auditeur lit les rapports de conformite et la timeline avec `audit:read`;
- le blocage avant correction est visible dans les rapports;
- l'action manager porte la raison, l'alerte et la recommandation;
- la publication finale est reliee au meme shift;
- l'export audit contient les logs de correction, revalidation et publication;
- `GET /api/audit/verify` retourne une chaine valide sans issue;
- un admin classique ne doit pas pouvoir forcer un `tenantId` tiers, couvert par
  `test/audit-isolation.e2e-spec.ts`.

## Automatisation associee

- `test/sprint14-auditor-recette.e2e-spec.ts`: parcours auditeur complet avec
  controleurs reels, `AuditService` reel et repositories memoire;
- `test/audit-isolation.e2e-spec.ts`: garde-fou d'isolation tenant audit;
- `test/sprint12-phase5-workflow.e2e-spec.ts`: pattern de workflow e2e reutilise
  pour manager/RH/audit et verification de chaine.
