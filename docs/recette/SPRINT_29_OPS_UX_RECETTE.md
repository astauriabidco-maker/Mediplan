# Sprint 29 - Recette utilisateur Ops et stabilisation UX

## Objectif

Valider que le cockpit Ops post-prod est exploitable en situation reelle par un
profil exploitation ou manager: comprendre un tenant critique, identifier la
cause, consulter le runbook, executer une correction, puis verifier l'audit et
le retour au vert.

## Perimetre recette

| Domaine | Parcours attendu | Critere GO | Critere NO-GO |
| --- | --- | --- | --- |
| Cockpit multi-tenant | Visualiser tenants sain, degrade et critique. | Le tenant critique ressort clairement, avec alertes, incidents, routines et dernier backup. | Statut tenant absent, incoherent ou impossible a comparer. |
| SLO/SLA | Comprendre les objectifs `PASSED`, `WARNING`, `FAILED`. | Valeur, seuil, periode et raison sont visibles sans ouvrir un outil externe. | SLO en echec sans explication actionnable. |
| Action Center | Assigner, commenter, prioriser, changer statut, resoudre. | Les mutations sont guidees, validees et rafraichissent la vue. | Action critique impossible ou sans feedback utilisateur. |
| Runbooks | Lire procedure, preuves, permissions et actions. | Le runbook explique quoi faire et quelle preuve fournir. | Procedure absente ou non reliee a la source du blocage. |
| Notifications | Voir preuves, ack, rappels, quiet hours, echecs. | Les notifications expliquent qui a ete informe et ce qui reste en attente. | Notification critique invisible ou impossible a auditer. |
| Audit ops | Filtrer Action Center, SLO, Runbook, Notification. | La sequence de decision est reconstructible sans donnees sensibles inutiles. | Audit inexploitable ou fuite de contenu sensible. |

## Jeu de donnees attendu

| Tenant | Etat | Signaux minimum |
| --- | --- | --- |
| `tenant-ops-ok` | Sain | Backup recent, aucun incident actif, SLO passes. |
| `tenant-ops-warning` | Degrade | SLO warning ou routine en retard, action non critique. |
| `tenant-ops-critical` | Critique | Alerte SLO critique, item Action Center, runbook, notification et audit. |

## Scenario de recette nominal

1. Ouvrir `/ops`.
2. Identifier `tenant-ops-critical` dans le cockpit multi-tenant.
3. Confirmer que le panneau SLO/SLA explique la violation.
4. Ouvrir l'item correspondant dans l'Action Center.
5. Charger le runbook et verifier les preuves attendues.
6. Assigner l'item a un operateur.
7. Ajouter un commentaire de traitement.
8. Passer le statut en `IN_PROGRESS`.
9. Resoudre avec justification et preuve.
10. Verifier que le cockpit et les compteurs reviennent au statut attendu.
11. Ouvrir le journal audit ops et filtrer Action Center / Runbook /
    Notification.

## Preuves a conserver

| Preuve | Source |
| --- | --- |
| Tests frontend Ops | `npm --prefix frontend run test -- --run src/api/ops.contract.test.ts src/api/ops.api.test.ts src/api/queryKeys.test.ts src/pages/OpsDashboardPage.test.tsx src/pages/AuditLogPage.test.tsx` - `PASSED`, 5 fichiers / 27 tests |
| Build frontend | `npm --prefix frontend run build` - `PASSED` |
| Controle diff | `git diff --check` - `PASSED` |
| Capture ou rapport de recette | Ticket de recette Sprint 29 |

## Decision

Statut provisoire: `GO_TECHNIQUE_AUTOMATISE`.

La consolidation automatisee est validee. La decision
`GO_UTILISATEUR_EXTERNE` reste a confirmer par une recette manuelle externe ou
un signoff hospitalier rattache au ticket Sprint 29, sans critere NO-GO observe
sur le parcours detection -> comprehension -> correction -> audit.

Limite Sprint 31 Phase 2: cette decision ne vaut pas signoff hospitalier
externe. Le statut courant reste `VALIDATION_INTERNE`; un
`GO_UTILISATEUR_EXTERNE` nominatif reste requis avant tout deploiement client
reel.
