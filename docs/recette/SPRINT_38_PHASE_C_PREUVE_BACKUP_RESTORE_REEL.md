# Sprint 38 Phase C - Preuve backup / restore reel

Date: 2026-05-10
Statut cible: `RESERVE_PROD_CLIENT_A_LEVER_PAR_PREUVE_REELLE`
Cadre: Sprint 38, levee des reserves production client

## Objectif

Constituer la preuve formelle qu'un export production client peut etre restaure
dans un environnement isole, puis compare a la source avec des compteurs
documentes avant decision.

Ce document ne lance aucun restore. Il fournit la checklist de preuve reelle et
le formulaire de resultat a completer par les responsables operationnels apres
execution controlee hors production source.

## Garde-fous Sprint 38

- Aucun restore lance depuis ce repository.
- Aucun restore sur l'environnement production source.
- Aucun reset DB.
- Aucune migration.
- Aucune suppression massive.
- Aucun secret, dump, backup ou donnee client brute dans Git.
- Aucun signataire, operateur ou resultat invente.
- Toute preuve doit etre rattachee a un ticket operationnel ou a un coffre
  documentaire approuve.

## Perimetre de preuve

| Domaine | Preuve attendue | Condition de levee |
| --- | --- | --- |
| Export | Backup produit depuis la source referencee, horodate, avec taille et hash. | Export termine sans erreur, artefact stocke hors Git. |
| Restore isole | Backup restaure sur une cible separee de la production et des flux externes. | Restore execute hors production source, sans effet de bord. |
| Comparaison compteurs | Compteurs source et cible releves avec les memes requetes ou le meme outil. | Ecarts nuls ou justifies par RPO accepte. |
| RPO / RTO | RPO et RTO observes, compares aux cibles acceptees. | Valeurs dans les seuils ou reserve formelle. |
| Hash artefact | Hash de l'artefact backup et, si applicable, hash du rapport de preuve. | Hash reproductible et rattache au ticket. |
| Operateur | Operateur export, operateur restore, observateur et valideur identifies. | Noms reels, roles, dates et decisions documentes. |
| Decision | Decision nominative de levee, reserve ou blocage. | `GO`, `GO_SOUS_RESERVE` ou `NO_GO` explicite. |

## Checklist de preuve reelle

### 1. Preparation

| Controle | A completer | Statut |
| --- | --- | --- |
| Ticket operationnel ouvert et reference | Numero / lien ticket: | `A_RENSEIGNER` |
| Fenetre validee | Date, heure debut, heure fin, fuseau: | `A_RENSEIGNER` |
| Source identifiee | Environnement, client / tenant, version, commit: | `A_RENSEIGNER` |
| Cible isolee identifiee | Nom cible, region, reseau, owner: | `A_RENSEIGNER` |
| Flux sortants neutralises | Notifications, webhooks, jobs externes, emails: | `A_RENSEIGNER` |
| Secrets hors depot | Coffre / mode d'injection sans valeur exposee: | `A_RENSEIGNER` |
| Critere d'arret connu | Conditions d'abandon de la procedure: | `A_RENSEIGNER` |

### 2. Export

| Controle | A completer | Statut |
| --- | --- | --- |
| Heure point de reference | UTC et heure locale: | `A_RENSEIGNER` |
| Commande ou job d'export | Reference expurgee, sans secret: | `A_RENSEIGNER` |
| Heure debut export | Horodatage: | `A_RENSEIGNER` |
| Heure fin export | Horodatage: | `A_RENSEIGNER` |
| Code retour / statut job | Succes / echec / avertissements: | `A_RENSEIGNER` |
| Taille artefact | Valeur et unite: | `A_RENSEIGNER` |
| Hash artefact backup | Algorithme et valeur: | `A_RENSEIGNER` |
| Emplacement artefact | URI interne ou reference coffre, jamais le fichier: | `A_RENSEIGNER` |
| Operateur export | Nom, fonction, contact interne: | `A_RENSEIGNER` |

### 3. Restore isole

| Controle | A completer | Statut |
| --- | --- | --- |
| Cible confirmee non production | Preuve reseau / environnement: | `A_RENSEIGNER` |
| Absence de migration | Preuve `migration:show`, rapport DBA ou attestation: | `A_RENSEIGNER` |
| Absence de reset DB | Attestation operateur: | `A_RENSEIGNER` |
| Heure debut restore | Horodatage: | `A_RENSEIGNER` |
| Heure fin restore | Horodatage: | `A_RENSEIGNER` |
| Code retour / statut restore | Succes / echec / avertissements: | `A_RENSEIGNER` |
| Logs expurges rattaches | Reference preuve: | `A_RENSEIGNER` |
| Effets de bord controles | Aucun email, webhook, notification ou job externe: | `A_RENSEIGNER` |
| Operateur restore | Nom, fonction, contact interne: | `A_RENSEIGNER` |

