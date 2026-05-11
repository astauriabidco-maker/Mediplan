# Sprint 37 - Phase 1 - Environnement cible production client

Date: 2026-05-10
Sprint: passage vraie production client
Statut cible: `ENVIRONNEMENT_CIBLE_PROD_VALIDE_SOUS_RESERVE`

## Objectif

Valider l'environnement cible reel avant toute operation de production client:
URL, domaine, HTTPS, configuration, secrets, base de donnees, stockage, mails,
monitoring, comptes admin, donnees initiales et preuves attendues.

Cette phase ne deploie rien, ne migre rien et ne vaut pas go-live. Elle sert a
obtenir une photographie verifiable de l'environnement qui recevra la vraie
production client.

## Garde-fous

- Aucun push.
- Aucun reset DB.
- Aucune migration destructive.
- Aucune suppression massive.
- Aucun Docker compose up/down.
- Aucun seed, import massif ou purge de donnees.
- Aucun secret consigne dans le depot.
- Aucun vrai signataire invente.
- Aucune donnee client reelle importee sans decision formelle separee.
- Toute validation humaine doit etre rattachee a une personne reelle et datee.

## Perimetre cible

| Champ | Valeur attendue | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Client / tenant cible | Organisation cliente et identifiant tenant exacts. | `A_RENSEIGNER` | Reference contrat, ticket projet ou fiche environnement. |
| Nom environnement | Nom d'exploitation de la production client. | `A_RENSEIGNER` | Console hebergeur, inventaire ops ou CMDB. |
| Usage | Vraie production client, pas demo commerciale ni preprod. | `A_RENSEIGNER` | Mention explicite dans le dossier de mise en production. |
| Version candidate | Commit, build, image ou artefact cible identifie. | `A_RENSEIGNER` | SHA, artefact CI, tag candidat ou release note. |
| Fenetre de validation | Date et horaire de verification de l'environnement. | `A_RENSEIGNER` | Planning go-live ou ticket release. |
| Responsable operationnel | Personne reelle responsable de la validation environnement. | `A_RENSEIGNER` | Nom, role, date et canal de contact hors secret. |

## Checklist environnement cible

| Domaine | Controle attendu | Statut | Preuve attendue |
| --- | --- | --- | --- |
| URL applicative | URL finale de production client identifiee, stable et rattachee au bon tenant. | `A_VERIFIER` | URL, capture navigateur, reference DNS ou console plateforme. |
| Domaine | Domaine ou sous-domaine possede, delegue et pointe vers l'environnement cible. | `A_VERIFIER` | Enregistrement DNS, TTL, proprietaire, cible technique. |
| HTTPS | Certificat TLS valide, chaine complete, expiration connue, redirection HTTP vers HTTPS active. | `A_VERIFIER` | Rapport TLS, capture navigateur, date d'expiration certificat. |
| Variables | Variables requises presentes sur l'environnement cible, listees sans valeur sensible. | `A_VERIFIER` | Inventaire des cles, environnement, date, responsable. |
| Secrets hors repo | Secrets stockes dans coffre, plateforme secrets ou outil ops, jamais dans Git. | `A_VERIFIER` | Reference coffre, politique rotation, owner, dernier controle. |
| Base de donnees | Instance DB cible identifiee, acces limite, sauvegardes configurees, aucune action destructive lancee. | `A_VERIFIER` | Nom instance, region, droits, statut backup, responsable DBA/ops. |
| Migrations | Inventaire des migrations connu sans execution dans cette phase. | `A_VERIFIER` | Rapport `migration:show` ou revue DBA, sans `migration:run`. |
| Stockage | Bucket, volume ou stockage objet cible cree, droits minimaux et retention documentes. | `A_VERIFIER` | Nom logique, region, politique acces, retention, test lecture/ecriture controle. |
| Mails | Domaine expediteur, SMTP/provider, rebonds et destinataires operationnels valides sans spam client. | `A_VERIFIER` | Configuration provider, SPF/DKIM/DMARC, mail de test controle, logs non sensibles. |
| Monitoring endpoint | Endpoint live/ready et observabilite minimale accessibles depuis la supervision. | `A_VERIFIER` | URL endpoint, resultat horodate, dashboard ou alerte associee. |
| Logs applicatifs | Logs backend/frontend consultables par personnes habilitees, sans donnee sensible inutile. | `A_VERIFIER` | Capture outil logs, politique retention, controle masquage. |
| Alertes | Alertes disponibilite, erreurs 5xx, latence et saturation minimales configurees. | `A_VERIFIER` | Dashboard, regle alerte, canal notification, test ou simulation non destructive. |
| Comptes admin | Comptes administrateurs reels identifies, MFA si disponible, pas de compte partage permanent. | `A_VERIFIER` | Matrice comptes/roles, procedure activation, owner client/interne. |
| Donnees initiales | Donnees de demarrage autorisees, minimales et tracables, sans import massif non valide. | `A_VERIFIER` | Manifest donnees initiales, source, validation client, statut anonymisation si applicable. |
| Sauvegarde initiale | Backup ou snapshot initial disponible avant ouverture client. | `A_VERIFIER` | Reference backup, horodatage, retention, RPO/RTO cibles. |
| Support lancement | Canal incident, astreinte ou plage support et escalade reels identifies. | `A_VERIFIER` | Planning support, canal, contacts reels, procedure triage. |
| Acces d'urgence | Procedure break-glass documentee, limitee, journalisee et approuvee. | `A_VERIFIER` | Runbook acces urgence, approbateur reel, journal attendu. |
| Preuve attendue | Chaque controle critique possede une preuve reelle, datee et stockee hors depot si sensible. | `A_VERIFIER` | Dossier preuves, ticket release ou registre de validation. |

