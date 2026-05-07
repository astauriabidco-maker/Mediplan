# Sprint 24 - Rapport hebdomadaire post-prod

## Objectif

Le rapport hebdomadaire consolide les signaux post-prod disponibles pour un
tenant: incidents, alertes ouvertes, journal ops, SLA/SLO derives, audit chain
et readiness backup.

Commande principale:

```bash
ENV_FILE=.env.production npm run ops:weekly-report
```

Validation locale sans API externe:

```bash
npm run ops:weekly-report:smoke
node scripts/ops-weekly-report.mjs --mock --report-dir /private/tmp/mediplan-ops-weekly
```

## Sources lues

Le script `scripts/ops-weekly-report.mjs` execute uniquement des probes `GET`:

- `/api/health/live` et `/api/health/ready`;
- `/api/ops/incidents`;
- `/api/ops/journal`;
- `/api/planning/observability/health`;
- `/api/audit/verify`;
- `/api/tenant-backups/metrics`;
- `/api/agent-alerts`.

Les incidents sont filtres cote script sur `declaredAt`, `resolvedAt`,
`closedAt` ou `updatedAt` pour rester compatible avec l'API operations actuelle.

## Parametrage

Variables utiles:

```bash
BASE_URL=https://...
API_TOKEN=<token lecture seule>
TENANT_ID=<tenant>
OPS_WEEKLY_FROM=<ISO datetime>
OPS_WEEKLY_TO=<ISO datetime>
OPS_WEEKLY_OPEN_ALERT_LIMIT=0
OPS_WEEKLY_HIGH_ALERT_LIMIT=0
OPS_WEEKLY_OPEN_INCIDENT_LIMIT=0
OPS_WEEKLY_CRITICAL_INCIDENT_LIMIT=0
```

Par defaut, la periode couvre les 7 derniers jours et les rapports sont ecrits
dans `prod-reports/`.

## Sorties

Le script produit:

- `prod-reports/ops-weekly-report-YYYY-MM-DD.md`;
- `prod-reports/ops-weekly-report-YYYY-MM-DD.json`.

Le JSON contient `period`, `tenant`, `counters`, `slaSlo`, `blockingReasons` et
`recommendations` pour exploitation par ticket ops ou comite hebdomadaire.

## Garde-fous

- Aucune mutation API, uniquement des methodes `GET`.
- Aucun deploy, migration, seed, restore backup, resolution d'alerte ou cloture
  d'incident.
- Aucun secret imprime dans les rapports.
- Ecriture limitee aux rapports Markdown/JSON.
