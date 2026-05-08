# Sprint 33 Phase 1 - Dossier pilote externe controle

## Objectif

Constituer le dossier de preparation d'une session pilote externe controlee
Mediplan, afin de cadrer les conditions de test, les roles attendus, les
preuves a collecter et les criteres de decision avant exposition a un hopital
pilote.

Ce document vise uniquement la decision `PILOT_SESSION_READY`: il confirme que
la session pilote peut etre preparee et executee sous controle. Il ne vaut pas
`GO_UTILISATEUR_EXTERNE`, ne remplace pas un PV de recette signe et ne doit pas
etre presente comme une autorisation d'usage autonome par des utilisateurs
externes.

## Perimetre Phase 1

| Domaine | Inclus | Hors perimetre |
| --- | --- | --- |
| Preparation pilote | Cadrage de la session, roles, prerequis, preuves et criteres d'entree/sortie. | Ouverture generale a des utilisateurs externes. |
| Environnement | Identification de la version, du tenant pilote, des comptes temporaires et des controles de readiness. | Migration destructive, reset DB, import massif ou modification de production. |
| Donnees | Jeu de demonstration anonymise ou pseudonymise, preuves classees et restrictions de partage. | Donnees nominatives brutes, donnees patient/RH sensibles non masquees, diffusion hors zone restreinte. |
| Parcours | Manager, RH, Ops, audit/conformite, support de session et cloture acces. | Exploitation autonome sans accompagnement Mediplan. |
| Decision | Preparation d'une decision `PILOT_SESSION_READY`, `PILOT_SESSION_READY_SOUS_RESERVE` ou `PILOT_SESSION_NOT_READY`. | `GO_UTILISATEUR_EXTERNE`, signoff hospitalier definitif ou contractualisation. |

## Version et commit

| Champ | Valeur |
| --- | --- |
| Depot | Mediplan |
| Sprint | 33 |
| Phase | 1 - Dossier pilote externe controle |
| Branche observee | `main` |
| Commit observe | `0dafc8a2` |
| Statut documentaire cible | `PILOT_SESSION_READY` apres validation des criteres d'entree |
| Statut explicitement non accorde | `GO_UTILISATEUR_EXTERNE` |

La version de reference doit etre reverifiee le jour de la session pilote et
renseignee dans le PV avec le hash complet du commit execute.

## Environnement attendu

| Element | Attendu avant session | Preuve attendue |
| --- | --- | --- |
| URL pilote | URL d'environnement pilote identifiee et limitee aux participants autorises. | Reference ticket ou fiche environnement. |
| Tenant pilote | Tenant dedie ou tenant demo non sensible, sans confusion avec production. | Identifiant tenant pseudonymise dans le dossier. |
| Version applicative | Commit, tag ou build horodate partage avec les participants internes. | Sortie `git rev-parse HEAD`, tag de build ou release note. |
| Comptes temporaires | Comptes limites par role, perimetre et duree de session. | Matrice comptes/roles et procedure de desactivation. |
| Donnees | Donnees anonymisees, pseudonymisees ou generees pour la demonstration. | Avis conformite ou checklist anonymisation. |
| Observabilite | Logs, audit trail, support et canal d'incident disponibles pendant la session. | Capture health/readiness et canal support ouvert. |
| Cloture | Desactivation comptes, archivage preuves et debrief planifies. | Checklist de fin de session. |

## Participants attendus par role

Aucun nom reel n'est renseigne dans ce dossier. Les personnes physiques doivent
etre ajoutees uniquement dans le PV de session, le jour du pilote, avec leur
accord et leur role effectif.