## Points bloquants

L'environnement cible doit rester `NOT_READY` si l'un des points suivants est
constate:

- URL finale inconnue, instable ou rattachee au mauvais tenant.
- Domaine non maitrise ou pointant vers un environnement non prevu.
- HTTPS absent, invalide, expire ou non force.
- Secret present dans le depot ou partage en clair dans un canal non autorise.
- DB cible non identifiee, sans backup, ou accessible trop largement.
- Stockage cible non identifie ou droits d'acces non maitrises.
- Mails sortants non controles, risque d'envoi client involontaire.
- Monitoring live/ready absent ou non accessible par la supervision.
- Compte admin partage, non trace ou cree sans owner reel.
- Donnees initiales non autorisees, non tracees ou contenant des donnees
  sensibles non validees.
- Absence de dossier de preuves ou de responsable reel.

## Preuves a collecter

| Preuve | Obligatoire | Sensibilite | Emplacement attendu |
| --- | --- | --- | --- |
| Capture URL HTTPS | Oui | Faible si aucune donnee visible | Dossier preuves ou ticket release. |
| Rapport DNS/TLS | Oui | Faible a moyenne | Dossier preuves ops. |
| Inventaire variables sans valeurs | Oui | Moyenne | Dossier restreint ou ticket ops. |
| Reference coffre secrets | Oui | Restreinte | Outil ops, jamais dans Git. |
| Fiche DB et backup | Oui | Restreinte | Dossier exploitation. |
| Fiche stockage | Oui | Restreinte | Dossier exploitation. |
| Preuve mails | Oui si mails actives | Moyenne | Console provider ou ticket test. |
| Endpoint monitoring | Oui | Faible a moyenne | Dashboard supervision ou capture horodatee. |
| Matrice comptes admin | Oui | Restreinte | Dossier habilitations. |
| Manifest donnees initiales | Oui | Selon contenu | Dossier client/restreint. |
| Registre reserves | Oui | Faible a moyenne | Ticket release ou document recette. |

## Commandes non destructives utiles

Commandes existantes pouvant aider a produire des preuves, a lancer uniquement
par la personne responsable et sur l'environnement explicitement cible:

```bash
npm run production:readiness -- --format json
npm run production:freeze -- --format json
npm run production:gates -- --format json
npm run production:signoffs -- --format json
npm run preprod:env:check
npm run ops:daily:postprod
npm run migration:show
git diff --check
```

Notes d'usage:

- `production:readiness` et `production:freeze` sont declares en dry-run dans
  `package.json`.
- `migration:show` sert seulement a inventorier les migrations; cette phase
  interdit `migration:run` et `migration:revert`.
- `preprod:env:check` ne doit etre utilise que si le fichier d'environnement
  pointe vers une cible de validation autorisee et sans exposer de secret.
- `ops:daily:postprod` effectue des controles de type GET/lecture; verifier les
  variables cible avant execution.

Commandes volontairement exclues:

- `git push`
- `git reset --hard`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run seed:demo`
- `npm run seed:hgd`
- `npm run demo:reset`
- `npm run preprod:compose:up`
- `npm run preprod:compose:down`
- `npm run preprod:compose:migrate`
- `npm run preprod:compose:seed`
- `npm run preprod:backup:restore`
- toute suppression massive, import massif ou reset de donnees

## Decision attendue

La decision par defaut reste:

```text
ENVIRONNEMENT_CIBLE_PROD_VALIDE_SOUS_RESERVE
```

`ENVIRONNEMENT_CIBLE_PROD_VALIDE` ne peut etre retenu que si chaque controle
critique est rattache a une preuve reelle, datee, non sensible ou stockee hors
depot, avec responsables reels identifies.

Cette phase ne donne pas l'autorisation de mise en production client. Le go-live
doit rester couvert par une decision separee, avec reserves, responsables et
signatures reelles.

## Validation locale

Validation non destructive attendue pour ce document:

```bash
git diff --check
```
