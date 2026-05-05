# Sprint 20 Phase 4 - Decision finale PROD

Date: 2026-05-05
Statut cible: `PROD_READY`
Statut par defaut: `PROD_NO_GO`

## Objectif

Formaliser la derniere decision avant production sans declencher aucune action
de livraison. Le script Sprint 20 Phase 4 agrege les preuves Phase 1 a Phase 4
et produit un dossier de decision Markdown et JSON.

## Commande

```bash
node scripts/production-decision-final.mjs --dry-run
```

Au moment de la freeze, inclure le statut Git si les agents sont prets a
attribuer les ecarts:

```bash
node scripts/production-decision-final.mjs --dry-run --include-git-status
```

## Dossier de decision

Par defaut, le dossier est ecrit dans `prod-decision-reports`:

- `production-decision-final-YYYY-MM-DD.json`
- `production-decision-final-YYYY-MM-DD.md`

Le dossier peut etre redirige avec `--decision-dir <dir>` ou
`PROD_DECISION_DIR`.

## Sources agregees

| Phase | Source | Decision attendue |
| --- | --- | --- |
| Phase 4 readiness | `scripts/production-readiness-review.mjs --dry-run --format json` | `PROD_READY` |
| Freeze check | `scripts/production-freeze-check.mjs --dry-run --format json` | `FREEZE_READY` |
| Final gates | `scripts/production-final-gates.mjs --format json` | `FINAL_GATES_READY` |
| Signoff matrix | `scripts/production-signoff-matrix.mjs --format json` | `SIGNOFF_READY` |

Les chemins des scripts optionnels peuvent etre ajustes avec
`PROD_FREEZE_CHECK_SCRIPT`, `PROD_FINAL_GATES_SCRIPT` et
`PROD_SIGNOFF_MATRIX_SCRIPT`.

## Decision

`PROD_READY` exige que toutes les sources soient presentes et retournent leur
decision attendue.

`PROD_NO_GO` est emis si:

- `production-readiness-review --dry-run` ne confirme pas `PROD_READY`;
- le freeze check est absent ou ne retourne pas `FREEZE_READY`;
- les final gates sont absentes ou ne retournent pas `FINAL_GATES_READY`;
- la matrice de signoff est absente ou ne retourne pas `SIGNOFF_READY`;
- une sortie JSON attendue est illisible ou manquante.

Cette robustesse est volontaire: si les scripts Phase 1-3 ne sont pas encore
presents, la decision reste exploitable et liste les raisons du `PROD_NO_GO`.

## Garde-fous

Le finalizer ne doit jamais:

- deployer;
- creer ou pousser un tag;
- pousser une branche;
- modifier une version package;
- lancer migration, Docker, seed, backup, restore ou mutation de donnees.

Il peut uniquement lire les scripts de decision, executer leurs modes
`--dry-run`, puis ecrire le dossier Markdown et JSON de decision.
