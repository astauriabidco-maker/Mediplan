# Sprint 32 Phase 3 - Roles signataires hopital pilote

## Objectif

Definir les roles signataires attendus cote hopital pilote avant une recette
externe Mediplan, sans inventer de noms reels ni transformer ce modele en
`GO_UTILISATEUR_EXTERNE`.

Ce document sert de matrice preparatoire: il clarifie qui doit signer quoi,
quelle responsabilite chaque role engage, quelles preuves doivent etre jointes
et quelles limites restent applicables tant que les personnes reelles ne sont
pas designees par l'hopital pilote.

## Principes de signature

- Aucun nom reel n'est renseigne dans ce modele.
- Les placeholders de signataire sont obligatoires tant que l'hopital pilote
  n'a pas communique les personnes autorisees.
- Une signature hospitaliere ne vaut que pour le role, le perimetre, la date,
  les preuves et les reserves explicitement rattaches au PV.
- Une signature Mediplan ne remplace jamais une signature metier hospitaliere.
- Toute preuve contenant donnees personnelles, identifiants SSO, informations
  RH sensibles ou details patient doit etre anonymisee ou stockee en zone
  restreinte avant signature.

## Roles signataires attendus

| Role signataire | Cote | Responsabilite engagee | Preuves a signer | Decision attendue |
| --- | --- | --- | --- | --- |
| Sponsor hopital pilote | Hopital | Confirme l'objectif pilote, le service pilote, la fenetre de test et l'acceptation finale des reserves. | PV de session, matrice GO/NO-GO, liste des reserves ouvertes ou levees. | `PILOT_GO`, `PILOT_GO_SOUS_RESERVE` ou `PILOT_NO_GO`. |
| Responsable metier planning | Hopital | Valide que les parcours planning sont comprehensibles et exploitables par le terrain. | Notes de parcours manager, captures planning anonymisees, decisions de remplacement ou publication simulee. | `GO_METIER`, `GO_METIER_SOUS_RESERVE` ou `NO_GO_METIER`. |
| Referent RH pilote | Hopital | Controle coherence absences, compteurs, dossiers agent et exports limites au perimetre pilote. | Captures RH anonymisees, export filtre ou reference ticket, liste des ecarts RH. | `GO_RH`, `GO_RH_SOUS_RESERVE` ou `NO_GO_RH`. |
| Referent conformite / DPO | Hopital | Valide les regles de capture, anonymisation, conservation et partage des preuves. | Grille d'anonymisation, liste des preuves refusees ou restreintes, trace de stockage. | `GO_CONFORMITE`, `GO_CONFORMITE_SOUS_RESERVE` ou `NO_GO_CONFORMITE`. |
| Responsable Ops hopital | Hopital | Evalue l'exploitabilite du cockpit, des alertes, runbooks, notifications et procedures d'escalade. | Captures cockpit, Action Center, runbook, journal notification, incident simule. | `GO_OPS`, `GO_OPS_SOUS_RESERVE` ou `NO_GO_OPS`. |
| Responsable technique Mediplan | Mediplan | Atteste version testee, environnement, comptes temporaires, preparation technique et controles relances. | Journal de preparation, version applicative, controles automatises, cloture acces. | `GO_TECHNIQUE`, `GO_TECHNIQUE_SOUS_RESERVE` ou `NO_GO_TECHNIQUE`. |
| Observateur recette Mediplan | Mediplan | Consolide preuves, horodatages, statuts de parcours, reserves et decisions sans signer a la place du pilote. | Checklist executee, dossier de preuves, PV consolide, plan de levee reserves. | `PV_COMPLET` ou `PV_INCOMPLET`. |

## Responsabilites par domaine

| Domaine | Signataire principal | Signataire consultatif | Responsabilite non delegable |
| --- | --- | --- | --- |
| Decision pilote globale | Sponsor hopital pilote | Observateur recette Mediplan | Accepter ou refuser l'ouverture pilote apres lecture des reserves. |
| Parcours planning | Responsable metier planning | Responsable Ops hopital | Confirmer que les arbitrages terrain sont lisibles et actionnables. |
| Parcours RH | Referent RH pilote | Referent conformite / DPO | Valider que les donnees RH exposees sont necessaires et comprises. |
| Preuves et anonymisation | Referent conformite / DPO | Responsable technique Mediplan | Autoriser ou refuser le partage des preuves hors espace restreint. |
| Exploitabilite Ops | Responsable Ops hopital | Responsable technique Mediplan | Confirmer que l'incident simule peut etre qualifie, suivi et audite. |
| Technique et acces | Responsable technique Mediplan | Responsable Ops hopital | Garantir la version testee, les comptes temporaires et leur fermeture. |

## Preuves a signer

