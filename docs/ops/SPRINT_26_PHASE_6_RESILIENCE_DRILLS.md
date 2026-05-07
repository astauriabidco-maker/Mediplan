# Sprint 26 Phase 6 - Drills resilience ops

Objectif: simuler et valider les scenarios de reprise exploitation sans
mutation dangereuse par defaut.

## Commandes

```bash
npm run ops:resilience
npm run ops:resilience -- --mock --scenarios all
npm run ops:resilience -- --api --scenarios backup-stale,audit-invalid,escalation-late
npm run ops:resilience:smoke
```

Scenarios disponibles:

- `routine-failure`;
- `notification-failure`;
- `backup-stale`;
- `audit-invalid`;
- `escalation-late`;
- `all`.

Options utiles:

- `--dry-run`, mode par defaut, planifie uniquement;
- `--mock`, injecte des signaux locaux et valide les playbooks de reprise;
- `--api`, execute uniquement des probes `GET`;
- `--from`, `--to`, `--tenant`, `--env`, `--base-url`;
- `--max-backup-age-hours`;
- `--escalation-sla-minutes`;
- `--report-dir`, `--format json|markdown|both`.

## Sorties

Le drill ecrit:

- `ops-resilience-drill-YYYY-MM-DD.json`;
- `ops-resilience-drill-YYYY-MM-DD.md`.

Le rapport JSON contient le mode, les scenarios, les checks, les preuves, les
actions de reprise attendues et la decision globale: `DRY_RUN_ONLY`,
`RECOVERY_READY` ou `RECOVERY_NO_GO`.

## Garde-fous

Le script ne lance pas de shell, migration, seed, reset DB, restore backup,
resolution d alerte, mutation incident, notification reelle ou commande git.

Par defaut, `npm run ops:resilience` reste en `dry-run`. Les rapports sont les
seules ecritures locales. Le mode `api` lit uniquement les endpoints existants
en `GET`, notamment backup metrics, audit verify et incidents ops selon les
scenarios demandes.
