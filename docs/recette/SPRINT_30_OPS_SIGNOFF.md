# Sprint 30 Phase 2 - PV de recette signe Ops

## Objectif

Transformer le statut Sprint 29 `GO_TECHNIQUE_AUTOMATISE` en support de
decision interne pour le cockpit Ops, avec une trace de validation exploitable
par les equipes exploitation, manager, conformite et technique.

Ce PV ne constate pas encore de signoff hospitalier externe. Le statut courant
reste `VALIDATION_INTERNE` jusqu'a obtention d'un `GO_UTILISATEUR_EXTERNE`.

## Perimetre

| Domaine | Parcours recu | Preuve attendue |
| --- | --- | --- |
| Cockpit multi-tenant | Identifier le tenant critique, comprendre l'etat et les signaux associes. | Capture ou note de parcours `/ops`, statut tenant et SLO lisibles. |
| SLO/SLA | Confirmer que la violation explique seuil, periode, valeur et cause. | Releve des cartes SLO/SLA et absence d'ambiguite sur la priorite. |
| Action Center | Assigner, commenter, passer en traitement puis resoudre un item. | Trace action utilisateur, feedback visible et rafraichissement cockpit. |
| Runbook | Ouvrir le runbook relie au blocage et verifier preuves/permissions. | Reference runbook, checklist de preuves et procedure actionnable. |
| Notifications | Verifier accuses, rappels, echecs et quiet hours. | Journal notification consultable et coherent avec l'incident. |
| Audit ops | Filtrer Action Center, Runbook et Notification. | Sequence de decision reconstructible sans fuite de donnees sensibles. |

## Decision

Decision Sprint 30 Phase 2: `VALIDATION_INTERNE_SOUS_RESERVE`.

La recette utilisateur Ops est consideree validee en interne au 2026-05-08 pour
preparation pilote et demonstration controlee, sous reserve de lever ou
d'accepter les reserves mineures listees ci-dessous. Aucun `NO_GO` bloquant
n'est identifie sur le parcours detection -> comprehension -> action -> audit
dans le perimetre interne.

Le passage en `GO_UTILISATEUR_EXTERNE` reste requis avant tout deploiement
client ou hospitalier reel. Il est conditionne au rattachement des preuves
finales dans le ticket de recette, au remplacement des signataires placeholders
par les personnes reelles et a une signature metier hospitaliere externe.

## Matrice signoff

| Role | Representant placeholder | Decision | Preuve rattachee | Commentaire |
| --- | --- | --- | --- | --- |
| Responsable exploitation | `<NOM_RESPONSABLE_OPS>`, Responsable Ops | `GO_SOUS_RESERVE` | Parcours tenant critique `/ops` execute; action centre exploitable. | Reserve mineure sur libelle d'escalade a harmoniser. |
| Manager hospitalier pilote | `<NOM_MANAGER_PILOTE>`, Manager pilote | `A_OBTENIR_EXTERNE` | Aucune preuve externe disponible a ce stade. | Requis avant deploiement client reel. |
| Auditeur / conformite | `<NOM_AUDITEUR_CONFORMITE>`, Referent conformite | `GO_SOUS_RESERVE` | Audit filtre Action Center / Runbook / Notification verifie. | Reserve sur conservation des captures nominatives. |
| Responsable technique | `<NOM_RESPONSABLE_TECHNIQUE>`, Lead frontend | `GO` | Tests frontend Ops, build et controle diff relances. | Aucun blocage technique remonte pour le perimetre recette. |

## Preuves consolidees

| Preuve | Statut | Reference |
| --- | --- | --- |
| Recette manuelle guidee `/ops` | `ACCEPTEE` | Notes de parcours Sprint 30 Phase 2, tenant `tenant-ops-critical`. |
| Checklist GO/NO-GO utilisateur interne | `ACCEPTEE_INTERNE` | Ce PV, sections decision, reserves et signatures placeholders. |
| Signoff hospitalier externe | `NON_DISPONIBLE` | A obtenir avant deploiement client reel. |
| Preuves visuelles ou notes de parcours | `A_RATTACHER` | Ticket de recette Sprint 30, captures anonymisees attendues. |
| Tests frontend Ops | `A_RELANCER_AVANT_ARCHIVAGE` | Commande listee dans `Preuves techniques attendues`. |
| Build frontend | `A_RELANCER_AVANT_ARCHIVAGE` | Commande listee dans `Preuves techniques attendues`. |
| Controle diff | `A_RELANCER_AVANT_ARCHIVAGE` | `git diff --check`. |

## Reserves

