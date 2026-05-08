# Sprint 32 Phase 5 - Script de demo guidee pilote externe

## Objectif

Conduire une demo externe courte, reproductible et non destructive pour un
hopital pilote. Le script montre le parcours Ops puis Audit sans reset DB,
sans seed, sans donnees nominatives reelles et sans promettre un
`GO_UTILISATEUR_EXTERNE` avant signature pilote.

La demo doit permettre aux observateurs de comprendre:

- comment un operateur identifie le tenant prioritaire dans `/ops`;
- comment il explique la cause, suit le runbook et rattache une preuve;
- comment `/audit` permet de reconstruire la sequence;
- quelles preuves sont partageables apres anonymisation;
- comment revenir a un etat de demonstration propre sans toucher la base.

## Cadre de session

| Element | Cible |
| --- | --- |
| Duree totale | 30 a 35 minutes, questions incluses. |
| Public | Sponsor pilote, responsable Ops, referent conformite, observateur recette. |
| Animateur | Produit ou lead Mediplan. |
| Operateur | Personne qui clique et annonce les actions. |
| Observateur | Chronometre, collecte preuves, note reserves et questions. |
| Environnement | Frontend de demo ou preprod avec donnees anonymisees. |
| Donnees | Tenants de demo `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique`. |
| Reset autorise | Reset UI, changement de tenant, rechargement page, reouverture session. |
| Reset interdit | Reset DB, migration, seed destructif, modification donnees hospitalieres reelles. |

## Preconditions

| Controle | Attendu avant d'ouvrir la session |
| --- | --- |
| Version | Version Mediplan et commit ou build note dans le ticket pilote. |
| Comptes | Compte demo limite aux droits `operations:read`, `operations:write` et `audit:read`. |
| Captures | Dossier de preuves restreint cree, convention de nommage partagee. |
| Donnees sensibles | Aucun nom reel d'agent, patient, operateur ou hopital dans les captures partageables. |
| Support | Responsable technique joignable pendant la session, sans intervention visible sauf blocage. |
| Decision | Rappeler que la demo prepare le pilote; elle ne signe pas seule un `GO_UTILISATEUR_EXTERNE`. |

## Timing recommande

| Bloc | Duree | But |
| --- | ---: | --- |
| Ouverture | 3 min | Poser le cadre, les limites et la regle de preuve. |
| Cockpit Ops | 6 min | Comparer sain, warning et critique. |
| Diagnostic SLO | 5 min | Montrer la cause operationnelle et l'urgence. |
| Action Center + runbook | 8 min | Cliquer, commenter, rattacher preuve, resoudre. |
| Audit | 6 min | Reconstruire la sequence et verifier la tracabilite. |
| Reset sans DB | 3 min | Montrer comment rejouer la demo proprement. |
| Questions / reserves | 5 min | Capturer decisions, irritants et suites. |

## Script de parole

### Ouverture

Dire:

> Cette session est une demo guidee sur donnees anonymisees. Elle sert a
> verifier la comprehension du parcours Ops et Audit avant pilote externe.
> Aucune action ne modifie une base hospitaliere reelle et aucune capture ne
> doit sortir sans anonymisation ou stockage restreint.

Insister sur trois points:

- le tenant critique est volontairement simule pour la demo;
- les preuves sont des traces de recette, pas des preuves de production client;
- la decision externe reste a formaliser dans un PV pilote signe.

## Parcours clique

| Etape | Ecran | Quoi dire | Quoi cliquer | Resultat attendu | Preuve |
| --- | --- | --- | --- | --- | --- |
| S32-P5-01 | Accueil ou menu | "Nous ouvrons le cockpit Ops, la surface de supervision et de traitement." | Aller sur `/ops`. | Le cockpit multi-tenant se charge. | `S32-P5-01-ops-open.png` |
| S32-P5-02 | `/ops` cockpit | "Les trois etats attendus sont visibles: sain, warning, critique." | Comparer `tenant-demo-sain`, `tenant-demo-warning`, `tenant-demo-critique`. | Le tenant critique ressort sans ambiguite. | `S32-P5-02-tenants-compare.png` |
| S32-P5-03 | `/ops` tenant critique | "Nous traitons le tenant prioritaire, pas un signal faible." | Selectionner ou garder `tenant-demo-critique`. | KPI alertes, incident, backup et notification visibles. | `S32-P5-03-critical-summary.png` |
| S32-P5-04 | Bloc SLO/SLA | "La priorite vient d'un objectif SLO en echec, avec valeur et seuil lisibles." | Ouvrir ou lire le detail SLO. | `FAILED`, `47min`, periode et raison actionnable visibles. | `S32-P5-04-slo-failed.png` |
| S32-P5-05 | Action Center | "L'item est en attente de preuve; l'operateur sait quoi fournir." | Ouvrir l'item critique `WAITING_EVIDENCE`. | Priorite, statut, preuve attendue et source lisibles. | `S32-P5-05-action-center.png` |
| S32-P5-06 | Runbook | "Le runbook transforme l'alerte en procedure: qui agit, quoi verifier, quelle preuve joindre." | Ouvrir le runbook lie a l'item. | Procedure, permissions `operations:write` et `audit:read`, preuves attendues visibles. | `S32-P5-06-runbook.png` |
| S32-P5-07 | Resolution | "Nous renseignons une resolution de demo avec preuve non sensible." | Saisir resume, URL de preuve fictive ou interne, libelle de preuve. | Le formulaire accepte la preuve et reste sur le tenant critique. | `S32-P5-07-resolution-form.png` |
| S32-P5-08 | Resolution | "La resolution est tracee; ce clic serait soumis aux droits operateur." | Cliquer sur resoudre ou valider. | Item passe a `RESOLVED` ou feedback de resolution visible. | `S32-P5-08-resolved.png` |
| S32-P5-09 | `/ops` apres action | "Nous verifions le retour a un etat lisible apres traitement." | Rafraichir les donnees ou revenir au resume tenant. | Statut global coherent, aucune perte de contexte tenant. | `S32-P5-09-ops-after-refresh.png` |
| S32-P5-10 | `/audit` | "L'audit doit reconstruire l'histoire sans outil technique externe." | Aller sur `/audit`. | Timeline audit accessible. | `S32-P5-10-audit-open.png` |
| S32-P5-11 | `/audit` filtres | "Nous filtrons les traces liees a l'alerte, au runbook et a la resolution." | Filtrer par periode, tenant ou familles Runbook/SLO/Action Center. | Evenements de detection, consultation, mutation et resolution visibles. | `S32-P5-11-audit-filtered.png` |
| S32-P5-12 | Cloture audit | "La preuve finale est la sequence horodatee et anonymisee." | Ouvrir le detail d'un evenement puis revenir a la liste. | Acteur pseudonymise, date, action et contexte reconstruisibles. | `S32-P5-12-audit-detail.png` |

