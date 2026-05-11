# Sprint 38 - Phase E - PV rollback teste non destructif

Date: 2026-05-10
Sprint: levee reserves production client
Statut: `ROLLBACK_TESTE_NON_DESTRUCTIF`
Cadre: phase E, preuve de rollback teste sans execution de rollback reel

## Objectif

Formaliser le proces-verbal de test rollback non destructif attendu pour lever
la reserve Sprint 37 "Rollback non teste".

Ce PV valide la capacite de decision, la procedure applicative, les controles
DB, les controles assets, les temps observes et les criteres de declenchement
sur un scenario de dry-run. Il ne lance aucun rollback reel et ne modifie pas
la production.

## Garde-fous

- Aucun rollback reel lance.
- Aucun `git reset`.
- Aucune migration lancee.
- Aucune migration destructive.
- Aucun reset DB.
- Aucun restore production.
- Aucune suppression massive.
- Aucun push.
- Aucune valeur secrete, donnee sensible ou capture nominative ajoutee au depot.
- Aucun signataire reel invente.

## Versions testees

| Champ | Valeur |
| --- | --- |
| Version N cible | `<VERSION_N_COMMIT_TAG_ARTEFACT>` |
| Version N-1 de repli | `<VERSION_N_MOINS_1_COMMIT_TAG_ARTEFACT>` |
| Environnement de reference | `<ENVIRONNEMENT_OU_URL_CIBLE>` |
| Date et heure dry-run | `2026-05-10 <HH:MM> Europe/Paris` |
| Responsable unique | `<NOM_REEL_RESPONSABLE_UNIQUE>` |
| Reference preuve externe | `<TICKET_OU_DOSSIER_PREUVE>` |

La version N et la version N-1 doivent etre renseignees avec des references
reelles avant signature: commit, tag, artefact CI, release ou checksum. Un PV
sans ces references reste une preuve documentaire, pas une preuve de rollback
operationnel complet.

## Scenario de test non destructif

Le test simule un incident bloquant apres exposition de la version N et verifie
que l'equipe sait decider et executer la procedure de repli vers N-1 sans
improviser.

| Etape | Action simulee ou controlee | Mode | Resultat |
| --- | --- | --- | --- |
| 1 | Identifier version N exposee et version N-1 de repli. | Lecture seule / dossier release | `OK_SOUS_RESERVE_REFERENCES_REELLES` |
| 2 | Confirmer le symptome fictif et son impact client. | Exercice table-top | `OK` |
| 3 | Appliquer les criteres de declenchement rollback. | Decision simulee | `OK` |
| 4 | Verifier compatibilite applicative N-1. | Lecture procedure / artefact | `OK_SOUS_RESERVE_ARTEFACT_REEL` |
| 5 | Verifier compatibilite DB. | Controle lecture seule / avis DB attendu | `OK_SOUS_RESERVE_AVIS_DB_REEL` |
| 6 | Verifier disponibilite assets de repli. | Controle lecture seule / manifest attendu | `OK_SOUS_RESERVE_MANIFEST_REEL` |
| 7 | Simuler decision responsable unique. | Dry-run decision | `OK` |
| 8 | Simuler lancement procedure rollback plateforme. | Non execute | `NON_EXECUTE_PAR_GARDE_FOU` |
| 9 | Relire smoke post-rollback attendu. | Checklist non destructive | `OK` |
| 10 | Consigner temps observes, reserves et decision. | PV | `OK` |

## Procedure applicative validee

La procedure applicative a ete relue et jouee en dry-run uniquement.

1. Geler les changements applicatifs non indispensables.
2. Identifier version N, version N-1, environnement et fenetre.
3. Confirmer que le signal incident atteint un critere de declenchement.
4. Obtenir avis applicatif, DB et assets avant toute bascule.
5. Obtenir decision explicite du responsable unique.
6. Si decision reelle, utiliser uniquement la procedure plateforme approuvee.
7. Rejouer les smoke tests non destructifs apres repli.
8. Maintenir surveillance logs, erreurs, latence et parcours critiques.
9. Documenter heure, owner, resultat et preuves rattachees.

Actions interdites pendant cette procedure:

- bascule vers un artefact non identifie;
- push direct ou hotfix non trace;
- `git reset`;
- modification manuelle de donnees client;
- suppression ou masquage de logs;
- lancement de migration non prevue;
- rollback DB implicite.

## Controle DB

Le test DB reste non destructif. Il valide les points de decision avant rollback
applicatif, sans restore ni migration.

| Controle | Attendu | Resultat |
| --- | --- | --- |
| Migrations version N | Liste connue et rattachee a la release. | `A_RATTACHER` |
| Compatibilite N-1/schema courant | Avis DB confirmant que N-1 peut lire le schema courant ou que la limite est connue. | `A_RATTACHER` |
| Backup pre-fenetre | Backup recent identifie, horodate, integre et accessible aux owners autorises. | `A_RATTACHER` |
| Restore isole precedent | Restore hors production prouve ou reserve explicite maintenue. | `A_RATTACHER` |
| Requetes de controle | Lecture seule uniquement, sans exposition de secret ni donnee sensible. | `OK_PROCEDURE` |
| Effets de bord | Aucun flux externe, aucune ecriture, aucune purge. | `OK` |

Resultat DB du dry-run: `OK_SOUS_RESERVE_PREUVES_REELLES_A_RATTACHER`.

## Controle assets

