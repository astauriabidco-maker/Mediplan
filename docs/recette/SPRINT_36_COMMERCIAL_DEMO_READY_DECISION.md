# Sprint 36 - Decision mise en ligne demo commerciale

Date: 2026-05-10
Decision finale: `COMMERCIAL_DEMO_READY`

## Objectif

Lever les reserves Sprint 35 en rendant Mediplan exploitable pour une demo
commerciale reelle: page de demande demo, contrat lead, mode demo visible,
smoke prospect, monitoring minimal et checklist de deploiement.

Cette decision ne vaut pas `PROD_READY`, ne permet pas de traiter des donnees
hospitalieres reelles et ne signe aucun `GO_UTILISATEUR_EXTERNE`.

## Conditions COMMERCIAL_DEMO_READY

- Page ou parcours public de demande demo disponible.
- Contrat de demande demo valide cote frontend/API.
- Donnees fictives ou anonymisees clairement signalees.
- Aucun patient, agent reel, planning reel ou document RH reel.
- Monitoring minimal et smoke demo commercial disponibles.
- Checklist deploiement demo renseignee.
- Parcours prospect teste: ouvrir, comprendre, demander demo, confirmer.

## Conditions COMMERCIAL_DEMO_READY_SOUS_RESERVE

- Page contact specifiee mais non implementee.
- Environnement public HTTPS non renseigne.
- Monitoring minimal non branche.
- Jeu de donnees demo non relu sur l'environnement expose.
- Smoke prospect non automatise.

## Validation attendue

```bash
npm run sprint36:commercial:check
git diff --check
```

## Validation executee

| Controle | Resultat |
| --- | --- |
| Page publique `/demo` | `PASSED` - formulaire demande demo accessible hors espace authentifie. |
| Contrat lead demo | `PASSED` - validation email pro, consentement, champs obligatoires et garde-fou donnees sensibles. |
| Mode demo commerciale | `PASSED` - tenant demo separe, banniere visible, imports/exports sensibles bloques. |
| Monitoring smoke | `PASSED` - `scripts/commercial-demo-smoke.mjs`. |
| Checklist deploiement demo | `PASSED` - `SPRINT_36_PHASE_5_CHECKLIST_DEPLOIEMENT_DEMO.md`. |
| Smoke E2E prospect | `PASSED` - tests `DemoRequestPage`. |
| Gate automatisee | `PASSED` - `npm run sprint36:commercial:check`. |

## Decision finale

`COMMERCIAL_DEMO_READY`.

Mediplan est pret pour une mise en ligne demo commerciale controlee: un
prospect peut acceder a `/demo`, soumettre une demande encadree, voir les
limites de demonstration, et l'equipe peut s'appuyer sur un smoke local pour
verifier le dispositif.

Cette decision ne vaut pas `PROD_READY`, ne permet pas d'heberger des donnees
hospitalieres reelles et ne signe aucun `GO_UTILISATEUR_EXTERNE`.
