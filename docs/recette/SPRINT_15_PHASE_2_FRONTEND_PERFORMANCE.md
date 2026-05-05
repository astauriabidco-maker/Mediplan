# Sprint 15 - Phase 2 - Performance frontend

## Objectif

Rendre le controle budget bundle exploitable en recette: identifier les plus
gros chunks, les routes concernees, le budget applique et les actions a mener
avant une derive de performance.

## Commandes de controle

| Controle                         | Commande                                                                                                       | Resultat attendu                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Smoke rapport                    | `npm run frontend:budget:smoke`                                                                                | `frontend-bundle-budget smoke passed`         |
| Syntaxe scripts                  | `node --check scripts/frontend-bundle-budget.mjs` puis `node --check scripts/frontend-bundle-budget.smoke.mjs` | aucune erreur                                 |
| Budget reel apres build frontend | `npm run frontend:budget:check`                                                                                | rapport budget et code 0 si budgets respectes |

## Lecture du rapport

Le rapport budget bundle affiche maintenant:

- les plus gros assets par impact, avec route(s), taille raw/gzip, budget
  applique et signal;
- les routes triees par proximite au budget, pour voir rapidement les routes
  en depassement, en surveillance ou avec chunk attendu manquant;
- les violations budget explicites;
- des recommandations actionnables par entree, chunk ou route.

## Criteres de validation recette

1. Une entree `index-*.js` au-dessus du budget doit produire une violation
   `entry` et recommander de deplacer les imports propres aux routes derriere
   des frontieres lazy.
2. Une route au-dessus du budget doit afficher les chunks responsables et la
   reduction necessaire en KiB.
3. Un chunk attendu manquant doit rester visible dans la section routes et dans
   les recommandations.
4. Les routes proches du budget, sans echec, doivent etre marquees en
   surveillance pour prevenir les regressions.

## Decision

Phase validee si le smoke passe et si le rapport reel permet d'identifier en
moins d'une minute le plus gros asset, la route concernee, le budget applique
et la prochaine action recommandee.
