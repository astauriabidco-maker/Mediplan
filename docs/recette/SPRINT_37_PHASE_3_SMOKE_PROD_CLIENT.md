# Sprint 37 Phase 3 - Smoke environnement prod client

Date: 2026-05-10
Statut cible: `PROD_CLIENT_SMOKE_PLAN_READY_WITH_RESERVES`
Cadre: passage vraie production client, smoke non destructif

## Objectif

Preparer le smoke de l'environnement cible client sans declencher d'appel
externe par defaut. Cette phase verifie que le depot, les scripts de recette et
la configuration attendue sont prets avant toute execution contre une URL
client.

Le smoke automatisable par defaut est local-only: il lit `package.json`, les
documents de recette, les scripts presents, `process.env` et un eventuel
`ENV_FILE`. Il ne fait aucun `fetch`, aucune migration, aucun seed, aucun reset
DB, aucune suppression massive, aucun Docker compose et aucun push.

## Garde-fous

- Aucun push.
- Aucune migration lancee.
- Aucun `migration:revert`.
- Aucun seed, reset DB ou restauration backup.
- Aucune suppression massive.
- Aucun Docker compose up/down.
- Aucun appel reseau externe sans accord explicite.
- Aucun affichage de secret: les valeurs sensibles sont masquees.
- Aucune modification de donnees client pendant cette phase.

## Script local non destructif

Commande par defaut:

```bash
npm run sprint37:prod-client:smoke
```

Commande avec fichier cible local, toujours sans reseau:

```bash
ENV_FILE=<fichier-prod-client> npm run sprint37:prod-client:smoke
```

Commande stricte a utiliser quand le shell cible contient toutes les variables
attendues:

```bash
ENV_FILE=<fichier-prod-client> npm run sprint37:prod-client:smoke:strict
```

Le script verifie:

- presence des documents Sprint 34, 35, 36 et 37;
- presence des scripts smoke/readiness existants;
- presence des scripts npm Sprint 37;
- absence de pattern destructif dans le script npm par defaut;
- absence de `fetch`, methode HTTP mutante ou execution de commande dans le
  script local;
- configuration cible attendue, sans fuite de secret.

## Configuration attendue

| Variable | Attendu | Statut initial |
| --- | --- | --- |
| `NODE_ENV` | `production` | `A_VERIFIER` |
| `COUNTRY_CODE` | `FR` par defaut, surchargeable via `PROD_CLIENT_EXPECTED_COUNTRY_CODE` | `A_VERIFIER` |
| `PORT` | numerique | `A_VERIFIER` |
| `FRONTEND_URL` | HTTPS | `A_VERIFIER` |
| `BASE_URL` | HTTPS | `A_VERIFIER` |
| `POSTGRES_HOST` | renseigne | `A_VERIFIER` |
| `POSTGRES_PORT` | numerique | `A_VERIFIER` |
| `POSTGRES_USER` | renseigne | `A_VERIFIER` |
| `POSTGRES_PASSWORD` | present, masque | `A_VERIFIER` |
| `POSTGRES_DB` | renseigne | `A_VERIFIER` |
| `JWT_SECRET` | present, au moins 64 caracteres, masque | `A_VERIFIER` |
| `DB_SYNCHRONIZE` | absent ou `false` | `A_VERIFIER` |
| `MISTRAL_API_KEY` | optionnel, masque si present | `A_VERIFIER` |

## Plan smoke cible

| Etape | Commande | Reseau | Destructif | Accord |
| --- | --- | --- | --- | --- |
| Config locale | `ENV_FILE=<fichier-prod-client> npm run sprint37:prod-client:smoke` | Non | Non | Non requis |
| Config stricte | `ENV_FILE=<fichier-prod-client> npm run sprint37:prod-client:smoke:strict` | Non | Non | Non requis |
| Smoke API lecture seule | `ENV_FILE=<fichier-prod-client> npm run smoke:api:preprod` | Oui | Non | Requis avant execution |
| Rattachement preuves | Ticket recette client | Non | Non | Requis par process |

Le smoke API existant reste volontairement separe car il appelle `BASE_URL`. Il
ne doit etre lance sur l'environnement client qu'apres approbation explicite,
avec un compte ou token smoke lecture seule.

## Resultats attendus

| Decision script | Sens |
| --- | --- |
| `PROD_CLIENT_SMOKE_PLAN_READY` | Depot et configuration cible conformes. |
| `PROD_CLIENT_SMOKE_PLAN_READY_WITH_RESERVES` | Depot conforme, configuration cible incomplete ou a corriger. |
| `PROD_CLIENT_SMOKE_PLAN_BLOCKED` | Fichier, script ou garde-fou bloquant. |

## Preuves a rattacher

```text
Date:
Commit:
Environnement:
URL frontend:
URL API:
Tenant / compte smoke:
Commande lancee:
Decision script:
Reserves:
Accord appel reseau externe: OUI / NON
Smoke API lance: OUI / NON
Resultat smoke API:
Owner Mediplan:
Owner client:
```

## Validation locale

Validations non destructives:

```bash
node --check scripts/prod-client-smoke-plan.mjs
npm run sprint37:prod-client:smoke
git diff --check
```

Commandes volontairement exclues sans accord explicite:

- `npm run smoke:api:preprod` contre une URL client;
- `npm run migration:run`;
- `npm run migration:revert`;
- `npm run seed:demo`;
- `npm run demo:reset`;
- toute commande Docker compose;
- toute suppression massive;
- tout push.
