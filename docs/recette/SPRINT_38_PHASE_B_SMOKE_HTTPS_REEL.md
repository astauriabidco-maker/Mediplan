# Sprint 38 Phase B - Smoke HTTPS reel

Date: 2026-05-10
Statut cible: `SMOKE_HTTPS_REEL_READY_TO_EXECUTE`
Cadre: levee reserve production client, execution sur `BASE_URL` cible

## Objectif

Preparer l'execution controlee du smoke HTTPS reel sur l'environnement cible
client afin de lever la reserve Sprint 37 "Smoke cible non execute".

Cette procedure ne declenche aucune execution par defaut. Elle decrit les
prealables, les commandes a lancer uniquement apres accord explicite, les
endpoints autorises en lecture seule, les preuves attendues et les criteres
GO/NO-GO.

## Perimetre autorise

- Cible: `BASE_URL` HTTPS de production client.
- Configuration: variables du shell cible ou `ENV_FILE` hors depot.
- Identite: `API_TOKEN` smoke lecture seule ou compte smoke dedie.
- Donnees: consultation uniquement.
- Methodes HTTP autorisees pendant le smoke: `GET` uniquement, sauf login
  technique si aucun `API_TOKEN` n'est fourni.
- Sorties: rapport de smoke, captures ou exports non sensibles, decision
  GO/NO-GO.

## Garde-fous

- Aucun appel reseau sans accord explicite du responsable d'execution.
- Aucune mutation metier.
- Aucun `POST`, `PUT`, `PATCH` ou `DELETE` hors authentification smoke
  controlee.
- Aucune migration.
- Aucun `migration:revert`.
- Aucun seed, reset DB ou restauration backup.
- Aucun Docker compose up/down.
- Aucun push.
- Aucun secret dans les preuves rattachees.
- Aucun test de charge, fuzzing ou scan agressif.
- Arret immediat en cas de 5xx recurrent, latence anormale ou suspicion de
  mutation.

## Prealables obligatoires

| Controle | Attendu | Statut |
| --- | --- | --- |
| Accord client/ops | Fenetre d'execution datee et approuvee | `A_OBTENIR` |
| `BASE_URL` | URL HTTPS cible, sans slash final obligatoire | `A_VERIFIER` |
| `ENV_FILE` | Fichier hors depot contenant la configuration cible | `A_VERIFIER` |
| `API_TOKEN` | Token smoke lecture seule, privilegies minimaux | `A_VERIFIER` |
| Compte smoke | Compte dedie si login necessaire, role lecture seule | `A_VERIFIER` |
| Tenant | `TENANT_ID` client ou tenant smoke connu | `A_VERIFIER` |
| Fenetre | Plage `FROM` / `TO` courte pour limiter le volume lu | `A_VERIFIER` |
| Observabilite | Dashboard/logs accessibles pendant l'execution | `A_VERIFIER` |
| Rollback incident | Contact d'astreinte connu si alerte prod | `A_VERIFIER` |

## Preparation locale sans reseau

Ces commandes ne doivent pas appeler la cible HTTPS:

```bash
ENV_FILE=.env.prod-client npm run sprint37:prod-client:smoke:strict
git diff --check
```

Points a confirmer avant toute execution reseau:

- `BASE_URL` commence par `https://`.
- `NODE_ENV=production`.
- `DB_SYNCHRONIZE` est absent ou `false`.
- `JWT_SECRET`, `POSTGRES_PASSWORD` et eventuels tokens sont presents hors
  depot et masques dans les sorties.
- Le compte ou token smoke ne possede pas de droit d'ecriture metier.

## Variables d'execution

Exemple de fichier env hors depot:

```bash
NODE_ENV=production
BASE_URL=https://api.client.example
FRONTEND_URL=https://app.client.example
TENANT_ID=<tenant-smoke-ou-client>
API_TOKEN=<token-smoke-lecture-seule>
SMOKE_REQUIRE_AUTH=true
FROM=2026-05-10T00:00:00.000Z
TO=2026-05-10T23:59:59.999Z
REPORT_DIR=preprod-reports/sprint38-phase-b
```

Alternative si aucun token n'est fourni:

```bash
SMOKE_EMAIL=<compte-smoke-lecture-seule>
SMOKE_PASSWORD=<mot-de-passe-hors-depot>
SMOKE_REQUIRE_AUTH=true
```

Le login technique utilise `/api/auth/login`. Il doit etre valide par le
responsable d'execution car il s'agit d'un `POST` d'authentification, sans
mutation metier attendue.

## Endpoints lecture seule autorises

| Ordre | Endpoint | Auth | But | Critere attendu |
| ---: | --- | --- | --- | --- |
| 1 | `GET /api/health/live` | Non | Process API vivant | HTTP 200 |
| 2 | `GET /api/health/ready` | Non | Dependances pretes | HTTP 200 |
| 3 | `GET /api/planning/observability/health?tenantId=&from=&to=` | Oui | Sante planning | HTTP 200, JSON lisible |
| 4 | `GET /api/audit/verify?tenantId=` | Oui | Chaine audit consultable | HTTP 200, pas d'erreur d'integrite |
| 5 | `GET /api/tenant-backups/metrics?tenantId=&from=&to=` | Oui | Metriques backup visibles | HTTP 200, compteurs coherents |

Endpoints optionnels, uniquement si le responsable metier les demande:

| Endpoint | Condition |
| --- | --- |
| `GET /api/production-readiness/decision` | Verification decision prod sans ecriture |
| `GET /api/production-readiness/gates` | Lecture des gates de production |
| `GET /api/ops/slo` | Lecture SLO si module ops expose en prod |
| `GET /api/ops/alerts` | Lecture alertes si module ops expose en prod |

