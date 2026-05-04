# Sprint 13 Phase 1 - Preproduction executable

Objectif: disposer d'un environnement preprod reproductible pour enchainer
configuration, migrations, seed demo hospitalier et smoke tests API.

## Artefacts ajoutes

| Fichier                         | Role                                                            |
| ------------------------------- | --------------------------------------------------------------- |
| `.env.preprod.example`          | Gabarit d'environnement preprod sans secret reel                |
| `docker-compose.preprod.yml`    | Stack Postgres, Redis et backend API en mode preprod            |
| `scripts/preprod-env-check.mjs` | Verification bloquante des variables obligatoires               |
| `scripts/preprod-api-smoke.mjs` | Smoke API avec login automatique si `SMOKE_EMAIL` est renseigne |

## Preparation

```bash
cp .env.preprod.example .env.preprod
```

Modifier ensuite dans `.env.preprod`:

- `POSTGRES_PASSWORD`;
- `JWT_SECRET`, avec au moins 64 caracteres aleatoires;
- `FRONTEND_URL` si le frontend preprod n'est pas local;
- `BASE_URL` si l'API n'est pas exposee sur `http://localhost:3005`.
- `DB_SYNCHRONIZE=false`, obligatoire en preprod pour imposer le passage par
  migrations.

Controle local:

```bash
ENV_FILE=.env.preprod npm run preprod:env:check
```

## Lancement de la stack preprod

```bash
npm run preprod:compose:up
```

La commande construit le backend, demarre Postgres et Redis, puis expose l'API
sur le port `PORT` defini dans `.env.preprod`.

Arret:

```bash
npm run preprod:compose:down
```

## Migrations

```bash
npm run preprod:compose:migrate
```

Notes importantes:

- les migrations s'executent dans le conteneur backend, donc avec
  `POSTGRES_HOST=postgres`;
- l'API ne doit pas creer de tables implicitement: `DB_SYNCHRONIZE=false`;
- le mode preprod reste separe de la base locale via le volume
  `mediplan_preprod_postgres`;
- si une migration echoue, ne pas lancer le seed avant diagnostic.

Commande de lecture sans execution:

```bash
ENV_FILE=.env.preprod npm run migration:show
```

## Seed hospitalier demo

```bash
npm run preprod:compose:seed
```

Le seed cree le tenant `HGD-DOUALA`, les services hospitaliers, agents,
competences, conges, shifts, politiques et comptes demo.

Compte smoke par defaut:

| Role             | Email                      | Mot de passe  |
| ---------------- | -------------------------- | ------------- |
| Super admin demo | `superadmin@mediplan.demo` | `password123` |

## Smoke tests API

```bash
npm run preprod:compose:smoke
```

Le smoke:

1. se connecte via `SMOKE_EMAIL` / `SMOKE_PASSWORD` si `API_TOKEN` est absent;
2. verifie `/api/health/live`;
3. verifie `/api/health/ready`;
4. lit l'observabilite planning;
5. verifie la chaine audit;
6. lit les metriques backup.

Les rapports sont produits dans `preprod-reports/`:

- `preprod-smoke-YYYY-MM-DD.md`;
- `preprod-smoke-YYYY-MM-DD.json`.

## Parcours recommande Phase 1

```bash
ENV_FILE=.env.preprod npm run preprod:env:check
npm run preprod:compose:up
npm run preprod:compose:migrate
npm run preprod:compose:seed
npm run preprod:compose:smoke
```

Decision:

- `GO`: env OK, migrations OK, seed OK, smoke `PASSED`;
- `GO SOUS RESERVE`: smoke OK avec warnings non bloquants documentes;
- `NO-GO`: readiness KO, migration KO, seed KO ou smoke protege KO.

## Points a surveiller

- Ne pas reutiliser `.env.preprod.example` tel quel: remplacer les secrets.
- Ne pas versionner `.env.preprod`.
- Garder un rapport smoke Markdown dans le ticket quotidien preprod.
- Apres chaque changement de schema, rejouer migrations puis seed sur un volume
  preprod frais avant validation Go/No-Go.

## Run local du 2026-05-04

Parcours execute sur la preprod locale:

```bash
ENV_FILE=.env.preprod npm run preprod:env:check
npm run preprod:compose:up
npm run preprod:compose:migrate
npm run preprod:compose:seed
npm run preprod:compose:smoke
```

Corrections appliquees pendant le run:

- desactivation de `synchronize` en preprod via `DB_SYNCHRONIZE=false`;
- generation d'une migration de rattrapage du schema courant;
- correction du type Postgres de `Shift.complianceExceptionApprovedById`;
- correction du moteur de couverture pour supporter `competencyName`;
- ajout du shift `PHARMA-STUP-WEEKEND-1` pour couvrir la Pharmacie
  Hospitaliere avec la competence `Circuit des stupefiants`;
- approbation d'une exception controlee sur `RAD-WEEKEND-IRM`, puis publication;
- resolution justifiee des alertes de recette;
- reparation locale de la chaine audit apres correction de normalisation des
  dates imbriquees.

Dernier smoke:

- statut global: `PASSED`;
- observabilite planning: `HEALTHY`;
- raisons critiques: aucune;
- alertes ouvertes: `0`;
- shifts pending: `0`;
- chaine audit: valide;
- evenements audit: `7`;
- backup exportable: `true`;
- rapport: `preprod-reports/preprod-smoke-2026-05-04.md`.
