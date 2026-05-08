# Sprint 33 Phase 4 - Modele de PV pilote externe controle

## Objectif

Fournir un modele de proces-verbal pour une session pilote externe controlee
Mediplan, sans nom reel pre-rempli et sans pretendre a un `PILOT_GO` effectif.

Ce document est un canevas a completer pendant ou apres la session pilote. Il
doit rattacher chaque decision a des participants identifies par role, des
preuves verifiees, des reserves explicites et des signatures reelles ou
placeholders.

## Statut du modele

Statut documentaire: `MODELE_PV_A_COMPLETER`.

Decision globale par defaut: `<DECISION_A_RENSEIGNER>`.

Valeurs autorisees pour la decision finale:

- `PILOT_GO`
- `PILOT_GO_SOUS_RESERVE`
- `PILOT_NO_GO`

Tant que les participants reels, preuves, reserves, dates et signatures ne sont
pas renseignes, ce modele ne vaut pas accord pilote, ouverture en production,
ni validation utilisateur externe.

## Identification de la session

| Champ | Valeur a renseigner |
| --- | --- |
| Hopital pilote | `<ETABLISSEMENT_PILOTE>` |
| Service ou unite pilote | `<SERVICE_PILOTE>` |
| Date de session | `<DATE_SESSION>` |
| Heure de debut | `<HEURE_DEBUT>` |
| Heure de fin | `<HEURE_FIN>` |
| Environnement teste | `<ENVIRONNEMENT_PREPROD_OU_DEMO>` |
| Version Mediplan | `<VERSION_APPLICATION>` |
| Perimetre fonctionnel | `<PERIMETRE_PILOTE>` |
| Dossier de preuves | `<REF_DOSSIER_PREUVES>` |
| Redacteur PV | `<REDACTEUR_PV>` |

## Participants par role

| Role | Cote | Participant | Responsabilite pendant le pilote | Presence | Signature attendue |
| --- | --- | --- | --- | --- | --- |
| Sponsor hopital pilote | Hopital | `<SIGNATAIRE_SPONSOR_HOPITAL>` | Valide la decision finale, les reserves acceptees et le perimetre pilote. | `<PRESENT_ABSENT>` | Obligatoire pour decision globale |
| Responsable metier planning | Hopital | `<SIGNATAIRE_METIER_PLANNING>` | Evalue les parcours planning, publication, remplacement et arbitrage terrain. | `<PRESENT_ABSENT>` | Obligatoire si parcours planning execute |
| Referent RH pilote | Hopital | `<SIGNATAIRE_RH_PILOTE>` | Controle absences, compteurs, dossiers agent et exports limites. | `<PRESENT_ABSENT>` | Obligatoire si parcours RH execute |
| Referent conformite / DPO | Hopital | `<SIGNATAIRE_CONFORMITE_DPO>` | Valide anonymisation, stockage, diffusion et conservation des preuves. | `<PRESENT_ABSENT>` | Obligatoire si preuves partageables |
| Responsable Ops hopital | Hopital | `<SIGNATAIRE_OPS_HOPITAL>` | Evalue cockpit, alertes, runbooks, notifications et procedures d'escalade. | `<PRESENT_ABSENT>` | Obligatoire si parcours Ops execute |
| Responsable technique Mediplan | Mediplan | `<SIGNATAIRE_TECH_MEDIPLAN>` | Atteste version, environnement, comptes temporaires et controles techniques. | `<PRESENT_ABSENT>` | Obligatoire pour contexte technique |
| Observateur recette Mediplan | Mediplan | `<OBSERVATEUR_RECETTE_MEDIPLAN>` | Consolide preuves, reserves, horodatages et decisions sans signer a la place du pilote. | `<PRESENT_ABSENT>` | Obligatoire pour PV complet |
| Support ou expert invite | Hopital / Mediplan | `<PARTICIPANT_INVITE>` | Apporte un avis limite au domaine precise. | `<PRESENT_ABSENT>` | Optionnelle |

## Parcours executes

| ID | Parcours | Role pilote | Statut | Preuve rattachee | Reserve associee | Commentaire |
| --- | --- | --- | --- | --- | --- | --- |
| P-01 | Connexion et controle du perimetre pilote | Technique / Ops | `<PASSED_BLOCKED_NOT_RUN>` | `<REF_PREUVE_P01>` | `<RESERVE_OU_AUCUNE>` | `<COMMENTAIRE>` |
| P-02 | Consultation planning service pilote | Planning | `<PASSED_BLOCKED_NOT_RUN>` | `<REF_PREUVE_P02>` | `<RESERVE_OU_AUCUNE>` | `<COMMENTAIRE>` |
| P-03 | Simulation absence et remplacement | Planning / RH | `<PASSED_BLOCKED_NOT_RUN>` | `<REF_PREUVE_P03>` | `<RESERVE_OU_AUCUNE>` | `<COMMENTAIRE>` |
| P-04 | Controle compteurs et dossier agent anonymise | RH | `<PASSED_BLOCKED_NOT_RUN>` | `<REF_PREUVE_P04>` | `<RESERVE_OU_AUCUNE>` | `<COMMENTAIRE>` |
| P-05 | Lecture cockpit Ops et alertes pilote | Ops | `<PASSED_BLOCKED_NOT_RUN>` | `<REF_PREUVE_P05>` | `<RESERVE_OU_AUCUNE>` | `<COMMENTAIRE>` |
| P-06 | Verification audit et traces | Conformite / Technique | `<PASSED_BLOCKED_NOT_RUN>` | `<REF_PREUVE_P06>` | `<RESERVE_OU_AUCUNE>` | `<COMMENTAIRE>` |
| P-07 | Cloture session et controle acces temporaires | Technique / Sponsor | `<PASSED_BLOCKED_NOT_RUN>` | `<REF_PREUVE_P07>` | `<RESERVE_OU_AUCUNE>` | `<COMMENTAIRE>` |