| Role attendu | Responsabilite | Presence requise |
| --- | --- | --- |
| Sponsor hopital pilote | Confirmer l'objectif metier, le service pilote, la fenetre de test et la decision de cloture. | Obligatoire pour decision pilote. |
| Manager hospitalier pilote | Executer ou observer les parcours planning, alertes et remplacement. | Obligatoire si parcours manager au perimetre. |
| Referent RH | Verifier absences, compteurs, dossier agent et export filtre. | Obligatoire si parcours RH au perimetre. |
| Referent conformite / DPO | Valider les regles de preuve, de masquage et de conservation. | Obligatoire avant toute collecte partageable. |
| Responsable Ops | Suivre cockpit, Action Center, runbook, incident simule et cloture acces. | Obligatoire pour session controlee. |
| Support Mediplan | Qualifier les incidents, prioriser les reserves et tenir le canal de session. | Obligatoire pendant la fenetre pilote. |
| Lead technique Mediplan | Confirmer version, comptes, tenant, donnees et observabilite. | Obligatoire avant ouverture session. |
| Observateur recette | Collecter preuves, horodater observations, consolider reserves et PV. | Obligatoire pour decision exploitable. |

## Prerequis d'entree

| ID | Prerequis | Critere attendu | Statut initial |
| --- | --- | --- | --- |
| `S33-P1-ENT-01` | Perimetre pilote valide | Parcours, roles et duree de session confirmes par sponsor et Mediplan. | `A_VERIFIER` |
| `S33-P1-ENT-02` | Environnement pret | URL, tenant, version, comptes et observabilite identifies. | `A_VERIFIER` |
| `S33-P1-ENT-03` | Donnees controlees | Donnees anonymisees ou generees, sans donnees nominatives brutes partagees. | `A_VERIFIER` |
| `S33-P1-ENT-04` | Comptes limites | Droits par role revus, comptes temporaires tracables et desactivation planifiee. | `A_VERIFIER` |
| `S33-P1-ENT-05` | Support actif | Canal, responsable de session, escalade et rollback connus. | `A_VERIFIER` |
| `S33-P1-ENT-06` | Risques P1 traites | Aucun P1 ouvert sans owner, mitigation, date cible et critere de levee. | `A_VERIFIER` |
| `S33-P1-ENT-07` | Preuves cadrees | Formats, stockage, anonymisation et classification des preuves approuves. | `A_VERIFIER` |
| `S33-P1-ENT-08` | Distinction decisionnelle | Les participants comprennent que `PILOT_SESSION_READY` ne vaut pas `GO_UTILISATEUR_EXTERNE`. | `A_VERIFIER` |

## Preuves a collecter

| Famille | Preuves obligatoires | Format accepte | Regle de stockage |
| --- | --- | --- | --- |
| Preparation | Perimetre, date, environnement, version, tenant, roles et participants effectifs. | PV Markdown, ticket recette ou fiche session. | Espace projet restreint. |
| Readiness technique | Commit complet, build, health check, audit actif, canal support ouvert. | Sortie commande, capture ou reference CI. | Archive recette pilote. |
| Comptes et acces | Matrice roles/comptes, droits constates, date de desactivation. | Tableau, capture anonymisee, journal d'acces. | Zone restreinte. |
| Donnees | Avis anonymisation, echantillon valide, statut des exports. | Checklist conformite ou note signee. | Zone restreinte, pas de diffusion mail. |
| Parcours manager | Planning, alerte, remplacement, preview, validation simulee. | PNG anonymise ou note de parcours horodatee. | Masquage agents, services sensibles et commentaires libres. |
| Parcours RH | Absences, compteurs, dossier agent, export filtre. | PNG, CSV minimal anonymise ou reference ticket. | Stockage restreint avec colonnes justifiees. |
| Parcours Ops | Cockpit, Action Center, runbook, notification, incident simule. | PNG ou note horodatee. | Masquage tenant reel et operateurs. |
| Audit / conformite | Timeline, details evenement, acteurs pseudonymises, justification des masquages. | Capture ou export restreint. | Conservation limitee au besoin de recette. |
| Decision | Reserves P1/P2/P3, owners, echeances, decision de sortie. | PV de session ou ticket approuve. | Archive recette pilote. |

## Risques ouverts a relier

Ce dossier doit rester lie au registre Sprint 32 Phase 6:

