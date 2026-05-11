# Sprint 37 Phase 2 - Backup / restore production client

Date: 2026-05-10
Statut cible: `PROD_CLIENT_NO_GO_TANT_QUE_RESTORE_NON_PROUVE`
Cadre: passage vraie production client, preuve backup/restore reelle attendue

## Objectif

Verifier qu'un backup production client peut etre exporte, restaure dans un
environnement isole et compare a la source avant toute decision de production.

Cette phase ne lance pas la restauration. Elle definit la procedure, les
preuves attendues, les responsabilites, les seuils RPO/RTO et la regle de
decision. En l'absence de restore reel prouve, la decision doit rester
`NO_GO`.

## Garde-fous

- Aucun push.
- Aucune suppression massive.
- Aucune migration destructive.
- Aucun reset DB.
- Aucune restauration lancee depuis ce document.
- Aucune restauration sur l'environnement production source.
- Aucune exposition de donnees client hors perimetre autorise.
- Aucun export de secret dans le depot, les logs ou les captures partageables.
- Aucun `GO_PROD_CLIENT` sans preuve de restauration isolee et comparaison
  documentee.

## Perimetre

| Element | Attendu | Hors perimetre |
| --- | --- | --- |
| Source | Base production client ou dump candidat identifie par date, environnement et responsable. | Modification de donnees source. |
| Export | Backup complet, horodate, chiffre si requis, stocke dans l'emplacement approuve. | Commit du backup dans le depot. |
| Restore | Restauration dans un environnement isole, non connecte aux flux clients. | Restore direct en production. |
| Comparaison | Compteurs metier et techniques compares entre source/export et cible restauree. | Validation fonctionnelle exhaustive. |
| Mesure | RPO et RTO observes sur la fenetre de test. | Engagement SLA contractuel non signe. |
| Decision | `GO`, `GO_SOUS_RESERVE` ou `NO_GO` avec preuves rattachees. | Decision implicite ou orale. |

## Procedure attendue

### 1. Preparation

| Controle | Attendu | Preuve |
| --- | --- | --- |
| Fenetre | Date, heure de debut, heure de fin cible et impact confirme. | Ticket operation, validation owner. |
| Source | Environnement source, version applicative, commit et schema notes. | Capture ou rapport lecture seule. |
| Cible isolee | Environnement restore separe, acces restreints, aucun webhook ou flux sortant actif. | Fiche environnement, controles reseau. |
| Roles | Responsable export, responsable restore, observateur, valideur metier identifies. | Liste nominative datee. |
| Secrets | Emplacement coffre et mode d'injection confirmes hors depot. | Attestation ops, pas de valeur secrete. |
| Critere arret | Conditions d'abandon et rollback de la procedure de test connues. | Runbook operation. |

### 2. Export backup

| Etape | Action attendue | Preuve attendue |
| --- | --- | --- |
| Gel logique | Noter l'heure de reference et le dernier evenement inclus si applicable. | Horodatage UTC/local, reference transaction ou binlog si disponible. |
| Export | Executer l'export approuve pour la base et les objets associes. | Commande ou job lance, sans secret visible. |
| Integrite | Calculer taille, checksum et statut de fin d'export. | Taille, checksum, code retour, logs expurges. |
| Stockage | Deposer le backup dans l'emplacement approuve avec retention connue. | URI interne ou reference coffre, jamais le fichier dans Git. |
| Acces | Verifier que seuls les roles autorises peuvent lire le backup. | Capture permissions ou attestation responsable. |

### 3. Restauration isolee

La restauration reelle doit etre effectuee uniquement pendant la fenetre
validee et sur l'environnement isole. Elle n'est pas lancee par ce document.

| Etape | Action attendue | Preuve attendue |
| --- | --- | --- |
| Provisioning | Creer ou selectionner une cible jetable, separee de la production. | Identifiant environnement, region, taille, owner. |
| Desactivation flux | Couper notifications, webhooks, integrations et jobs externes. | Liste des flux desactives, capture configuration. |
| Restore | Restaurer le backup exporte sur la cible isolee. | Heure debut/fin, commande ou job, code retour, logs expurges. |
| Migrations | Confirmer qu'aucune migration destructive n'a ete lancee. | `migration:show`, rapport DBA ou attestation technique. |
| Demarrage controle | Demarrer uniquement les composants necessaires aux controles. | Liste services, URL interne restreinte si applicable. |
| Nettoyage | Detruire ou verrouiller l'environnement apres validation selon politique. | Ticket de cloture ou preuve de verrouillage. |

### 4. Comparaison compteurs

Les compteurs doivent etre releves sur la source de reference et sur la cible
restauree avec les memes requetes ou le meme outil.

| Domaine | Compteur minimal | Resultat attendu |
| --- | --- | --- |
| Tenants / organisations | Nombre total, actifs, suspendus si applicable. | Identique a la source au point de reference. |
| Utilisateurs / agents | Nombre total, actifs, roles critiques. | Identique ou ecart justifie par RPO. |
| Donnees planning | Nombre d'evenements, affectations, periodes critiques. | Identique ou ecart justifie par RPO. |
| Actions operationnelles | Nombre d'actions ouvertes, en cours, resolues. | Identique ou ecart justifie par RPO. |
| Audit | Nombre d'evenements audit sur la fenetre controlee. | Identique ou ecart justifie par RPO. |
| Notifications / jobs | Compteurs stockes uniquement, aucun envoi externe. | Identique, aucun effet de bord. |
| Tables techniques | Nombre de tables, contraintes, index critiques. | Identique, aucune table manquante. |

