# Sprint 14 Phase 4 / Sprint 15 Phase 3 - Runbook incidents preprod

Objectif: prouver que l'equipe sait detecter, qualifier, sauvegarder,
restaurer et reprendre le service apres correction sur la preprod. Les
scenarios utilisent les endpoints reels exposes avec le prefixe `/api`.

Mise a jour Sprint 15 Phase 3: le runbook formalise le mode dry-run par defaut,
les garde-fous explicites pour publier ou restaurer, le rapport enrichi
Markdown/JSON, l'idempotence attendue des executions et les commandes de
validation de cloture.

## Prerequis

- Stack preprod demarree, migree et seedee.
- Compte smoke super-admin ou `API_TOKEN` avec `planning:read`,
  `planning:publish`, `backup:read` et `backup:write`.
- Tenant cible: `HGD-DOUALA` par defaut.
- Fenetre de recette: `INCIDENT_FROM` / `INCIDENT_TO`, sinon les dernieres 24h.

## Modes d'execution Sprint 15 Phase 3

### Dry-run non destructif

Le dry-run est le mode par defaut et doit etre lance en premier sur chaque
fenetre de recette. Il n'execute ni publication reelle ni restauration:

- la publication utilise `POST /api/planning/publish/preview`;
- la restauration est marquee `skipped`;
- les controles observability, audit et backup restent effectues;
- les rapports sont produits dans `REPORT_DIR`.

```bash
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

### Drill publication avec garde-fou

Une publication reelle est interdite sans accord explicite. Pour auditer un
refus reel de publication pendant un incident, activer le garde-fou
`INCIDENT_ALLOW_PUBLISH=true` et rendre le refus bloquant avec
`INCIDENT_EXPECT_BLOCKED_PUBLICATION=true`:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_PUBLISH=true \
INCIDENT_EXPECT_BLOCKED_PUBLICATION=true \
node scripts/preprod-incident-drill.mjs
```

### Drill restauration avec garde-fou

Une restauration reelle est interdite sans accord explicite. L'import n'est
execute que si `INCIDENT_ALLOW_RESTORE=true` est present sur la commande:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_RESTORE=true \
node scripts/preprod-incident-drill.mjs
```

Le mode de restauration par defaut est `REPLACE_PLANNING_DATA`. Changer ce mode
uniquement si le ticket incident le justifie:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_RESTORE=true \
INCIDENT_IMPORT_MODE=REPLACE_PLANNING_DATA \
node scripts/preprod-incident-drill.mjs
```

## Rapports et preuves enrichies

Les rapports sont ecrits dans `preprod-reports/` par defaut:

- `preprod-incident-drill-YYYY-MM-DD.md`;
- `preprod-incident-drill-YYYY-MM-DD.json`.

Le rapport Markdown donne une synthese directement attachable au ticket:

- statut global du drill;
- base URL, tenant et periode;
- rappel des mutations executees ou non: publication et restauration;
- tableau des scenarios avec statut, observation, HTTP, duree et note;
- synthese reprise: observability finale, raisons finales, alertes hautes,
  audit chain et backup exportable;
- liste detaillee des alertes hautes ouvertes si elles existent.

Le rapport JSON conserve les preuves machine:

- `scenarios` avec `evidence` par controle;
- `metricsBefore` et `metricsAfter`;
- `restoreResult` quand une restauration est executee;
- `auditVerification`;
- `openHighAlerts` normalisees avec agent, type, regle et message.

## Idempotence attendue

- Une execution dry-run peut etre relancee sur la meme fenetre sans modifier la
  preprod.
- Les mutations sont opt-in et visibles dans le rapport via
  `Publication executee` et `Restauration executee`.
- Une restauration doit toujours exporter le snapshot avant import, puis
  comparer les metriques backup avant/apres.
- Les noms de rapports sont journaliers. Relancer plusieurs fois le meme jour
  remplace les fichiers du jour; archiver ou changer `REPORT_DIR` si plusieurs
  preuves doivent etre conservees separement.
- Les scenarios `Publication bloquee` et `Alerte critique` sont non bloquants
  par defaut. Les rendre bloquants uniquement pendant un drill incident force
  avec les variables `INCIDENT_EXPECT_*`.

## Variables utiles

