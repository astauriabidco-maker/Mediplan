# Sprint 38 Phase A - ENV_FILE prod client

Date: 2026-05-10
Statut cible: `READY_WITH_RESERVES`
Cadre: levee reserves production client, preparation ENV_FILE sans secret reel

## Objectif

Fournir un modele de fichier `ENV_FILE` production client et une methode de
validation non destructive avant execution d'un smoke cible. Cette phase ne
cree pas de fichier `.env.prod-client` reel, ne contient aucun secret client et
ne declenche aucune migration, reset DB, seed, suppression massive, appel
reseau externe ou push.

Le modele versionne est `.env.prod-client.example`. Le fichier reel doit etre
cree par l'exploitation dans un emplacement controle, avec des secrets fournis
par le client ou le coffre interne, puis reference via `ENV_FILE`.

## Garde-fous

- Aucun secret reel dans le depot.
- Aucun fichier `.env.prod-client` reel cree par cette phase.
- Aucun reset DB, seed, migration ou restauration backup.
- Aucune suppression massive.
- Aucun push.
- Aucun appel reseau externe: la validation stricte lit uniquement le fichier
  env, `package.json`, les scripts et les documents locaux.
- Les secrets controles par le script sont masques (`present`) dans la sortie.

## Modele ENV_FILE

Modele a utiliser:

```bash
.env.prod-client.example
```

Creation du fichier cible par l'exploitation, hors depot ou dans un emplacement
ignore localement:

```bash
cp .env.prod-client.example <chemin-securise>/env.prod-client
```

Le fichier cible doit ensuite etre rempli avec les valeurs reelles et passe au
smoke strict:

```bash
ENV_FILE=<chemin-securise>/env.prod-client npm run sprint37:prod-client:smoke:strict
```

Ne pas utiliser de vraies valeurs dans `.env.prod-client.example` et ne pas
committer le fichier cible.

## Variables obligatoires

| Variable | Regle de validation | Secret |
| --- | --- | --- |
| `NODE_ENV` | doit valoir `production` | Non |
| `COUNTRY_CODE` | doit valoir `FR` par defaut, ou la valeur de `PROD_CLIENT_EXPECTED_COUNTRY_CODE` | Non |
| `PORT` | numerique | Non |
| `FRONTEND_URL` | URL HTTPS | Non |
| `BASE_URL` | URL HTTPS | Non |
| `POSTGRES_HOST` | renseigne | Non |
| `POSTGRES_PORT` | numerique | Non |
| `POSTGRES_USER` | renseigne | Non |
| `POSTGRES_PASSWORD` | renseigne, masque dans la sortie | Oui |
| `POSTGRES_DB` | renseigne | Non |
| `JWT_SECRET` | renseigne, 64 caracteres minimum, masque dans la sortie | Oui |

## Variables optionnelles et garde-fous

| Variable | Regle | Commentaire |
| --- | --- | --- |
| `DB_SYNCHRONIZE` | absent, vide ou `false` | doit rester non destructif en production client |
| `MISTRAL_API_KEY` | optionnel | masque si present |

`DB_SYNCHRONIZE=true` bloque la validation stricte.

## Methode de validation

Validation attendue depuis un shell qui a acces au fichier cible:

```bash
ENV_FILE=<chemin-securise>/env.prod-client npm run sprint37:prod-client:smoke:strict
```

Cette commande est non destructive. Elle verifie:

- presence des documents et scripts de recette attendus;
- presence des scripts npm `sprint37:prod-client:smoke` et
  `sprint37:prod-client:smoke:strict`;
- absence de pattern destructif dans le script de smoke local;
- absence de `fetch`, methode HTTP mutante ou execution de commande dans le
  script local;
- presence et format des variables obligatoires;
- masquage des secrets dans le rapport.

Resultat attendu:

- `Statut: PASSED`;
- `Decision: PROD_CLIENT_SMOKE_PLAN_READY`;
- `Mode strict: oui`;
- `Env file: <chemin-securise>/env.prod-client (lu)`;
- aucune reserve sur les variables obligatoires.

Si la decision est `PROD_CLIENT_SMOKE_PLAN_BLOCKED`, corriger la configuration
ou le garde-fou signale avant toute suite. Si la decision reste
`PROD_CLIENT_SMOKE_PLAN_READY_WITH_RESERVES`, rattacher les reserves au ticket
client et ne pas lancer de smoke API cible sans arbitrage explicite.

## Preuve attendue

Preuve a rattacher au ticket de recette client, sans valeur secrete:

```text
Sprint: 38 Phase A
Date / heure:
Commit ou branche locale:
Owner Mediplan:
Owner client:
Chemin ENV_FILE utilise:
Commande:
Statut script:
Decision script:
Mode strict:
Env file lu: OUI / NON
Variables obligatoires: PASSED / details reserves
Secrets affiches en clair: NON
DB_SYNCHRONIZE:
Reserves restantes:
Accord smoke API cible: OUI / NON
Smoke API cible lance: NON
```

Extrait de sortie acceptable:

```text
- Statut: PASSED
- Decision: PROD_CLIENT_SMOKE_PLAN_READY
- Mode strict: oui
- Env file: <chemin-securise>/env.prod-client (lu)
```

## Validation locale de cette phase

Controle de format attendu avant cloture:

```bash
git diff --check
```

La validation stricte avec un vrai `ENV_FILE` production client reste a executer
par l'exploitation ou dans le shell cible autorise, jamais avec des secrets
committes.