Statuts autorises:

- `PASSED`: parcours execute et preuve exploitable rattachee.
- `BLOCKED`: parcours bloque ou reserve critique ouverte.
- `NOT_RUN`: parcours non execute, avec justification obligatoire.

## Preuves collectees

| Reference | Famille | Description | Responsable | Stockage | Sensibilite | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| `<REF_PREUVE_PLANNING>` | Planning | `<DESCRIPTION_PREUVE>` | `<RESPONSABLE>` | `<URL_OU_TICKET_RESTREINT>` | `<ANONYMISEE_RESTREINTE_REFUSEE>` | `<ACCEPTEE_A_CORRIGER_REFUSEE>` |
| `<REF_PREUVE_RH>` | RH | `<DESCRIPTION_PREUVE>` | `<RESPONSABLE>` | `<URL_OU_TICKET_RESTREINT>` | `<ANONYMISEE_RESTREINTE_REFUSEE>` | `<ACCEPTEE_A_CORRIGER_REFUSEE>` |
| `<REF_PREUVE_CONFORMITE>` | Conformite | `<DESCRIPTION_PREUVE>` | `<RESPONSABLE>` | `<URL_OU_TICKET_RESTREINT>` | `<ANONYMISEE_RESTREINTE_REFUSEE>` | `<ACCEPTEE_A_CORRIGER_REFUSEE>` |
| `<REF_PREUVE_OPS>` | Ops | `<DESCRIPTION_PREUVE>` | `<RESPONSABLE>` | `<URL_OU_TICKET_RESTREINT>` | `<ANONYMISEE_RESTREINTE_REFUSEE>` | `<ACCEPTEE_A_CORRIGER_REFUSEE>` |
| `<REF_PREUVE_TECHNIQUE>` | Technique | `<DESCRIPTION_PREUVE>` | `<RESPONSABLE>` | `<URL_OU_TICKET_RESTREINT>` | `<ANONYMISEE_RESTREINTE_REFUSEE>` | `<ACCEPTEE_A_CORRIGER_REFUSEE>` |

Regles de preuve:

- Aucune preuve nominative ne doit etre partagee hors espace restreint.
- Toute capture contenant donnees RH, identifiant utilisateur, commentaire
  sensible ou information patient doit etre anonymisee ou refusee.
- Une preuve manquante sur un parcours critique impose une reserve ou un
  `PILOT_NO_GO`.
- Les references de preuve doivent etre stables, horodatees et consultables par
  les signataires autorises.

## Reserves

