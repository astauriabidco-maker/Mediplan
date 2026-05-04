# Sprint 14 Phase 2 - Recette RH

Date: 2026-05-04

## Objectif

Valider une preuve de recette RH couvrant les donnees et controles critiques:

- agents et masquage des donnees RH sensibles;
- services hospitaliers et grades rattaches au tenant;
- politiques RH service/grade;
- demandes, soldes et validation de conges;
- permissions dediees et refus des droits insuffisants;
- isolation tenant pour les donnees RH et planning.

Les endpoints ci-dessous sont les endpoints backend reels. En environnement HTTP expose, ajouter le prefixe global `/api` configure dans `src/main.ts`. Exemple: `GET /agents` cote test e2e devient `GET /api/agents` cote client.

## Roles de recette

| Role | Permissions minimales | Usage |
| --- | --- | --- |
| RH gestionnaire agents | `agents:read`, `agents:write` | Creer et consulter les agents |
| Manager service | `services:read`, `services:write`, `services:manage_staff` | Administrer les services et rattacher les agents |
| Lecteur grades | `agents:read` | Consulter les grades |
| Gestionnaire grades | `agents:write` | Creer, modifier et supprimer les grades |
| RH politiques lecture | `hr-policies:read` | Lire les politiques RH |
| RH politiques edition | `hr-policies:write` | Creer et modifier les politiques RH |
| RH politiques gestion | `hr-policies:manage` | Supprimer les politiques RH |
| Agent | `leaves:read`, `leaves:request`, `planning:read` | Consulter son espace et demander un conge |
| Validateur conges | `leaves:read`, `leaves:validate` | Lire et arbitrer les demandes d'equipe |
| Gestionnaire conges | `leaves:manage` | Gerer les conges transverse tenant |
| Auditeur | `audit:read` | Verifier les traces sensibles |
| Super admin | `*` ou role `SUPER_ADMIN` | Selection explicite d'un tenant pour audit/support transverse |

## Donnees de depart

Preparer un tenant de recette `tenant-a` avec:

- un service hospitalier `10` code `URG` et un sous-service optionnel `11`;
- un grade `20` code `IDE`;
- deux agents actifs: agent RH test `100` et manager `101`;
- un agent tiers `102` contenant des champs sensibles (`nir`, `iban`, `personalEmail`, `healthRecords`, `beneficiaries`);
- une politique RH service/grade `hospitalServiceId=10`, `gradeId=20`;
- un solde de conges pour l'agent `100`;
- une demande de conge `200` au statut `PENDING`;
- un utilisateur RH, un validateur conges, un auditeur et un super admin.

Preuves minimales a conserver pour chaque scenario:

- requetes executees et statuts HTTP;
- corps de reponse utile en masquant les secrets reels;
- identifiants agent, service, grade, politique, conge et audit;
- decision recette: `OK`, `KO`, `OK sous reserve`.

## Scenario 1 - RH cree un agent et protege les donnees sensibles

But: le RH cree un agent dans son tenant, puis un manager non privilegie ne voit pas les champs RH sensibles d'un autre agent.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Tenter une creation avec `tenantId` client | `POST /api/agents` | HTTP `400`, DTO refuse `tenantId` |
| 2 | Creer l'agent sans `tenantId` | `POST /api/agents` | HTTP `201`, agent rattache au tenant authentifie |
| 3 | Lire la liste agents avec `tenantId=tenant-b` en query | `GET /api/agents?tenantId=tenant-b` | Le backend utilise `tenant-a` pour un admin/RH non super admin |
| 4 | Lire un agent tiers comme manager | `GET /api/agents/102` | Champs sensibles (`nir`, `iban`, `healthRecords`, etc.) masques a `null` |
| 5 | Lire le meme agent comme admin/RH privilegie | `GET /api/agents/102` | Champs sensibles visibles selon le role |
| 6 | Lire les dossiers sante | `GET /api/agents/102/health-records` | Permission `agents:read` requise, tenant force cote serveur |

Payload creation:

```json
{
  "nom": "Nadia Kouame",
  "email": "nadia.kouame@example.test",
  "matricule": "RH-REC-100",
  "telephone": "+33612345678",
  "hospitalServiceId": 10,
  "gradeLegacy": "IDE",
  "nir": "190010100000000",
  "iban": "FR7612345987650123456789014"
}
```

Criteres d'acceptation:

- aucun `tenantId` fourni par le client n'est accepte sur la creation agent;
- les lectures cross-tenant sont ignorees pour un utilisateur non `SUPER_ADMIN`;
- `password` et `invitationToken` ne sont jamais exposes;
- les champs RH sensibles d'un autre agent sont masques pour un manager non privilegie;
- les acces aux dossiers sante utilisent le tenant authentifie.

