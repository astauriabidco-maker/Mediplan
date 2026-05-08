# Sprint 30 Phase 5 - Preuves visuelles ou notes de parcours

## Objectif

Produire une trace exploitable de recette visuelle lorsque le navigateur ou les
captures ne sont pas disponibles dans l'environnement courant. Cette note sert
de substitut textuel: elle decrit les etapes, les ecrans attendus, les elements
a capturer ulterieurement et le mapping vers les tests automatises existants.

## Contexte

Le worktree contient des travaux Sprint 29 non commit. Cette preuve Sprint 30
reste limitee a `docs/recette` et ne modifie aucun fichier applicatif.

Statut navigateur: `INDISPONIBLE_DANS_CETTE_TRACE`.

Decision de preuve: `PREUVE_TEXTUELLE_ACCEPTABLE_SOUS_RESERVE_CAPTURE`.

## Parcours nominal a rejouer

| Etape | Ecran / action | Resultat visuel attendu | Capture attendue | Couverture test |
| --- | --- | --- | --- | --- |
| 1 | Ouvrir `/ops`. | Le cockpit Ops charge une synthese multi-tenant avec tenants `OK`, `WARNING` et `CRITICAL`. Le tenant critique doit ressortir sans ambiguite. | `S30-P5-01-cockpit-multi-tenant.png` | `OpsDashboardPage.test.tsx` - recette guidee ops; `ops.contract.test.ts` - surface `multiTenantSummary`. |
| 2 | Selectionner ou verifier `tenant-ops-critical`. | Les KPI critiques affichent alertes, readiness, gates, backups, incidents et notifications avec libelles lisibles. | `S30-P5-02-tenant-critical-kpis.png` | `OpsDashboardPage.test.tsx` - affiche les signaux post-prod critiques. |
| 3 | Lire le bloc SLO/SLA. | Chaque objectif affiche son statut `PASSED`, `WARNING` ou `FAILED`, sa valeur courante, son seuil, la periode et une raison actionnable. | `S30-P5-03-slo-failed-warning.png` | `OpsDashboardPage.test.tsx` - recette guidee ops; `ops.contract.test.ts` - objectifs et statuts SLO. |
| 4 | Ouvrir l'Action Center. | Les items montrent type, priorite, statut, responsable, evidence attendue et source de blocage. Les statuts `OPEN`, `IN_PROGRESS`, `WAITING_EVIDENCE`, `RESOLVED` doivent etre comprehensibles. | `S30-P5-04-action-center-open.png` | `OpsDashboardPage.test.tsx` - assigne, commente et change priorite/statut; `ops.contract.test.ts` - types, statuts et priorites Action Center. |
| 5 | Assigner l'item critique. | Un retour utilisateur confirme l'assignation et l'item reste visible avec le nouvel operateur. | `S30-P5-05-action-center-assigned.png` | `OpsDashboardPage.test.tsx` - mutations assignation Action Center; `ops.api.test.ts` - mutations ops sures. |
| 6 | Ajouter un commentaire de traitement. | Le commentaire apparait dans le contexte de l'item sans masquer les informations critiques. | `S30-P5-06-action-center-comment.png` | `OpsDashboardPage.test.tsx` - commentaire Action Center. |
| 7 | Changer priorite puis statut en `IN_PROGRESS`. | Les badges priorite/statut sont mis a jour et la liste reste coherente apres rafraichissement. | `S30-P5-07-action-center-transition.png` | `OpsDashboardPage.test.tsx` - priorite et statut Action Center. |
| 8 | Ouvrir le runbook rattache. | Le runbook affiche objectif, procedure, permissions, preuves attendues et actions de reprise sans quitter le parcours. | `S30-P5-08-runbook-detail.png` | `OpsDashboardPage.test.tsx` - ouvre un runbook depuis l'action-center; `ops.contract.test.ts` - surface `journal`. |
| 9 | Resoudre l'item avec justification et preuve. | La resolution demande une justification, accepte une preuve textuelle, puis bascule l'item en `RESOLVED` avec feedback utilisateur. | `S30-P5-09-action-center-resolved.png` | `OpsDashboardPage.test.tsx` - resolution Action Center et alerte supportee. |
| 10 | Verifier notifications. | Le panneau notifications affiche statuts, canaux, ack, rappels, quiet hours, echecs et derniere activite. | `S30-P5-10-notifications.png` | `OpsDashboardPage.test.tsx` - signaux post-prod critiques; `ops.contract.test.ts` - statuts journal. |
| 11 | Ouvrir `/audit` ou le journal audit Ops. | La timeline permet de reconstruire detection, runbook, mutation Action Center, notification et resolution. Les filtres par famille Runbook/SLO restent disponibles. | `S30-P5-11-audit-timeline.png` | `AuditLogPage.test.tsx` - timeline ops lisible; filtre runbook et SLO; recherche details utiles. |
| 12 | Rafraichir `/ops`. | Les compteurs et panneaux restent stables, sans perte du tenant selectionne ni regression visuelle. | `S30-P5-12-refresh-stability.png` | `OpsDashboardPage.test.tsx` - permet de rafraichir la synthese ops; `queryKeys.test.ts` - cles par periode et tenant. |

