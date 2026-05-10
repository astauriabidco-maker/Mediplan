# Sprint 36 - Phase 5 - Checklist deploiement demo

Date: 2026-05-10
Sprint: Mise en ligne demo commerciale reelle
Statut cible: `DEMO_COMMERCIALE_DEPLOYABLE_SOUS_RESERVE`

## Objectif

Preparer une checklist operationnelle pour mettre en ligne une demo
commerciale reelle, publique ou partageable, sans la confondre avec une
production hospitaliere et sans declencher d'action destructive.

Ce document sert a verifier le domaine, le HTTPS, la configuration, le build,
le rollback simple, les smoke tests post-deploiement, les logs, le compte demo
et les limites d'usage avant exposition commerciale.

## Garde-fous

- Aucun push.
- Aucun reset DB.
- Aucune migration destructive.
- Aucune suppression massive.
- Aucun seed destructif.
- Aucun deploiement lance par ce document.
- Aucune donnee patient, RH, hopital ou agent reel ne doit etre exposee.
- Aucun secret ne doit etre copie dans ce document.
- Aucun engagement de production hospitaliere ne doit etre formule.

## Perimetre de mise en ligne

| Champ | Valeur attendue | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Environnement | Environnement demo commerciale distinct de la production client. | `A_RENSEIGNER` | Nom environnement, URL interne ou reference plateforme. |
| Fenetre | Date, heure de debut, heure de fin et public vise. | `A_RENSEIGNER` | Planning demo ou invitation. |
| Version | Commit, artefact, build ou tag candidat identifie. | `A_RENSEIGNER` | SHA, reference CI ou note de release. |
| Responsable | Owner technique et owner commercial reels identifies. | `A_RENSEIGNER` | Contact interne date. |
| Decision | Statut de lancement formalise avant exposition. | `A_RENSEIGNER` | Decision `GO_DEMO`, `GO_SOUS_RESERVE` ou `NO_GO`. |

## Checklist deploiement demo

| Domaine | Controle attendu | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Domaine | URL demo reservee, stable et rattachee au bon environnement. | `A_VERIFIER` | Nom DNS, cible, TTL, proprietaire et date de verification. |
| HTTPS | Certificat TLS valide, chaine complete, redirection HTTP vers HTTPS activee. | `A_VERIFIER` | Capture navigateur, verification plateforme ou rapport SSL. |
| Variables | Variables requises presentes hors depot, secrets stockes dans un coffre, valeurs sensibles masquees. | `A_VERIFIER` | Liste non sensible des cles et responsable de verification. |
| Build | Build candidat genere sans erreur et rattache au commit attendu. | `A_VERIFIER` | Reference CI, artefact, logs de build ou checksum si disponible. |
| Donnees demo | Donnees synthetiques ou anonymisees, volumes modestes, aucun identifiant reel. | `A_VERIFIER` | Revue donnees ou attestation anonymisation. |
| Compte demo | Compte fictif limite, droits strictement necessaires, secret partage par canal controle. | `A_VERIFIER` | Matrice roles, date de rotation et owner du compte. |
| Logs | Logs applicatifs, erreurs serveur, erreurs frontend et acces demo consultables. | `A_VERIFIER` | Lien dashboard, capture ou reference outil. |
| Smoke post-deploiement | Parcours critiques rejoues apres mise en ligne sur l'URL publique. | `A_VERIFIER` | Resultats horodates et captures si necessaire. |
| Rollback simple | Procedure de repli courte documentee, seuils d'activation connus. | `A_VERIFIER` | Runbook rollback et contact decisionnaire. |
| Limites usage | Limites commerciales, donnees, securite et support preparees pour la session. | `A_VERIFIER` | Section "Limites d'usage" relue par l'animateur. |

## Domaine et HTTPS

| Controle | Attendu | Statut |
| --- | --- | --- |
| Resolution DNS | Le domaine pointe vers l'environnement demo prevu. | `A_VERIFIER` |
| TTL | TTL compatible avec un repli rapide si besoin. | `A_VERIFIER` |
| Certificat | Certificat non expire et coherent avec le domaine expose. | `A_VERIFIER` |
| Redirection | HTTP redirige vers HTTPS sans boucle. | `A_VERIFIER` |
| Navigateur | Page chargee sans alerte de securite. | `A_VERIFIER` |

Critere de blocage immediat:

- domaine pointant vers un environnement non prevu;
- certificat absent, expire ou non conforme;
- alerte navigateur visible pendant la demo;
- impossibilite de couper ou modifier l'exposition du domaine.

## Variables d'environnement

Les variables doivent etre verifiees sans exposer de valeur sensible dans ce
document.

| Famille | Controle | Statut | Preuve |
| --- | --- | --- | --- |
| Application | Variables obligatoires presentes pour l'environnement demo. | `A_VERIFIER` | Liste des noms de variables, sans valeurs. |
| Secrets | Secrets stockes hors depot et non partages en clair. | `A_VERIFIER` | Reference coffre ou procedure interne. |
| Integrations | Integrations externes desactivees ou configurees en mode demo si necessaire. | `A_VERIFIER` | Parametrage non sensible. |
| Emails | Envoi reel bloque, limite ou redirige selon le scenario demo. | `A_VERIFIER` | Regle d'envoi et destinataires autorises. |
| Analytics | Collecte compatible avec la demo, sans donnees personnelles reelles. | `A_VERIFIER` | Parametrage ou decision de desactivation. |

