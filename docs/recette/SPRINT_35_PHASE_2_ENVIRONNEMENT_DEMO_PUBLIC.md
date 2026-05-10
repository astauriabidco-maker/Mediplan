# Sprint 35 - Phase 2 - Environnement demo public

Date: 2026-05-10
Sprint: Go-live commercial controle
Statut cible: `DEMO_PUBLIC_ENV_PRET_SOUS_RESERVE`

## Objectif

Preparer une checklist courte et verifiable pour exposer un environnement de
demo public commercial, sans le confondre avec une production client et sans
declencher d'operation destructive.

Cette checklist sert a confirmer que le domaine, la securite de transport, la
configuration, les comptes, les donnees fictives, la sauvegarde minimale, le
monitoring minimal, le rollback simple et le contact demo sont prets avant une
presentation externe.

## Garde-fous

- Aucun push.
- Aucun reset DB.
- Aucune migration destructive.
- Aucune suppression massive.
- Aucun seed destructif.
- Aucun deploiement declenche par ce document.
- Aucun vrai signataire invente.
- Aucun compte demo ne doit contenir de donnees personnelles reelles.
- Aucune donnee patient, RH ou hopital reel ne doit etre exposee.

## Perimetre environnement

| Champ | Valeur attendue | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Nom environnement | `demo-public` ou nom interne equivalent. | `A_RENSEIGNER` | Reference environnement / tableau exploitation. |
| Usage | Demo commerciale controlee, non production client. | `A_RENSEIGNER` | Mention explicite dans le dossier demo. |
| Fenetre d'exposition | Date et plage horaire de demo. | `A_RENSEIGNER` | Invitation ou planning interne. |
| Version applicative | Commit, build ou release candidate identifie. | `A_RENSEIGNER` | SHA commit, artefact ou tag candidat. |
| Responsable operationnel | Personne reelle a renseigner le jour J. | `A_RENSEIGNER` | Contact interne date, sans inventer de nom. |

## Checklist de readiness

| Domaine | Controle attendu | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Domaine | URL publique de demo reservee, documentee et rattachee au bon environnement. | `A_VERIFIER` | Nom DNS, cible, TTL, proprietaire du domaine. |
| HTTPS | Certificat TLS valide, chaine complete, redirection HTTP vers HTTPS active. | `A_VERIFIER` | Capture navigateur, rapport SSL ou verification plateforme. |
| Variables d'environnement | Variables requises presentes hors depot, secrets stockes dans un coffre ou outil d'exploitation. | `A_VERIFIER` | Liste non sensible des cles, responsable, date de verification. |
| Comptes demo | Comptes limites, nommes comme comptes fictifs, droits strictement necessaires. | `A_VERIFIER` | Matrice roles demo et procedure de rotation mot de passe. |
| Donnees fictives | Jeu de donnees synthetique, sans patient, employe, etablissement ou identifiant reel. | `A_VERIFIER` | Rapport anonymisation ou revue manuelle datee. |
| Backup minimal | Export ou snapshot minimal disponible avant exposition, avec retention courte definie. | `A_VERIFIER` | Reference backup, horodatage, duree de retention. |
| Monitoring minimal | Disponibilite, erreurs serveur, erreurs frontend et latence suivies pendant la demo. | `A_VERIFIER` | Dashboard, alerte ou journal de supervision. |
| Rollback simple | Retour a la version precedente ou desactivation de l'exposition documente. | `A_VERIFIER` | Procedure courte avec seuils d'activation. |
| Contact demo | Canal unique pour incident demo et contact commercial/technique reels identifies. | `A_VERIFIER` | Canal, horaire, escalade, personnes reelles a renseigner. |

## Critere de blocage immediat

La demo publique doit rester `NOT_READY` si l'un des points suivants est
constate:

- Donnee personnelle, patient, RH ou hopital reel visible.
- Compte demo partageant un secret de production.
- Domaine pointant vers un environnement non prevu.
- HTTPS absent, invalide ou contournable.
- Variable sensible commitee dans le depot.
- Absence de moyen simple pour couper l'exposition publique.
- Absence de contact joignable pendant la fenetre de demo.

## Comptes demo

Les comptes doivent rester fictifs et limites. Les identifiants exacts ne sont
pas consignes ici si cela expose un secret.

| Role demo | Usage | Contraintes |
| --- | --- | --- |
| Administrateur demo | Montrer le parametrage et les vues de pilotage. | Droits limites a l'environnement demo public. |
| Manager demo | Parcours de validation et consultation operationnelle. | Aucun acces a donnees reelles ou exports sensibles. |
| RH demo | Scenarios RH fictifs et non sensibles. | Donnees synthetiques uniquement. |
| Audit demo | Consultation preuves, journaux et reserves fictives. | Lecture seule si possible. |

## Donnees fictives

Le jeu de donnees demo doit utiliser:

- noms de personnes fictifs;
- etablissements fictifs ou generiques;
- dates coherentes mais non issues d'un dossier reel;
- volumes representatifs mais modestes;
- traces et preuves de demonstration sans document sensible;
- mentions claires indiquant que les donnees sont synthetiques.

## Backup minimal

Avant l'ouverture publique de demo, verifier au minimum:

| Controle | Attendu | Statut |
| --- | --- | --- |
| Snapshot ou export | Disponible avant la fenetre de demo. | `A_VERIFIER` |
| Retention | Duree courte documentee. | `A_VERIFIER` |
| Restauration | Procedure connue, sans execution destructive dans ce document. | `A_VERIFIER` |
| Donnees sensibles | Backup ne contient pas de donnees reelles. | `A_VERIFIER` |

## Monitoring minimal

Pendant la fenetre de demo, suivre au minimum:

- disponibilite de l'URL publique;
- erreurs HTTP 5xx;
- erreurs frontend visibles;
- latence percue des parcours critiques;
- saturation simple de l'hebergement si disponible;
- canal incident actif.

## Rollback simple

Le rollback de demo publique doit pouvoir se limiter a une action sobre:

1. couper l'exposition publique ou retirer le domaine de demo;
2. revenir a la version candidate precedente si la plateforme le permet;
3. bloquer ou faire tourner les comptes demo;
4. informer le canal contact/demo;
5. documenter l'incident et la decision de reprise.

Aucune commande de reset DB, suppression massive ou migration destructive ne
fait partie de cette checklist.

## Decision attendue

`DEMO_PUBLIC_ENV_PRET` ne peut etre retenu que si tous les controles critiques
sont verts et rattaches a des preuves reelles.

Par defaut, tant que les preuves d'environnement et les contacts reels ne sont
pas renseignes, la decision reste:

```text
DEMO_PUBLIC_ENV_PRET_SOUS_RESERVE
```

## Validation locale

Validation non destructive attendue pour ce document:

```bash
git diff --check
```

Commandes volontairement exclues:

- `git push`
- `git reset --hard`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run demo:reset`
- tout seed destructif
- toute suppression massive