## Elements a capturer

| Famille | Elements obligatoires | Critere d'acceptation visuel |
| --- | --- | --- |
| Cockpit multi-tenant | Liste tenants, statut, generation, tenant critique. | Le statut critique est visible en premier niveau de lecture et comparable aux tenants sains/degrades. |
| KPI tenant | Alertes, notifications, readiness, gates, backups. | Les KPI donnent valeur, detail et gravite sans necessiter d'outil externe. |
| SLO/SLA | Objectif, valeur courante, cible, periode, raison. | Un echec `FAILED` explique pourquoi il bloque et quelle mesure est en cause. |
| Action Center | Type, priorite, statut, assignee, commentaire, preuve. | Les actions utilisateur produisent un feedback et conservent le contexte de decision. |
| Runbook | Procedure, permissions, evidence, action de reprise. | Le runbook dit quoi faire, qui peut le faire et quelle preuve rattacher. |
| Notifications | Statut, canaux, ack, rappels, quiet hours, echecs. | La chaine d'information est auditable et les attentes restantes sont visibles. |
| Audit | Filtres, timeline, details operationnels. | La sequence detection -> action -> notification -> resolution est reconstructible. |

## Notes de parcours si capture impossible

Utiliser ce format dans le ticket de recette:

```text
Date:
Operateur:
Environnement:
Navigateur:
URL:
Tenant:
Etape:
Ecran attendu:
Observation:
Ecart:
Test automatise associe:
Decision: GO / GO_AVEC_RESERVE / NO_GO
```

Exemple minimal acceptable:

```text
Etape: 8 - Runbook depuis Action Center
Ecran attendu: procedure, permissions et preuves attendues visibles.
Observation: navigateur indisponible dans l'environnement courant; preuve
textuelle basee sur le mapping Sprint 30 Phase 5.
Ecart: capture manuelle a produire avant GO utilisateur.
Test automatise associe: OpsDashboardPage.test.tsx - ouvre un runbook depuis
l'action-center et resout une alerte supportee.
Decision: GO_AVEC_RESERVE
```

## Mapping tests

| Test | Role dans la preuve |
| --- | --- |
| `frontend/src/pages/OpsDashboardPage.test.tsx` | Couvre le parcours utilisateur principal: cockpit critique, SLO, Action Center, runbook, resolution, audit indirect et etats vides. |
| `frontend/src/pages/AuditLogPage.test.tsx` | Couvre la lisibilite de la timeline audit Ops, les filtres Runbook/SLO et la recherche textuelle utile. |
| `frontend/src/api/ops.contract.test.ts` | Verifie que les surfaces contractuelles Ops/Audit, statuts, types, priorites et permissions restent explicites. |
| `frontend/src/api/ops.api.test.ts` | Verifie l'agregation des endpoints Ops, le mode partiel et les mutations sures. |
| `frontend/src/api/queryKeys.test.ts` | Verifie la stabilite des cles de cache par tenant et periode, utile pour le rafraichissement visuel. |

## Validations attendues

Commandes a conserver comme preuve technique:

```bash
npm --prefix frontend run test -- --run src/api/ops.contract.test.ts src/api/ops.api.test.ts src/api/queryKeys.test.ts src/pages/OpsDashboardPage.test.tsx src/pages/AuditLogPage.test.tsx
git diff --check
```

Une validation navigateur reste attendue avant signoff utilisateur si
l'environnement permet les captures. En l'absence de navigateur, joindre cette
note au ticket Sprint 30 Phase 5 avec la mention:
`PREUVE_TEXTUELLE_NAVIGATEUR_INDISPONIBLE`.

Cette preuve visuelle/textuelle ne vaut pas signoff hospitalier externe. Le
statut courant reste `VALIDATION_INTERNE`; un `GO_UTILISATEUR_EXTERNE`
nominatif reste requis avant tout deploiement client reel.

## Decision

Statut documentaire: `GO_TRACE_TEXTUELLE`.

Statut utilisateur interne: `GO_AVEC_RESERVE_CAPTURE`.

Statut externe: `A_OBTENIR_AVANT_DEPLOIEMENT_CLIENT_REEL`.

La reserve est levee lorsque les captures nommees `S30-P5-01` a `S30-P5-12`
sont rattachees au ticket de recette ou remplacees par des observations
manuelles signees avec le format ci-dessus.
