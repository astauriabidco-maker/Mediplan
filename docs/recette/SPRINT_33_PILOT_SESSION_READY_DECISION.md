# Sprint 33 - Decision session pilote controlee

## Objectif

Transformer le statut `PILOT_READY_INTERNE` du Sprint 32 en mecanique
operationnelle de session pilote: dossier, roles, repetition, PV, preuves,
reserves et parcours E2E exploitables.

Le Sprint 33 ne signe pas un `GO_UTILISATEUR_EXTERNE`. Il prepare une session
pilote controlee et tracable.

## Statut cible

Decision cible: `PILOT_SESSION_READY` ou `PILOT_SESSION_NOT_READY`.

Statut provisoire: `PILOT_SESSION_READY`.

## Conditions PILOT_SESSION_READY

- Dossier pilote disponible avec perimetre, environnement, version et risques.
- Surface de session ou contrat de donnees permettant de suivre checklist,
  preuves, reserves et decision.
- Repetition interne documentee avant exposition a un hopital pilote.
- Modele de PV pilote disponible, avec signataires reels a renseigner le jour
  de la session.
- Regles de preuves robustes: captures, liens, horodatage, commit ou build,
  stockage restreint et anonymisation.
- Parcours E2E pilote documente ou teste: ouvrir session, suivre checklist,
  jouer demo, rattacher preuve, enregistrer reserve, produire decision.
- Validation automatisee pertinente verte.

## Conditions PILOT_SESSION_NOT_READY

- Donnees sensibles ou identifiants hospitaliers reels dans un support
  partageable.
- Absence de PV ou de roles signataires.
- Impossible de rattacher les preuves a une session.
- Parcours `/ops` ou `/audit` non rejouable en repetition interne.
- Reserve P1 non mitigee avant session pilote.

## Exclusions

- Aucun deploiement production client.
- Aucun reset DB, seed destructif, rollback ou migration destructive.
- Aucun nom de signataire invente.
- Aucun `GO_UTILISATEUR_EXTERNE` sans PV signe par de vraies personnes.

## Validation attendue

```bash
npm run sprint33:pilot:check
git diff --check
```

## Validation executee

| Controle | Resultat |
| --- | --- |
| Dossier pilote | `PASSED` - `docs/recette/SPRINT_33_PHASE_1_DOSSIER_PILOTE.md`. |
| Contrat session pilote | `PASSED` - `frontend/src/api/pilot-session.contract.test.ts`. |
| Repetition interne | `PASSED` - `docs/recette/SPRINT_33_PHASE_3_REPETITION_INTERNE.md`. |
| Modele PV pilote | `PASSED` - `docs/recette/SPRINT_33_PHASE_4_PV_PILOTE_MODELE.md`. |
| Preuves robustes | `PASSED` - `docs/recette/SPRINT_33_PHASE_5_PREUVES_PILOTE.md`. |
| E2E parcours pilote | `PASSED` - test cockpit Ops + `docs/recette/SPRINT_33_PHASE_6_E2E_PARCOURS_PILOTE.md`. |
| Validation automatisee | `PASSED` - `npm run sprint33:pilot:check`. |

## Decision finale

`PILOT_SESSION_READY`.

Mediplan dispose maintenant d'une mecanique de session pilote controlee:
dossier, contrat de suivi, repetition interne, PV, preuves, scenario E2E et
decision documentee.

Cette decision autorise la preparation d'une session pilote encadree. Elle ne
vaut pas `GO_UTILISATEUR_EXTERNE`, ne remplace pas les signatures reelles et ne
declenche aucun deploiement production client.