## Build et version

Avant exposition, consigner:

```text
Commit:
Branche:
Artefact / build:
Date build:
Environnement cible:
Owner verification:
Resultat build: OK / KO / SOUS_RESERVE
Reserve eventuelle:
```

Le build doit etre considere `KO` si la version exposee ne correspond pas au
commit attendu ou si les logs de build contiennent une erreur non expliquee.

## Smoke post-deploiement

Les controles suivants sont a rejouer apres mise en ligne sur l'URL finale:

| Parcours | Controle attendu | Statut | Preuve |
| --- | --- | --- | --- |
| Accueil | URL publique chargee en HTTPS sans erreur visible. | `A_VERIFIER` | Capture horodatee ou note smoke. |
| Auth demo | Connexion au compte demo fictif reussie. | `A_VERIFIER` | Resultat smoke, sans mot de passe. |
| Tableau principal | Vue metier principale chargee avec donnees demo. | `A_VERIFIER` | Capture anonymisee. |
| Parcours critique | Action demo principale executable sans erreur bloquante. | `A_VERIFIER` | Note parcours et resultat. |
| Audit / traces | Trace ou journal demo consultable si le scenario le montre. | `A_VERIFIER` | Capture ou reference log. |
| Deconnexion | Session demo fermable proprement. | `A_VERIFIER` | Resultat smoke. |

Modele de resultat smoke:

```text
Date:
URL:
Version / commit:
Compte demo utilise:
Parcours testes:
Resultat global: OK / KO / SOUS_RESERVE
Erreurs observees:
Logs consultes:
Decision:
Owner:
```

## Logs et surveillance minimale

Pendant la fenetre de demo, suivre au minimum:

- disponibilite de l'URL publique;
- erreurs HTTP 5xx;
- erreurs frontend visibles;
- echecs de connexion du compte demo;
- latence percue sur le parcours principal;
- evenement inhabituel dans les logs d'acces;
- canal incident interne actif.

Les logs doivent permettre de comprendre un incident de demo sans exposer de
donnees sensibles dans les captures ou comptes rendus commerciaux.

## Compte demo

| Controle | Attendu | Statut |
| --- | --- | --- |
| Identite | Nom de compte clairement fictif. | `A_VERIFIER` |
| Droits | Droits limites au strict necessaire pour la demo. | `A_VERIFIER` |
| Secret | Mot de passe ou lien d'acces transmis par canal controle. | `A_VERIFIER` |
| Rotation | Rotation prevue apres la fenetre de demo ou apres partage externe. | `A_VERIFIER` |
| Donnees | Aucune donnee reelle accessible depuis le compte. | `A_VERIFIER` |
| Export | Exports sensibles bloques ou limites. | `A_VERIFIER` |

Les identifiants exacts ne doivent pas etre notes ici si cela expose un secret.

## Rollback simple

Le rollback de demo doit rester sobre et rapidement activable:

1. annoncer la pause sur le canal demo interne;
2. couper l'exposition publique ou retirer le domaine demo si necessaire;
3. revenir a l'artefact candidat precedent si la plateforme le permet;
4. bloquer ou faire tourner le compte demo;
5. consigner l'incident, l'heure, la version et la decision de reprise;
6. informer l'animateur commercial des limites a communiquer au client.

Aucune commande de reset DB, migration destructive, seed destructif ou
suppression massive ne fait partie du rollback de cette checklist.

## Limites d'usage

Ces limites doivent etre connues de l'animateur avant toute demo externe:

- la demo commerciale ne vaut pas mise en production hospitaliere;
- la demo ne constitue pas une homologation SSI, DPO ou client;
- aucun patient, agent, etablissement ou planning reel ne doit etre importe;
- aucun test de charge, pentest ou integration client ne doit etre improvise;
- aucun SLA, engagement support ou engagement hebergement n'est valide par la
  seule demo;
- les captures de demo ne remplacent pas un PV pilote signe;
- toute demande client hors scenario doit etre notee comme reserve ou prochaine
  etape, pas executee en direct si elle modifie l'environnement.

## Critere de decision

| Decision | Conditions | Suite |
| --- | --- | --- |
| `GO_DEMO` | Domaine, HTTPS, variables, build, compte demo, smoke, logs et rollback valides. | Ouvrir la fenetre demo et conserver les preuves. |
| `GO_SOUS_RESERVE` | Aucun blocage critique, mais preuves partielles ou reserve P2/P3 documentee. | Demo possible avec limites explicites et owner de reserve. |
| `NO_GO` | Donnee sensible, HTTPS KO, compte non controle, build incertain, smoke KO ou rollback indisponible. | Ne pas exposer la demo; ouvrir remediation interne. |

La decision par defaut reste `GO_SOUS_RESERVE` tant que toutes les preuves
reelles ne sont pas rattachees au dossier de demo.

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
- tout deploiement direct
