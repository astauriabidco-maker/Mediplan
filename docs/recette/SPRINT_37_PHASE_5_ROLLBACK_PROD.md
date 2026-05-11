# Sprint 37 - Phase 5 - Runbook rollback production

Date: 2026-05-10
Sprint: Passage vraie production client
Statut cible: `ROLLBACK_PROD_TESTE_SOUS_RESERVE`

## Objectif

Documenter un runbook de rollback production client avant go-live, avec
criteres de declenchement, owners, fenetre, controles applicatifs, controles
DB, assets, tests non destructifs et preuves attendues.

Ce document ne declenche aucun rollback reel. Il sert a verifier que l'equipe
sait revenir a un etat acceptable si un incident critique survient pendant la
fenetre de production, sans improviser de migration destructive, suppression
massive, reset DB ou push.

## Garde-fous

- Aucun push.
- Aucun `git reset`.
- Aucun rollback reel.
- Aucun reset DB.
- Aucune migration destructive.
- Aucune suppression massive.
- Aucun import, seed ou restore execute depuis ce document.
- Aucun secret, token, mot de passe ou valeur sensible ne doit etre copie ici.
- Aucun owner, signataire ou client ne doit etre invente.
- Toute preuve doit etre horodatee, rattachee a une version et conservee dans
  un espace controle.

## Perimetre rollback

| Domaine | Inclus dans le runbook | Hors perimetre |
| --- | --- | --- |
| Applicatif | Retour a l'artefact precedent, bascule de configuration non sensible, verification URL et sante service. | Developpement correctif en urgence sans revue, push direct, hotfix non trace. |
| DB | Gel ecriture, verification backup, evaluation restore sur environnement controle, plan DBA. | Reset DB, migration destructive, restore direct non valide, suppression massive. |
| Assets | Repli vers assets versionnes ou stockage precedent, verification liens et fichiers critiques. | Purge irreversible, regeneration massive non testee, suppression du stockage courant. |
| Observabilite | Suivi logs, erreurs, metriques et alertes pendant la fenetre. | Masquage ou suppression de logs utiles a l'incident. |
| Communication | Decision go/no-go, canal incident, information client controlee. | Promesse de reprise sans preuve ou annonce non validee. |

## Fenetre et prerequis

| Champ | Attendu | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Fenetre production | Date, heure debut, heure fin, timezone et marge de surveillance notees. | `A_RENSEIGNER` | Planning release ou ticket operationnel. |
| Fenetre rollback | Dernier moment acceptable pour activer le rollback sans aggraver le risque. | `A_RENSEIGNER` | Decision release, RTO cible, contrainte client. |
| Version cible | Commit, artefact, tag ou reference build de la version a deployer. | `A_RENSEIGNER` | SHA, lien CI, checksum ou release note. |
| Version de repli | Commit, artefact, tag ou reference build de la version precedente validee. | `A_RENSEIGNER` | SHA, lien CI, preuve smoke precedente. |
| Backup | Backup recent identifie avant fenetre, avec retention et owner. | `A_VERIFIER` | Reference backup, date, taille, politique retention. |
| Acces | Acces plateforme, logs, monitoring, stockage et base verifies par les owners reels. | `A_VERIFIER` | Attestation non sensible ou checklist d'acces. |
| Canal incident | Canal unique actif avec decisionnaire, tech lead, ops et support. | `A_VERIFIER` | Lien canal interne ou reference ticket. |

## Owners

Les noms reels doivent etre renseignes avant toute production client.

| Role | Responsabilite | Nom / contact | Backup | Statut |
| --- | --- | --- | --- | --- |
| Incident commander | Tient la chronologie, arbitre les escalades, demande la decision rollback. | `A_RENSEIGNER` | `A_RENSEIGNER` | `A_VERIFIER` |
| Owner applicatif | Verifie artefacts, configuration, sante service et smoke applicatif. | `A_RENSEIGNER` | `A_RENSEIGNER` | `A_VERIFIER` |
| Owner DB / DBA | Verifie backup, migrations, integrite et option de restauration controlee. | `A_RENSEIGNER` | `A_RENSEIGNER` | `A_VERIFIER` |
| Owner assets | Verifie stockage, assets critiques, liens et plan de repli. | `A_RENSEIGNER` | `A_RENSEIGNER` | `A_VERIFIER` |
| Owner observabilite | Surveille metriques, logs, alertes et erreurs utilisateur. | `A_RENSEIGNER` | `A_RENSEIGNER` | `A_VERIFIER` |
| Owner support client | Coordonne message client et collecte impacts metier. | `A_RENSEIGNER` | `A_RENSEIGNER` | `A_VERIFIER` |
| Decisionnaire NO-GO | Autorise rollback ou maintien sous reserve selon criteres. | `A_RENSEIGNER` | `A_RENSEIGNER` | `A_VERIFIER` |

