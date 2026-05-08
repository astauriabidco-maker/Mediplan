# Sprint 33 Phase 6 - E2E parcours pilote controle

## Objectif

Verrouiller le parcours pilote au niveau utilisateur: ouvrir le cockpit Ops,
identifier le tenant critique, comprendre le SLO en echec, ouvrir le runbook,
rattacher une preuve valide et refuser une cloture sans preuve exploitable.

La Phase 6 reste une validation de session pilote controlee. Elle ne vaut pas
`GO_UTILISATEUR_EXTERNE` et ne remplace pas un PV signe.

## Couverture automatisee

Le test frontend `OpsDashboardPage` couvre le parcours pilote externe controle:

- tenants demo non sensibles visibles;
- tenant critique `tenant-demo-critique` selectionne;
- SLO et incident Ops lisibles;
- runbook ouvert avec permissions `operations:write` et `audit:read`;
- preuve audit attendue;
- URL de preuve invalide refusee;
- resolution acceptee uniquement avec preuve valide.

## Commande cible

```bash
npm run sprint33:pilot:check
```

Cette commande inclut:

- contrat API session pilote;
- fixture demo Ops;
- contrats Ops existants;
- tests cockpit Ops et audit;
- build frontend;
- `git diff --check`.

## Critere de reussite

| Controle | Attendu |
| --- | --- |
| Test parcours pilote | `PASSED` |
| Contrat session pilote | `PASSED` |
| Build frontend | `PASSED` |
| Whitespace | `PASSED` |
| Donnees sensibles dans tenants Sprint 33 | Aucun identifiant hospitalier reel introduit |

## Limites

- Pas de test navigateur reel dans cette phase.
- Pas de backend de session pilote persistant.
- Pas de signature utilisateur externe.
- Pas de reset DB, migration destructive ou seed.

## Decision Phase 6

Decision: `GO_INTERNE_E2E_PILOTE_CONTROLE`.

Le parcours est suffisamment verrouille pour soutenir une session pilote
controlee, sous reserve de rattacher les preuves et signatures reelles dans le
PV pilote le jour de la session.
