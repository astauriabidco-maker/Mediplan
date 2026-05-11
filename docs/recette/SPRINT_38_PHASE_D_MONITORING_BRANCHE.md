# Sprint 38 Phase D - PV branchement monitoring reel

Date: 2026-05-10
Contexte: levee des reserves production client
Statut cible: `MONITORING_REEL_BRANCHE_SOUS_RESERVE_PREUVES`

## Objectif

Formaliser le proces-verbal de branchement du monitoring reel Mediplan pour la
production client, afin de lever la reserve Sprint 37 sur le monitoring avant
decision de cloture Sprint 38.

Ce document ne declenche aucune mutation applicative, aucun push, aucune
migration, aucun reset DB, aucune restauration backup et aucun test destructif.
Il liste les signaux reellement attendus, les destinataires d'alerte, les liens
ou captures de dashboards a rattacher, et le resultat du test d'alerte.

## Garde-fous

- Aucun push.
- Aucune migration destructive.
- Aucun reset DB.
- Aucune restauration backup sur production client.
- Aucun test de charge sur production client.
- Aucune modification de seuil sans validation datee.
- Aucun masquage ou silence manuel des alertes pour obtenir un statut vert.
- Aucune donnee sensible dans les captures, logs, tickets ou exports partages.

## Perimetre branche

| Element | Valeur PV |
| --- | --- |
| Client alias | `A_RENSEIGNER` |
| Environnement | `production-client` |
| URL publique | `A_RENSEIGNER` |
| API cible | `A_RENSEIGNER` |
| Version / commit surveille | `A_RENSEIGNER` |
| Fenetre de verification | `A_RENSEIGNER` |
| Owner monitoring | `A_RENSEIGNER` |
| Owner astreinte technique | `A_RENSEIGNER` |
| Owner relation client | `A_RENSEIGNER` |

## PV de branchement

| Signal | Branchement attendu | Statut PV | Preuve a rattacher |
| --- | --- | --- | --- |
| Uptime public | Sonde active sur l'URL client publique avec historique et seuil d'indisponibilite. | `A_PROUVER` | Lien dashboard uptime ou capture horodatee. |
| API health | Healthchecks `live` et `ready` ou equivalents branches sur l'API de production client. | `A_PROUVER` | Lien dashboard API health, statut HTTP, horodatage. |
| Logs backend | Logs applicatifs consultables en lecture seule avec filtre environnement/client. | `A_PROUVER` | Lien requete sauvegardee ou capture anonymisee. |
| Logs frontend/RUM | Erreurs navigateur visibles avec version frontend, route et client alias. | `A_PROUVER` | Lien RUM, capture erreurs frontend ou rapport zero erreur. |
| Alertes 5xx | Regle active sur taux ou volume 5xx API, avec seuil et routage confirmes. | `A_PROUVER` | Capture regle, graphe 5xx, dernier etat. |
| Audit | Evenements audit critiques recherches et visibles apres action sensible autorisee. | `A_PROUVER` | Trace audit anonymisee, identifiant evenement, horodatage. |
| Backup status | Statut dernier backup production client visible et compatible RPO. | `A_PROUVER` | Dashboard backup, dernier succes, RPO/RTO, horodatage. |
| Formulaire `/demo` | Soumission test non sensible tracee de bout en bout si la route est exposee. | `A_PROUVER` | ID soumission, statut reception, log backend masque. |
| Alerting global | Canal d'alerte production client actif et teste sans bruit excessif. | `A_PROUVER` | Message test, destinataires, accuse reception. |

## Seuils actifs attendus

| Signal | Seuil de surveillance | Severite | Action attendue |
| --- | ---: | --- | --- |
| Uptime public | Indisponibilite confirmee ou taux sous SLA client | P1 | Ouvrir incident, qualifier impact, informer owner client. |
| API health ready | Rouge persistant hors maintenance annoncee | P1 | Diagnostiquer API, verifier dependances, escalader. |
| Taux 5xx API | `>= 1%` sur 15 min ou vague sur endpoint critique | P1/P2 | Correlier logs, identifier endpoint, ouvrir ticket. |
| Latence API p95 | `>= 1500 ms` sur parcours critique | P2 | Qualifier degradation et surveiller tendance. |
| Erreurs frontend | Erreur bloquante sur parcours client ou `/demo` | P1/P2 | Reproduire navigateur, capturer version, escalader frontend. |
| Backup status | Dernier succes hors RPO ou statut inconnu/rouge | P1 | Escalader exploitation avant action risquee. |
| Audit | Trace absente apres action sensible attendue | P2 | Verifier ingestion audit et horodatage. |
| Formulaire `/demo` | Soumission non recue sous 10 min | P2 | Verifier API, routage, logs et destination lead. |

Les seuils contractuels client priment sur les valeurs par defaut ci-dessus et
doivent etre reportes dans les captures ou liens de configuration.

## Destinataires et routage

| Canal | Usage | Destinataires attendus | Statut PV |
| --- | --- | --- | --- |
| Canal incident P1 | Indisponibilite, health rouge, 5xx bloquants. | `A_RENSEIGNER` | `A_PROUVER` |
| Canal exploitation | Backup, infrastructure, dependances techniques. | `A_RENSEIGNER` | `A_PROUVER` |
| Canal applicatif | Backend, frontend, formulaire `/demo`, audit. | `A_RENSEIGNER` | `A_PROUVER` |
| Canal relation client | Communication externe si impact confirme. | `A_RENSEIGNER` | `A_PROUVER` |
| Escalade secondaire | Relais si canal principal muet sous 5 min. | `A_RENSEIGNER` | `A_PROUVER` |