| ID | Priorite | Domaine | Description | Impact pilote | Responsable | Echeance | Critere de levee | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | `<P1_P2_P3>` | `<DOMAINE>` | `<DESCRIPTION_RESERVE>` | `<IMPACT>` | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<CRITERE_RETEST>` | `<OUVERTE_ACCEPTEE_LEVEE>` |
| R-02 | `<P1_P2_P3>` | `<DOMAINE>` | `<DESCRIPTION_RESERVE>` | `<IMPACT>` | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<CRITERE_RETEST>` | `<OUVERTE_ACCEPTEE_LEVEE>` |
| R-03 | `<P1_P2_P3>` | `<DOMAINE>` | `<DESCRIPTION_RESERVE>` | `<IMPACT>` | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<CRITERE_RETEST>` | `<OUVERTE_ACCEPTEE_LEVEE>` |

Classification:

- `P1`: bloque la decision `PILOT_GO` et oriente vers `PILOT_NO_GO` tant que la
  reserve reste ouverte.
- `P2`: peut permettre `PILOT_GO_SOUS_RESERVE` si le sponsor accepte le risque,
  l'echeance et le critere de retest.
- `P3`: reserve mineure suivie dans le backlog pilote, sans blocage si acceptee.

## Matrice de decision

| Decision | Conditions minimales | Formulation a reporter dans le PV |
| --- | --- | --- |
| `PILOT_GO` | Sponsor hopital signe, roles applicables signes, preuves critiques acceptees, aucune reserve P1 ouverte, comptes temporaires maitrises. | "Le pilote externe controle est autorise dans le perimetre, les dates et les limites de ce PV." |
| `PILOT_GO_SOUS_RESERVE` | Sponsor hopital signe, parcours critiques exploitables, aucune reserve P1 ouverte, reserves P2/P3 acceptees avec responsable, echeance et retest. | "Le pilote externe controle est autorise sous reserves listees dans ce PV, sans extension de perimetre implicite." |
| `PILOT_NO_GO` | Sponsor absent, preuve critique manquante, reserve P1 ouverte, anonymisation refusee, acces temporaire non maitrise ou parcours critique bloque. | "Le pilote externe controle n'est pas autorise tant que les conditions bloquees ne sont pas levees et revalidees." |

Decision retenue pour cette session: `<PILOT_GO_OU_PILOT_GO_SOUS_RESERVE_OU_PILOT_NO_GO>`.

Justification synthetique:

```text
<JUSTIFICATION_DECISION>
```

## Clauses de non-production

- Ce PV pilote ne vaut pas mise en production.
- Ce PV pilote ne vaut pas autorisation de traitement de donnees reelles hors
  cadre valide par l'hopital pilote.
- Ce PV pilote ne vaut pas extension automatique a d'autres services,
  etablissements, utilisateurs ou cas d'usage.
- Aucune migration destructive, reset de base, purge massive ou action
  irreversible ne doit etre rattachee a cette decision.
- Les comptes temporaires, acces de demo et jeux de donnees de pilote doivent
  etre fermes, expires ou explicitement reconduits avec justification.
- Tout passage en production exige une decision separee, signee, datee, avec
  perimetre, risques, plan de rollback, exploitation et conformite valides.

## Actions post-session

| Action | Responsable | Echeance | Preuve de cloture | Statut |
| --- | --- | --- | --- | --- |
| Consolider le dossier de preuves | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<REF_CLOTURE>` | `<TODO_DONE_BLOCKED>` |
| Anonymiser ou retirer les preuves sensibles | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<REF_CLOTURE>` | `<TODO_DONE_BLOCKED>` |
| Lever ou accepter les reserves | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<REF_CLOTURE>` | `<TODO_DONE_BLOCKED>` |
| Fermer les comptes temporaires | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<REF_CLOTURE>` | `<TODO_DONE_BLOCKED>` |
| Planifier le retest si necessaire | `<RESPONSABLE>` | `<DATE_CIBLE>` | `<REF_CLOTURE>` | `<TODO_DONE_BLOCKED>` |

## Signatures placeholders

| Role | Nom et fonction | Decision signee | Date | Reserve acceptee | Signature |
| --- | --- | --- | --- | --- | --- |
| Sponsor hopital pilote | `<NOM_FONCTION_SPONSOR_HOPITAL>` | `<PILOT_GO_OU_PILOT_GO_SOUS_RESERVE_OU_PILOT_NO_GO>` | `<DATE_SIGNATURE>` | `<RESERVES_ACCEPTEES_OU_AUCUNE>` | `<SIGNATURE_SPONSOR_HOPITAL>` |
| Responsable metier planning | `<NOM_FONCTION_METIER_PLANNING>` | `<GO_METIER_OU_GO_SOUS_RESERVE_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<RESERVES_PLANNING>` | `<SIGNATURE_METIER_PLANNING>` |
| Referent RH pilote | `<NOM_FONCTION_RH_PILOTE>` | `<GO_RH_OU_GO_SOUS_RESERVE_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<RESERVES_RH>` | `<SIGNATURE_RH_PILOTE>` |
| Referent conformite / DPO | `<NOM_FONCTION_CONFORMITE_DPO>` | `<GO_CONFORMITE_OU_GO_SOUS_RESERVE_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<RESERVES_CONFORMITE>` | `<SIGNATURE_CONFORMITE_DPO>` |
| Responsable Ops hopital | `<NOM_FONCTION_OPS_HOPITAL>` | `<GO_OPS_OU_GO_SOUS_RESERVE_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<RESERVES_OPS>` | `<SIGNATURE_OPS_HOPITAL>` |
| Responsable technique Mediplan | `<NOM_FONCTION_TECH_MEDIPLAN>` | `<GO_TECHNIQUE_OU_GO_SOUS_RESERVE_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<RESERVES_TECHNIQUES>` | `<SIGNATURE_TECH_MEDIPLAN>` |
| Observateur recette Mediplan | `<NOM_FONCTION_OBSERVATEUR_RECETTE>` | `<PV_COMPLET_OU_PV_INCOMPLET>` | `<DATE_SIGNATURE>` | `<RESERVES_CONSOLIDEES>` | `<SIGNATURE_OBSERVATEUR_RECETTE>` |

## Controle avant diffusion

Avant diffusion du PV complete:

- remplacer les placeholders par les informations autorisees;
- verifier que la decision retenue est une des trois valeurs autorisees;
- confirmer que les preuves sensibles sont anonymisees, restreintes ou exclues;
- rattacher chaque reserve a un responsable, une echeance et un critere de
  levee;
- confirmer que les clauses de non-production restent visibles dans la version
  signee;
- executer le controle whitespace:

```bash
git diff --check
```
