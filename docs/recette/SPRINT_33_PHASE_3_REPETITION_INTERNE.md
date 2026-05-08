# Sprint 33 Phase 3 - Repetition interne avant pilote externe controle

## Objectif

Executer une repetition interne de bout en bout avant toute session pilote
externe controlee, en reprenant les garde-fous Sprint 32:

- parcours `/ops` et `/audit` sur jeu de demo non sensible;
- script de demo guidee court, reproductible et non destructif;
- controle d'anonymisation avant toute capture ou note partageable;
- journalisation des incidents de repetition;
- decision interne limitee a `PASSED` ou `BLOCKED`.

Cette repetition ne vaut pas signature hospitaliere, ne remplace pas un PV
pilote externe et ne doit contenir aucun vrai signataire.

## Perimetre

| Inclus | Exclu |
| --- | --- |
| Verification du script Sprint 32 Phase 5 sur `/ops` puis `/audit`. | Reset DB, seed destructif, migration ou rollback. |
| Relecture des preuves et captures avec grille d'anonymisation Sprint 32 Phase 1. | Donnees hospitalieres reelles, noms reels ou emails reels. |
| Simulation des roles animateur, operateur, observateur et conformite. | Signature nominative ou decision `GO_UTILISATEUR_EXTERNE`. |
| Capture des incidents de repetition et criteres de re-test. | Push, commit ou publication externe. |

## Roles de repetition

| Role interne | Placeholder | Responsabilite |
| --- | --- | --- |
| Animateur demo | `<ANIMATEUR_INTERNE>` | Lit le script, annonce le cadre, maintient le rythme. |
| Operateur demo | `<OPERATEUR_INTERNE>` | Execute les clics sur `/ops` et `/audit`. |
| Observateur recette | `<OBSERVATEUR_RECETTE>` | Chronometre, collecte preuves, classe les reserves. |
| Controle anonymisation | `<CONTROLEUR_ANONYMISATION>` | Verifie captures, notes, tenants, acteurs et commentaires libres. |
| Support technique | `<SUPPORT_TECHNIQUE>` | Observe sans mutation destructive, intervient seulement en blocage. |

Aucun de ces placeholders ne doit etre remplace par un nom reel dans ce
document. Les noms reels, si necessaires le jour du pilote, appartiennent au PV
pilote externe separe.

## Preconditions

| ID | Controle | Attendu | Statut |
| --- | --- | --- | --- |
| `S33-P3-PRE-01` | Environnement | URL interne ou preprod de demo accessible, version notee dans le ticket interne. | `TODO` |
| `S33-P3-PRE-02` | Donnees | Tenants limites a `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique`. | `TODO` |
| `S33-P3-PRE-03` | Comptes | Compte de demo limite aux droits necessaires `operations:read`, `operations:write`, `audit:read`. | `TODO` |
| `S33-P3-PRE-04` | Preuves | Dossier restreint cree pour captures et notes de parcours. | `TODO` |
| `S33-P3-PRE-05` | Anonymisation | Rappel Sprint 32 Phase 1 lu par l'observateur et le controleur anonymisation. | `TODO` |
| `S33-P3-PRE-06` | Interdits | Aucun reset DB, seed destructif, migration, suppression audit ou creation de donnees nominatives. | `TODO` |
| `S33-P3-PRE-07` | Script | Script Sprint 32 Phase 5 disponible et ordre `/ops` puis `/audit` confirme. | `TODO` |

## Checklist `/ops`

| ID | Verification | Attendu | Preuve | Statut |
| --- | --- | --- | --- | --- |
| `S33-P3-OPS-01` | Ouvrir `/ops`. | Le cockpit se charge sans erreur bloquante. | `S33-P3-OPS-01-open.png` ou note. | `TODO` |
| `S33-P3-OPS-02` | Comparer les trois tenants demo. | `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique` sont visibles et non sensibles. | `S33-P3-OPS-02-tenants.png` ou note. | `TODO` |
| `S33-P3-OPS-03` | Qualifier le tenant critique. | Statut critique, SLO en echec et priorite lisibles sans ambiguite. | `S33-P3-OPS-03-critical.png` ou note. | `TODO` |
| `S33-P3-OPS-04` | Ouvrir Action Center. | Item critique visible, statut attendu et preuve requise comprehensibles. | `S33-P3-OPS-04-action-center.png` ou note. | `TODO` |
| `S33-P3-OPS-05` | Ouvrir le runbook lie. | Procedure, permissions et preuve attendue lisibles. | `S33-P3-OPS-05-runbook.png` ou note. | `TODO` |
| `S33-P3-OPS-06` | Simuler une resolution non sensible. | Resume demo et preuve fictive acceptes sans donnee reelle. | `S33-P3-OPS-06-resolution.png` ou note. | `TODO` |
| `S33-P3-OPS-07` | Recharger ou revenir au resume tenant. | L'etat reste coherent; aucune action destructive requise. | `S33-P3-OPS-07-after-refresh.png` ou note. | `TODO` |

## Checklist `/audit`

