# Sprint 25 phase 6 - Rapport direction / metier

## Objectif

Produire une synthese lisible pour direction, RH et cadres hospitaliers sur la
periode choisie: disponibilite, conformite planning, incidents, delais de
resolution, alertes critiques, publications refusees et risques residuels.

Commande principale:

```bash
ENV_FILE=.env.production npm run business:management-report
```

Validation locale sans API externe:

```bash
npm run business:management-report:smoke
node scripts/management-business-report.mjs --mock --report-dir /private/tmp/mediplan-management-report
node scripts/management-business-report.mjs --dry-run --tenant HGD-DOUALA
```

## Sources lues

Le script `scripts/management-business-report.mjs` execute uniquement des
probes `GET`:

- `/api/health/live` et `/api/health/ready`;
- `/api/planning/observability/health`;
- `/api/planning/compliance/summary`;
- `/api/ops/incidents`;
- `/api/ops/alerts`;
- `/api/agent-alerts`;
- `/api/audit/verify`;
- `/api/tenant-backups/metrics`.

Les incidents sont filtres cote script sur `declaredAt`, `resolvedAt`,
`closedAt` ou `updatedAt`, afin de rester compatible avec l'API operations
actuelle.

## Parametrage

Variables utiles:

```bash
BASE_URL=https://...
API_TOKEN=<token lecture seule>
TENANT_ID=<tenant>
MANAGEMENT_REPORT_FROM=<ISO datetime>
MANAGEMENT_REPORT_TO=<ISO datetime>
MANAGEMENT_REPORT_AVAILABILITY_TARGET=0.99
MANAGEMENT_REPORT_CRITICAL_ALERT_LIMIT=0
MANAGEMENT_REPORT_OPEN_INCIDENT_LIMIT=0
MANAGEMENT_REPORT_REFUSED_PUBLICATION_LIMIT=0
```

Options CLI equivalentes:

```bash
node scripts/management-business-report.mjs \
  --tenant HGD-DOUALA \
  --from 2026-05-01T00:00:00.000Z \
  --to 2026-05-31T23:59:59.000Z \
  --format both
```

Par defaut, la periode couvre les 30 derniers jours et les rapports sont ecrits
dans `business-reports/`.

## Sorties

Le script produit:

- `business-reports/management-business-report-YYYY-MM-DD.md`;
- `business-reports/management-business-report-YYYY-MM-DD.json`.

Le Markdown est oriente lecture comite: indicateurs cles, lecture RH/hopital,
incidents, alertes critiques, risques residuels et actions recommandees. Le JSON
expose les memes signaux via `indicators`, `residualRisks`,
`managementSummary`, `blockingReasons` et `checks`.

## Garde-fous

- Aucune mutation API, uniquement des methodes `GET`.
- Aucun deploy, migration, seed, restore backup, resolution d'alerte, cloture
  d'incident ou publication planning.
- Aucun secret imprime dans les rapports.
- Ecriture limitee aux rapports Markdown/JSON.
