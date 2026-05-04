# Sprint 14 Phase 4 - Scenarios incidents preprod

Objectif: prouver que l'equipe sait detecter, qualifier, sauvegarder,
restaurer et reprendre le service apres correction sur la preprod. Les
scenarios utilisent les endpoints reels exposes avec le prefixe `/api`.

## Prerequis

- Stack preprod demarree, migree et seedee.
- Compte smoke super-admin ou `API_TOKEN` avec `planning:read`,
  `planning:publish`, `backup:read` et `backup:write`.
- Tenant cible: `HGD-DOUALA` par defaut.
- Fenetre de recette: `INCIDENT_FROM` / `INCIDENT_TO`, sinon les dernieres 24h.

Commande de verification non destructive:

```bash
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

Commande de drill complet avec restauration explicite:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_RESTORE=true \
node scripts/preprod-incident-drill.mjs
```

Les rapports sont ecrits dans `preprod-reports/`:

- `preprod-incident-drill-YYYY-MM-DD.md`;
- `preprod-incident-drill-YYYY-MM-DD.json`.

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

Pour chaque execution, conserver dans le ticket Sprint 14:

- commande lancee avec variables masquees;
- rapport Markdown;
- statut final;
- anomalies ou ecarts acceptes;
- decision `GO`, `GO SOUS RESERVE` ou `NO-GO`.

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
