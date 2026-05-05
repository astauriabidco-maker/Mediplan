# Sprint 20 Phase 2 - Final Gates

Objectif: fournir un orchestrateur final non destructif pour declarer,
planifier et, uniquement sur demande explicite, executer les gates finales de
production.

## Orchestrateur

Script:

```bash
node scripts/production-final-gates.mjs
```

Le mode par defaut est `dry-run-plan`. Il liste les commandes finales, lit les
statuts `PROD_GATE_*`, produit une sortie Markdown contenant aussi le JSON, et
ne lance aucune commande lourde ou mutante.

Execution explicite:

```bash
node scripts/production-final-gates.mjs --execute
```

Options utiles:

```bash
node scripts/production-final-gates.mjs --format json
node scripts/production-final-gates.mjs --only ci-product,frontend-budget
node scripts/production-final-gates.mjs --execute --ci-command full
```

## Gates

| Gate | Env declaratif | Commande planifiee |
| --- | --- | --- |
| CI produit | `PROD_GATE_CI_PRODUCT` | `npm run ci:product:verify` par defaut, ou `npm run ci:product` avec `--ci-command full` |
| Budget frontend | `PROD_GATE_FRONTEND_BUDGET` | `npm run frontend:budget:check` |
| Audits | `PROD_GATE_AUDITS` | `npm run frontend:audit`, `npm audit --omit=dev --audit-level=moderate` |
| Preprod go/no-go | `PROD_GATE_PREPROD_GO_NO_GO` | `ENV_FILE=.env.preprod npm run preprod:go-no-go` |
| Ops readiness | `PROD_GATE_OPS_READINESS` | `ENV_FILE=.env.preprod npm run preprod:ops:readiness` |
| Backup/restore recent | `PROD_GATE_BACKUP_RESTORE_RECENT` | Declaratif uniquement, aucune restauration lancee |

## Decision

La decision vaut `FINAL_GATES_READY` uniquement si toutes les declarations
requises sont exactement `PASSED`.

Valeurs acceptees:

- `PASSED`
- `FAILED`
- `NO_GO`
- `WAIVED`

Toute valeur manquante, invalide, `FAILED`, `NO_GO` ou `WAIVED` donne
`FINAL_GATES_NO_GO`. En mode `--execute`, une commande qui sort en erreur
ajoute aussi une raison de no-go.

Exemple pret:

```bash
PROD_GATE_CI_PRODUCT=PASSED \
PROD_GATE_FRONTEND_BUDGET=PASSED \
PROD_GATE_AUDITS=PASSED \
PROD_GATE_PREPROD_GO_NO_GO=PASSED \
PROD_GATE_OPS_READINESS=PASSED \
PROD_GATE_BACKUP_RESTORE_RECENT=PASSED \
node scripts/production-final-gates.mjs --format json
```

## Garde-fous

- Par defaut, aucune commande lourde n'est executee.
- Les commandes ne partent qu'avec `--execute`.
- Le backup/restore recent reste une preuve declaree, pas une restauration
  relancee par l'orchestrateur.
- Aucun `docker compose`, migration, seed, deploy, tag, push ou mutation de
  package n'est lance par ce script.
- La sortie Markdown inclut le JSON complet pour archivage dans le ticket de
  release.

## Validation locale

```bash
node --check scripts/production-final-gates.mjs
node scripts/production-final-gates.mjs --format json
```
