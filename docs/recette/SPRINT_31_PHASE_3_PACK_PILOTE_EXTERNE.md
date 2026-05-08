# Sprint 31 Phase 3 - Pack pilote externe

## Objectif

Preparer un pack de recette partageable avec un futur hopital pilote avant
ouverture controlee de Mediplan en contexte externe.

Ce document sert de checklist operationnelle: il liste quoi tester, quelles
preuves capturer, quels roles mobiliser, quels criteres de decision appliquer
et quelles donnees anonymiser avant tout partage hors cercle projet restreint.

## Perimetre pilote

| Domaine | Inclus dans le pack | Hors perimetre Phase 3 |
| --- | --- | --- |
| Parcours manager | Consultation planning, arbitrage alertes, remplacement, publication sous controle. | Publication reelle sans validation explicite du responsable pilote. |
| Parcours RH | Controle absences, compteurs, dossier agent, export filtre. | Import massif ou correction de donnees de production. |
| Parcours auditeur / conformite | Lecture audit, filtrage evenement, verification tracabilite et anonymisation. | Audit legal complet ou validation DPO definitive. |
| Parcours Ops | Cockpit, Action Center, runbook, notifications, preuves d'incident. | Astreinte production autonome sans accompagnement projet. |
| Donnees pilote | Jeu anonymise ou pseudonymise representatif de l'hopital. | Donnees nominatives brutes partagees par mail ou ticket public. |

## Roles a mobiliser

| Role | Responsabilite pendant pilote | Livrable attendu |
| --- | --- | --- |
| Sponsor hopital pilote | Confirme l'objectif metier, le service pilote et la fenetre de test. | Accord de demarrage et decision finale `PILOT_GO` ou `PILOT_NO_GO`. |
| Manager hospitalier pilote | Execute les parcours planning et valide la lisibilite terrain. | Notes de recette manager, captures planning, reserves metier. |
| Referent RH | Verifie absences, compteurs, exports et coherence dossier agent. | Releve RH anonymise, ecarts constates, validation des libelles. |
| Referent conformite / DPO | Valide les preuves partageables et les masquages obligatoires. | Avis anonymisation, liste des preuves refusees ou restreintes. |
| Responsable Ops | Supervise cockpit, alertes, runbooks, notifications et reprise. | Trace incident simule, decision sur exploitabilite Ops. |
| Lead technique Mediplan | Prepare environnement, comptes, donnees et support pendant recette. | Journal de preparation, version testee, controles techniques. |
| Observateur recette | Chronometre, collecte preuves, consolide irritants et decisions. | PV de session, matrice GO/NO-GO, dossier de preuves. |

## Preconditions

| Controle | Attendu avant session | Statut |
| --- | --- | --- |
| Environnement pilote | URL, version, tenant pilote et fenetre de disponibilite confirmes. | `A_VERIFIER` |
| Comptes de test | Comptes manager, RH, auditeur, Ops et admin limites au tenant pilote. | `A_VERIFIER` |
| Donnees | Jeu representatif anonymise: agents, services, absences, contraintes, incidents. | `A_VERIFIER` |
| Consentement documentaire | Regle de capture, stockage et partage validee avec le referent conformite. | `A_VERIFIER` |
| Support | Canal de support, responsable de session et procedure d'escalade connus. | `A_VERIFIER` |
| Rollback | Procedure de fin de test et desactivation des comptes temporaires prete. | `A_VERIFIER` |

## Checklist de tests

| ID | Parcours | Scenario a tester | Preuves a capturer | Critere d'acceptation |
| --- | --- | --- | --- | --- |
| P31-P3-01 | Acces | Connexion des roles pilote et verification des droits par profil. | Capture ecran accueil role, matrice droits, horodatage session. | Chaque role voit uniquement les fonctions attendues. |
| P31-P3-02 | Manager | Consulter un planning de service et identifier une alerte prioritaire. | Capture planning, detail alerte, note de comprehension manager. | L'alerte est comprise sans assistance technique. |
| P31-P3-03 | Manager | Simuler une absence et evaluer les propositions de remplacement. | Capture absence, liste candidats, decision retenue ou reserve. | Les propositions sont exploitables et les contraintes visibles. |
| P31-P3-04 | Manager | Previsualiser puis valider une publication pilote non destructive. | Capture preview, confirmation, trace audit associee. | La difference preview / planning courant est explicite. |
| P31-P3-05 | RH | Controler absences, compteurs et dossier agent anonymise. | Export filtre, capture compteur, note ecart eventuel. | Les donnees RH sont coherentes et les libelles comprensibles. |
| P31-P3-06 | RH | Verifier un export destine a consolidation pilote. | Fichier export stocke en zone restreinte, hash ou reference ticket. | Aucune donnee nominative brute ne sort du perimetre autorise. |
| P31-P3-07 | Ops | Ouvrir le cockpit Ops et qualifier un tenant en etat degrade ou critique. | Capture cockpit, statut tenant, KPI lisibles. | La priorite operationnelle est identifiable en moins de 2 minutes. |
| P31-P3-08 | Ops | Traiter un item Action Center: assigner, commenter, changer statut. | Captures avant/apres, commentaire, trace audit. | La sequence d'action est reconstructible et reversible si simulee. |
| P31-P3-09 | Ops | Ouvrir le runbook relie a l'incident pilote. | Capture procedure, permissions, preuves attendues. | Le runbook dit quoi faire, qui agit et quelle preuve joindre. |
| P31-P3-10 | Notifications | Verifier ack, rappel, echec et quiet hours sur notification simulee. | Journal notification, statut canal, horodatage. | Les attentes restantes sont visibles et auditables. |
| P31-P3-11 | Audit | Rechercher les traces manager, RH et Ops de la session. | Capture timeline filtree, identifiants evenement anonymises. | La chronologie de decision est reconstruite sans fuite sensible. |
| P31-P3-12 | Cloture | Desactiver comptes temporaires et archiver preuves. | Liste comptes fermes, emplacement preuves, PV de cloture. | Aucun acces temporaire actif ne subsiste apres la session. |

