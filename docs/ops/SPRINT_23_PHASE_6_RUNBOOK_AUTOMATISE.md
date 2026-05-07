# Sprint 23 Phase 6 - Runbook automatise exploitation

Date: 2026-05-07
Objectif: fournir trois entrees npm non destructives pour preparer les paquets
operationnels quotidiens, incident et rapport hebdomadaire.

## Perimetre

Cette phase ajoute une automatisation documentaire. Les scripts generent des
rapports Markdown/JSON et listent les controles attendus, mais n'executent pas
les commandes operationnelles.

Commandes exposees:

```bash
npm run ops:daily
npm run ops:incident
npm run ops:weekly-report
```

Script sous-jacent:

```bash
node scripts/ops-runbook-automation.mjs --workflow daily
node scripts/ops-runbook-automation.mjs --workflow incident --incident-id INC-YYYY-NNN
node scripts/ops-runbook-automation.mjs --workflow weekly-report --week YYYY-Www
```

Sorties:

- `preprod-reports/ops-daily-YYYY-MM-DD.md`;
- `preprod-reports/ops-daily-YYYY-MM-DD.json`;
- `preprod-reports/ops-incident-YYYY-MM-DD.md`;
- `preprod-reports/ops-incident-YYYY-MM-DD.json`;
- `preprod-reports/ops-weekly-report-YYYY-MM-DD.md`;
- `preprod-reports/ops-weekly-report-YYYY-MM-DD.json`.

Le repertoire peut etre change avec `REPORT_DIR` ou `--report-dir`.

## Garde-fous

Le script:

- ne lance pas les commandes de readiness, smoke, backup, restore ou incident;
- ne cree pas de cron;
- ne modifie pas Docker;
- ne lance pas de migration ni de seed;
- ne restaure pas de backup;
- ne modifie pas git;
- n'ecrit que les rapports Markdown/JSON.

La decision `READY` signifie que le paquet documentaire est coherent: scripts
references presents et aucune commande hors politique non destructive detectee.
Elle ne signifie pas que l'environnement est sain. La sante reelle reste a
verifier en executant manuellement les controles listes par l'owner.

## ops:daily

Objectif: preparer le controle quotidien avant ouverture recette ou support.

```bash
npm run ops:daily
REPORT_DIR=/private/tmp/mediplan-ops npm run ops:daily
```

Le paquet quotidien demande de collecter:

- readiness exploitation strict API;
- synthese operationnelle;
- smoke API preprod;
- verification alertes `HIGH`, audit chain et backup exportable;
- decision `READY` / `NO-GO` dans le ticket exploitation du jour.

Criteres `NO-GO`:

- endpoint health non 2xx;
- audit chain invalide;
- backup non exportable;
- alerte `HIGH` ouverte sans owner.

## ops:incident

Objectif: structurer la qualification, la stabilisation et la sortie incident.

```bash
npm run ops:incident
npm run ops:incident -- --incident-id INC-2026-001
```

Le paquet incident demande de collecter:

- incident commander et scribe;
- impact utilisateur, tenant et fenetre temporelle;
- preuves avant correction;
- mitigation, correction et owner;
- preuves apres correction;
- decision finale `READY` ou `NO-GO` acceptee.

Criteres `NO-GO`:

- cause inconnue sans mitigation explicite;
- correction non verifiee par readiness ou synthese operationnelle;
- action preventive sans owner;
- impact RH/metier non arbitre.

## ops:weekly-report

Objectif: consolider les signaux d'exploitation avant comite operationnel ou
release.

```bash
npm run ops:weekly-report
npm run ops:weekly-report -- --week 2026-W19
```

Le paquet hebdomadaire demande de consolider:

- decisions `READY` / `NO-GO` de la semaine;
- incidents, causes, delais et actions preventives;
- presence du restore drill ou justification de report;
- echeances rotation secrets/env;
- risques ouverts, owners et dates cibles;
- preuves utiles au ticket release si applicable.

Criteres `NO-GO`:

- restore drill absent sans justification;
- incident critique sans post-mortem;
- risque `HIGH` sans owner ou date cible;
- decision release dependante de preuves manquantes.

## Validation locale

Validation syntaxique:

```bash
node --check scripts/ops-runbook-automation.mjs
```

Validation non destructive avec rapports hors depot:

```bash
REPORT_DIR=/private/tmp/mediplan-ops node scripts/ops-runbook-automation.mjs --workflow daily
REPORT_DIR=/private/tmp/mediplan-ops node scripts/ops-runbook-automation.mjs --workflow incident --incident-id INC-DRY-RUN
REPORT_DIR=/private/tmp/mediplan-ops node scripts/ops-runbook-automation.mjs --workflow weekly-report --week 2026-W19
```

## Pointeurs

- Routines operationnelles Sprint 17:
  `docs/ops/SPRINT_17_OPERATIONS_ROUTINES.md`
- Runbook exploitation Sprint 17:
  `docs/ops/SPRINT_17_EXPLOITATION_RUNBOOK.md`
- Script automatisation:
  `scripts/ops-runbook-automation.mjs`
- Scripts npm:
  `ops:daily`, `ops:incident`, `ops:weekly-report`
