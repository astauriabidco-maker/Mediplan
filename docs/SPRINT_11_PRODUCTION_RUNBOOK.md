# Sprint 11 - Runbook production hospitalier

## Objectif

Ce runbook transforme les garde-fous construits dans les sprints 0 a 10 en procedures d'exploitation pour un ERP RH hospitalier: incidents de conformite, audit, publication de planning, supervision et deploiement.

## Portes de qualite avant deploiement

Chaque livraison production doit passer par la meme commande locale et CI:

```bash
npm run ci:product
```

Cette gate couvre:

- build backend NestJS;
- lint coeur et e2e;
- tests unitaires noyau agents, audit, planning, conformite, leaves;
- tests e2e isolation tenant et conformite;
- build frontend Vite;
- budget bundle frontend;
- lint frontend;
- tests UI frontend;
- audit npm frontend;
- smoke test des routes critiques.
- smoke API preprod `npm run smoke:api:preprod` et rapport quotidien local,
  decrit dans `docs/SPRINT_12_PREPROD_MONITORING.md`.

Un deploiement est bloque si l'une de ces etapes echoue.

## Surfaces critiques

| Domaine | Endpoint ou commande | Permission attendue | Usage production |
| --- | --- | --- | --- |
| Cockpit manager | `GET /planning/manager/cockpit` | `planning:read` | Vue synthese conformite |
| File de correction | `GET /planning/compliance/worklist` | `planning:read` | Problemes a corriger |
| Pourquoi un shift bloque | `GET /planning/shifts/:id/compliance` | `planning:read` | Diagnostic metier |
| Preview publication | `POST /planning/publish/preview` | `planning:read` | Rapport avant publication |
| Publication planning | `POST /planning/publish` | `planning:publish` | Publication officielle |
| Rapports conformite | `GET /planning/compliance/reports` | `audit:read` | Historique publication |
| Timeline conformite | `GET /planning/compliance/timeline` | `audit:read` | Tracabilite decisionnelle |
| Audit global | `GET /audit` | `audit:read` | Investigation et export |

## Procedure incident conformite

Declencheurs typiques:

- publication refusee;
- compteur `blockedShifts` non nul dans le cockpit;
- alertes `HIGH` ouvertes;
- scan conformite degrade ou critique;
- manager signale une impossibilite de correction.

Procedure:

1. Ouvrir le cockpit manager sur la periode concernee.
2. Relever `openAlerts`, `blockedShifts`, `agentsAtRisk`, `refusedPublications`.
3. Ouvrir la file de correction et trier par criticite.
4. Pour chaque item critique, ouvrir le diagnostic shift ou alerte.
5. Verifier les raisons bloquantes: repos minimum, surcharge hebdomadaire, competence manquante, conge conflictuel, certificat expire.
6. Appliquer une action manager: reassignment, remplacement, resolution alerte, revalidation.
7. Si une exception est indispensable, exiger une justification claire et une permission dediee.
8. Relancer `POST /planning/publish/preview`.
9. Publier uniquement si le rapport ne contient plus de violation bloquante.
10. Conserver l'identifiant de rapport et les audits associes dans le ticket incident.

## Procedure audit

Investigation standard:

1. Identifier le tenant et la periode.
2. Filtrer `GET /audit` avec `tenantId`, `from`, `to`.
3. Pour une publication, filtrer `detailAction=PUBLISH_PLANNING`.
4. Pour une politique RH, filtrer `detailAction=WORK_POLICY`.
5. Pour une mutation planning, filtrer `entityType=SHIFT` ou `detailAction=SHIFT`.
6. Comparer la timeline conformite avec les logs audit.
7. Verifier la presence d'une justification sur les actions critiques.

Exemples de filtres utiles:

```text
GET /audit?from=2026-05-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z&detailAction=PUBLISH_PLANNING
GET /planning/compliance/reports?from=2026-05-01T00:00:00.000Z&limit=50
GET /planning/compliance/timeline?shiftId=123&limit=50
```

## Procedure publication planning

1. Verifier que les politiques service/grade sont a jour.
2. Lancer le cockpit manager sur la periode.
3. Traiter les items `HIGH`, puis `MEDIUM`.
4. Lancer une preview publication.
5. Si la preview retourne des violations bloquantes, ne pas publier.
6. Corriger ou justifier chaque blocage.
7. Publier.
8. Verifier qu'un audit `PUBLISH_PLANNING` existe avec le rapport enrichi.
9. Archiver le rapport de publication dans le dossier de periode.

## Checklist deploiement hospitalier

Avant bascule:

- `npm run ci:product` passe sur la branche candidate;
- migrations TypeORM revues et ordonnees;
- variables `JWT_SECRET`, `COUNTRY_CODE`, `DB_TYPE`, `DB_NAME` configurees;
- roles/permissions charges pour managers, RH, audit, direction et super admin;
- backup base de donnees recent disponible;
- runbook incident partage aux administrateurs RH;
- procedure rollback connue;
- audit frontend `npm run frontend:audit` a zero vulnerabilite moderate ou plus;
- budget bundle `npm run frontend:budget:check` passe.

Apres bascule:

- tester connexion manager;
- ouvrir `/manager/cockpit`;
- ouvrir `/manager/worklist`;
- lancer une preview publication sur une petite periode;
- verifier `GET /audit` avec un utilisateur `audit:read`;
- verifier qu'un utilisateur sans permission ne peut pas lire audit/conformite avancee;
- verifier les logs applicatifs sur erreurs API et trace id client.

## Indicateurs de supervision

| Indicateur | Source | Seuil d'alerte |
| --- | --- | --- |
| `openAlerts.HIGH` | Cockpit manager | > 0 hors periode de correction |
| `blockedShifts` | Cockpit manager | > 0 avant publication |
| `refusedPublications` | Cockpit manager / audit | hausse sur 24h |
| `complianceScan.status` | Observabilite planning | `DEGRADED` ou `CRITICAL` |
| `failedPublications` | Observabilite planning | > 0 apres correction |
| erreurs API frontend | Observabilite frontend | hausse anormale par route |
| bundle budget | CI frontend | echec budget |
| audit npm frontend | CI frontend | vulnerabilite moderate ou plus |
| health API | `GET /api/health/live`, `GET /api/health/ready` | endpoint DOWN ou base indisponible |
| rapport preprod | `npm run smoke:api:preprod` | statut `FAILED`, audit chain invalide ou backup non exportable |

## Rollback

Rollback applicatif:

1. Suspendre publication planning si des mutations sont en cours.
2. Revenir au tag ou commit precedent.
3. Redeployer backend et frontend ensemble.
4. Verifier `GET /planning/manager/cockpit`.
5. Verifier `GET /audit`.
6. Relancer une preview publication, pas une publication directe.

Rollback donnees:

1. Utiliser le backup tenant ou base avant migration.
2. Restaurer dans un environnement isole.
3. Comparer agents, services, shifts, leaves, work policies et audits.
4. Valider avec RH avant remise en production.

## Responsabilites

| Role | Responsabilite |
| --- | --- |
| Manager planning | Corriger les blocages et demander exceptions |
| Admin RH | Maintenir politiques, agents, services, grades |
| Auditeur | Lire audit, timeline, rapports publication |
| Direction | Arbitrer exceptions et risques persistants |
| Super admin | Selection tenant, support incident transversal |
| Exploitation | CI, deploiement, sauvegarde, rollback |