### 4. Comparaison compteurs

| Domaine | Compteur minimal | Valeur source | Valeur cible restauree | Ecart | Decision |
| --- | --- | --- | --- | --- | --- |
| Tenants / organisations | Total, actifs, suspendus si applicable |  |  |  | `A_RENSEIGNER` |
| Utilisateurs / agents | Total, actifs, roles critiques |  |  |  | `A_RENSEIGNER` |
| Planning | Evenements, affectations, periodes critiques |  |  |  | `A_RENSEIGNER` |
| Actions operationnelles | Ouvertes, en cours, resolues |  |  |  | `A_RENSEIGNER` |
| Audit | Evenements audit sur la fenetre controlee |  |  |  | `A_RENSEIGNER` |
| Notifications / jobs | Compteurs stockes, aucun envoi externe |  |  |  | `A_RENSEIGNER` |
| Tables techniques | Tables, contraintes, index critiques |  |  |  | `A_RENSEIGNER` |
| Stockage associe | Objets ou fichiers rattaches si applicable |  |  |  | `A_RENSEIGNER` |

Tout ecart doit etre documente avec:

```text
Compteur:
Ecart observe:
Cause:
Lien avec RPO:
Impact client:
Responsable analyse:
Decision compteur: OK / GO_SOUS_RESERVE / NO_GO
```

### 5. RPO / RTO

| Mesure | A renseigner | Decision |
| --- | --- | --- |
| RPO cible accepte | Valeur, source d'acceptation, responsable: | `A_RENSEIGNER` |
| RPO observe | Ecart entre point de reference et donnees restaurees: | `A_RENSEIGNER` |
| RTO cible accepte | Valeur, source d'acceptation, responsable: | `A_RENSEIGNER` |
| RTO observe | Duree debut restore -> cible verifiable: | `A_RENSEIGNER` |
| Duree export | Debut export -> fin export: | `A_RENSEIGNER` |
| Duree comparaison | Debut controles -> fin controles: | `A_RENSEIGNER` |
| Depassement seuil | Aucun / reserve / derogation signee: | `A_RENSEIGNER` |

## Formulaire de resultat

```text
Reference ticket operationnel:
Date execution:
Fuseau horaire:
Client / tenant:
Version applicative:
Commit / image:

Source production:
Environnement restore isole:
Preuve isolation cible:
Flux sortants desactives: OUI / NON

Backup reference:
Emplacement artefact hors Git:
Algorithme hash artefact backup:
Hash artefact backup:
Taille artefact backup:
Heure point de reference:
Heure debut export:
Heure fin export:
Statut export: OK / KO / OK_AVEC_RESERVE
Operateur export:

Heure debut restore isole:
Heure fin restore isole:
Statut restore isole: OK / KO / OK_AVEC_RESERVE
Operateur restore:
Absence de migration confirmee: OUI / NON
Absence de reset DB confirmee: OUI / NON
Aucun effet de bord externe: OUI / NON

Compteurs compares:
Compteurs OK:
Compteurs avec reserve:
Compteurs bloquants:
Ecarts justifies par RPO:
Ecarts non justifies:

RPO cible:
RPO observe:
RPO decision: OK / RESERVE / KO
RTO cible:
RTO observe:
RTO decision: OK / RESERVE / KO

Hash rapport de preuve:
Emplacement rapport de preuve:
Observateur:
Valideur technique:
Valideur ops:
Valideur securite / conformite:
Valideur metier client:

Decision finale: GO / GO_SOUS_RESERVE / NO_GO
Motif decision:
Reserves restantes:
Actions de levee:
Date prochaine revue:
```

## Regle de decision

La decision doit rester `NO_GO` si au moins une condition est vraie:

- aucun restore reel isole n'a ete execute;
- le restore a touche la production source;
- un reset DB ou une migration a ete lance;
- l'artefact backup n'a pas de hash documente;
- le rapport restore ne permet pas de relier export, artefact et cible;
- les compteurs minimaux ne sont pas compares;
- un ecart critique reste non justifie;
- RPO ou RTO depasse le seuil accepte sans derogation formelle;
- un flux externe a ete declenche depuis la cible restauree;
- un operateur ou valideur reel manque;
- la preuve contient un secret ou une donnee client brute non autorisee.

`GO_SOUS_RESERVE` est autorise uniquement si le restore isole est prouve, les
donnees critiques sont coherentes, et les reserves restantes sont explicites,
datees et acceptees par les responsables reels.

`GO` est autorise uniquement si export, restore isole, comparaison compteurs,
RPO/RTO, hash artefact, operateurs et decision sont complets et rattaches aux
preuves approuvees.

## Validation locale

Commande non destructive a lancer pour valider ce document:

```bash
git diff --check
```

Commandes volontairement non lancees:

- toute commande de restore;
- toute commande de reset DB;
- toute commande de migration;
- toute commande de suppression massive;
- toute commande de push.
