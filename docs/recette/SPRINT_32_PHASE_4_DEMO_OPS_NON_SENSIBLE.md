# Sprint 32 Phase 4 - Jeu de demo Ops non sensible

## Objectif

Conserver un jeu de demonstration Ops stable, partageable en recette interne et
non sensible, sans reset DB, migration destructive, seed backend ou mutation
preprod.

Le jeu reprend des tenants demo generiques stabilises en Sprint 31:

| Etat | Tenant | Intention demo |
| --- | --- | --- |
| Sain | `tenant-demo-sain` | Montrer un tenant nominal sans alerte ni incident. |
| Warning | `tenant-demo-warning` | Montrer un signal surveillable sans escalade critique. |
| Critique | `tenant-demo-critique` | Rejouer SLO en echec, Action Center, runbook, resolution avec preuve et retour au vert. |

## Perimetre Sprint 32 Phase 4

| Inclus | Exclu |
| --- | --- |
| Fixture frontend `ops-pilot-demo`. | Reset ou rechargement de base. |
| Tests frontend de stabilite et non-sensibilite. | Migration destructive. |
| Documentation de recette demo Ops. | Push ou publication externe. |

## Garde-fous non sensibles

- Les tenants references sont strictement limites a l'allowlist
  `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique`.
- La fixture ne contient pas de donnees patient, beneficiaire, email, telephone,
  NIR ou SSN.
- Les acteurs restent des identifiants techniques demo (`actorId`,
  `assignedToId`) et non des noms reels.
- Les preuves attendues restent des libelles ou URLs de demonstration.

## Contrat verifie

- Trois tenants demo sont visibles dans le cockpit multi-tenant.
- Le tenant sain reste `OK` sans alerte ouverte ni incident actif.
- Le tenant warning reste `WARNING` avec un signal non critique.
- Le tenant critique porte le SLO en echec, l'incident escalade,
  l'Action Center `WAITING_EVIDENCE` et le runbook auditable.
- La resolution du tenant critique cible `tenant-demo-critique`, exige une preuve et
  ramene l'ecran au statut operationnel.

## Validations du 2026-05-08

| Controle | Commande | Resultat |
| --- | --- | --- |
| Fixture demo, cockpit Ops et contrat API | `npm --prefix frontend run test -- --run src/api/__mocks__/ops-pilot-demo.mock.test.ts src/pages/OpsDashboardPage.test.tsx src/api/ops.contract.test.ts` | `PASSED` - 3 fichiers / 16 tests |

## Decision Phase 4

Decision: `GO_INTERNE_DEMO_OPS_NON_SENSIBLE`.

Le jeu de demo Ops reste stable pour une recette interne non sensible. Toute
presentation externe doit encore s'appuyer sur les conditions Sprint 32 de
pilot readiness, notamment documents anonymises, script de demo guidee et
risques ouverts documentes.
