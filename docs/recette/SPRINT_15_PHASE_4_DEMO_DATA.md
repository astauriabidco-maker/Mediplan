# Sprint 15 Phase 4 - Donnees demo hospitalieres

## Objectif

Valider non destructivement que le tenant demo `HGD-DOUALA` expose un jeu de donnees hospitalieres coherent avant recette preprod:

- etablissements HGD et annexes disponibles;
- services hospitaliers rattaches aux etablissements;
- agents demo rattaches aux services;
- shifts et conges presents sur la periode de demonstration;
- absence d'alerte ouverte non resolue en preprod saine;
- chaine audit verifiable;
- backup tenant exportable et aligne avec les compteurs API.

Le controle est porte par `scripts/preprod-demo-health-check.mjs`. Il n'ecrit pas en base, ne lance pas de seed et n'appelle aucun endpoint de mutation metier. Les seules ecritures sont les rapports locaux JSON/Markdown dans `REPORT_DIR` (`preprod-reports` par defaut).

## Commandes

```bash
ENV_FILE=.env.preprod node scripts/preprod-demo-health-check.mjs
```

Sortie JSON:

```bash
ENV_FILE=.env.preprod OUTPUT_FORMAT=json node scripts/preprod-demo-health-check.mjs
```

Smoke local avec les valeurs demo par defaut:

```bash
BASE_URL=http://localhost:3005 \
TENANT_ID=HGD-DOUALA \
SMOKE_EMAIL=superadmin@mediplan.demo \
SMOKE_PASSWORD=password123 \
node scripts/preprod-demo-health-check.mjs
```

Validation syntaxique:

```bash
node --check scripts/preprod-demo-health-check.mjs
```

## Variables

| Variable | Defaut | Usage |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3005` | URL API cible |
| `TENANT_ID` | `HGD-DOUALA` | Tenant a controler |
| `SMOKE_EMAIL` | `superadmin@mediplan.demo` | Compte demo utilise pour les lectures protegees |
| `SMOKE_PASSWORD` | `password123` | Mot de passe du compte demo |
| `FROM` / `TO` | semaine courante elargie | Fenetre de verification des shifts |
| `OUTPUT_FORMAT` | `markdown` | `markdown` ou `json` pour la sortie console |
| `REPORT_DIR` | `preprod-reports` | Dossier des rapports |

Seuils ajustables si une recette veut accepter un dataset partiel:

| Variable | Defaut |
| --- | ---: |
| `MIN_DEMO_FACILITIES` | 3 |
| `MIN_DEMO_SERVICES` | 21 |
| `MIN_DEMO_AGENTS` | 35 |
| `MIN_DEMO_SHIFTS` | 28 |
| `MIN_DEMO_LEAVES` | 11 |
| `MAX_DEMO_OPEN_ALERTS` | 0 |
| `MIN_DEMO_AUDIT_LOGS` | 1 |

## Controles realises

Le script authentifie le compte demo, puis effectue uniquement des lectures:

- `GET /api/facilities`
- `GET /api/hospital-services`
- `GET /api/agents`
- `GET /api/planning/shifts`
- `GET /api/planning/leaves`
- `GET /api/agent-alerts?isResolved=false`
- `GET /api/audit/verify`
- `GET /api/audit`
- `GET /api/tenant-backups/metrics`
- `GET /api/tenant-backups/export`

Les controles bloquants couvrent:

- seuils minimums sur etablissements, services, agents, shifts, conges et evenements audit;
- plafond d'alertes ouvertes non resolues, `0` par defaut pour une preprod saine;
- presence des codes etablissements `HGD`, `HGD-BNJ`, `HGD-LOG`;
- presence des principaux codes services (`URG`, `CHIR`, `REA`, `MAT`, `PED`, `RAD`, `LAB`, `PHARMA`, `ADM`);
- rattachement de tous les agents visibles a un service;
- validite de la chaine audit;
- export backup `tenant-business-backup` disponible;
- alignement des compteurs API avec les compteurs backup lorsque les endpoints exposent les memes jeux.

## Criteres de recette

La recette Sprint 15 Phase 4 est acceptee si:

- `node --check scripts/preprod-demo-health-check.mjs` reussit;
- le health-check local ou preprod termine avec `Statut: PASSED`;
- `Alertes ouvertes` vaut `0`, sauf reserve metier explicite via `MAX_DEMO_OPEN_ALERTS`;
- les rapports `preprod-demo-health-check-YYYY-MM-DD.json` et `.md` sont generes;
- aucun seed, import backup, migration, modification frontend ou modification `package.json` n'est necessaire pour obtenir le resultat.