Tout endpoint non liste doit etre ajoute au PV d'execution avant lancement,
avec justification lecture seule.

## Execution smoke HTTPS reel

Execution automatisee existante, a lancer seulement apres accord explicite:

```bash
ENV_FILE=.env.prod-client npm run smoke:api:preprod
```

Execution avec repertoire de rapport dedie:

```bash
ENV_FILE=.env.prod-client \
REPORT_DIR=preprod-reports/sprint38-phase-b \
npm run smoke:api:preprod
```

Controle manuel minimal si le script n'est pas retenu, toujours apres accord
explicite:

```bash
curl --fail --silent --show-error "$BASE_URL/api/health/live"
curl --fail --silent --show-error "$BASE_URL/api/health/ready"
curl --fail --silent --show-error \
  -H "Authorization: Bearer $API_TOKEN" \
  "$BASE_URL/api/planning/observability/health?tenantId=$TENANT_ID&from=$FROM&to=$TO"
curl --fail --silent --show-error \
  -H "Authorization: Bearer $API_TOKEN" \
  "$BASE_URL/api/audit/verify?tenantId=$TENANT_ID"
curl --fail --silent --show-error \
  -H "Authorization: Bearer $API_TOKEN" \
  "$BASE_URL/api/tenant-backups/metrics?tenantId=$TENANT_ID&from=$FROM&to=$TO"
```

Les sorties brutes ne doivent pas etre collees dans un ticket si elles
contiennent des donnees personnelles, secrets, tokens, emails patients ou
identifiants sensibles. Conserver seulement le statut, les codes HTTP, la duree
et un extrait non sensible.

## Preuves a rattacher

```text
Sprint:
Phase:
Date/heure debut:
Date/heure fin:
Commit:
Branche:
Responsable execution:
Accord reseau externe: OUI / NON
BASE_URL:
ENV_FILE utilise: OUI / NON, chemin hors depot masque si necessaire
Mode auth: API_TOKEN / compte smoke / non authentifie
Compte smoke:
Tenant:
FROM:
TO:
Commande lancee:
Rapport genere:
Endpoints executes:
Codes HTTP:
Durees observees:
Erreurs:
Captures dashboards/logs:
Donnees sensibles masquees: OUI / NON
Decision proposee: GO / NO-GO
Signataire client/ops:
```

Preuves minimales acceptables:

- log de commande horodate avec secrets masques;
- fichier rapport markdown ou JSON produit par le smoke;
- capture dashboard ou logs montrant absence d'alerte critique pendant la
  fenetre;
- PV decision GO/NO-GO complete.

## Criteres GO

Decision `GO_SMOKE_HTTPS_REEL` si toutes les conditions suivantes sont vraies:

- `BASE_URL` est en HTTPS et correspond a la cible client validee.
- Les endpoints obligatoires repondent HTTP 2xx.
- Aucune erreur applicative bloquante dans le rapport.
- Aucune alerte critique nouvelle pendant la fenetre de smoke.
- Les durees restent compatibles avec l'usage normal attendu.
- Les preuves sont datees, rattachees au commit et sans secret.
- Le responsable client/ops accepte le resultat.

## Criteres NO-GO

Decision `NO_GO_SMOKE_HTTPS_REEL` si au moins une condition est vraie:

- Accord reseau ou fenetre d'execution absent.
- `BASE_URL` non HTTPS ou cible incertaine.
- Token/compte smoke absent alors que `SMOKE_REQUIRE_AUTH=true`.
- Un endpoint obligatoire retourne 401, 403, 404, 5xx ou timeout.
- Le login smoke echoue.
- Une mutation metier est detectee ou suspectee.
- Une alerte critique production apparait pendant l'execution.
- Une preuve contient un secret non masque.
- Le responsable client/ops refuse ou ajourne la decision.

## Plan de repli

En cas de NO-GO:

1. Arreter les appels immediatement.
2. Conserver rapport et horodatage sans relancer en boucle.
3. Notifier responsable Mediplan et responsable client/ops.
4. Qualifier l'incident: configuration, auth, disponibilite, donnees,
   observabilite ou securite.
5. Ouvrir une reserve Sprint 38 avec owner, impact, preuve et condition de
   levee.
6. Ne pas declarer `PROD_CLIENT_READY` tant qu'un nouveau smoke vert n'est pas
   obtenu ou qu'une exception signee n'est pas rattachee.

## PV de decision

| Champ | Valeur |
| --- | --- |
| Decision | `A_RENSEIGNER` |
| Date | `A_RENSEIGNER` |
| BASE_URL | `A_RENSEIGNER` |
| Commit | `A_RENSEIGNER` |
| Rapport | `A_RENSEIGNER` |
| Reserves restantes | `A_RENSEIGNER` |
| Responsable Mediplan | `A_RENSEIGNER` |
| Responsable client/ops | `A_RENSEIGNER` |

Decision possible:

- `GO_SMOKE_HTTPS_REEL`: reserve smoke HTTPS levee.
- `GO_SOUS_RESERVE`: smoke globalement vert mais preuve annexe manquante ou
  reserve mineure signee.
- `NO_GO_SMOKE_HTTPS_REEL`: reserve maintenue, production client non prete.

## Validation de cette procedure

Validation locale non destructive:

```bash
git diff --check
```

Commandes volontairement non lancees pendant la preparation de cette procedure:

- `npm run smoke:api:preprod`;
- toute commande `curl` vers `BASE_URL`;
- toute migration;
- tout seed ou reset;
- toute commande Docker;
- tout push.
