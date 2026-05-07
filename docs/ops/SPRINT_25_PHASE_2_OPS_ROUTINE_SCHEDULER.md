# Sprint 25 Phase 2 - Scheduler routines ops

Objectif: planifier, orchestrer et historiser les routines post-prod
`daily`, `weekly`, `escalation`, `backup`, `audit` et `slo` sans mutation
dangereuse par defaut.

## Commandes

```bash
npm run ops:routines
npm run ops:routines -- --mock --routines all
npm run ops:routines -- --api --routines daily,backup,audit,slo --tenant HGD-DOUALA
npm run ops:routines:smoke
```

Options utiles:

- `--routines daily,weekly,escalation,backup,audit,slo,all`;
- `--dry-run`, mode par defaut, planifie uniquement;
- `--mock`, execute les routines mock/locales non destructives;
- `--api`, execute les probes `GET` et scripts de rapport existants;
- `--from`, `--to`, `--weekly-from`, `--weekly-to`;
- `--tenant`, `--env`, `--base-url`;
- `--report-dir`, `--journal`.

## Sorties

Le scheduler ecrit:

- `ops-routine-scheduler-YYYY-MM-DD.json`;
- `ops-routine-scheduler-YYYY-MM-DD.md`;
- `ops-routine-journal.jsonl`.

Le JSONL conserve pour chaque run: horodatage, mode, tenant, statut global,
routines executees/planifiees, raisons bloquantes et chemins de rapports.

## Garde-fous

Le scheduler n'utilise pas de shell pour les scripts enfant et ne lance pas:

- migrations, seed ou reset DB;
- restauration backup;
- resolution d'alertes/incidents;
- mutations Docker;
- mutations git;
- methodes HTTP `POST`, `PATCH`, `PUT` ou `DELETE`.

Le statut `PLANNED` correspond a un `dry-run`. Les statuts `PASSED`, `FAILED`
et `BLOCKED` sont reserves aux modes `mock` ou `api`.