## Criteres de declenchement

| Severite | Signal | Seuil rollback | Decision attendue |
| --- | --- | --- | --- |
| P0 | Indisponibilite totale application client. | Service inaccessible ou erreur critique confirmee au-dela du delai RTO cible. | Activer decision rollback ou NO-GO maintien. |
| P0 | Perte, corruption ou exposition de donnees sensibles. | Suspicion credible ou preuve observee. | Stop fenetre, gel actions, escalade securite, NO-GO reprise sans avis owner. |
| P1 | Authentification ou droits incorrects. | Utilisateur accede a un perimetre non prevu ou ne peut pas exercer son role critique. | Rollback si correction config non destructive impossible dans la fenetre. |
| P1 | Migration ou schema incoherent. | Erreur bloquante, divergence schema, echec lecture/ecriture critique. | Gel ecriture, avis DBA, rollback applicatif seulement si compatible. |
| P1 | Assets critiques indisponibles. | Documents, images, exports ou fichiers necessaires au parcours client indisponibles. | Repli assets si testable, sinon NO-GO. |
| P2 | Degradation performance. | Latence ou erreurs au-dessus du seuil accepte mais parcours encore possible. | Maintien sous reserve ou rollback selon impact metier. |
| P2 | Observabilite insuffisante. | Impossible de diagnostiquer un incident client pendant la fenetre. | NO-GO si le risque ne peut pas etre encadre. |

Un rollback ne doit pas etre declenche par intuition seule. Il doit etre base
sur un signal observe, une heure, un impact, un owner et une decision explicite.

## Sequence applicative

Cette sequence est un plan de controle. Les commandes exactes dependent de la
plateforme de production et doivent rester dans les procedures d'exploitation
validees.

1. Geler les changements non indispensables sur la fenetre.
2. Consigner heure, version cible, version exposee et symptome observe.
3. Confirmer que l'incident est reproductible ou visible dans les logs.
4. Verifier que la version de repli est identifiee et deja validee.
5. Confirmer compatibilite entre version de repli, schema DB et assets.
6. Demander decision au decisionnaire NO-GO avec avis applicatif et DB.
7. Si rollback autorise, executer uniquement la procedure plateforme validee.
8. Rejouer les smoke tests non destructifs.
9. Consigner resultat, horodatage, owners et preuves.
10. Maintenir surveillance renforcee jusqu'a cloture incident.

Actions interdites dans la sequence applicative:

- push direct en production;
- modification de code non revue pendant l'incident;
- `git reset`;
- suppression de logs;
- bascule vers un artefact non identifie;
- correction manuelle de donnees client sans validation DB et support.

## Sequence DB

La DB est traitee comme un point de controle specifique. Par defaut, le rollback
applicatif ne doit pas supposer qu'un rollback DB est possible.

| Etape | Controle | Statut | Preuve attendue |
| --- | --- | --- | --- |
| Inventaire migrations | Migrations prevues, appliquees et reversibles connues avant fenetre. | `A_VERIFIER` | Rapport migration ou sortie lecture seule. |
| Compatibilite schema | Version de repli compatible avec le schema courant ou plan documente. | `A_VERIFIER` | Avis owner DB, matrice compatibilite. |
| Backup pre-fenetre | Backup disponible avant changement, retention et integrite controlees. | `A_VERIFIER` | Reference backup, date, taille, checksum si disponible. |
| Restore test | Restauration testee hors production sur environnement controle. | `A_VERIFIER` | Rapport restore, duree, anomalies, RPO/RTO observes. |
| Gel ecriture | Capacite a limiter ou suspendre les ecritures si corruption suspectee. | `A_VERIFIER` | Procedure exploitation ou decision incident. |
| Donnees post-incident | Reconciliation necessaire identifiee si ecritures ont eu lieu. | `A_VERIFIER` | Journal actions, requetes de controle non destructives. |

Commandes et actions volontairement exclues:

- `npm run migration:revert` sur production sans decision formelle;
- `npm run migration:run` improvise;
- reset DB;
- restore direct sur production sans plan DBA valide;
- suppression massive;
- modification SQL manuelle non tracee.

## Sequence assets

| Controle | Attendu | Statut | Preuve |
| --- | --- | --- | --- |
| Inventaire assets critiques | Liste des fichiers, buckets, objets ou chemins necessaires au parcours client. | `A_VERIFIER` | Inventaire non sensible ou reference stockage. |
| Version assets | Version ou generation des assets rattachee au build cible et au build de repli. | `A_VERIFIER` | Manifest, checksum ou reference artefact. |
| Droits acces | Droits lecture/ecriture conformes pour l'environnement production. | `A_VERIFIER` | Attestation owner, sans secret. |
| Repli | Possibilite de revenir a un jeu d'assets precedent sans purge destructive. | `A_VERIFIER` | Procedure stockage ou snapshot. |
| Verification liens | Liens, exports ou apercus critiques charges apres repli. | `A_VERIFIER` | Smoke non destructif, capture anonymisee. |