Test automatise associe:

- `test/sprint14-rh-recette.e2e-spec.ts`: creation agent, isolation tenant et masquage des donnees sensibles.

## Scenario 2 - Manager service administre services et grades

But: les structures RH de rattachement sont tenantees et les mutations demandent les permissions attendues.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Lire les services avec `tenantId=tenant-b` | `GET /api/hospital-services?tenantId=tenant-b` | Tenant resolu a `tenant-a` pour un non super admin |
| 2 | Creer un service avec `tenantId` client | `POST /api/hospital-services` | HTTP `400`, DTO refuse le champ |
| 3 | Creer un service valide | `POST /api/hospital-services` | HTTP `201`, service cree dans `tenant-a`, acteur trace |
| 4 | Lire les grades | `GET /api/grades` | Service appele avec `tenant-a` |
| 5 | Creer un grade | `POST /api/grades` | HTTP `201`, `GradesService.create('tenant-a', data)` force le tenant |
| 6 | Supprimer un grade sans `agents:write` | `DELETE /api/grades/:id` | HTTP `403` |

Payload service:

```json
{
  "name": "Urgences",
  "code": "URG",
  "level": 1,
  "minAgents": 3,
  "maxAgents": 30
}
```

Payload grade:

```json
{
  "name": "Infirmier diplome d'Etat",
  "code": "IDE"
}
```

Criteres d'acceptation:

- `services:read` et `services:write` sont separes;
- le tenant query est reserve au `SUPER_ADMIN` sur les endpoints services qui le supportent;
- la creation service refuse les champs hors DTO;
- la creation grade force le tenant dans `GradesService`;
- un manque de permission bloque les mutations de grade.

Limite constatee:

- `GradesController` ne supporte pas aujourd'hui la selection explicite `tenantId` pour un `SUPER_ADMIN`, contrairement aux services et agents. La recette automatisee verifie donc le forcage tenant pour utilisateur courant, pas l'inspection cross-tenant super admin sur les grades.

Test automatise associe:

- `test/sprint14-rh-recette.e2e-spec.ts`: services, grades, permissions et isolation.

## Scenario 3 - RH applique une politique service/grade

But: une politique RH service/grade est consultable, creee, modifiee et supprimee uniquement par les droits dedies.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Lire les politiques comme agent | `GET /api/work-policies` | HTTP `403` |
| 2 | Lire les politiques comme RH lecture | `GET /api/work-policies` | HTTP `200`, liste limitee au tenant |
| 3 | Creer une politique comme RH lecture | `POST /api/work-policies` | HTTP `403` |
| 4 | Creer une politique comme RH edition | `POST /api/work-policies` | HTTP `201`, acteur et tenant transmis au service |
| 5 | Modifier la politique | `PUT /api/work-policies/:id` | HTTP `200`, tenant et acteur transmis |
| 6 | Supprimer comme RH edition | `DELETE /api/work-policies/:id` | HTTP `403` |
| 7 | Supprimer comme RH gestion | `DELETE /api/work-policies/:id` | HTTP `200` |

Payload politique:

```json
{
  "hospitalServiceId": 10,
  "gradeId": 20,
  "restHoursAfterGuard": 12,
  "maxGuardDuration": 12,
  "maxWeeklyHours": 44,
  "onCallCompensationPercent": 0.5
}
```

Criteres d'acceptation:

- `hr-policies:read` ne permet pas d'ecrire;
- `hr-policies:write` permet create/update mais pas delete;
- `hr-policies:manage` permet la suppression;
- le tenant et l'acteur viennent de l'utilisateur authentifie;
- les identifiants `hospitalServiceId` et `gradeId` sont conserves dans la politique.

Tests automatises associes:

- `test/sprint14-rh-recette.e2e-spec.ts`;
- `test/rbac-work-policies-isolation.e2e-spec.ts`.

## Scenario 4 - Agent demande un conge et manager le valide