- `docs/recette/SPRINT_32_PHASE_6_RISQUES_AVANT_PILOTE.md`
- `docs/recette/SPRINT_32_PILOT_READINESS_DECISION.md`
- `docs/recette/SPRINT_31_PHASE_6_BACKLOG_RESERVES.md`

| Risque | Lien attendu en Phase 1 | Condition de decision |
| --- | --- | --- |
| `S32-R01` - comptes pilote | Matrice comptes/roles et cloture acces rattachees au ticket pilote. | Bloquant si droits non verifies ou desactivation absente. |
| `S32-R02` - donnees pilote | Avis conformite et echantillon anonymise attaches. | Bloquant si donnee nominative brute sort du perimetre. |
| `S32-R03` - signoff externe | Roles reels renseignes uniquement dans le PV, sans placeholder signe. | Bloquant pour `GO_UTILISATEUR_EXTERNE`; non bloquant pour preparation si roles attendus sont identifies. |
| `S32-R06` - exploitation | Canal support, incident commander, escalade et rollback connus. | Bloquant si aucun responsable de session n'est joignable. |
| `S32-R10` - readiness environnement | Controle readiness horodate le jour J. | Bloquant si l'environnement n'est pas declare pret avant ouverture. |
| `S32-R12` - consolidation apres session | Debrief et arbitrage reserves planifies. | Reserve P2 si la date manque, P1 si aucun owner n'est designe. |

## Criteres de sortie

| Decision | Conditions |
| --- | --- |
| `PILOT_SESSION_READY` | Tous les prerequis d'entree sont `PASSED`, aucun P1 non mitige, environnement pret, preuves cadrees, participants par role confirmes et distinction avec `GO_UTILISATEUR_EXTERNE` rappelee dans le PV. |
| `PILOT_SESSION_READY_SOUS_RESERVE` | Session possible sous accompagnement, reserves P2/P3 documentees, owners et dates de levee renseignes, aucun risque P1 sans mitigation active. |
| `PILOT_SESSION_NOT_READY` | Environnement instable, donnees non maitrisees, compte temporaire non controle, support absent, risque P1 sans owner ou confusion maintenue avec `GO_UTILISATEUR_EXTERNE`. |

Une decision `PILOT_SESSION_READY` autorise seulement la tenue de la session
pilote controlee. Le `GO_UTILISATEUR_EXTERNE` exige un PV de session avec
participants reels, decision explicite, reserves acceptees ou levees, et
signature effective des roles habilites.

## Format minimal de PV attendu

```text
Session pilote:
Date:
Environnement:
Tenant:
Version / commit complet:
Participants reels:
Roles representes:

Prerequis d'entree:
- ID:
  Statut: PASSED / PASSED_WITH_RESERVE / BLOCKED
  Preuve:
  Commentaire:

Parcours executes:
- Parcours:
  Role:
  Statut: PASSED / PASSED_WITH_RESERVE / BLOCKED / NOT_RUN
  Preuves:
  Reserves:
  Owner:
  Date cible:

Risques ouverts relies:
- ID:
  Statut: MITIGE / ACCEPTE / BLOQUANT
  Preuve:

Decision de sortie:
PILOT_SESSION_READY / PILOT_SESSION_READY_SOUS_RESERVE / PILOT_SESSION_NOT_READY

Mention obligatoire:
Cette decision ne vaut pas GO_UTILISATEUR_EXTERNE.
```

## Validation documentaire

Controle a effectuer avant diffusion:

```bash
git diff --check docs/recette/SPRINT_33_PHASE_1_DOSSIER_PILOTE.md
```

Le dossier est diffusable lorsque:

- aucune personne physique, hopital reel, agent, patient ou utilisateur
  nominatif n'est invente;
- les participants sont decrits par roles uniquement;
- les risques ouverts Sprint 32 sont relies a des preuves attendues;
- les criteres d'entree et de sortie distinguent explicitement
  `PILOT_SESSION_READY` de `GO_UTILISATEUR_EXTERNE`;
- aucune action destructive, migration, reset DB ou ouverture autonome n'est
  impliquee par le document.