Le test assets reste non destructif. Il verifie que les fichiers critiques
peuvent etre rattaches a N et N-1 sans purge ni regeneration massive.

| Controle | Attendu | Resultat |
| --- | --- | --- |
| Inventaire assets critiques | Liste des chemins, buckets, objets ou manifests necessaires au parcours client. | `A_RATTACHER` |
| Version assets N | Assets rattaches au build cible. | `A_RATTACHER` |
| Version assets N-1 | Assets de repli disponibles ou snapshot identifie. | `A_RATTACHER` |
| Droits d'acces | Lecture par l'application et par les owners autorises. | `A_RATTACHER` |
| Smoke assets | Chargement non destructif des fichiers critiques apres repli simule. | `OK_PROCEDURE` |
| Purge | Aucune purge, suppression ou regeneration massive executee. | `OK` |

Resultat assets du dry-run: `OK_SOUS_RESERVE_MANIFEST_ET_PREUVES_REELLES`.

## Temps observes

Les temps ci-dessous correspondent au dry-run documentaire et decisionnel. Ils
ne constituent pas un RTO contractuel tant qu'aucune bascule reelle n'a ete
executee sur la plateforme cible.

| Mesure | Debut | Fin | Duree observee | Commentaire |
| --- | --- | --- | --- | --- |
| Identification versions N/N-1 | `<HH:MM>` | `<HH:MM>` | `<DUREE>` | Reference artefacts a rattacher. |
| Qualification signal incident | `<HH:MM>` | `<HH:MM>` | `<DUREE>` | Scenario table-top. |
| Decision rollback simulee | `<HH:MM>` | `<HH:MM>` | `<DUREE>` | Responsable unique requis. |
| Controle DB lecture seule | `<HH:MM>` | `<HH:MM>` | `<DUREE>` | Avis DB reel a rattacher. |
| Controle assets lecture seule | `<HH:MM>` | `<HH:MM>` | `<DUREE>` | Manifest reel a rattacher. |
| Smoke attendu post-repli | `<HH:MM>` | `<HH:MM>` | `<DUREE>` | Checklist prete, non executee apres rollback reel. |
| Temps total dry-run | `<HH:MM>` | `<HH:MM>` | `<DUREE>` | Mesure non contractuelle. |

## Criteres de declenchement

Un rollback ne peut etre decide que si un signal observe depasse un seuil
documente et qu'un responsable unique assume la decision.

| Severite | Signal | Seuil de declenchement | Decision attendue |
| --- | --- | --- | --- |
| P0 | Application indisponible pour le client. | Indisponibilite confirmee au-dela du delai RTO cible. | Decision rollback ou NO-GO maintien. |
| P0 | Perte, corruption ou exposition de donnees sensibles. | Suspicion credible ou preuve observee. | Stop fenetre, gel actions, escalade securite. |
| P1 | Authentification ou droits incorrects. | Acces hors perimetre ou role critique bloque. | Rollback si correction config non destructive impossible. |
| P1 | Incompatibilite schema DB. | Erreur bloquante lecture/ecriture critique ou divergence non expliquee. | Avis DB obligatoire avant rollback applicatif. |
| P1 | Assets critiques indisponibles. | Documents, exports ou fichiers critiques non charges. | Repli assets si disponible, sinon NO-GO. |
| P2 | Degradation performance. | Latence ou erreurs au-dessus du seuil accepte, parcours encore possible. | Maintien sous reserve ou rollback selon impact metier. |
| P2 | Observabilite insuffisante. | Impossible de diagnostiquer pendant la fenetre. | NO-GO si risque non encadre. |

## Resultat du PV

Decision Phase E: `ROLLBACK_TESTE_NON_DESTRUCTIF_SOUS_RESERVE_PREUVES_REELLES`.

Le test de rollback est valide comme exercice non destructif:

- procedure applicative relue et jouee en dry-run;
- decision de rollback simulee avec criteres explicites;
- controles DB limites a la lecture seule;
- controles assets limites a la lecture seule;
- aucun rollback reel lance;
- aucun restore, reset DB, migration ou suppression massive lance;
- temps observes prevus dans le PV et a completer avec valeurs reelles;
- signature responsable unique requise avant levee complete de reserve.

Reserve restante: rattacher les references reelles de version N/N-1, les
preuves DB, le manifest assets, les temps observes effectifs et la signature du
responsable unique. Sans ces elements, la preuve reste acceptable pour un
dry-run documentaire mais ne vaut pas validation operationnelle complete.

## Signature responsable unique

```text
Je, <NOM_REEL_RESPONSABLE_UNIQUE>, confirme avoir pilote ou revu le test de
rollback non destructif Sprint 38 Phase E pour la version N
<VERSION_N_COMMIT_TAG_ARTEFACT> et la version de repli N-1
<VERSION_N_MOINS_1_COMMIT_TAG_ARTEFACT>.

Je confirme qu'aucun rollback reel, aucun restore production, aucun reset DB,
aucune migration et aucune suppression massive n'ont ete lances pendant ce test.

Decision: ROLLBACK_TESTE_NON_DESTRUCTIF_VALIDE / NON_VALIDE
Reserves acceptees:
Date:
Nom:
Role:
Signature:
```

## Validation locale

Commande non destructive a lancer pour ce document:

```bash
git diff --check
```

Commandes volontairement non lancees:

- rollback reel;
- restore production;
- migration;
- reset DB;
- suppression massive;
- push.