| ID | Verification | Attendu | Preuve | Statut |
| --- | --- | --- | --- | --- |
| `S33-P3-AUD-01` | Ouvrir `/audit`. | La timeline audit est accessible depuis la session de demo. | `S33-P3-AUD-01-open.png` ou note. | `TODO` |
| `S33-P3-AUD-02` | Filtrer par tenant ou periode. | Les evenements lies au parcours Ops sont retrouvables. | `S33-P3-AUD-02-filtered.png` ou note. | `TODO` |
| `S33-P3-AUD-03` | Verifier detection et consultation. | Les actions SLO, Action Center et runbook sont reconstruites. | `S33-P3-AUD-03-sequence.png` ou note. | `TODO` |
| `S33-P3-AUD-04` | Verifier mutation ou resolution. | L'action de resolution demo est tracee avec acteur pseudonymise. | `S33-P3-AUD-04-resolution-event.png` ou note. | `TODO` |
| `S33-P3-AUD-05` | Ouvrir le detail d'un evenement. | Horodatage, action et contexte sont utiles sans exposer d'identite reelle. | `S33-P3-AUD-05-detail.png` ou note. | `TODO` |

## Script de repetition interne

| Bloc | Duree cible | Action | Point de controle |
| --- | ---: | --- | --- |
| Ouverture | 3 min | Rappeler que la session est interne, anonymisee et non signante. | Tous les participants acceptent les interdits. |
| Parcours `/ops` | 12 min | Derouler `S33-P3-OPS-01` a `S33-P3-OPS-07`. | Aucun blocage P1, aucune donnee sensible. |
| Parcours `/audit` | 8 min | Derouler `S33-P3-AUD-01` a `S33-P3-AUD-05`. | Sequence Ops reconstruite. |
| Controle anonymisation | 7 min | Relire captures et notes avant classement. | Chaque preuve est `ANONYMISEE`, `RESTREINTE` ou `REFUSEE`. |
| Incidents et decision | 5 min | Classer reserves, owners et retests. | Decision `PASSED` ou `BLOCKED`. |

Phrase d'ouverture recommandee:

```text
Cette repetition est interne. Elle verifie notre capacite a presenter le
parcours Ops puis Audit sur donnees anonymisees, sans reset DB, sans migration
destructive et sans vrai signataire. Toute fuite sensible ou action non
tracable bloque la repetition.
```

## Controle anonymisation

| Controle | Attendu |
| --- | --- |
| Noms et prenoms | Aucun nom reel dans le document, les notes ou les captures partageables. |
| Emails, logins, SSO, matricules | Absents ou remplaces par aliases non routables comme `role001@example.invalid`. |
| Tenants | Uniquement `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique`, sauf preuve restreinte justifiee. |
| Donnees RH ou patient | Absentes des preuves partageables; toute apparition classe la preuve `REFUSEE` ou `RESTREINTE`. |
| URLs internes | Remplacees par reference restreinte, sans token, domaine sensible ou query string. |
| Acteurs audit | Pseudonymises et suffisants pour reconstruire la sequence sans identifier une personne reelle. |
| Signataires | Placeholders uniquement; aucun nom reel, aucune signature effective. |

Commande de recherche conseillee avant rattachement au dossier interne:

```bash
rg -n "[@]|password|secret|token|Bearer|BEGIN PRIVATE|NIR|SSN" docs/recette/SPRINT_33_PHASE_3_REPETITION_INTERNE.md
```

Les occurrences volontaires de controle, comme `role001@example.invalid` dans
la table ci-dessus, doivent etre relues manuellement et acceptees uniquement si
elles restent des exemples anonymises.

## Journal des incidents de repetition

| ID | Etape | Symptome | Priorite | Decision immediate | Owner placeholder | Retest | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<INCIDENT_ID>` | `<S33-P3-OPS-XX_OU_AUD-XX>` | `<DESCRIPTION>` | `P1/P2/P3` | `CONTINUER / CONTOURNER / STOPPER` | `<OWNER_INTERNE>` | `<CRITERE_RETEST>` | `OUVERT` |

Regles de classement:

| Priorite | Sens repetition | Effet sur decision |
| --- | --- | --- |
| `P1` | Fuite sensible, `/ops` indisponible, `/audit` inexploitable, reset DB necessaire, action non tracable. | `BLOCKED` obligatoire. |
| `P2` | Parcours compris mais preuve incomplete, libelle ambigu, lenteur notable ou contournement manuel. | `PASSED` seulement si owner et retest sont renseignes. |
| `P3` | Irritant documentaire ou amelioration de confort sans impact demo. | Non bloquant si trace dans le journal. |

## Criteres de decision

| Decision | Conditions |
| --- | --- |
| `PASSED` | Tous les controles `/ops` et `/audit` critiques sont executes, aucune fuite sensible n'est constatee, les preuves sont classees, aucun P1 n'est ouvert, les P2 ont owner et critere de retest. |
| `BLOCKED` | Un controle critique `/ops` ou `/audit` est impossible, une preuve expose une donnee sensible, une action exige reset DB ou mutation destructive, l'audit ne reconstruit pas la resolution, ou un P1 reste ouvert. |

Statuts autorises par ligne de checklist:

- `PASSED`: controle execute et preuve acceptable.
- `PASSED_WITH_RESERVE`: controle execute avec reserve P2/P3 documentee.
- `BLOCKED`: controle non exploitable ou risque P1.
- `NOT_RUN`: controle non joue, avec justification obligatoire.

## Sortie attendue

La Phase 3 Sprint 33 est terminee lorsque:

- la checklist `/ops` est renseignee;
- la checklist `/audit` est renseignee;
- les preuves sont classees par anonymisation;
- les incidents de repetition ont priorite, owner placeholder et critere de
  retest;
- la decision interne est `PASSED` ou `BLOCKED`;
- aucun vrai signataire n'a ete ajoute.

## Validation documentaire

Controle a executer apres modification de ce fichier:

```bash
git diff --check -- docs/recette/SPRINT_33_PHASE_3_REPETITION_INTERNE.md
```

Resultat attendu: aucune erreur whitespace.