| Variable                              | Defaut                     | Usage                                                          |
| ------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `BASE_URL`                            | `http://localhost:3005`    | API preprod sans `/api` final                                  |
| `TENANT_ID`                           | `HGD-DOUALA`               | Tenant cible                                                   |
| `API_TOKEN`                           | vide                       | JWT existant, sinon login smoke                                |
| `SMOKE_EMAIL`                         | `superadmin@mediplan.demo` | Login smoke si `API_TOKEN` absent                              |
| `SMOKE_PASSWORD`                      | `password123`              | Mot de passe smoke                                             |
| `INCIDENT_FROM` / `INCIDENT_TO`       | dernieres 24h              | Fenetre de publication et observability                        |
| `INCIDENT_ALLOW_PUBLISH`              | `false`                    | Execute `POST /api/planning/publish`; sinon preview uniquement |
| `INCIDENT_ALLOW_RESTORE`              | `false`                    | Execute `POST /api/tenant-backups/import` si `true`            |
| `INCIDENT_IMPORT_MODE`                | `REPLACE_PLANNING_DATA`    | Mode de restauration                                           |
| `INCIDENT_EXPECT_BLOCKED_PUBLICATION` | `false`                    | Rend bloquant le scenario publication bloquee                  |
| `INCIDENT_EXPECT_CRITICAL_ALERT`      | `false`                    | Rend bloquant le scenario alerte critique                      |
| `REPORT_DIR`                          | `preprod-reports`          | Dossier local des preuves                                      |

## Scenario 1 - Publication bloquee

But: verifier que la preprod refuse une publication non conforme et que le
refus est observable.

Action non destructive par defaut:

```text
POST /api/planning/publish/preview
body: { "start": INCIDENT_FROM, "end": INCIDENT_TO }
```

Action de drill auditant un refus reel, uniquement avec accord explicite:

```text
POST /api/planning/publish
body: { "start": INCIDENT_FROM, "end": INCIDENT_TO }
```

