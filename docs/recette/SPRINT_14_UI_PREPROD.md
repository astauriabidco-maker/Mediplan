# Sprint 14 - Phase 5 UX/UI preprod

## Objectif

Verifier que les preuves metier manager, RH et audit sont consultables depuis l'UI sans requete SQL directe.

## Parcours exposes

- Cockpit manager: liens rapides vers la file de corrections, la pre-publication et le journal audit.
- Pre-publication planning: acces direct aux rapports de conformite existants via `/api/planning/compliance/reports`, avec periode courante et limite explicites.
- Journal audit: route dediee `/audit`, entree de navigation `Journal audit`, recherche et export CSV client des preuves affichees.

## Points de recette

- Un manager/admin peut partir du cockpit et ouvrir les preuves audit sans passer par les parametres.
- Les etats vides distinguent l'absence de donnees et l'absence de resultat de recherche.
- Les libelles parlent de preuves audit, rapports publication et corrections manager.
- L'export CSV ne s'active que lorsqu'au moins une preuve audit est affichee.

## Validations ciblees

- A lancer depuis `frontend/`: tests des pages manager, pre-publication et worklist.
- A lancer depuis `frontend/`: build TypeScript/Vite si le temps preprod le permet.