Aucune purge, regeneration massive ou suppression d'assets ne doit etre faite
pendant un rollback sans decision explicite et preuve de recuperation.

## Tests non destructifs

Les tests suivants valident la capacite de rollback sans executer de rollback
reel.

| Test | Methode non destructive | Resultat attendu | Preuve |
| --- | --- | --- | --- |
| Identification version | Lire version exposee, commit, artefact et environnement. | Version cible et version de repli connues. | Capture plateforme ou log lecture seule. |
| Smoke public | Charger URL, authentification controlee, page principale, deconnexion. | Parcours critique disponible ou erreur documentee. | Resultat smoke horodate. |
| Logs | Lire erreurs backend, frontend, acces et jobs critiques. | Logs accessibles sans fuite de secret. | Capture masquee ou reference dashboard. |
| DB read-only | Executer uniquement des controles de lecture approuves. | Schema et compteurs critiques coherents. | Rapport owner DB. |
| Assets read-only | Verifier presence et chargement d'assets critiques. | Assets disponibles, liens valides. | Capture anonymisee ou manifest. |
| Dry-run decision | Simuler la prise de decision avec seuils et owners. | Owner et decisionnaire savent dire GO, SOUS_RESERVE ou NO-GO. | Chronologie d'exercice. |
| Communication | Relire message client incident et message reprise. | Message pret, factuel, sans promesse non validee. | Brouillon approuve ou ticket support. |

Modele de compte rendu test:

```text
Date:
Environnement:
Version cible:
Version de repli:
Participants:
Scenario simule:
Tests executes:
Resultat: OK / SOUS_RESERVE / KO
Temps de decision observe:
RPO/RTO estimes:
Reserves:
Owners des reserves:
Preuves rattachees:
Decision finale:
```

## Preuves attendues

| Preuve | Obligatoire | Regle |
| --- | --- | --- |
| Chronologie incident ou exercice | Oui | Heure, action, owner, decision, resultat. |
| Version cible et version de repli | Oui | SHA, artefact, tag ou reference CI reelle. |
| Smoke non destructif | Oui | Resultat horodate, URL, version, owner. |
| Avis DB | Oui | Backup, migrations, compatibilite schema, restore test hors prod. |
| Avis assets | Oui | Inventaire, disponibilite, droits, repli possible. |
| Observabilite | Oui | Logs et alertes consultables pendant la fenetre. |
| Decision NO-GO / rollback | Oui si incident ou exercice | Decisionnaire reel, motif, heure, suite. |
| Reserves | Oui si presentes | Severite, impact, owner, critere de levee, date cible. |

Convention de reference proposee:

```text
S37-P5-rollback-prod-<objet>-<numero>-<date>
```

Exemples:

- `S37-P5-rollback-prod-smoke-01-2026-05-10`
- `S37-P5-rollback-prod-db-avis-02-2026-05-10`
- `S37-P5-rollback-prod-decision-03-2026-05-10`

## NO-GO

La production client doit rester `NO-GO` ou `GO_SOUS_RESERVE` si une des
conditions suivantes est vraie:

- version de repli non identifiee;
- owner applicatif, DB, assets ou decisionnaire absent;
- backup pre-fenetre absent, non localisable ou non attribue;
- compatibilite entre version de repli et schema DB inconnue;
- restore jamais teste hors production;
- assets critiques sans inventaire ni repli;
- smoke non destructif KO sur parcours critique;
- logs ou alertes indisponibles pendant la fenetre;
- procedure rollback necessite reset DB, migration destructive ou suppression
  massive;
- decision client, support ou securite impossible a tracer;
- presence d'une donnee sensible exposee sans plan incident valide.

Decision par defaut: `ROLLBACK_PROD_TESTE_SOUS_RESERVE`.

`ROLLBACK_PROD_TESTE` ne doit etre retenu que si les owners reels sont
renseignes, les preuves existent, les tests non destructifs sont rejoues, et
les reserves bloquantes sont levees ou acceptees formellement.

## Validation locale

Validation non destructive attendue pour ce document:

```bash
git diff --check
```

Commandes volontairement exclues:

- `git push`
- `git reset`
- `npm run migration:run`
- `npm run migration:revert`
- tout reset DB
- tout restore production
- tout seed destructif
- toute suppression massive
- tout rollback reel
