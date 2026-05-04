# Sprint 12 - Checklist go/no-go preproduction

## Objectif

Cette checklist decide si Mediplan peut passer en preproduction hospitaliere pour une recette terrain avec managers, RH, auditeurs et exploitation.

Le resultat attendu est explicite:

- `GO`: preproduction ouverte aux utilisateurs de recette;
- `GO SOUS RESERVE`: preproduction ouverte avec contournement documente;
- `NO-GO`: ouverture bloquee.

## Decision rapide

| Domaine | Commande ou preuve | Go | No-go |
| --- | --- | --- | --- |
| CI produit | `npm run ci:product` | 100% vert | une etape rouge |
| Donnees demo | seed preprod execute | tenant complet | donnees incoherentes |
| Securite API | tests `api-security.spec.ts` | 401/403/429/500 standardises | fuite interne ou DTO permissif |
| RBAC | e2e `rbac-work-policies-isolation` | roles respectes | privilege excessif |
| Audit | `GET /audit/verify` | chaine valide | trou ou hash invalide |
| Conformite | preview publication | violations expliquees | blocage opaque |
| Backup | export/import tenant | restore minimal OK | cross-tenant ou perte relation |
| Frontend | budget bundle | budgets verts | chunk hors seuil |
| Runbook | Sprint 11 disponible | equipe informee | procedure manquante |

## Decision formelle Sprint 13 - 2026-05-04

Decision: `GO PREPRODUCTION TECHNIQUE`

Perimetre valide:

- tenant preprod: `HGD-DOUALA`;
- environnement: stack Docker preprod locale;
- base: Postgres preprod avec migrations TypeORM;
- mode DB: `DB_SYNCHRONIZE=false`;
- compte smoke: `superadmin@mediplan.demo`;
- branche: `main`;
- base commit publiee avant Phase 3/4: `6081384f feat(preprod): validate sprint 13 readiness`.

Note de version: la Phase 3 backup/restauration et cette decision Phase 4 sont
dans le worktree courant au moment de cette decision et doivent etre commitees
avant diffusion de la candidate.

### Preuves Go/No-Go

| Critere | Preuve | Resultat | Decision |
| --- | --- | --- | --- |
| Configuration env | `ENV_FILE=.env.preprod npm run preprod:env:check` | OK, aucun warning | GO |
| Stack preprod | `npm run preprod:compose:up` | backend, Postgres, Redis healthy | GO |
| Migrations | `npm run preprod:compose:migrate` | `No migrations are pending` | GO |
| Seed hospitalier | `npm run preprod:compose:seed` | `HGD-DOUALA`, 3 etablissements, 21 services, 35 agents, 29 shifts apres correction | GO |
| Smoke API | `npm run preprod:compose:smoke` | `PASSED` | GO |
| Conformite | rapport smoke | `HEALTHY`, aucune raison critique | GO |
| Alertes | rapport smoke + SQL | alertes ouvertes `0` | GO |
| Planning | rapport smoke + SQL | shifts pending `0` | GO |
| Audit | `GET /api/audit/verify` via smoke | chaine valide, anomalies `0`, evenements `8` | GO |
| Backup exportable | `GET /api/tenant-backups/metrics` via smoke | `exportable: true` | GO |
| Restauration | `npm run preprod:backup:restore` | `PASSED`, compteurs avant/snapshot/import/apres identiques | GO |

### Compteurs de restauration

| Dataset | Avant | Snapshot | Importe | Apres | Statut |
| --- | ---: | ---: | ---: | ---: | --- |
| facilities | 3 | 3 | 3 | 3 | OK |
| hospitalServices | 21 | 21 | 21 | 21 | OK |
| agents | 35 | 35 | 35 | 35 | OK |
| shifts | 29 | 29 | 29 | 29 | OK |
| leaves | 11 | 11 | 11 | 11 | OK |
| auditLogs | 8 | 8 | 8 | 8 | OK |

### Artefacts de preuve

- `preprod-reports/preprod-smoke-2026-05-04.md`;
- `preprod-reports/preprod-smoke-2026-05-04.json`;
- `preprod-reports/preprod-backup-restore-2026-05-04.md`;
- `preprod-reports/preprod-backup-restore-2026-05-04.json`;
- `docs/SPRINT_13_PREPROD_EXECUTION.md`.

### Risques et reserves

| Risque | Niveau | Traitement |
| --- | --- | --- |
| Secrets `.env.preprod` locaux | Moyen | fichier ignore par Git, seuls les exemples sont versionnes |
| Vulnerabilites npm backend signalees pendant build Docker | Moyen | a traiter dans lot securite dependances backend |
| Rapport preprod local non historise en Git | Faible | rapports conserves dans `preprod-reports/`, dossier volontairement ignore |
| Phase 3/4 non commitee au moment de la decision | Moyen | commit/push requis avant diffusion candidate |

Conclusion: les criteres demandes pour la Phase 4 sont satisfaits. La candidate
peut passer en preproduction technique apres commit/push de la Phase 3/4.

## Commandes bloquantes

Ces commandes doivent passer sur la branche candidate:

```bash
npm run ci:product
npm test -- api-security.spec.ts --runInBand
npm test -- backup.controller.spec.ts backup.service.spec.ts --runInBand
npm run test:e2e -- rbac-work-policies-isolation.e2e-spec.ts planning-security-isolation.e2e-spec.ts --runInBand
npm run frontend:budget:check
npm run frontend:audit
```

Si une commande echoue, decision `NO-GO` sauf si l'echec est non fonctionnel, documente et valide par exploitation.