Modele de releve a rattacher au ticket:

```text
Reference preuve:
Date:
Source environnement:
Cible restore:
Backup utilise:
Heure point de reference:
Compteur:
Valeur source:
Valeur cible restauree:
Ecart:
Justification ecart:
Decision compteur: OK / A_EXPLIQUER / BLOQUANT
```

## RPO / RTO

| Mesure | Definition | Cible avant GO | Preuve attendue |
| --- | --- | --- | --- |
| RPO observe | Ecart maximal entre le point de reference production et les donnees restaurees. | A definir contractuellement; `A_VERIFIER` tant que non signe. | Horodatage backup, dernier evenement inclus, ecarts compteurs. |
| RTO observe | Duree entre debut de restauration et environnement verifiable. | A definir contractuellement; `A_VERIFIER` tant que non signe. | Heure debut restore, heure fin restore, heure controles termines. |
| Duree export | Temps necessaire pour produire un backup integre. | Compatible avec fenetre operationnelle. | Logs expurges, timestamps. |
| Duree verification | Temps necessaire pour comparer les compteurs minimaux. | Compatible avec decision de reprise. | Rapport comparaison date. |

Sans cible RPO/RTO acceptee par les responsables reels, la decision maximale
autorisee est `GO_SOUS_RESERVE`, jamais `GO_PROD_CLIENT`.

## Responsabilites

| Role | Responsabilite | Decision attendue |
| --- | --- | --- |
| Responsable Ops | Planifie la fenetre, coordonne export, restore isole et collecte preuves. | `GO`, `GO_SOUS_RESERVE` ou `NO_GO`. |
| Responsable technique | Valide commandes, version, schema, absence de migration destructive et integrite technique. | `GO`, `GO_SOUS_RESERVE` ou `NO_GO`. |
| Responsable securite / conformite | Valide stockage, acces, chiffrement, anonymisation des preuves et destruction/verrouillage cible. | `GO`, `GO_SOUS_RESERVE` ou `NO_GO`. |
| Valideur metier client | Confirme que les compteurs metier minimaux couvrent les donnees critiques. | `GO`, `GO_SOUS_RESERVE` ou `NO_GO`. |
| Observateur recette | Note les horodatages, ecarts, captures et references sans manipuler les donnees. | Avis documentaire. |

Les noms reels, fonctions, dates et decisions doivent etre ajoutes dans le
ticket de preuve. Aucun signataire placeholder ne vaut validation production.

## Preuves obligatoires

| Preuve | Obligatoire | Statut attendu |
| --- | --- | --- |
| Ticket operation backup/restore | Oui | Date, perimetre, environnement, owners reels. |
| Rapport export | Oui | Backup cree, integrite prouvee, emplacement approuve. |
| Rapport restore isole | Oui | Restore execute hors production, logs expurges, code retour. |
| Rapport comparaison compteurs | Oui | Source et cible comparees, ecarts justifies. |
| Mesures RPO/RTO | Oui | Valeurs observees, cible acceptee ou reserve explicite. |
| Controle securite backup | Oui | Acces, chiffrement, retention, absence de fuite secret. |
| Attestation absence effet de bord | Oui | Aucun flux externe declenche depuis la cible. |
| Decision nominative | Oui | Responsables reels, date, statut, reserves. |

## NO-GO automatique

La decision doit etre `NO_GO` si au moins une condition est vraie:

- aucun restore reel n'a ete execute en environnement isole;
- le restore a ete execute sur la production source;
- les compteurs minimaux ne sont pas compares;
- un ecart compteur reste inexplique sur une donnee critique;
- RPO ou RTO observe depasse la cible acceptee sans derogation formelle;
- le backup n'a pas de preuve d'integrite;
- les logs ou captures exposent des secrets ou donnees sensibles non autorisees;
- un flux externe a ete declenche depuis l'environnement restaure;
- une migration destructive, un reset DB ou une suppression massive a ete lance;
- les responsables reels ne sont pas identifies.

## Decision de cloture

```text
Date:
Client / tenant:
Version / commit:
Environnement source:
Environnement restore isole:
Backup reference:
Heure point de reference:
RPO observe:
RTO observe:
Compteurs compares:
Ecarts ouverts:
Incidents pendant restore:
Responsable Ops:
Responsable technique:
Responsable securite / conformite:
Valideur metier client:
Decision: GO_PROD_CLIENT / GO_SOUS_RESERVE / NO_GO
Motif:
Reserves:
Preuves rattachees:
Restore reel prouve: OUI / NON
```

Decision par defaut Sprint 37 Phase 2:
`PROD_CLIENT_NO_GO_TANT_QUE_RESTORE_NON_PROUVE`.

## Validation locale

Commande non destructive lancee pour ce document:

```bash
git diff --check
```

Commandes volontairement non lancees:

- toute commande de restore;
- toute commande de migration;
- toute commande de reset DB;
- toute commande de suppression massive;
- toute commande de push.