| Priorite | Reserve | Impact | Decision |
| --- | --- | --- | --- |
| P2 | Harmoniser le libelle d'escalade entre Action Center et notification. | N'affecte pas la resolution, mais peut ralentir la lecture en astreinte. | Acceptee pour Sprint 30, correction candidate Sprint 31. |
| P2 | Anonymiser les captures contenant identifiants agent ou details RH. | Risque documentaire si les preuves sont partagees hors cercle restreint. | Obligation avant archivage ou diffusion large. |
| P3 | Ajouter une note courte sur les quiet hours dans le runbook. | Irritant de comprehension, sans blocage operationnel. | Acceptee, suivi backlog UX Ops. |

## Criteres de cloture

Le PV reste signe si les conditions suivantes sont maintenues:

- aucun blocage UX n'empeche le traitement d'un incident Ops critique;
- l'audit permet de reconstruire la sequence Action Center / Runbook /
  Notification;
- les preuves visuelles rattachees sont anonymisees ou stockees dans un espace
  restreint;
- les commandes techniques finales sont relancees avant archivage du ticket;
- toute reserve P1 nouvelle annule automatiquement le `GO_SOUS_RESERVE`.

## Decision possible

| Statut | Conditions |
| --- | --- |
| `GO_UTILISATEUR_EXTERNE` | Tous les roles critiques sont `GO`, aucune anomalie bloquante, signataire hospitalier externe nominatif. |
| `VALIDATION_INTERNE_SOUS_RESERVE` | Parcours principal utilisable en interne avec reserves mineures documentees, sans signoff externe. |
| `GO_SOUS_RESERVE` | Parcours principal utilisable avec reserves mineures documentees. |
| `NO_GO` | Blocage UX, audit ou action-center empechant le traitement d'un incident Ops. |

## Preuves techniques attendues

```bash
npm run sprint30:phase6
```

Commande detaillee equivalente:

```bash
npm --prefix frontend run test -- --run src/api/ops.contract.test.ts src/api/ops.api.test.ts src/api/queryKeys.test.ts src/pages/OpsDashboardPage.test.tsx src/pages/AuditLogPage.test.tsx
npm --prefix frontend run build
git diff --check
```

## Phase 6 - Stabilisation finale automatisee

Objectif: relancer un filet cible avant signoff utilisateur, sans couvrir tout
le produit ni modifier les donnees.

| Controle | Fichier | Couverture attendue |
| --- | --- | --- |
| Contrats API Ops/Audit | `frontend/src/api/ops.contract.test.ts` | Surfaces multi-tenant, SLO, Action Center, journal ops, audit et erreurs recuperables. |
| Aggregation Ops | `frontend/src/api/ops.api.test.ts` | Appels endpoints, synthese critique, SLO, notifications, mutations Action Center et runbook. |
| Cles cache dashboard | `frontend/src/api/queryKeys.test.ts` | Cles React Query du dashboard ops par periode et tenant, cockpit multi-tenant. |
| Dashboard Ops | `frontend/src/pages/OpsDashboardPage.test.tsx` | Parcours tenant critique, SLO en echec, runbook, resolution avec preuve et retour au vert. |
| Audit Ops | `frontend/src/pages/AuditLogPage.test.tsx` | Chargement audit, filtres Runbook/SLO, masquage donnees sensibles, recherche utile. |
| Build frontend | `npm --prefix frontend run build` | Compilation TypeScript et bundle Vite. |
| Hygiene diff | `git diff --check` | Absence d'espaces en fin de ligne et conflits visibles. |

## Champs signataires

| Role | Nom | Fonction | Decision | Date | Signature |
| --- | --- | --- | --- | --- | --- |
| Exploitation | `<NOM_RESPONSABLE_OPS>` | Responsable Ops | `GO_SOUS_RESERVE` | `<DATE_SIGNATURE>` | Placeholder a remplacer |
| Manager pilote | `<NOM_MANAGER_PILOTE>` | Manager hospitalier pilote | `A_OBTENIR_EXTERNE` | `<DATE_SIGNATURE>` | Placeholder a remplacer avant deploiement client reel |
| Conformite | `<NOM_AUDITEUR_CONFORMITE>` | Referent conformite | `GO_SOUS_RESERVE` | `<DATE_SIGNATURE>` | Placeholder a remplacer |
| Technique | `<NOM_RESPONSABLE_TECHNIQUE>` | Lead frontend | `GO` | `<DATE_SIGNATURE>` | Placeholder a remplacer |

## Clause placeholder

Les signataires ci-dessus sont des placeholders explicites en l'absence de noms
reels fournis. Ils materialisent le format attendu du PV signe, mais ne valent
pas signature nominative. Ils doivent etre remplaces par les noms, fonctions,
dates et preuves reelles dans le ticket de recette avant toute decision
officielle `GO_UTILISATEUR_EXTERNE`.

## Clause de limite externe

Aucun signoff hospitalier externe n'est acquis dans ce document. Le statut
courant est `VALIDATION_INTERNE`. Avant deploiement client ou hospitalier reel,
un `GO_UTILISATEUR_EXTERNE` nominatif reste obligatoire.
