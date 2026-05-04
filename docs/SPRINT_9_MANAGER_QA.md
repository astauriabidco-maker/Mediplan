# Sprint 9 - QA produit et tests UI manager

Date: 2026-05-04

## Objectif

Valider le parcours manager complet:

1. detecter un probleme dans le cockpit,
2. comprendre le blocage dans la file de correction ou le planning,
3. corriger via une action guidee,
4. previsualiser la publication,
5. publier quand le rapport est conforme,
6. tracer l'action dans la timeline.

## Surfaces validees

| Surface | Route | Validation Sprint 9 |
| --- | --- | --- |
| Cockpit manager | `/manager/cockpit` | KPI, services, erreurs, periode invalide |
| File de correction | `/manager/worklist` | filtres, tri, selection, guidance |
| Actions guidees | planning modal shift | exception justifiee, remplacement, revalidation, erreurs API |
| Pre-publication | `/planning/prepublication` | violations, warnings, publishable, publication |
| Timeline | `/planning/prepublication` | evenements metier et filtres |
| Contrats API | `frontend/src/api/*workflow*` | endpoints, permissions, mocks deterministes |

## Commandes de validation

Depuis la racine:

```bash
npm run frontend:build
npm run frontend:lint
npm run frontend:test
npm run ci:quality
```

Ou en une seule commande produit:

```bash
npm run ci:product
```

## Filet de tests ajoute

- Vitest + Testing Library React + jsdom.
- Smoke test frontend.
- Tests cockpit et worklist.
- Tests actions guidees et pre-publication.
- Tests contrats API et mocks workflow manager.

## Scenarios de recette manuelle

- Ouvrir `/manager/cockpit` avec une periode valide et verifier les KPI.
- Saisir une periode invalide et verifier le message d'erreur sans requete cassée.
- Ouvrir `/manager/worklist`, filtrer par criticite et selectionner un item.
- Verifier que le panneau de guidance affiche ruleCode, endpoint, methode et permissions.
- Ouvrir un shift dans `/planning`, demander une exception sans justification puis avec justification.
- Demander un remplacement et verifier le feedback utilisateur.
- Revalider un shift et verifier le rafraichissement des surfaces manager.
- Ouvrir `/planning/prepublication`, calculer un preview non publiable, lire violations/warnings.
- Tester un preview publiable et confirmer la publication.
- Verifier qu'un evenement coherent apparait dans la timeline.

## Limites connues

- La recette visuelle automatisee navigateur n'a pas ete executee dans cette session: l'agent Phase 1 n'avait pas acces au navigateur integre.
- Le bundle Vite depasse encore 500 kB; c'est un sujet Sprint 10 performance frontend.
- `npm audit` frontend signale des vulnerabilites transitoires a traiter dans un lot securite dependances.

## Definition of done Sprint 9

- Build frontend vert.
- Lint frontend vert.
- Tests UI frontend verts.
- CI backend verte.
- Documentation QA et findings disponibles.
- Aucun `git diff --check` en erreur.