## Preuves a capturer

| Famille | Preuves obligatoires | Format accepte | Regle de stockage |
| --- | --- | --- | --- |
| Session | Date, environnement, version, tenant, participants, roles. | PV Markdown ou ticket recette. | Espace projet restreint. |
| Ecrans manager | Planning, alerte, remplacement, preview, validation. | PNG ou note de parcours signee. | Floutage noms agents et commentaires libres. |
| Ecrans RH | Liste absences, compteur, dossier agent, export filtre. | PNG, CSV anonymise, reference ticket. | Zone restreinte, pas de diffusion mail. |
| Ops | Cockpit, Action Center, runbook, notifications, resolution simulee. | PNG ou note horodatee. | Masquage tenant reel, operateurs et details incident sensibles. |
| Audit | Timeline, filtres, details evenement, acteur et horodatage pseudonymises. | PNG ou export journal restreint. | Conservation limitee au besoin de recette. |
| Decisions | Reserves, arbitrages, GO/NO-GO, signatures placeholders remplacees. | PV signe ou ticket approuve. | Archive recette pilote. |

## Donnees a anonymiser

| Type de donnee | Action obligatoire | Exemple acceptable |
| --- | --- | --- |
| Identite agent | Remplacer nom, prenom, matricule et email par alias stable. | `AGENT-001`, `agent001@example.invalid`. |
| Identite patient | Exclure du jeu pilote si possible; sinon pseudonymiser et limiter l'acces. | `PATIENT-A`, sans date de naissance complete. |
| Donnees RH sensibles | Masquer motif medical, commentaire libre, justificatif et piece jointe. | `MOTIF_ABSENCE_ANONYMISE`. |
| Service ou unite sensible | Generaliser si l'intitule revele une activite confidentielle. | `SERVICE-PILOTE-A`. |
| Tenant / hopital | Utiliser un nom de tenant pilote non public dans les captures partagees. | `tenant-hopital-pilote`. |
| Utilisateur operateur | Masquer email, login nominatif et identifiant SSO. | `ops-pilote-01`. |
| Horodatage | Conserver precision utile a l'audit sans exposer planning reel si non requis. | Date de session + plage horaire arrondie. |
| Exports | Supprimer colonnes inutiles et proteger le fichier par zone restreinte. | CSV avec colonnes minimales et alias stables. |

## Criteres GO / NO-GO

| Decision | Conditions |
| --- | --- |
| `PILOT_GO` | Tous les parcours critiques sont `PASSED`, preuves obligatoires rattachees, aucune fuite de donnee sensible, comptes temporaires maitrises. |
| `PILOT_GO_SOUS_RESERVE` | Parcours principal utilisable, reserves P2/P3 documentees, plan de levee date et responsable nomme. |
| `PILOT_NO_GO` | Blocage P1 sur acces, planning, RH, Ops, audit ou anonymisation; preuve manquante sur un parcours critique; fuite de donnee sensible non maitrisee. |

## Seuils de blocage

| Priorite | Exemple | Impact decision |
| --- | --- | --- |
| P1 | Donnee nominative brute partagee hors espace restreint. | `PILOT_NO_GO` immediat jusqu'a correction et purge. |
| P1 | Manager incapable de comprendre ou valider le planning pilote. | `PILOT_NO_GO` pour ouverture terrain. |
| P1 | Audit incapable de reconstruire une action sensible. | `PILOT_NO_GO` conformite. |
| P2 | Libelle metier ambigu mais contournement documente. | `PILOT_GO_SOUS_RESERVE` possible. |
| P2 | Capture manquante mais note de parcours signee disponible. | `PILOT_GO_SOUS_RESERVE` possible. |
| P3 | Irritant ergonomique sans impact decisionnel. | Suivi backlog, pas bloquant. |

## Format PV de session

```text
Hopital pilote:
Tenant:
Environnement:
Version Mediplan:
Date session:
Participants:
Roles executes:

Parcours testes:
- ID:
  Role:
  Statut: PASSED / PASSED_WITH_RESERVE / BLOCKED / NOT_RUN
  Preuves:
  Observations:
  Donnees anonymisees:
  Reserve:
  Responsable levee:

Decision finale: PILOT_GO / PILOT_GO_SOUS_RESERVE / PILOT_NO_GO
Signatures:
```

## Sortie attendue du pack

| Livrable | Responsable | Condition de cloture |
| --- | --- | --- |
| Checklist executee | Observateur recette | Chaque ligne a un statut et une preuve ou justification. |
| Dossier de preuves | Observateur recette + conformite | Toutes les preuves sont anonymisees ou restreintes. |
| PV de session | Sponsor pilote + Mediplan | Decision finale et reserves signees. |
| Plan de levee reserves | Responsable concerne | Chaque reserve P1/P2 a responsable, echeance et critere de re-test. |
| Cloture acces | Lead technique Mediplan | Comptes temporaires desactives ou reinitialises. |

## Validation documentaire

Controle a effectuer avant diffusion:

```bash
git diff --check docs/recette/SPRINT_31_PHASE_3_PACK_PILOTE_EXTERNE.md
```

Le document est diffusable lorsque:

- aucune donnee reelle d'hopital, agent, patient ou utilisateur n'est presente;
- les placeholders sont explicites;
- les preuves attendues sont associees a un role et a un parcours;
- les criteres `PILOT_GO`, `PILOT_GO_SOUS_RESERVE` et `PILOT_NO_GO` sont
  directement exploitables en session.
