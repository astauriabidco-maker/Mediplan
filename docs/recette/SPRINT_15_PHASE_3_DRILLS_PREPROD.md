# Sprint 15 Phase 3 - Drills preprod

Objectif: cadrer la recette de robustesse des drills preprod en distinguant le
controle nominal, le dry-run non destructif, l'incident reel supervise et les
criteres de bascule `RECOVERY_CRITICAL`.

Ce runbook s'applique au script existant
`scripts/preprod-incident-drill.mjs`. Il ne modifie pas la preprod par defaut:
la publication reste en preview et la restauration est ignoree tant que les
flags explicites ne sont pas poses.

## Prerequis

- Stack preprod demarree, migree, seedee et accessible.
- Fichier `.env.preprod` disponible ou variables exportees dans le shell.
- Compte smoke super-admin valide, ou `API_TOKEN` existant.
- Tenant cible connu, `HGD-DOUALA` par defaut.
- Fenetre de recette annoncee avant execution si elle differe des dernieres
  24h.
- Ticket de recette ouvert pour attacher les rapports Markdown et JSON.

## Commande nominale

Commande attendue pour valider la Phase 3 sans mutation metier:

```bash
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

Comportement attendu:

- `POST /api/planning/publish/preview`, aucune publication reelle;
- `GET /api/planning/observability/health`;
- `GET /api/tenant-backups/metrics`;
- `GET /api/tenant-backups/export`;
- restauration marquee `skipped`;
- verification finale de l'audit, du backup et de l'observability.

La commande nominale doit retourner un code 0 et produire:

- `preprod-reports/preprod-incident-drill-YYYY-MM-DD.md`;
- `preprod-reports/preprod-incident-drill-YYYY-MM-DD.json`.

## Dry-run explicite

Le dry-run de recette force la simulation des mutations meme si des flags
d'autorisation sont exportes par erreur:

```bash
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
```

Critere dry-run:

- publication reelle interdite, endpoint preview uniquement;
- restauration/import interdits;
- export backup autorise uniquement comme preuve de restaurabilite;
- tableau `Mutations` present avec actions `simulated` ou `skipped`;
- rapport genere meme si les scenarios incidents sont seulement observes;
- statut final `PASSED` si la reprise est saine.

Le script accepte aussi `--dry-run` et `INCIDENT_DRY_RUN=true`.

## Incident reel encadre

Un incident reel encadre n'est autorise que pendant une fenetre supervisee avec
responsable recette, responsable technique et decision de rollback identifies.

### Publication bloquee attendue

Utiliser uniquement lorsque l'objectif est de prouver qu'une publication non
conforme est refusee par l'API reelle:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_PUBLISH=true \
INCIDENT_EXPECT_BLOCKED_PUBLICATION=true \
node scripts/preprod-incident-drill.mjs
```

Attendus:

- `POST /api/planning/publish` appele;
- refus HTTP `400` ou reponse indiquant `publishable=false`;
- scenario `Publication bloquee` en `PASSED`;
- violations ou message de blocage presents dans le rapport.

### Alerte critique attendue

Utiliser uniquement lorsque des alertes hautes ouvertes sont volontairement
presentes ou conservees pour le drill:

```bash
ENV_FILE=.env.preprod \
INCIDENT_EXPECT_CRITICAL_ALERT=true \
node scripts/preprod-incident-drill.mjs
```

Attendus:

- observability initiale `CRITICAL`;
- raison `HIGH_ALERTS_OPEN`;
- compteur `highAlerts > 0`;
- alertes hautes listees dans le rapport final si elles restent ouvertes.

### Restauration supervisee