| Famille de preuve | Signataires requis | Format accepte | Condition avant signature |
| --- | --- | --- | --- |
| PV de session pilote | Sponsor hopital pilote, Observateur recette Mediplan | Markdown signe, ticket approuve ou PDF archive | Tous les parcours executes ont statut, preuve ou justification. |
| Matrice GO/NO-GO | Sponsor hopital pilote, roles hospitaliers concernes | Tableau dans PV ou ticket recette | Les reserves P1/P2 ont priorite, responsable, echeance et critere de retest. |
| Parcours planning | Responsable metier planning | Captures anonymisees ou note de parcours signee | Aucun nom agent, commentaire sensible ou planning reel non autorise. |
| Parcours RH | Referent RH pilote | Capture, export filtre, reference ticket restreint | Colonnes minimales, alias stables, stockage restreint confirme. |
| Anonymisation et conservation | Referent conformite / DPO | Grille de controle ou commentaire d'approbation | Les preuves refusees sont listees et exclues du dossier partageable. |
| Parcours Ops | Responsable Ops hopital | Captures cockpit, runbook, Action Center, journal notification | Tenant, operateurs et details incident sensibles masques si necessaire. |
| Preuves techniques | Responsable technique Mediplan | Sortie de commande, hash, reference CI ou note horodatee | Version, environnement et date de relance sont renseignes. |
| Cloture acces | Responsable technique Mediplan, Sponsor hopital pilote | Liste comptes fermes ou ticket de desactivation | Aucun compte temporaire pilote actif sans justification explicite. |

## Modele de matrice sans noms reels

| Role | Placeholder signataire | Fonction | Perimetre signe | Decision | Date | Preuve rattachee | Reserve | Signature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sponsor hopital pilote | `<SIGNATAIRE_SPONSOR_HOPITAL>` | Sponsor pilote | Decision finale pilote | `<PILOT_GO_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<REF_PV_SESSION>` | `<RESERVES_OU_AUCUNE>` | Placeholder a remplacer |
| Responsable metier planning | `<SIGNATAIRE_METIER_PLANNING>` | Responsable planning pilote | Parcours planning et arbitrage terrain | `<GO_METIER_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<REF_PREUVE_PLANNING>` | `<RESERVES_PLANNING>` | Placeholder a remplacer |
| Referent RH pilote | `<SIGNATAIRE_RH_PILOTE>` | Referent RH | Absences, compteurs, dossier agent, export filtre | `<GO_RH_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<REF_PREUVE_RH>` | `<RESERVES_RH>` | Placeholder a remplacer |
| Referent conformite / DPO | `<SIGNATAIRE_CONFORMITE_DPO>` | Referent conformite | Anonymisation, stockage, diffusion des preuves | `<GO_CONFORMITE_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<REF_GRILLE_ANONYMISATION>` | `<RESERVES_CONFORMITE>` | Placeholder a remplacer |
| Responsable Ops hopital | `<SIGNATAIRE_OPS_HOPITAL>` | Responsable Ops | Cockpit, alertes, runbook, notification, audit incident | `<GO_OPS_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<REF_PREUVE_OPS>` | `<RESERVES_OPS>` | Placeholder a remplacer |
| Responsable technique Mediplan | `<SIGNATAIRE_TECH_MEDIPLAN>` | Responsable technique | Version, environnement, comptes, validations techniques | `<GO_TECHNIQUE_OU_NO_GO>` | `<DATE_SIGNATURE>` | `<REF_PREUVE_TECHNIQUE>` | `<RESERVES_TECHNIQUES>` | Placeholder a remplacer |
| Observateur recette Mediplan | `<OBSERVATEUR_RECETTE_MEDIPLAN>` | Observateur recette | Consolidation PV et dossier de preuves | `<PV_COMPLET_OU_INCOMPLET>` | `<DATE_SIGNATURE>` | `<REF_DOSSIER_PREUVES>` | `<RESERVES_CONSOLIDEES>` | Placeholder a remplacer |

## Regles de decision

| Decision globale | Conditions minimales |
| --- | --- |
| `PILOT_GO` | Sponsor hopital pilote signe, roles planning/RH/conformite/Ops applicables signes `GO`, preuves obligatoires rattachees, aucune reserve P1 ouverte. |
| `PILOT_GO_SOUS_RESERVE` | Sponsor hopital pilote signe, parcours critique utilisable, reserves P2/P3 acceptees avec responsable, echeance et critere de retest. |
| `PILOT_NO_GO` | Absence de sponsor signataire, reserve P1 ouverte, preuve critique manquante, anonymisation non validee ou compte temporaire non maitrise. |
| `A_CONSOLIDER` | Roles identifies mais noms reels, preuves, dates ou decisions non encore fournis par l'hopital pilote. |

## Clauses de limite

Ce document ne contient volontairement aucun nom reel. Il ne constitue pas un
PV signe et ne doit pas etre presente comme une validation hospitaliere
effective.

Le passage a un `GO_UTILISATEUR_EXTERNE` exige un PV distinct ou un ticket de
recette approuve avec personnes reelles, fonctions, dates, preuves rattachees,
reserves acceptees et decision explicite du sponsor hopital pilote.

## Validation documentaire

Controle a effectuer avant rattachement au dossier Sprint 32:

```bash
git diff --check docs/recette/SPRINT_32_PHASE_3_ROLES_SIGNATAIRES_HOPITAL.md
```

Le document est diffusable lorsque:

- aucun nom reel d'hopital, agent, patient ou utilisateur n'est present;
- chaque role hospitalier critique a une responsabilite et une preuve associee;
- les placeholders sont explicites et non ambigus;
- les decisions `PILOT_GO`, `PILOT_GO_SOUS_RESERVE`, `PILOT_NO_GO` et
  `A_CONSOLIDER` sont exploitables en session pilote.
