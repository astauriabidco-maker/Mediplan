# Sprint 31 Phase 4 - Donnees demo pilote Ops

## Objectif

Stabiliser un jeu de donnees demo pilote pour le cockpit Ops, lisible par
exploitation et utilisable en recette interne sans reset DB, migration ou seed
destructif.

Ce jeu sert a rejouer le parcours:

1. comparer les tenants sain, warning et critique;
2. comprendre la cause SLO du tenant critique;
3. consulter l'Action Center et le runbook;
4. resoudre avec preuve;
5. verifier le retour au vert et la trace audit.

## Perimetre

| Inclus | Hors perimetre |
| --- | --- |
| Fixtures frontend typees pour `/ops`. | Reset d'un tenant hospitalier reel en base. |
| Tests de stabilite des tenants sain/warning/critique. | Migration ou mutation de donnees preprod. |
| Documentation Ops du jeu pilote. | Signoff utilisateur hospitalier externe. |
| Reutilisation du parcours Sprint 30 critique. | Nouveau seed backend. |

## Tenants pilotes stabilises

| Etat Ops | Tenant | Signaux attendus | Usage recette |
| --- | --- | --- | --- |
| Sain | `tenant-demo-sain` | Aucun incident actif, aucune alerte ouverte, backup recent, action-center vide. | Montrer le nominal et verifier que l'UI ne force pas un faux incident. |
| Warning | `tenant-demo-warning` | Une alerte medium, action non critique, aucun incident actif, backup recent. | Montrer un signal a surveiller sans escalade. |
| Critique | `tenant-demo-critique` | SLO p95 en echec, incident escalade, alerte critique, action-center `WAITING_EVIDENCE`, runbook et preuve attendue. | Rejouer detection -> runbook -> resolution -> audit. |

## Contrat donnees

Les fixtures sont dans:

- `frontend/src/api/__mocks__/ops-pilot-demo.mock.ts`;
- `frontend/src/api/__mocks__/ops-pilot-demo.mock.test.ts`.

Le contrat minimal verifie:

- exactement trois tenants pilotes;
- un seul tenant `CRITICAL`;
- un seul tenant `WARNING`;
- un tenant sain `OK` sans alerte ni incident;
- le tenant critique rattache son SLO, son Action Center et son runbook au
  meme `tenantId`;
- le runbook critique demande `operations:write` et `audit:read`;
- la resolution critique attend une preuve de retour nominal et une preuve
  d'audit immuable.

## Parcours Ops recommande

| Etape | Action | Resultat attendu |
| --- | --- | --- |
| 1 | Ouvrir `/ops` avec `tenant-demo-critique` impersonne ou selectionne. | Le cockpit multi-tenant affiche aussi `tenant-demo-sain` et `tenant-demo-warning`. |
| 2 | Comparer les tenants. | Le tenant sain reste vert, le warning reste surveillable, le critique ressort prioritaire. |
| 3 | Lire le SLO critique. | `Résolution alerte critique`, `47min`, `FAILED` et la raison SLO sont visibles. |
| 4 | Ouvrir le runbook Action Center. | Les controles bloquants et preuves attendues sont listés. |
| 5 | Resoudre l'item avec resume, URL et libelle de preuve. | La mutation cible `tenant-demo-critique`, statut `RESOLVED`, preuve Grafana et audit chain. |
| 6 | Verifier le retour au vert. | Statut global operationnel, SLO `PASSED`, aucune alerte ouverte. |

## Limites explicites

- Les donnees Sprint 31 Phase 4 sont des fixtures frontend, pas une source de
  verite preprod.
- Elles ne prouvent pas l'etat d'une base client ou hospitaliere reelle.
- Elles ne remplacent pas les seeds internes existants.
- Elles ne doivent pas etre utilisees pour declarer un `GO_UTILISATEUR_EXTERNE`
  sans execution pilote reelle et signataires nominatifs.

## Validations

| Controle | Commande | Statut |
| --- | --- | --- |
| Fixture tenants pilote + parcours Ops | `npm --prefix frontend run test -- --run src/api/__mocks__/ops-pilot-demo.mock.test.ts src/pages/OpsDashboardPage.test.tsx src/api/ops.contract.test.ts` | `PASSED` - 3 fichiers / 15 tests |

## Decision Phase 4

Decision: `GO_INTERNE_DEMO_PILOTE_AVEC_RESERVES`.

Le jeu de tenants demo pilote est stabilise et documente pour Ops. Il couvre
les etats sain, warning et critique sans action destructive sur la base. Les
reserves restent celles du Sprint 31 interne: absence de signoff hospitalier
externe et necessite de rattacher des preuves reelles avant toute ouverture
pilote client.