La restauration est une mutation preprod. Elle requiert accord explicite dans
le ticket de recette, snapshot exporte par le run courant et confirmation du
mode d'import:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_RESTORE=true \
INCIDENT_IMPORT_MODE=REPLACE_PLANNING_DATA \
node scripts/preprod-incident-drill.mjs
```

Attendus:

- `POST /api/tenant-backups/import` appele une seule fois;
- scenario `Restauration` en `PASSED`;
- compteurs `imported` presents;
- audit chain valide apres import;
- observability finale non critique.

## Flags

| Variable                              | Defaut                     | Usage recette                                                   |
| ------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| `ENV_FILE`                            | vide                       | Charge `.env.preprod` sans ecraser les variables deja exportees |
| `BASE_URL`                            | `http://localhost:3005`    | URL preprod sans `/api` final                                   |
| `TENANT_ID`                           | `HGD-DOUALA`               | Tenant cible du drill                                           |
| `API_TOKEN`                           | vide                       | JWT existant, sinon login smoke                                 |
| `SMOKE_EMAIL`                         | `superadmin@mediplan.demo` | Login smoke si `API_TOKEN` absent                               |
| `SMOKE_PASSWORD`                      | `password123`              | Mot de passe smoke                                              |
| `INCIDENT_FROM` / `INCIDENT_TO`       | dernieres 24h              | Fenetre de publication, observability et backup                 |
| `FROM` / `TO`                         | fallback                   | Alias acceptes si `INCIDENT_FROM` / `INCIDENT_TO` absents       |
| `INCIDENT_DRY_RUN`                    | `false`                    | Force preview publication et bloque restore                     |
| `INCIDENT_ALLOW_PUBLISH`              | `false`                    | Execute la publication reelle si `true`, sinon preview          |
| `INCIDENT_ALLOW_RESTORE`              | `false`                    | Execute l'import backup si `true`                               |
| `INCIDENT_IMPORT_MODE`                | `REPLACE_PLANNING_DATA`    | Mode envoye a l'import                                          |
| `INCIDENT_EXPECT_BLOCKED_PUBLICATION` | `false`                    | Rend bloquant le refus de publication attendu                   |
| `INCIDENT_EXPECT_CRITICAL_ALERT`      | `false`                    | Rend bloquante l'alerte critique attendue                       |
| `REPORT_DIR`                          | `preprod-reports`          | Dossier local des preuves                                       |

## Criteres de reussite

La Phase 3 est validee si la commande nominale retourne `PASSED` avec:

- observability finale differente de `CRITICAL`;
- aucune alerte haute ouverte non justifiee;
- `auditVerification.valid=true`;
- `metricsAfter.exportable=true`;
- scenario `Export backup` en `PASSED`;
- scenario `Restauration` en `PASSED` ou `skipped` documente;
- rapports Markdown et JSON attaches au ticket;
- toute correction metier preprod decrite dans le ticket avec auteur, heure et
  justification.

## Criteres RECOVERY_CRITICAL

Classer la recette en `RECOVERY_CRITICAL` et ouvrir une action immediate si au
moins un point est observe apres tentative de reprise:

- observability finale `CRITICAL`;
- raison finale contenant `HIGH_ALERTS_OPEN`;
- `openHighAlerts > 0` sans justification de drill encore actif;
- audit chain invalide ou endpoint `/api/audit/verify` en erreur;
- backup non exportable apres correction ou restauration;
- import execute mais compteurs `imported` absents ou incoherents;
- publication reelle acceptee alors que le drill attendait un blocage;
- rapport JSON absent, incomplet ou non parseable;
- code retour non nul hors scenario incident volontairement attendu.

En `RECOVERY_CRITICAL`, ne relancer une publication ou une restauration qu'apres
decision explicite dans le ticket. La prochaine action doit etre soit une
correction metier documentee, soit une restauration supervisee, soit un rollback
technique.

## Preuves attendues

Attacher au ticket de recette:

- commande exacte lancee, avec flags;
- horodatage de debut et fin;
- hash ou reference de la version testee;
- rapport Markdown `preprod-incident-drill-YYYY-MM-DD.md`;
- rapport JSON `preprod-incident-drill-YYYY-MM-DD.json`;
- extrait de synthese: statut, tenant, periode, observability finale, raisons
  finales, alertes hautes ouvertes, audit chain, backup exportable;
- decision operateur: `GO`, `NO-GO`, ou `RECOVERY_CRITICAL`;
- si incident reel: accord prealable, fenetre, responsable, impact attendu,
  action de reprise et validation post-reprise.

## Validations

Avant recette:

```bash
node --check scripts/preprod-incident-drill.mjs
node --check scripts/preprod-incident-drill.smoke.mjs
npm run preprod:incident:smoke
```

Validation nominale:

```bash
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

Validation dry-run explicite:

```bash
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
```

Validation post-incident ou post-restauration:

```bash
ENV_FILE=.env.preprod \
INCIDENT_ALLOW_PUBLISH=false \
INCIDENT_ALLOW_RESTORE=false \
node scripts/preprod-incident-drill.mjs
```

La validation post-incident est acceptee uniquement si elle repasse en
`PASSED`, avec observability finale saine, audit chain valide et backup
exportable.

## Resultat observe le 2026-05-05

Commande:

```bash
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
```

Resultat: `NO-GO` non destructif.

Le drill a correctement bloque les mutations (`planning.publish` en `simulated`,
`tenant-backups.import` en `skipped`) et a produit les rapports. La reprise est
restee `CRITICAL` a cause de 4 alertes `HIGH` ouvertes sur `HGD-DOUALA`
(`HIGH_ALERTS_OPEN`). Prochaine action metier: corriger ou justifier ces alertes
avant de demander un `GO` preprod.
