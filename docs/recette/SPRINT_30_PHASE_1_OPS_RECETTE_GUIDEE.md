# Sprint 30 Phase 1 - Recette manuelle guidee Ops

## Objectif

Formaliser et executer un parcours utilisateur `/ops` de bout en bout pour un
tenant critique: detection dans le cockpit multi-tenant, comprehension SLO,
traitement Action Center, consultation runbook, resolution avec preuve, puis
verification audit.

## Perimetre

| Inclus | Hors perimetre |
| --- | --- |
| Parcours guide utilisateur Ops sans navigateur obligatoire. | Signoff nominatif final. |
| Verification des contrats frontend existants. | Tests e2e navigateur ou API preprod reelle. |
| Controle tenant critique, SLO, action-center, runbook, resolution, audit. | Correction fonctionnelle backend hors anomalie bloquante. |

## Preconditions

| Element | Attendu |
| --- | --- |
| Profil | Exploitation ou manager avec `operations:read`, `operations:write` et `audit:read`. |
| Route | `/ops` accessible depuis le menu exploitation. |
| Tenant critique | `HGD-DOUALA-REA` ou tenant equivalent dans le jeu de recette. |
| Signal initial | Au moins un SLO `FAILED`, un item Action Center critique, un runbook disponible et une preuve de notification/audit. |
| Donnees sensibles | Aucune preuve ne doit contenir de donnees RH nominatives non necessaires. |

## Parcours guide execute

| Etape | Action utilisateur | Resultat attendu | Resultat observe |
| --- | --- | --- | --- |
| 1 | Ouvrir `/ops`. | Le tableau de bord Ops se charge avec le tenant courant. | `OK` - surface couverte par `OpsDashboardPage.test.tsx`. |
| 2 | Identifier le tenant critique dans le cockpit multi-tenant. | Le tenant critique ressort avec alertes, incidents, routines et dernier backup. | `OK` - scenario `HGD-DOUALA-REA` couvert par le test de recette guidee. |
| 3 | Lire le panneau SLO/SLA. | Le SLO en echec affiche valeur courante, seuil, periode et raison. | `OK` - `FAILED`, `47min` et raison explicite verifies. |
| 4 | Ouvrir l'item Action Center correspondant. | Priorite, statut, preuve requise, commentaire precedent et source reference sont visibles. | `OK` - item critique `WAITING_EVIDENCE` verifie. |
| 5 | Ouvrir le runbook depuis l'Action Center. | Le runbook explique cause, permissions, controles bloquants et preuves attendues. | `OK` - permissions `operations:write` et `audit:read` verifiees. |
| 6 | Completer la resolution. | L'operateur renseigne resume, URL de preuve et libelle de preuve. | `OK` - payload resolution verifie avec preuve Grafana et audit chain. |
| 7 | Resoudre l'item. | La mutation `RESOLVED` est appelee pour le tenant critique, sans changer de tenant. | `OK` - appel attendu avec `tenantId=HGD-DOUALA-REA`. |
| 8 | Verifier le retour au vert. | Le cockpit revient en statut operationnel, aucune alerte ouverte, SLO `PASSED`. | `OK` - rafraichissement summary et statut operationnel verifies. |
| 9 | Verifier l'audit ops. | Les filtres Action Center / Runbook / Notification permettent de reconstruire la sequence. | `OK` - contrats audit et journal ops couverts par `ops.contract.test.ts`. |

## Points de controle GO / NO-GO

| Domaine | Controle | Decision Phase 1 |
| --- | --- | --- |
| Tenant critique | Le tenant cible reste lisible et non confondu avec un autre tenant. | `GO` |
| SLO | Le SLO expose statut, seuil, valeur, periode et raison actionnable. | `GO` |
| Action Center | Assignation/commentaire/statut/priorite/resolution sont modelises et proteges en ecriture. | `GO` |
| Runbook | Le runbook rattache la source d'incident aux permissions et preuves attendues. | `GO` |
| Resolution | La resolution exige un resume et accepte une preuve explicite. | `GO` |
| Audit | Les surfaces audit et journal ops restent filtrables par tenant/periode/action. | `GO` |

## Reserves

| Reserve | Impact | Suite recommandee |
| --- | --- | --- |
| Recette executee sans navigateur reel. | Pas de validation visuelle manuelle des espacements et interactions fines. | A couvrir en Phase 2 ou signoff utilisateur avec capture. |
| Signataires externes non renseignes. | Pas de `GO_UTILISATEUR_EXTERNE` nominatif. | Completer `docs/recette/SPRINT_30_OPS_SIGNOFF.md` avec un signataire hospitalier externe avant deploiement client reel. |
| Donnees issues de mocks frontend. | Pas de preuve preprod live. | Relier au ticket de recette ou a une session preprod. |

## Preuves techniques

| Preuve | Commande | Statut |
| --- | --- | --- |
| Contrats et parcours frontend Ops/Audit | `npm --prefix frontend run test -- --run src/api/ops.contract.test.ts src/api/ops.api.test.ts src/api/queryKeys.test.ts src/pages/OpsDashboardPage.test.tsx src/pages/AuditLogPage.test.tsx` | `PASSED` - 5 fichiers / 27 tests |
| Build frontend | `npm --prefix frontend run build` | `PASSED` |
| Controle whitespace/diff | `git diff --check` | `PASSED` |

## Decision Phase 1

Decision: `GO_PHASE_1_GUIDEE_AVEC_RESERVES`.

Le parcours utilisateur Ops est formalise et executable sur les surfaces
frontend existantes. Aucun critere NO-GO n'est identifie sur la sequence
detection -> comprehension SLO -> action-center -> runbook -> resolution ->
audit. Le statut courant reste `VALIDATION_INTERNE`. Le passage en
`GO_UTILISATEUR_EXTERNE` reste conditionne a une recette visuelle et a un
signoff nominatif hospitalier externe avant tout deploiement client reel.