## Points d'attention pendant les clics

| Risque | Conduite a tenir |
| --- | --- |
| Un nom reel apparait dans une capture. | Arreter la capture, masquer ou stocker en zone restreinte, noter la reserve conformite. |
| Le tenant critique n'est pas visible. | Ne pas improviser une mutation DB; basculer en note de parcours et rattacher la validation technique. |
| La resolution modifie un etat persistant de preprod. | Noter l'horodatage, ne pas rejouer sans accord technique, utiliser le reset non DB ci-dessous. |
| L'audit ne retrouve pas l'action. | Classer reserve P1 conformite si aucune trace exploitable n'est disponible. |
| Le public demande une decision externe immediate. | Revenir au PV pilote: decision possible seulement avec roles, preuves et signatures nominatifs. |

## Reset sans DB

Le reset de demo vise a rejouer proprement la presentation sans restaurer ni
modifier la base.

| Action | Quand l'utiliser | Effet attendu |
| --- | --- | --- |
| Recharger `/ops`. | Apres une hesitation ou un changement de filtre. | Les donnees de demo se relisent sans mutation destructive. |
| Revenir au tenant `tenant-demo-critique`. | Si le contexte tenant est perdu. | Le parcours critique reprend au meme point de demonstration. |
| Fermer puis rouvrir la session navigateur. | Si les filtres ou caches visuels perturbent la lecture. | Session propre, sans reset backend. |
| Utiliser une note de parcours. | Si une mutation a deja ete jouee et ne doit pas etre rejouee. | La demo continue avec capture precedente ou observation signee. |
| Rejouer uniquement la lecture Audit. | Si l'Action Center est deja resolu. | La tracabilite reste demonstrable sans recreer l'incident. |

Actions explicitement interdites pendant la demo:

- `npm run seed:demo`;
- `npm run demo:reset`;
- migration ou rollback;
- modification manuelle en base;
- suppression d'evenements audit;
- creation de donnees nominatives pour "faire plus reel".

## Preuves a collecter

| Preuve | Obligatoire | Regle |
| --- | --- | --- |
| Captures `/ops` `S32-P5-01` a `S32-P5-09` | Oui si navigateur disponible. | Masquer noms, emails, SSO, tenant reel et commentaires libres sensibles. |
| Captures `/audit` `S32-P5-10` a `S32-P5-12` | Oui si navigateur disponible. | Conserver horodatage utile, pseudonymiser acteur et identifiant tenant si partage externe. |
| Note de parcours | Oui si capture impossible. | Utiliser le modele ci-dessous. |
| Liste des reserves | Oui. | Classer P1/P2/P3, responsable, date cible et critere de re-test. |
| Decision de session | Oui. | `PILOT_GO`, `PILOT_GO_SOUS_RESERVE` ou `PILOT_NO_GO`, seulement si sponsor pilote present. |

Modele de note de parcours:

```text
Session:
Environnement:
Version:
Operateur:
Observateur:
Tenant:
Etape:
Action realisee:
Observation:
Preuve rattachee:
Donnees masquees:
Reserve:
Decision etape: PASSED / PASSED_WITH_RESERVE / BLOCKED / NOT_RUN
```

## Criteres de decision

| Decision | Conditions minimales |
| --- | --- |
| `PILOT_GO` | Parcours `/ops` et `/audit` compris par le public cible, preuves rattachees, aucune fuite sensible, aucune reserve P1. |
| `PILOT_GO_SOUS_RESERVE` | Parcours principal compris, reserves P2/P3 documentees, preuves substituables par notes signees. |
| `PILOT_NO_GO` | Tenant critique incomprehensible, action non tracable dans `/audit`, donnee sensible exposee, ou reset DB necessaire pour rejouer la demo. |

## Validations techniques associees

Avant diffusion du support de demo, conserver une sortie recente de:

```bash
npm run sprint31:phase5
git diff --check
```

Pour une validation documentaire ciblee apres modification de ce fichier:

```bash
git diff --check -- docs/recette/SPRINT_32_PHASE_5_DEMO_GUIDEE_PILOTE_EXTERNE.md
```

## Sortie attendue

La Phase 5 est terminee lorsque:

- le script ci-dessus est disponible pour l'animateur;
- le dossier de preuves ou le ticket pilote contient les captures ou notes;
- le reset sans DB est compris et respecte;
- les reserves sont classees;
- la decision reste limitee a `PILOT_READY` tant qu'aucun PV externe nominatif
  n'a ete signe.