Commande:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_PUBLISH=true \
INCIDENT_EXPECT_BLOCKED_PUBLICATION=true \
node scripts/preprod-incident-drill.mjs
```

Attendu pendant l'incident:

- HTTP `400`;
- rapport `publishable=false` ou message de blocage;
- violations listees dans le rapport;
- `GET /api/planning/observability/health` expose ensuite
  `LAST_PUBLICATION_BLOCKED`.

Preuve script:

- scenario `Publication bloquee`;
- `observed=blocked`;
- `evidence.violations > 0` si le backend renvoie le rapport complet.

Si le planning a deja ete corrige, ce scenario est conserve comme observation.
Pendant un drill incident force, lancer avec
`INCIDENT_EXPECT_BLOCKED_PUBLICATION=true`.

Garde-fou Sprint 15 Phase 3:

- ne jamais activer `INCIDENT_ALLOW_PUBLISH=true` sur une fenetre non validee
  par le ticket incident;
- conserver la sortie dry-run avant toute publication reelle;
- verifier dans le rapport que `Publication executee: oui` apparait seulement
  pour un drill explicitement autorise.

## Scenario 2 - Alerte critique

But: verifier que les alertes hautes ouvertes rendent la sante preprod
critique et priorisent la correction.

Action:

```text
GET /api/planning/observability/health?tenantId=...&from=...&to=...
```

Attendu pendant l'incident:

- `status=CRITICAL`;
- `reasons` contient `HIGH_ALERTS_OPEN`;
- `counters.highAlerts > 0`;
- les alertes restent ouvertes tant qu'elles ne sont pas resolues ou couvertes
  par une correction conforme.

Preuve script:

- scenario `Alerte critique`;
- `evidence.status`;
- `evidence.reasons`;
- compteurs `openAlerts` et `highAlerts`.

Pendant un drill incident force, lancer avec
`INCIDENT_EXPECT_CRITICAL_ALERT=true`.

## Scenario 3 - Export backup

But: produire un snapshot tenant avant restauration ou correction risquee.

Actions:

```text
GET /api/tenant-backups/metrics?tenantId=...&from=...&to=...
GET /api/tenant-backups/export?tenantId=...&from=...&to=...
```

Attendu:

- metriques `exportable=true`;
- snapshot `kind=tenant-business-backup`;
- `schemaVersion` renseigne;
- `integrity.datasetCounts` present pour comparer avant/apres.

Preuve script:

- scenario `Export backup`;
- `evidence.schemaVersion`;
- `evidence.datasetCounts`;
- rapport JSON complet.

## Scenario 4 - Restauration

But: verifier que le snapshot peut etre restaure en preprod avec remappage des
donnees metier.

Action, uniquement avec accord explicite:

```text
POST /api/tenant-backups/import?tenantId=...
body: {
  "snapshot": "<snapshot exporte>",
  "mode": "REPLACE_PLANNING_DATA"
}
```

Le script n'execute pas cette mutation par defaut. Utiliser:

```bash
ENV_FILE=.env.preprod INCIDENT_ALLOW_RESTORE=true node scripts/preprod-incident-drill.mjs
```

Attendu:

- HTTP `201` ou reponse OK du controleur;
- `imported` contient les compteurs importes;
- les metriques backup apres restauration restent coherentes;
- la chaine audit reste valide.

Preuve script:

- scenario `Restauration`;
- `evidence.mode`;
- `evidence.imported`.

Garde-fou Sprint 15 Phase 3:

- verifier que l'export backup est `PASSED` avant d'autoriser l'import;
- documenter le mode `INCIDENT_IMPORT_MODE` dans le ticket;
- conserver les metriques backup avant/apres issues du rapport JSON;
- ne jamais combiner restauration et publication reelle dans la meme commande
  sans validation explicite du responsable de recette.

## Scenario 5 - Reprise apres correction

But: confirmer que la preprod redevient exploitable apres correction ou
restauration.

Actions:

```text
GET /api/planning/observability/health?tenantId=...&from=...&to=...
GET /api/audit/verify?tenantId=...
GET /api/tenant-backups/metrics?tenantId=...&from=...&to=...
```

Attendu:

- observability finale differente de `CRITICAL`;
- chaine audit `valid=true`;
- backup `exportable=true`;
- aucune nouvelle violation bloquante non traitee;
- rapport Markdown attache au ticket de recette.

Preuve script:

- scenario `Reprise apres correction`;
- `evidence.observabilityStatus`;
- `evidence.auditChainValid=true`;
- `evidence.backupExportable=true`.

## Decision de recette

| Scenario            | Critere GO                                                                      | Critere NO-GO                                                       |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Publication bloquee | Refus visible et auditable pendant incident, ou planning deja corrige documente | Publication acceptee alors que des violations bloquantes persistent |
| Alerte critique     | `HIGH_ALERTS_OPEN` visible pendant incident, puis disparu apres correction      | Alerte haute invisible dans observability                           |
| Export backup       | Snapshot complet et metriques coherentes                                        | Export absent, non parseable ou non exportable                      |
| Restauration        | Import reussi avec compteurs importes                                           | Import en erreur ou donnees incoherentes apres restore              |
| Reprise             | Observability non critique, audit valide, backup exportable                     | `CRITICAL`, audit invalide ou backup non exportable                 |

## Conservation des preuves

Pour chaque execution, conserver dans le ticket de recette:

- commande lancee avec variables masquees;
- rapport Markdown;
- rapport JSON si un ecart, une alerte ou une mutation a ete observe;
- statut final;
- valeurs `Publication executee` et `Restauration executee`;
- anomalies ou ecarts acceptes;
- decision `GO`, `GO SOUS RESERVE` ou `NO-GO`.

## Validation Sprint 15 Phase 3

Commandes a lancer avant cloture de la phase:

```bash
node --check scripts/preprod-incident-drill.mjs
```

```bash
ENV_FILE=.env.preprod \
REPORT_DIR=preprod-reports/sprint-15-phase-3 \
node scripts/preprod-incident-drill.mjs
```

Commandes optionnelles, uniquement si le ticket incident l'autorise:

```bash
ENV_FILE=.env.preprod \
REPORT_DIR=preprod-reports/sprint-15-phase-3 \
INCIDENT_ALLOW_PUBLISH=true \
INCIDENT_EXPECT_BLOCKED_PUBLICATION=true \
node scripts/preprod-incident-drill.mjs
```

```bash
ENV_FILE=.env.preprod \
REPORT_DIR=preprod-reports/sprint-15-phase-3 \
INCIDENT_ALLOW_RESTORE=true \
node scripts/preprod-incident-drill.mjs
```

Critere de validation:

- `node --check` passe;
- le dry-run preprod retourne `Statut: PASSED`;
- le rapport indique `Publication executee: non, preview uniquement`;
- le rapport indique `Restauration executee: non`;
- observability finale non critique, audit valide et backup exportable;
- toute commande avec `INCIDENT_ALLOW_PUBLISH` ou `INCIDENT_ALLOW_RESTORE` est
  rattachee a une autorisation explicite dans le ticket.

## Execution de cloture Sprint 14

Date: 2026-05-04

Commande:

```bash
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

Resultat final apres correction des alertes hautes preprod:

| Controle                  | Resultat                               |
| ------------------------- | -------------------------------------- |
| Statut drill              | `PASSED`                               |
| Tenant                    | `HGD-DOUALA`                           |
| Publication               | preview uniquement, `publishable=true` |
| Observability finale      | `HEALTHY`                              |
| Raisons finales           | aucune                                 |
| Alertes hautes ouvertes   | `0`                                    |
| Audit chain               | `valid=true`                           |
| Evenements audit verifies | `14`                                   |
| Backup exportable         | `true`                                 |

Correction preprod realisee avant cloture:

- renouvellement `AFGSU Niveau 2` pour Pauline NGONO EBOGO;
- alignement du shift Urgences publie de Robert ABENA MANGA avec la regle
  `IDE urgence AFGSU2`;
- renouvellement des competences expirees detectees pendant la verification;
- resolution des alertes hautes avec justification Sprint 14.

Decision incident: `GO` pour la reprise preprod, avec restauration non executee
par defaut afin d'eviter une mutation non necessaire.
