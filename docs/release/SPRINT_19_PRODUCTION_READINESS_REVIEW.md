# Sprint 19 - Production Readiness Review

Date: 2026-05-05
Statut cible: `PROD_READY`
Statut par defaut sans signatures: `PROD_NO_GO`

## Objectif

Transformer une release candidate `RC_READY` en decision formelle
`PROD_READY` uniquement si les preuves techniques, les gates de securite, les
preuves preprod et les signoffs metier/exploitation sont presents.

Cette revue est volontairement courte et stricte. Elle ne deploie rien, ne
modifie aucune version, ne cree aucun tag et ne pousse pas de code.

## Commande

```bash
node scripts/production-readiness-review.mjs --dry-run
```

Au moment de la freeze:

```bash
node scripts/production-readiness-review.mjs --dry-run --include-git-status
```

## Signoffs obligatoires

`PROD_READY` exige toutes les variables suivantes a `GO`:

| Role | Variable |
| --- | --- |
| Responsable RH | `PROD_SIGNOFF_RH=GO` |
| Manager pilote | `PROD_SIGNOFF_MANAGER=GO` |
| Responsable exploitation | `PROD_SIGNOFF_EXPLOITATION=GO` |
| Referent securite | `PROD_SIGNOFF_SECURITY=GO` |
| Direction / sponsor metier | `PROD_SIGNOFF_DIRECTION=GO` |

## Gates obligatoires

`PROD_READY` exige toutes les variables suivantes a `PASSED`:

| Gate | Variable |
| --- | --- |
| Gate produit complete | `PROD_GATE_CI_PRODUCT=PASSED` |
| Backup/restore recent | `PROD_GATE_BACKUP_RESTORE=PASSED` |
| Audit securite dependances | `PROD_GATE_SECURITY_AUDIT=PASSED` |
| Rollback applicatif et donnees | `PROD_GATE_ROLLBACK=PASSED` |

## Preuves preprod attendues

Le script lit les rapports du jour dans `REPORT_DIR` (`preprod-reports` par
defaut):

- `preprod-go-no-go-final-YYYY-MM-DD.json`
- `preprod-ops-readiness-YYYY-MM-DD.json`
- `preprod-demo-health-check-YYYY-MM-DD.json`
- `preprod-operational-summary-YYYY-MM-DD.json`

Les preuves doivent etre `GO`, `READY` ou `PASSED` selon le rapport.

## Decision

`PROD_READY` si:

- le finalizer RC retourne `RC_READY`;
- les cinq signoffs sont `GO`;
- les quatre gates sont `PASSED`;
- les preuves preprod du jour sont presentes et vertes;
- le statut Git est propre ou les ecarts sont attribues au moment de la freeze.

`PROD_NO_GO` si un seul de ces elements manque.

## Garde-fous

- Aucun deploiement.
- Aucun tag.
- Aucun push.
- Aucune modification de version.
- Aucune migration.
- Aucun seed.
- Aucune restauration backup.
- Aucune mutation Docker ou base de donnees.

## Sortie attendue actuelle

Tant que les signatures metier et gates finales ne sont pas fournies, la sortie
correcte est `PROD_NO_GO`. C'est un resultat sain: le projet est `RC_READY`,
mais la production exige une decision humaine explicite et des preuves finales.