But: le workflow conges utilise le tenant courant, l'agent cible autorise et les permissions de validation.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Lire ses soldes | `GET /api/leaves/balances?year=2026` | `LeavesService.getMyBalances('tenant-a', user.id, 2026)` |
| 2 | Lire ses demandes | `GET /api/leaves/my-leaves` | Liste limitee a l'agent authentifie |
| 3 | Demander un conge pour soi | `POST /api/leaves/request` | HTTP `201`, tenant courant, `canManageAll=false` |
| 4 | Tenter de lire les demandes equipe sans droit | `GET /api/leaves/team-requests` | HTTP `403` |
| 5 | Lire les demandes equipe comme validateur | `GET /api/leaves/team-requests` | HTTP `200`, manager courant transmis |
| 6 | Valider la demande | `PATCH /api/leaves/200/validate` | HTTP `200`, statut `APPROVED`, validateur et tenant transmis |
| 7 | Demander un conge pour un tiers comme gestionnaire | `POST /api/leaves/request` | `canManageAll=true` si `leaves:manage`, `ADMIN`, `SUPER_ADMIN` ou `*` |

Payload demande:

```json
{
  "start": "2026-06-22",
  "end": "2026-06-24",
  "type": "CONGE_ANNUEL",
  "reason": "Repos annuel planifie"
}
```

Criteres d'acceptation:

- `leaves:request` est obligatoire pour creer une demande;
- `leaves:read` est obligatoire pour les soldes et demandes personnelles;
- `leaves:validate` est obligatoire pour les demandes equipe et l'arbitrage;
- `leaves:manage` autorise la gestion d'un autre agent;
- aucun `tenantId` client ne pilote la mutation.

Tests automatises associes:

- `test/sprint14-rh-recette.e2e-spec.ts`;
- `test/planning-leaves-isolation.e2e-spec.ts`.

## Scenario 5 - Auditeur verifie les traces sensibles

But: l'auditeur reconstruit les operations RH sensibles et verifie la chaine audit.

| Etape | Action | Endpoint reel | Attendu |
| --- | --- | --- | --- |
| 1 | Filtrer les creations agents | `GET /api/audit?action=CREATE&entityType=AGENT&limit=20` | Logs limites au tenant courant |
| 2 | Filtrer les lectures sensibles | `GET /api/audit?action=READ&entityType=AGENT&entityId=102&limit=20` | Trace de l'acces aux donnees sante/RH si produite par le service |
| 3 | Filtrer les politiques RH | `GET /api/audit?entityType=WORK_POLICY&limit=20` | Creation/update/delete retrouvees |
| 4 | Filtrer les conges | `GET /api/audit?entityType=LEAVE&entityId=200&limit=20` | Demande et validation visibles |
| 5 | Exporter la preuve | `GET /api/audit/export?from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.999Z&limit=100` | Export avec filtres |
| 6 | Verifier la chaine | `GET /api/audit/verify` | `valid=true`, `issues=[]` |

Criteres d'acceptation:

- `audit:read` est obligatoire;
- un admin classique ne peut pas forcer `tenantId=tenant-b`;
- un `SUPER_ADMIN` peut auditer explicitement `tenantId=tenant-b`;
- les operations agents, politiques et conges sont reconstruisibles;
- les preuves exportees ne contiennent pas de secrets non masques hors role autorise.

Tests automatises associes:

- `test/audit-isolation.e2e-spec.ts`;
- `src/audit/audit.service.spec.ts`;
- `test/sprint14-rh-recette.e2e-spec.ts` couvre les appels sensibles au niveau controleur/service mocke.

## Matrice de validation finale

| Scenario | Preuve attendue | Decision |
| --- | --- | --- |
| Agent et donnees sensibles | Creation forcee tenant, lecture manager masquee, lecture admin visible | OK si champs sensibles proteges |
| Services et grades | Services/grades crees dans `tenant-a`, mutations refusees sans droits | OK si isolation et permissions respectees |
| Politiques RH | Read/write/manage separes, service/grade transmis | OK si RBAC et actor tracking respectes |
| Conges | Demande personnelle, validation manager, gestion transverse explicite | OK si tenant et `canManageAll` corrects |
| Audit RH | Logs/export/verify reconstruisent les actions sensibles | OK si chaine valide |

## Commandes de validation recommandees

```bash
npm run test:e2e -- sprint14-rh-recette.e2e-spec.ts --runInBand
npm run test:e2e -- agents-isolation.e2e-spec.ts hospital-services-isolation.e2e-spec.ts planning-leaves-isolation.e2e-spec.ts rbac-work-policies-isolation.e2e-spec.ts audit-isolation.e2e-spec.ts --runInBand
git diff --check
```

## References

- `src/agents/agents.controller.ts`
- `src/agents/hospital-services.controller.ts`
- `src/agents/grades.controller.ts`
- `src/agents/dto/agent-response.dto.ts`
- `src/planning/work-policies.controller.ts`
- `src/planning/leaves.controller.ts`
- `src/audit/audit.controller.ts`
