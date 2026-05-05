# Sprint 17 - Routines operationnelles verifiables

## Objectif

Transformer le runbook Sprint 17 en routines d'exploitation repetables,
verifiables et non destructives. Le planning couvre backups, restore drill,
monitoring health, rotation secrets/env et incident review avec owners,
frequences, commandes, preuves et decision `READY` / `NO-GO`.

Le generateur de checklist est:

```bash
node scripts/ops-routine-scheduler.mjs --dry-run
node scripts/ops-routine-scheduler.mjs --mock --report-dir preprod-reports
```

Il produit:

- `preprod-reports/ops-routine-scheduler-YYYY-MM-DD.md`;
- `preprod-reports/ops-routine-scheduler-YYYY-MM-DD.json`.

Le script n'execute aucune commande operationnelle. Il ne cree pas de cron, ne
modifie pas Docker, ne lance pas de migration, ne restaure pas de donnees et ne
fait aucun reset. Il ecrit uniquement les rapports Markdown/JSON.

## Decision READY / NO-GO

La decision `READY` exige:

- toutes les commandes referencees pointent vers des scripts presents dans le
  depot;
- aucune commande planifiee ne contient d'action hors politique non destructive
  (`docker compose up/down/run`, `migration:run`, `migration:revert`,
  `git reset`, suppression recursive);
- chaque routine a un owner, un backup, une frequence, des preuves attendues et
  des criteres `NO-GO`.

La decision `NO-GO` bloque la routine concernee tant que la raison bloquante du
rapport n'est pas corrigee ou explicitement acceptee par le responsable
exploitation.

## Planning des routines

| Routine | Frequence | Owner | Preuves principales |
| --- | --- | --- | --- |
| Backup logique tenant | Quotidien avant correction planning | Responsable exploitation | Synthese operationnelle Markdown/JSON, ticket du jour |
| Restore drill controle | Hebdomadaire hors recette active | Tech lead backend | Rapport backup/restore Markdown/JSON, validation RH/exploitation si necessaire |
| Monitoring health et alertes | Deux fois par jour pendant recette, puis quotidien | Astreinte niveau 1 | Readiness, operational summary, capture alertes HIGH si presentes |
| Rotation secrets et revue env | Mensuel tokens smoke, trimestriel secrets critiques | Referent securite | Ticket rotation, readiness post-rotation, smoke authentifie |
| Incident review | Sous 2 jours ouvres apres incident ou `NO-GO` | Responsable exploitation | Chronologie, cause, actions, rapports avant/apres |

## Commandes de controle

Backups quotidiens:

```bash
ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api
ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api
```

Restore drill:

```bash
ENV_FILE=.env.preprod node scripts/preprod-backup-restore.mjs
```

Monitoring health:

```bash
ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api
ENV_FILE=.env.preprod npm run smoke:api:preprod
ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api
```

Rotation secrets/env:

```bash
ENV_FILE=.env.preprod node scripts/preprod-env-check.mjs
ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api
```

Incident review:

```bash
ENV_FILE=.env.preprod INCIDENT_DRY_RUN=true node scripts/preprod-incident-drill.mjs --dry-run
ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api
```

Ces commandes sont des pointeurs de runbook. Le generateur
`ops-routine-scheduler.mjs` les documente mais ne les execute pas.

## Astreinte et escalade

- Niveau 1: astreinte support, qualification initiale et collecte des preuves.
- Niveau 2: responsable exploitation, decision `READY` / `NO-GO`.
- Niveau 3: tech lead backend, diagnostic API, audit chain, backup/restore.
- Niveau 4: referent plateforme/DevOps, environnement, base, deploiement.
- Niveau 5: referent securite, suspicion fuite secret ou acces non autorise.
- Niveau metier: responsable RH/produit, arbitrage recette et impact planning.

Objectifs de reaction:

- critique: prise en charge sous 15 minutes;
- high: prise en charge sous 30 minutes;
- medium: traitement sous 1 jour ouvre.

## Preuves a conserver

Chaque routine doit conserver:

- rapport Markdown et JSON date;
- ticket ou canal de suivi avec owner, heure de debut, heure de fin et decision;
- commandes executees manuellement, sans secrets dans les logs;
- anomalies, cause probable, correction et verification apres correction;
- validation metier si la recette ou les plannings utilisateurs sont impactes.

Ne jamais joindre `.env.preprod`, tokens, mots de passe, exports de secrets ou
snapshots contenant des donnees sensibles dans un canal non approuve.

## Procedure incident review

1. Qualifier l'incident avec readiness, monitoring health et synthese
   operationnelle.
2. Stabiliser en suspendant publications planning, imports backup et actions
   correctives non urgentes.
3. Diagnostiquer dans l'ordre: API/base, audit chain, backup exportable,
   alertes `HIGH`, publication bloquee.
4. Corriger avec owner assigne et horodatage.
5. Verifier avec readiness, operational summary et smoke API.
6. Documenter cause, impact, correction, preuves avant/apres et decision finale.

## Validation locale

Validation syntaxique:

```bash
node --check scripts/ops-routine-scheduler.mjs
```

Validation non destructive:

```bash
node scripts/ops-routine-scheduler.mjs --dry-run
node scripts/ops-routine-scheduler.mjs --mock
```

Pour eviter d'ajouter des rapports au depot pendant une verification locale:

```bash
REPORT_DIR=/private/tmp/mediplan-ops-routine-reports node scripts/ops-routine-scheduler.mjs --dry-run
```

## Pointeurs

- Runbook exploitation Sprint 17:
  `docs/ops/SPRINT_17_EXPLOITATION_RUNBOOK.md`
- Readiness exploitation: `scripts/preprod-ops-readiness.mjs`
- Synthese operationnelle: `scripts/preprod-operational-summary.mjs`
- Backup/restore drill: `scripts/preprod-backup-restore.mjs`
- Incident drill: `scripts/preprod-incident-drill.mjs`
