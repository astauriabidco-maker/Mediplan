# Sprint 31 Phase 5 - Recette interne rejouable

## Objectif

Fournir un point d'entree unique pour rejouer la validation interne Ops/Audit
avant archivage: contrats frontend, dashboard, audit, build, controle diff,
parcours utilisateur et preuves rattachees.

Cette recette ne remplace pas `sprint30:phase6`: elle le reference comme filet
technique stable et ajoute le cadre Sprint 31 pour les observations de
parcours et les preuves.

## Commande unique

```bash
npm run sprint31:phase5
```

Equivalent technique conserve:

```bash
npm run sprint30:phase6
```

La commande execute:

| Controle | Commande effective | Attendu |
| --- | --- | --- |
| Contrats Ops/Audit | `npm --prefix frontend run test -- --run src/api/ops.contract.test.ts ...` | Surfaces contractuelles stables pour summary, SLO, Action Center, journal et audit. |
| Dashboard Ops | meme lot Vitest cible | Parcours cockpit, tenant critique, SLO, runbook, resolution et feedback utilisateur. |
| Audit Ops | meme lot Vitest cible | Timeline lisible, filtres Runbook/SLO et recherche exploitable. |
| Build frontend | `npm --prefix frontend run build` | TypeScript et Vite compilent sans erreur. |
| Controle diff | `git diff --check` | Aucun conflit, espace final ou marqueur invalide dans le diff courant. |

## Fichiers couverts

| Fichier | Role dans la recette |
| --- | --- |
| `frontend/src/api/ops.contract.test.ts` | Valide les contrats de donnees Ops/Audit et les enumerations critiques. |
| `frontend/src/api/ops.api.test.ts` | Valide l'agregation API Ops, les modes partiels et les mutations sures. |
| `frontend/src/api/queryKeys.test.ts` | Verifie les cles de cache dashboard par tenant et periode. |
| `frontend/src/pages/OpsDashboardPage.test.tsx` | Rejoue le parcours principal Ops: diagnostic, action, runbook, resolution. |
| `frontend/src/pages/AuditLogPage.test.tsx` | Verifie la lecture audit Ops et la reconstruction de decision. |

## Parcours interne a rejouer

| Etape | Action | Preuve attendue | Critere GO |
| --- | --- | --- | --- |
| 1 | Lancer `npm run sprint31:phase5`. | Sortie terminal complete ou lien CI interne. | Tests, build et `git diff --check` passent. |
| 2 | Ouvrir `/ops` si un navigateur est disponible. | Capture cockpit multi-tenant ou note de parcours. | Tenant critique identifiable et cause lisible. |
| 3 | Lire les blocs SLO/SLA. | Capture ou releve statut, valeur, seuil, periode, raison. | Le statut `FAILED` ou `WARNING` explique l'action attendue. |
| 4 | Traiter l'item Action Center critique. | Trace assignation, commentaire, priorite/statut, resolution. | Chaque mutation donne un feedback et conserve le tenant. |
| 5 | Ouvrir le runbook rattache. | Reference runbook, permissions, procedure, preuves attendues. | L'operateur sait quoi faire et quelle preuve fournir. |
| 6 | Ouvrir `/audit`. | Capture timeline ou note avec filtres Action Center / Runbook / SLO. | La sequence detection -> action -> notification -> resolution est reconstructible. |
| 7 | Archiver les preuves. | Ticket recette, dossier restreint ou annexe PV. | Les donnees sensibles sont anonymisees ou stockees en acces restreint. |

## Format de preuve manuelle

```text
Date:
Operateur:
Commit ou branche:
Environnement:
Commande executee:
Resultat commande: PASSED | FAILED
Navigateur:
Tenant:
Parcours /ops: GO | RESERVE | NO-GO | N/A
Parcours /audit: GO | RESERVE | NO-GO | N/A
Preuves rattachees:
Donnees sensibles anonymisees: OUI | NON | N/A
Reserves:
Decision interne: GO | GO_AVEC_RESERVE | NO_GO
```

## Regles de decision

| Decision | Conditions |
| --- | --- |
| `GO` | `npm run sprint31:phase5` passe et le parcours Ops/Audit est couvert par captures ou notes signees. |
| `GO_AVEC_RESERVE` | La commande passe, mais les captures navigateur sont remplacees par notes de parcours ou une reserve mineure documentee. |
| `NO_GO` | Un test cible, le build, `git diff --check`, la comprehension du tenant critique ou la reconstruction audit echoue. |

## References

- `docs/recette/SPRINT_30_PHASE_1_OPS_RECETTE_GUIDEE.md`
- `docs/recette/SPRINT_30_PHASE_3_OPS_GO_NO_GO_UTILISATEUR.md`
- `docs/recette/SPRINT_30_PHASE_5_PREUVES_VISUELLES.md`
- `docs/recette/SPRINT_30_OPS_SIGNOFF.md`
