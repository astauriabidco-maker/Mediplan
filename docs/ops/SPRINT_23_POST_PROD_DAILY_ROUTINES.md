# Sprint 23 - Routines post-prod quotidiennes

## Objectif

Le check quotidien post-prod consolide les signaux non destructifs attendus
apres mise en production: sante API, conformite planning, audit chain, backup
exportable et alertes ouvertes.

Commande principale:

```bash
ENV_FILE=.env.production npm run ops:daily:postprod
```

Validation locale sans API:

```bash
npm run ops:daily:postprod:smoke
node scripts/ops-daily-check.mjs --mock --report-dir /private/tmp/mediplan-ops-daily
```

## Garde-fous

Le script `scripts/ops-daily-check.mjs` est volontairement en lecture seule:

- probes API `GET` uniquement pour les controles metier;
- aucun deploiement, migration, seed, restore backup ou resolution d'alerte;
- aucune valeur de secret imprimee dans les rapports;
- ecriture limitee aux rapports Markdown/JSON.

Il produit:

- `prod-reports/ops-daily-check-YYYY-MM-DD.md`;
- `prod-reports/ops-daily-check-YYYY-MM-DD.json`.

## Decision

La decision `POST_PROD_READY` exige:

- `/api/health/live` et `/api/health/ready` disponibles;
- token API de lecture fourni pour les probes authentifiees;
- conformite planning non `CRITICAL`;
- audit chain valide et sans anomalie;
- backup metrics `exportable=true`;
- aucune alerte ouverte au-dela des seuils configures.

Seuils par defaut:

```bash
OPS_DAILY_OPEN_ALERT_LIMIT=0
OPS_DAILY_HIGH_ALERT_LIMIT=0
```

Tout depassement produit `POST_PROD_NO_GO` avec raisons bloquantes dans le
rapport.
