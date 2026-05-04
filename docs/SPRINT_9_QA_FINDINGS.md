# Sprint 9 Phase 1 - Recette navigateur locale et inventaire QA

Date: 2026-05-04

## Perimetre inspecte

- `/manager/cockpit`
- `/manager/worklist`
- `/planning`
- `/planning/prepublication`

Le frontend Vite a ete lance sur `http://127.0.0.1:5173/`. La recette navigateur integree n'a pas pu etre executee jusqu'au bout parce que le backend Browser Use IAB n'etait pas disponible dans cette session. La validation a donc combine lancement Vite, build TypeScript, revue statique approfondie des composants/routes et controle des contrats API frontend.

## Parcours QA attendu

1. Ouvrir le cockpit manager et verifier les KPI: alertes ouvertes, shifts bloques, agents a risque, publications refusees, indicateurs par service.
2. Ouvrir la file de correction, filtrer par criticite/categorie/periode, selectionner un probleme.
3. Lire le panneau "pourquoi ce point est bloque" et verifier les actions disponibles.
4. Depuis le planning, ouvrir un shift et lancer une action guidee: reassignation, remplacement, exception, resolution ou revalidation.
5. Ouvrir la pre-publication, recalculer le rapport, verifier violations/warnings/recommandations.
6. Publier si le rapport est publiable, puis relire la timeline metier.

## Bugs corriges dans ce lot

- Les actions guidees invalidaient des cles React Query inexistantes (`planningManagerCockpit`, `planningManagerWorklist`, `planningComplianceSummary`). Apres correction, les mutations rafraichissent les vraies surfaces manager: cockpit, worklist, preview publication, timeline et planning.
- Le cockpit manager pouvait passer par un etat instable si la periode devenait invalide. La page bloque maintenant la requete, affiche un message metier et permet de retablir une periode valide.
- Les dates vides du cockpit sont ignorees au changement, ce qui evite les `Invalid Date` lors de la saisie.
- La pre-publication gere maintenant explicitement une periode incomplete avant d'appeler les hooks de preview/timeline.
- La limite de timeline est bornee entre `1` et `200`, ce qui evite des requetes invalides si le champ numerique est vide ou hors bornes.

## Findings QA actionnables

### P1 - Le build frontend est bloque par la Phase 3 parallele

`npm --prefix frontend run build` echoue actuellement sur `src/test/render.tsx`: `@testing-library/react` est importe mais la dependance n'est pas encore installee. Ce point appartient a la Phase 3 "tests UI"; il ne faut pas le corriger dans la Phase 1 sans coordonner l'installation de la stack de tests.

Action recommandee: la Phase 3 doit soit ajouter les dependances Vitest/Testing Library/jsdom et les types, soit isoler les helpers de test hors compilation applicative.

### P1 - Recette navigateur non executable dans cette session

Le serveur Vite demarre, mais l'automatisation in-app browser ne trouve aucun backend IAB. La recette DOM/clics n'a donc pas pu confirmer visuellement les pages.

Action recommandee: relancer cette checklist avec Browser Use disponible, ou ajouter Playwright en Phase 3 pour couvrir le parcours critique.

### P2 - Publication directe encore presente dans `/planning`

La page planning contient encore une action de publication directe historique avec `alert()`. Le parcours produit Sprint 9 devrait pousser le manager vers `/planning/prepublication`, qui explique les violations, warnings et la timeline.

Action recommandee: remplacer l'action directe par un lien/bouton vers la pre-publication, ou afficher un message qui indique que la publication controlee se fait depuis cette page.

### P2 - Contrats manager dupliques

Les types du workflow manager existent dans `manager.api.ts`, `manager-workflow.api.ts`, `manager-workflow.contract.ts` et `planning.api.ts`. Cette duplication augmente le risque de divergence, notamment autour de `availableActions` vs `actions`, `status` vs `health`, et des compteurs observability.

Action recommandee: en Phase 5, choisir un client canonique pour les ecrans et faire des tests de contrat sur les mocks.

### P2 - Actions de la worklist seulement descriptives

`/manager/worklist` affiche les actions disponibles avec methode, endpoint et permissions, mais ne permet pas encore de les executer directement depuis ce panneau. Les actions executable existent dans le planning via `ManagerGuidedActions`.

Action recommandee: reutiliser `ManagerGuidedActions` dans le panneau de detail de la worklist pour boucler le parcours detecter -> comprendre -> corriger sans quitter la page.

### P3 - Libelles cockpit sans accents

Plusieurs libelles du cockpit restent sans accents: "Sante", "Donnees generees", "periode", "refusee", "conformite". Ce n'est pas bloquant, mais l'interface hospitaliere gagne a etre plus soignee.

Action recommandee: corriger les libelles en meme temps que les polish UX de Phase 2.

### P3 - Responsive a confirmer visuellement

Les pages utilisent des grilles responsives, mais la sidebar fixe `w-64` et les panneaux larges (`420px`, `w-96`) doivent etre confirmes sur largeur tablette/mobile. Sans navigateur, ce point reste non verifie.

Action recommandee: tester 1440px, 1024px et 390px en Phase 1 bis ou Phase 4 UI.

## Checklist de recette finale

- Se connecter avec un profil manager/admin ayant `planning:read`, `planning:write`, `planning:exception` et `audit:read`.
- Verifier que `/manager/cockpit` charge, se met a jour, et affiche un etat clair si l'API echoue.
- Verifier que les filtres de date refusent une periode inversee sur cockpit, worklist et pre-publication.
- Verifier que `/manager/worklist` affiche un item, son agent, ses metadata et le guidage associe.
- Verifier qu'une reassignation depuis un shift rafraichit cockpit, worklist, preview et timeline.
- Verifier qu'une exception exige une justification avant confirmation.
- Verifier que `/planning/prepublication` bloque la publication quand le rapport n'est pas publiable.
- Verifier qu'une publication reussie ajoute un evenement lisible dans la timeline.
