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

| Gate                          | Env declaratif         | Commande planifiee                                                      |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Migration OK                  | `PROD_GATE_MIGRATION`  | `npm run migration:show`                                                |
| Seed OK                       | `PROD_GATE_SEED`       | Declaratif uniquement, rapport seed rattache                            |
| Smoke API OK                  | `PROD_GATE_SMOKE`      | `npm run preprod:compose:smoke`                                         |
| Conformite healthy            | `PROD_GATE_COMPLIANCE` | `ENV_FILE=.env.preprod npm run preprod:go-no-go`                        |
| Audit valide                  | `PROD_GATE_AUDIT`      | `npm run frontend:audit`, `npm audit --omit=dev --audit-level=moderate` |
| Backup exportable/restaurable | `PROD_GATE_BACKUP`     | Declaratif uniquement, preuve backup/restore rattachee                  |

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
PROD_GATE_MIGRATION=PASSED \
PROD_GATE_SEED=PASSED \
PROD_GATE_SMOKE=PASSED \
PROD_GATE_COMPLIANCE=PASSED \
PROD_GATE_AUDIT=PASSED \
PROD_GATE_BACKUP=PASSED \
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
