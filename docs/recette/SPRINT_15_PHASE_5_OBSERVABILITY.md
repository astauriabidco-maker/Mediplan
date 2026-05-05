# Sprint 15 Phase 5 - Observabilite operationnelle

Objectif: produire une synthese operationnelle preprod lisible par un
operateur avant decision de recette. Le script consolide l'observability, la
chaine audit, le backup exportable, les alertes `HIGH` ouvertes et la decision
`GO` / `NO-GO`.

Le script cible est `scripts/preprod-operational-summary.mjs`. Il est non
destructif: en mode API il utilise uniquement des lectures metier, avec login
smoke possible si `API_TOKEN` est absent. Aucun import backup, aucune
publication planning et aucune correction d'alerte ne sont executes.

## Commande nominale

```bash
ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs
```

Endpoints lus:

- `GET /api/health/live`;
- `GET /api/health/ready`;
- `GET /api/planning/observability/health`;
- `GET /api/audit/verify`;
- `GET /api/tenant-backups/metrics`;
- `GET /api/tenant-backups/export`;
- `GET /api/agent-alerts?severity=HIGH&isResolved=false`.

Le rapport est ecrit dans `REPORT_DIR`, `preprod-reports` par defaut:

- `preprod-operational-summary-YYYY-MM-DD.md`;
- `preprod-operational-summary-YYYY-MM-DD.json`.

## Mode mock/smoke

Si aucune API preprod n'est disponible, le script peut etre valide en mode
mock:

```bash
node scripts/preprod-operational-summary.mjs --mock
```

Equivalent par variable:

```bash
OPERATIONAL_SUMMARY_MOCK=true node scripts/preprod-operational-summary.mjs
```

Par defaut, une API indisponible bascule en mock pour produire une preuve de
smoke locale. Pour rendre l'API obligatoire:

```bash
ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api
```

Un `GO` issu du mode mock valide seulement le script et le format de rapport.
Il ne remplace pas une decision preprod reelle.

## Variables

| Variable                              | Defaut                     | Usage                                                        |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `ENV_FILE`                            | vide                       | Charge un fichier env sans ecraser le shell                  |
| `BASE_URL`                            | `http://localhost:3005`    | URL API sans slash final                                     |
| `TENANT_ID`                           | `HGD-DOUALA`               | Tenant de recette                                            |
| `API_TOKEN`                           | vide                       | JWT existant pour endpoints proteges                         |
| `SMOKE_EMAIL`                         | `superadmin@mediplan.demo` | Login smoke si `API_TOKEN` absent                            |
| `SMOKE_PASSWORD`                      | `password123`              | Mot de passe smoke                                           |
| `OPERATIONAL_FROM` / `OPERATIONAL_TO` | dernieres 24h              | Fenetre d'observability et backup                            |
| `FROM` / `TO`                         | fallback                   | Alias acceptes                                               |
| `OPERATIONAL_SUMMARY_MOCK`            | `false`                    | Force le mode mock/smoke                                     |
| `OPERATIONAL_SUMMARY_MOCK_ON_FAILURE` | `true`                     | Bascule mock si l'API est indisponible                       |
| `OPERATIONAL_SUMMARY_STRICT_API`      | `false`                    | Interdit le fallback mock                                    |
| `REPORT_DIR`                          | `preprod-reports`          | Dossier local des rapports                                   |

## Criteres GO

La decision est `GO` uniquement si tous les points suivants sont vrais:

- tous les checks HTTP sont en succes;
- observability differente de `CRITICAL`;
- raison `HIGH_ALERTS_OPEN` absente;
- aucune alerte `HIGH` ouverte;
- chaine audit valide;
- aucune anomalie de chaine audit;
- backup metrics `exportable=true`;
- export backup present avec `kind=tenant-business-backup`, schema et compteurs
  d'integrite.

## Criteres NO-GO

La decision est `NO-GO` des qu'un point bloquant est observe:

- endpoint de sante, observability, audit, backup ou alertes en erreur;
- observability `CRITICAL`;
- raison `HIGH_ALERTS_OPEN`;
- au moins une alerte `HIGH` ouverte;
- chaine audit invalide, indisponible ou avec anomalies;
- backup non exportable;
- export backup incomplet ou non conforme.

En `NO-GO`, attacher le rapport au ticket de recette, corriger ou justifier les
alertes, puis relancer la synthese sans mutation metier.

## Validations

```bash
node --check scripts/preprod-operational-summary.mjs
node scripts/preprod-operational-summary.mjs --mock
```

Validation preprod attendue:

```bash
ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs
```

Validation stricte sans fallback:

```bash
ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api
```