Chaque destinataire doit etre une personne, une equipe ou un canal reellement
joignable pendant la fenetre de surveillance. Les alias generiques sont
acceptes uniquement si leur ownership est documente.

## Captures et liens dashboards

| Reference | Dashboard / preuve | Lien ou emplacement | Horodatage | Commentaire |
| --- | --- | --- | --- | --- |
| `S38-D-UPTIME` | Uptime public production client | `A_RENSEIGNER` | `A_RENSEIGNER` | URL cible visible, donnees sensibles masquees. |
| `S38-D-API-HEALTH` | API health `live` / `ready` | `A_RENSEIGNER` | `A_RENSEIGNER` | Statut vert ou anomalie expliquee. |
| `S38-D-BACKEND-LOGS` | Logs backend filtres prod client | `A_RENSEIGNER` | `A_RENSEIGNER` | Extrait anonymise ou requete sauvegardee. |
| `S38-D-FRONTEND-RUM` | Logs frontend / RUM | `A_RENSEIGNER` | `A_RENSEIGNER` | Version frontend et route visibles. |
| `S38-D-5XX` | Alertes et metriques 5xx | `A_RENSEIGNER` | `A_RENSEIGNER` | Seuil, fenetre, dernier etat. |
| `S38-D-AUDIT` | Recherche audit evenement sensible | `A_RENSEIGNER` | `A_RENSEIGNER` | Identifiant evenement masque si necessaire. |
| `S38-D-BACKUP` | Backup status production client | `A_RENSEIGNER` | `A_RENSEIGNER` | Dernier succes, RPO/RTO visibles. |
| `S38-D-DEMO` | Parcours formulaire `/demo` | `A_RENSEIGNER` | `A_RENSEIGNER` | ID soumission non sensible et reception. |
| `S38-D-ALERTE-TEST` | Test d'alerte monitoring | `A_RENSEIGNER` | `A_RENSEIGNER` | Message emis, recu, accuse. |

## Test d'alerte

| Champ | Valeur |
| --- | --- |
| Type de test | `A_RENSEIGNER` |
| Methode non destructive | `A_RENSEIGNER` |
| Signal declenche | `A_RENSEIGNER` |
| Horodatage emission | `A_RENSEIGNER` |
| Horodatage reception | `A_RENSEIGNER` |
| Canal de reception | `A_RENSEIGNER` |
| Destinataires touches | `A_RENSEIGNER` |
| Accuse reception | `A_RENSEIGNER` |
| Delai reception | `A_RENSEIGNER` |
| Resultat | `A_RENSEIGNER` |
| Ticket ou preuve | `A_RENSEIGNER` |

Critere de reussite: l'alerte test est recue sur le canal attendu en moins de
5 minutes, sans mutation destructive, sans notification a un mauvais groupe et
avec une preuve horodatee rattachee au dossier Sprint 38.

## Formulaire `/demo`

| Controle | Attendu | Statut PV | Preuve |
| --- | --- | --- | --- |
| Route exposee | `/demo` accessible selon le parcours public client. | `A_PROUVER` | Capture route ou statut HTTP. |
| Soumission test | Payload non sensible soumis avec consentement de test. | `A_PROUVER` | ID soumission masque. |
| Reception | Destination lead, email ou CRM recoit la demande. | `A_PROUVER` | Capture reception ou entree CRM anonymisee. |
| Logs | Trace backend consultable sans donnees personnelles inutiles. | `A_PROUVER` | Requete logs, correlation id. |
| Erreurs | Aucune erreur 4xx/5xx inattendue pendant le test. | `A_PROUVER` | Graphe API ou logs filtres. |

## Decision Phase D

Decision recommandee tant que les preuves ne sont pas rattachees:
`MONITORING_REEL_BRANCHE_SOUS_RESERVE_PREUVES`.

La reserve peut etre levee vers `MONITORING_REEL_BRANCHE_OK` uniquement si les
conditions suivantes sont vraies:

- uptime public branche et visible;
- API health branche et vert;
- logs backend et frontend consultables en lecture seule;
- alerte 5xx active avec seuil confirme;
- destinataires reels confirmes pour P1, exploitation, applicatif et relation
  client;
- test d'alerte recu et accuse dans le delai cible;
- audit consultable sur un evenement autorise;
- backup status connu, vert et dans le RPO attendu;
- formulaire `/demo` verifie si expose en production client;
- captures ou liens dashboards rattaches au dossier Sprint 38;
- aucune donnee sensible exposee dans les preuves.

## Synthese de cloture

```text
Date cloture:
Client alias:
Environnement:
Version / commit:
Fenetre observee:
Owner monitoring:
Uptime:
API health:
Logs backend:
Logs frontend/RUM:
Alertes 5xx:
Audit:
Backup status:
Formulaire /demo:
Destinataires confirmes:
Test alerte:
Captures/liens dashboards:
Incidents ouverts:
Reserves restantes:
Decision: MONITORING_REEL_BRANCHE_OK / MONITORING_REEL_BRANCHE_SOUS_RESERVE_PREUVES / MONITORING_REEL_BRANCHE_NO_GO
Motif:
Prochaine verification:
```

## Validation locale

Validation documentaire non destructive:

```bash
git diff --check
```

