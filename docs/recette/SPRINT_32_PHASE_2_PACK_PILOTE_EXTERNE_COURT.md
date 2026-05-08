# Sprint 32 Phase 2 - Pack pilote externe court

## Objectif

Fournir un pack court, partageable avec un hopital pilote, pour conduire une
demo controlee de Mediplan sans exposer de donnees sensibles ni transformer la
session en signoff utilisateur non signe.

Ce document complete `docs/recette/SPRINT_32_PILOT_READINESS_DECISION.md` et
reprend le format court attendu pour une premiere session hopital:
objectifs, prerequis, parcours de demo, preuves attendues et criteres de
succes.

## Objectifs de session

| ID | Objectif | Resultat attendu |
| --- | --- | --- |
| `S32-P2-O1` | Montrer le parcours manager sur planning de service anonymise. | Le manager comprend l'etat du planning, les alertes et les choix proposes. |
| `S32-P2-O2` | Verifier la lecture RH des absences et compteurs. | Le referent RH confirme que les libelles et ecarts visibles sont exploitables. |
| `S32-P2-O3` | Montrer le cockpit Ops et la prise en charge d'un incident simule. | Le referent Ops identifie priorite, action attendue, runbook et statut. |
| `S32-P2-O4` | Prouver la tracabilite minimale des actions sensibles. | L'auditeur retrouve les actions de demo avec acteur, heure et contexte pseudonymises. |
| `S32-P2-O5` | Collecter une decision pilote explicite. | Le sponsor choisit `PILOT_GO`, `PILOT_GO_SOUS_RESERVE` ou `PILOT_NO_GO`. |

## Prerequis

| Controle | Attendu avant demo | Blocage si absent |
| --- | --- | --- |
| Representants hopital | Sponsor pilote, manager, referent RH, referent Ops ou conformite identifies par role reel. | Oui, si aucun decisionnaire metier n'est present. |
| Environnement | URL, version Mediplan, tenant pilote et plage horaire confirmes. | Oui, si l'environnement n'est pas stable. |
| Comptes | Comptes temporaires limites aux roles de demo, sans acces production reel. | Oui, si les droits ne sont pas maitrises. |
| Donnees | Jeu de demo anonymise: agents, services, absences, alertes et incident simule. | Oui, si une donnee personnelle brute apparait. |
| Preuves | Espace restreint pour captures, notes de parcours et PV de session. | Oui, si les preuves doivent circuler par canal non maitrise. |
| Cloture | Procedure de desactivation des comptes temporaires connue. | Non bloquant demo, bloquant cloture. |

## Parcours de demo

| Etape | Role pilote | Action guidee | Preuve attendue |
| --- | --- | --- | --- |
| `S32-P2-D1` | Manager | Ouvrir le planning du service pilote et lire l'etat global. | Capture ou note: planning anonymise, date de session, version. |
| `S32-P2-D2` | Manager | Examiner une alerte prioritaire et comparer les options de remplacement. | Capture ou note: alerte, contraintes visibles, option retenue ou reserve. |
| `S32-P2-D3` | RH | Controler une absence et un compteur agent pseudonymise. | Capture ou note: agent alias, compteur, commentaire RH. |
| `S32-P2-D4` | Ops | Ouvrir le cockpit, qualifier un tenant critique simule et consulter le runbook. | Capture ou note: statut, priorite, runbook, action attendue. |
| `S32-P2-D5` | Ops | Changer le statut d'un item Action Center en mode demo. | Capture avant/apres ou note horodatee, sans modification production. |
| `S32-P2-D6` | Audit / conformite | Retrouver les actions manager, RH et Ops dans l'audit. | Capture ou note: timeline filtree, acteur pseudonymise, horodatage. |
| `S32-P2-D7` | Sponsor | Relire les reserves et choisir une decision pilote. | PV de decision avec role, date, statut et reserves. |

## Preuves attendues

| Famille | Minimum a conserver | Regle de partage |
| --- | --- | --- |
| Session | Hopital pilote placeholder, tenant, environnement, version, date, participants par role. | Pas de nom invente; noms reels seulement si fournis et autorises. |
| Manager | Planning, alerte, options de remplacement, comprehension terrain. | Alias agents et services; pas de planning nominatif brut. |
| RH | Absence, compteur, export ou note de controle. | Motifs sensibles masques; fichier stocke en espace restreint. |
| Ops | Cockpit, Action Center, runbook, changement de statut simule. | Tenant et operateurs pseudonymises dans toute capture partageable. |
| Audit | Timeline filtree, acteur, action, horodatage et contexte. | Identifiants techniques limites au besoin de recette. |
| Decision | Statut final, reserves, responsable et echeance de levee. | Decision signee par role reel; pas de signataire fictif. |

## Criteres de succes

| Decision | Criteres |
| --- | --- |
| `PILOT_GO` | Tous les parcours `S32-P2-D1` a `S32-P2-D7` sont executes, les preuves minimales sont rattachees, aucune donnee sensible brute n'est exposee, les comptes temporaires sont maitrises. |
| `PILOT_GO_SOUS_RESERVE` | Le parcours principal est compris par les roles hopital, aucune fuite sensible n'est constatee, les reserves P2/P3 ont un responsable, une echeance et un critere de re-test. |
| `PILOT_NO_GO` | Un blocage P1 empeche acces, comprehension planning, lecture RH, traitement Ops, audit, anonymisation ou collecte de decision. |

## Blocages P1

- Donnee personnelle, RH sensible, patient ou identifiant nominatif expose dans
  une preuve partageable non restreinte.
- Aucun representant hopital capable de porter la decision pilote.
- Manager incapable d'identifier l'alerte ou de comprendre les options de
  remplacement.
- Ops incapable de retrouver le runbook ou le statut attendu de l'incident
  simule.
- Audit incapable de reconstruire une action sensible de la session.
- Comptes temporaires impossibles a desactiver ou a limiter apres demo.

## PV court

```text
Hopital pilote:
Tenant:
Environnement:
Version Mediplan:
Date:
Participants par role:

Parcours executes:
- ID:
  Role:
  Statut: PASSED / PASSED_WITH_RESERVE / BLOCKED / NOT_RUN
  Preuve:
  Reserve:
  Responsable:
  Echeance:

Decision: PILOT_GO / PILOT_GO_SOUS_RESERVE / PILOT_NO_GO
Signataire hopital:
Signataire Mediplan:
Commentaires:
```

## Validation documentaire

Commandes a conserver avant diffusion du pack:

```bash
git diff --check docs/recette/SPRINT_32_PHASE_2_PACK_PILOTE_EXTERNE_COURT.md
```

Le pack est diffusable si:

- aucun nom reel, email, matricule, patient ou donnees RH sensibles n'est
  present dans le document;
- les roles signataires sont decrits sans identite inventee;
- chaque parcours possede une preuve attendue;
- les decisions `PILOT_GO`, `PILOT_GO_SOUS_RESERVE` et `PILOT_NO_GO` sont
  directement utilisables en session hopital.
