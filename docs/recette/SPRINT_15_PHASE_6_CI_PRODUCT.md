# Sprint 15 Phase 6 - CI produit

## Objectif

Ajouter un orchestrateur CI produit non destructif qui documente et regroupe
les controles essentiels avant integration dans `package.json`.

Le script central est:

```bash
node scripts/ci-product-verify.mjs
```

Il execute les controles dans cet ordre et s'arrete au premier echec:

| Ordre | Controle | Commande executee | Mutation |
| --- | --- | --- | --- |
| 1 | Build frontend | `npm run frontend:build` | Non destructive |
| 2 | Budget bundle frontend | `npm run frontend:budget:check` | Non destructive |
| 3 | Lint frontend | `npm run frontend:lint` | Non destructive |
| 4 | Tests frontend | `npm run frontend:test` | Non destructive |
| 5 | Audit dependances frontend | `npm run frontend:audit` | Non destructive |
| 6 | Build backend | `npm run build` | Non destructive |
| 7 | Smoke incident | `npm run preprod:incident:smoke` | Non destructive |
| 8 | Smoke routes frontend | `npm run frontend:smoke:routes` | Non destructive |

## Modes non executants

Lister les controles sans rien lancer:

```bash
node scripts/ci-product-verify.mjs --list
```

Afficher le plan de commandes sans rien lancer:

```bash
node scripts/ci-product-verify.mjs --dry-run
```

Afficher l'aide:

```bash
node scripts/ci-product-verify.mjs --help
```

## Garde-fous

- Le script lance chaque commande avec `spawn`, sans shell intermediaire.
- Aucune commande destructive n'est orchestree.
- L'ordre est explicite pour garder le budget bundle apres le build frontend.
- L'integration npm est volontairement hors scope de cette phase pour eviter
  les conflits dans `package.json`.
- Le smoke incident utilise la commande projet `preprod:incident:smoke`, qui
  valide notamment les garde-fous `--dry-run` du drill incident.

## Validation Phase 6

Commandes a executer apres modification:

```bash
node --check scripts/ci-product-verify.mjs
node scripts/ci-product-verify.mjs --list
node scripts/ci-product-verify.mjs --dry-run
```

Critere d'acceptation:

- `node --check` ne remonte aucune erreur de syntaxe;
- `--list` affiche les huit controles attendus;
- `--dry-run` affiche le plan exact sans executer les commandes;
- le script complet peut ensuite etre raccorde dans `package.json` par le lot
  d'integration dedie.
