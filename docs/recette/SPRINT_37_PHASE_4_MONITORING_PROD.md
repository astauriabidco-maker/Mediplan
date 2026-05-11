# Sprint 37 Phase 4 - Monitoring prod client branche

Date: 2026-05-10
Contexte: passage vraie prod client
Statut cible: `MONITORING_PROD_CLIENT_SOUS_RESERVE`

## Objectif

Verifier que le monitoring de production client Mediplan est branche,
observable et exploitable avant et pendant la fenetre de passage en vraie
production client.

Ce document ne declenche aucun push, aucune migration destructive, aucun reset
DB, aucune restauration, aucune suppression massive et aucun changement
applicatif. Il sert a confirmer que les signaux de production, les alertes, les
preuves et les runbooks permettent de surveiller le client reel sans improviser.

## Garde-fous

- Aucun push.
- Aucun reset DB.
- Aucune migration destructive.
- Aucune suppression massive.
- Aucune restauration backup sur production client.
- Aucun test de charge non approuve sur production client.
- Aucun contournement ou silence manuel des alertes sans decision datee.
- Aucune donnee sensible copiee dans les preuves, captures ou tickets.
- Aucun seuil critique modifie pendant la fenetre sans validation explicite.

## Checklist monitoring prod client

| Domaine | Controle attendu | Statut Sprint 37 | Preuve attendue |
| --- | --- | --- | --- |
| Uptime | URL client, frontend et endpoint principal accessibles depuis un reseau externe controle. | `A_VERIFIER` | Capture dashboard uptime, horodatage, URL cible, statut HTTP. |
| API health | Endpoints `live` et `ready` ou equivalents verts sur l'environnement client. | `A_VERIFIER` | Capture health, resultat synthetique ou export monitoring. |
| Logs backend | Logs applicatifs backend consultables en lecture seule sur la fenetre prod client. | `A_VERIFIER` | Lien dashboard, requete sauvegardee, extrait anonymise. |
| Logs frontend | Erreurs navigateur/RUM visibles avec version, URL et client alias. | `A_VERIFIER` | Dashboard RUM, console capturee ou rapport erreurs frontend. |
| Alertes | Alertes critiques routees vers le bon canal et testees sans bruit excessif. | `A_VERIFIER` | Message test, canal, destinataire, horodatage, accusere reception. |
| Audit | Evenements audit critiques produits et consultables pour actions metier sensibles. | `A_VERIFIER` | Trace audit anonymisee, identifiant evenement, horodatage. |
| Backup status | Dernier backup production client connu, vert et compatible avec RPO cible. | `A_VERIFIER` | Dashboard backup, date dernier succes, RPO/RTO cibles. |
| Formulaire demo/contact | Formulaire demo/contact soumis, recu et trace sans perte ni donnee sensible inutile. | `A_VERIFIER` | ID soumission, email/CRM, log backend, statut de reception. |
| Erreurs 5xx | Taux 5xx API visible, seuil configure et absence de vague non expliquee. | `A_VERIFIER` | Graphe 5xx, filtre environnement client, fenetre observee. |
| Runbooks | Runbooks incident, alerte, backup et communication accessibles par l'astreinte. | `A_VERIFIER` | Liens runbooks, owners, derniere revue, canal escalade. |
| Seuils | Seuils uptime, latence, 5xx, frontend errors, backup et alertes documentes. | `A_VERIFIER` | Capture configuration alerte ou table seuils ci-dessous completee. |
| Preuves dashboard | Pack de captures dashboard horodatees rattache au dossier Sprint 37. | `A_VERIFIER` | Manifest preuves, liens internes, captures anonymisees. |

## Fenetre de surveillance

Fenetre recommandee pour un passage vraie prod client:

- `T-60 min`: verifier uptime, API health, logs, alertes, audit et backup
  status.
- `T-30 min`: confirmer owners, canaux d'escalade, runbooks et seuils actifs.
- `T0`: demarrer la surveillance renforcee avec un owner monitoring nomme.
- `T+15 min`: verifier erreurs 5xx, logs backend/frontend et parcours critique.
- `T+60 min`: consolider alertes, latence, formulaire demo/contact et audit.
- `T+24 h`: confirmer absence d'erreur differee, backup post-fenetre et tickets
  ouverts.
- `T+72 h`: clore la surveillance renforcee ou prolonger avec decision datee.

## Seuils prod client a confirmer

| Signal | Seuil cible | Severite | Action attendue | Preuve |
| --- | ---: | --- | --- | --- |
| Uptime public | `>= 99.5%` sur fenetre observee | P1 si indisponibilite confirmee | Diagnostiquer, informer, escalader. | Dashboard uptime. |
| API health ready | `100%` vert hors maintenance annoncee | P1 si rouge persistant | Ouvrir incident et qualifier impact client. | Healthcheck horodate. |
| Taux 5xx API | `< 1%` sur 15 min | P1 si parcours critique bloque, P2 sinon | Filtrer endpoint, correler logs, ouvrir ticket. | Graphe 5xx et logs. |
| Latence API p95 | `< 1500 ms` sur parcours critique | P2 | Identifier endpoint, charge et degradation. | Dashboard APM/API. |
| Erreurs frontend | `0` erreur bloquante sur parcours client | P1/P2 selon impact | Reproduire navigateur, capturer version, escalader. | RUM ou capture console. |
| Alertes critiques | Reception `< 5 min` | P1 si canal muet | Tester canal secondaire et informer owner. | Accuse reception. |
| Backup | Dernier succes `< 24 h` ou RPO contractuel | P1 si inconnu/rouge | Escalader exploitation avant nouvelle action risquee. | Dashboard backup. |
| Audit | Trace produite `< 5 min` apres action sensible | P2 | Verifier ingestion et horodatage. | Recherche audit. |
| Formulaire contact | Reception `< 10 min` | P2 | Verifier soumission, mail/CRM, logs backend. | ID formulaire. |