## Critere 1 - Jeux de donnees hospitaliers

Go si le tenant preprod contient:

- au moins un etablissement;
- plusieurs poles ou services;
- grades hospitaliers differencies;
- competences obligatoires;
- agents titulaires et contractuels;
- temps plein, temps partiel, nuit, astreinte;
- conges approuves et conflits controles;
- certificats ou habilitations expirables;
- politiques service/grade;
- planning contenant au moins un cas conforme et un cas bloquant.

No-go si:

- les agents n'ont pas de `tenantId`;
- les services ne sont pas relies aux agents;
- aucun cas bloquant ne peut etre reproduit;
- les donnees demo exposent des donnees personnelles reelles.

## Critere 2 - Recette manager

Go si un manager peut:

1. ouvrir `/manager/cockpit`;
2. voir les compteurs de conformite;
3. ouvrir `/manager/worklist`;
4. comprendre pourquoi un shift est bloque;
5. executer une action de correction;
6. relancer une preview publication;
7. publier uniquement si aucune violation bloquante ne reste.

No-go si:

- le manager ne comprend pas la cause d'un blocage;
- une action critique est possible sans justification;
- une publication bloquee ne genere pas d'audit exploitable.

## Critere 3 - Recette RH

Go si un RH peut:

- consulter agents/services/grades;
- mettre a jour une politique RH;
- verifier l'effet service/grade sur la validation planning;
- demander ou valider un conge selon ses permissions;
- constater que les champs sensibles sont masques pour les roles non autorises.

No-go si:

- un role RH peut supprimer une politique sans permission de gestion;
- un role non RH voit des donnees sensibles non necessaires;
- les changements de politique ne sont pas audites.

## Critere 4 - Recette auditeur

Go si un auditeur peut:

- consulter `GET /audit`;
- filtrer par periode, tenant, action, detailAction;
- exporter les logs via `GET /audit/export`;
- verifier la chaine via `GET /audit/verify`;
- retrouver la sequence alerte -> recommandation -> action manager -> audit.

No-go si:

- un auditeur ne peut pas reconstruire une decision;
- la chaine audit est invalide;
- un utilisateur sans `audit:read` accede aux rapports.

## Critere 5 - Backup et restauration

Go si:

- `GET /tenant-backups/export` produit un snapshot tenant complet;
- le snapshot contient planning, politiques et audit conformite;
- `POST /tenant-backups/import` remappe les relations;
- l'import force le `tenantId` cible;
- les non `SUPER_ADMIN` ne peuvent pas importer cross-tenant;
- une restauration minimale est testee en environnement isole.

No-go si:

- les IDs source sont reutilises sans remapping;
- des donnees d'un autre tenant apparaissent;
- le snapshot ne permet pas de verifier la conformite publiee.

## Critere 6 - Securite et donnees sensibles

Go si:

- DTO stricts: champs inconnus rejetes;
- conversion implicite des types desactivee;
- 500 sans detail interne;
- rate limit actif sur endpoints critiques;
- logs frontend et backend redigent emails, matricules, NIR et contacts;
- permissions legacy documentees et testees.

No-go si:

- une erreur interne remonte une stack ou SQL brut;
- un endpoint critique accepte un payload non valide;
- une action sensible est possible sans permission dediee.

## Critere 7 - Performance frontend

Go si:

- `npm run frontend:budget:check` passe;
- chunk entry <= 350 KiB;
- chunk JS global <= 450 KiB;
- route dashboard <= 450 KiB;
- route planning <= 320 KiB;
- `npm run frontend:audit` retourne 0 vulnerabilite moderate ou plus.

Go sous reserve si un chunk non critique depasse de moins de 10% et qu'un ticket sprint performance est ouvert.

No-go si:

- le chunk entry depasse le budget;
- une vulnerabilite high ou critical est presente;
- une route critique ne se charge pas.

## Critere 8 - Monitoring preprod

Go si les controles suivants sont operationnels:

- cockpit manager;
- worklist conformite;
- rapports publication;
- audit verify/export;
- backup export/import;
- smoke routes frontend;
- rapport quotidien preprod ou procedure manuelle equivalente.

No-go si aucune preuve quotidienne n'est produite pendant la recette.

## Matrice de decision

| Situation | Decision |
| --- | --- |
| Tous les criteres go | `GO` |
| Un critere mineur en reserve, aucun risque securite/audit | `GO SOUS RESERVE` |
| Echec CI produit | `NO-GO` |
| Fuite donnees sensibles | `NO-GO` |
| Audit chain invalide | `NO-GO` |
| Publication possible malgre violation bloquante | `NO-GO` |
| Backup cross-tenant possible | `NO-GO` |

## Journal de decision

Chaque passage go/no-go doit produire une note de decision:

```text
Date:
Version/commit:
Tenant preprod:
Resultat ci:product:
Resultat audit verify:
Resultat backup restore:
Resultat recette manager:
Resultat recette RH:
Resultat recette auditeur:
Decision: GO | GO SOUS RESERVE | NO-GO
Risques acceptes:
Signataires:
```

## References

- `docs/SPRINT_11_PRODUCTION_RUNBOOK.md`
- `docs/SPRINT_13_PREPROD_EXECUTION.md`
- `docs/SPRINT_10_FRONTEND_PERFORMANCE.md`
- `docs/SPRINT_8_MANAGER_WORKFLOW.md`
- `npm run ci:product`
- `GET /audit/verify`
- `GET /tenant-backups/export`
- `POST /tenant-backups/import`