Les valeurs ci-dessus sont des seuils de recette par defaut. Toute valeur
contractuelle client plus stricte doit remplacer le seuil cible et etre datee
dans la preuve.

## Runbooks requis

| Runbook | Declencheur | Owner | Delai cible | Preuve de disponibilite |
| --- | --- | --- | ---: | --- |
| Incident P1 indisponibilite | Uptime rouge, API health rouge ou parcours client bloque. | `A_RENSEIGNER` | 5 min | Lien runbook, canal crise, dernier test. |
| Erreurs 5xx | Taux 5xx au-dessus du seuil ou vague sur endpoint critique. | `A_RENSEIGNER` | 10 min | Requete logs, dashboard 5xx, procedure triage. |
| Erreurs frontend | Erreur JS bloquante ou augmentation RUM non expliquee. | `A_RENSEIGNER` | 15 min | Procedure reproduction, capture navigateur, owner frontend. |
| Backup status rouge | Dernier backup inconnu, en erreur ou hors RPO. | `A_RENSEIGNER` | 15 min | Procedure escalation exploitation, contact backup. |
| Audit incomplet | Action sensible sans trace audit exploitable. | `A_RENSEIGNER` | 30 min | Procedure verification audit, owner conformite. |
| Formulaire demo/contact | Soumission non recue ou anomalie conversion. | `A_RENSEIGNER` | 30 min | Procedure replay non destructive, owner commercial/support. |
| Communication client | Incident P1/P2 confirme ou risque d'impact client. | `A_RENSEIGNER` | 30 min | Modele message, valideur, canal client. |

## Preuves dashboard a rattacher

Chaque preuve doit etre horodatee, limitee au perimetre client autorise et
anonymisee si elle sort de l'espace restreint.

| Preuve | Obligatoire | Contenu minimal | Reference |
| --- | --- | --- | --- |
| Dashboard uptime | Oui | URL cible, statut, fenetre, horodatage. | `S37-P4-uptime-<date>` |
| Dashboard API health | Oui | `live`/`ready` ou equivalent, environnement, version. | `S37-P4-api-health-<date>` |
| Dashboard logs backend | Oui | Filtre client/env, absence ou presence erreurs, extrait anonymise. | `S37-P4-backend-logs-<date>` |
| Dashboard logs frontend/RUM | Oui | Version frontend, erreurs JS, navigateur si disponible. | `S37-P4-frontend-logs-<date>` |
| Dashboard alertes | Oui | Regles actives, dernier test, canal et destinataire. | `S37-P4-alertes-<date>` |
| Dashboard 5xx | Oui | Taux, endpoint, fenetre, seuil. | `S37-P4-5xx-<date>` |
| Dashboard backup | Oui | Dernier succes, RPO/RTO, statut. | `S37-P4-backup-<date>` |
| Audit event sample | Oui | Evenement test ou action sensible autorisee, horodatage, resultat. | `S37-P4-audit-<date>` |
| Formulaire contact | Si actif | ID soumission, reception, trace backend, statut CRM/email. | `S37-P4-contact-<date>` |
| Synthese post-fenetre | Oui | Incidents, alertes, anomalies, reserves, decision. | `S37-P4-synthese-<date>` |

## Criteres GO / NO-GO monitoring

### GO prod client sous surveillance

Le passage peut rester ouvert sous surveillance si tous les points suivants
sont vrais:

- uptime et API health verts;
- logs backend et frontend consultables en lecture seule;
- alertes critiques recues par le bon canal;
- taux 5xx sous seuil ou anomalies expliquees et non bloquantes;
- backup status connu et vert;
- audit des actions sensibles consultable;
- formulaire demo/contact verifie si actif sur le parcours client;
- runbooks et owners reels disponibles;
- captures dashboard rattachees au dossier de preuves;
- aucune donnee sensible exposee dans les preuves partageables.

### NO-GO ou suspension

Suspendre la fenetre, reporter ou basculer en mode incident si un point
bloquant est observe:

- application ou API indisponible pour le client;
- healthcheck rouge persistant sans explication controlee;
- vague 5xx sur parcours critique;
- erreur frontend bloquante pour le client;
- logs indisponibles pour diagnostiquer;
- alertes critiques non recues ou mauvais canal;
- backup status inconnu, rouge ou hors RPO non accepte;
- audit absent pour une action sensible attendue;
- formulaire demo/contact annonce mais non fonctionnel;
- runbook P1 introuvable ou owner absent;
- preuve dashboard impossible a produire;
- donnee sensible exposee dans logs, captures ou ticket.

## Synthese de cloture

```text
Date:
Client alias:
Environnement:
Version / commit:
Fenetre observee:
Owner monitoring:
Owner backend:
Owner frontend:
Owner support/client:
Uptime:
API health:
Taux 5xx:
Logs backend:
Logs frontend:
Alertes:
Audit:
Backup status:
Formulaire demo/contact:
Runbooks accessibles:
Preuves dashboard rattachees:
Incidents ouverts:
Reserves:
Decision: MONITORING_PROD_CLIENT_OK / MONITORING_PROD_CLIENT_SOUS_RESERVE / MONITORING_PROD_CLIENT_NO_GO
Motif:
Prochaine verification:
```

## Validation locale

Validation documentaire non destructive a conserver:

```bash
git diff --check
```

Commandes volontairement exclues de cette phase:

- `git push`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run seed:demo`
- `npm run demo:reset`
- toute migration destructive;
- toute suppression massive;
- tout reset DB;
- toute restauration backup sur production client;
- tout deploiement ou changement applicatif improvise.
