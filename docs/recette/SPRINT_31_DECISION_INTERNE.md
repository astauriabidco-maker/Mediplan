# Sprint 31 Phase 2 - Limites explicites et PV fondateur

## Objectif

Acter une validation interne honnete du cockpit Ops en l'absence de signataires
hospitaliers externes, avec un signataire unique assumant les roles fondateur,
Product Owner et responsable technique provisoire.

Ce PV consolide la decision Sprint 31 Phase 1 a partir des traces Sprint 29/30
de recette Ops. Il ne remplace pas un signoff hospitalier externe.

## References documentaires

| Reference | Role dans le PV |
| --- | --- |
| `docs/recette/SPRINT_29_OPS_UX_RECETTE.md` | Base de recette UX Ops et statut technique automatise. |
| `docs/recette/SPRINT_30_PHASE_1_OPS_RECETTE_GUIDEE.md` | Parcours guide detection -> comprehension -> action -> audit. |
| `docs/recette/SPRINT_30_PHASE_3_OPS_GO_NO_GO_UTILISATEUR.md` | Grille GO/NO-GO utilisateur Ops. |
| `docs/recette/SPRINT_30_PHASE_5_PREUVES_VISUELLES.md` | Preuves textuelles ou visuelles attendues. |
| `docs/recette/SPRINT_30_OPS_SIGNOFF.md` | PV Sprint 30 sous reserve, non nominatif. |
| `docs/recette/SPRINT_31_PHASE_4_DONNEES_DEMO_PILOTE_OPS.md` | Donnees demo pilote Ops sain/warning/critique sans reset DB. |

## Decision cible

Decision Sprint 31 Phase 2: `GO_INTERNE_SOUS_RESERVE`.

Statut courant: `VALIDATION_INTERNE`.

Ce statut autorise la poursuite produit, la preparation d'un pilote externe et
les demonstrations controlees. Il ne vaut ni `GO_UTILISATEUR_EXTERNE`, ni
validation hospitaliere nominative, ni autorisation de deploiement client reel.

La decision est prise sous reserve de maintenir les controles automatises,
d'anonymiser les preuves de recette partageables et de faire signer toute
ouverture externe par un representant metier reel.

## Signataire courant

| Signataire unique | Roles couverts | Perimetre couvert | Decision | Date | Signature |
| --- | --- | --- | --- | --- | --- |
| `Signataire unique: Fondateur/PO` | Fondateur / Product Owner / Responsable technique provisoire | Validation interne produit, parcours metier simule, coherence technique provisoire et acceptation des reserves. | `GO_INTERNE_SOUS_RESERVE` | `<DATE_SIGNATURE>` | Placeholder explicite, a remplacer par signature reelle si formalisation nominative requise. |

## Portee de validation

| Domaine | Statut interne | Justification |
| --- | --- | --- |
| Cockpit Ops multi-tenant | `GO_INTERNE_SOUS_RESERVE` | Les documents Sprint 30 couvrent identification tenant critique, SLO/SLA et priorite operationnelle. |
| Action Center et runbook | `GO_INTERNE_SOUS_RESERVE` | Le parcours assignation, commentaire, changement de statut, runbook et resolution est documente. |
| Audit et preuves | `GO_INTERNE_SOUS_RESERVE` | La sequence decisionnelle est reconstruite par les traces attendues, sous reserve d'anonymisation et de rattachement final. |
| Technique provisoire | `GO_INTERNE_SOUS_RESERVE` | Le signataire unique accepte une responsabilite technique provisoire, sous reserve de relance des controles cibles avant archivage. |
| Validation externe | `NON_COUVERTE` | Aucun representant hospitalier externe nominatif n'a signe ce PV. |

## Reserves acceptees

| Priorite | Reserve | Condition de maintien du GO interne |
| --- | --- | --- |
| P2 | Preuves visuelles finales encore a rattacher ou remplacer par notes de parcours signees. | Les preuves restent tracees dans le ticket de recette et anonymisees avant diffusion large. |
| P2 | Signoff externe non disponible. | Le statut reste limite a `GO_INTERNE_SOUS_RESERVE` jusqu'a recette pilote externe. |
| P2 | Relance technique finale a effectuer avant archivage. | Les commandes ciblees Sprint 30/31 sont executees et conservees comme preuve. |
| P3 | Libelles et aides Ops perfectibles. | Aucun defaut ne doit bloquer comprehension, action ou audit du parcours critique. |

## Limite explicite

Aucun signoff hospitalier externe n'est disponible a ce stade. Avant tout
deploiement client ou hospitalier reel, il faudra obtenir un
`GO_UTILISATEUR_EXTERNE` rattache a un pilote, avec noms, roles, dates et
preuves.

Le statut courant reste donc limite a `VALIDATION_INTERNE` tant qu'aucun
representant metier hospitalier externe n'a signe une decision explicite. Les
documents Sprint 29/30 peuvent servir de support de preparation, mais pas de
preuve de signoff externe.

## Conditions de maintien

- Les validations automatisees Sprint 30/31 restent vertes.
- Les preuves de recette interne sont conservees.
- Les donnees demo pilote Ops restent stabilisees sur les tenants sain,
  warning et critique documentes en Phase 4.
- Les limites du signoff interne sont visibles dans les documents de decision.
- Les reserves restantes sont suivies dans
  `docs/recette/SPRINT_31_PHASE_6_BACKLOG_RESERVES.md`.
- Les reserves bloquantes P1 restent absentes.
- Le signataire unique n'est pas transforme en signataire nominatif sans nom
  reel fourni.

## Conditions de passage en GO utilisateur externe

1. Designer au moins un representant metier hospitalier reel.
2. Executer le parcours pilote externe sur donnees anonymisees.
3. Rattacher captures ou notes de parcours au ticket pilote.
4. Obtenir une decision explicite: `GO_UTILISATEUR_EXTERNE`,
   `GO_EXTERNE_SOUS_RESERVE` ou `NO_GO_EXTERNE`.

## Validations techniques a conserver

```bash
npm run sprint30:phase6
git diff --check
```

Commande detaillee equivalente:

```bash
npm --prefix frontend run test -- --run src/api/ops.contract.test.ts src/api/ops.api.test.ts src/api/queryKeys.test.ts src/pages/OpsDashboardPage.test.tsx src/pages/AuditLogPage.test.tsx
npm --prefix frontend run build
git diff --check
```

## Statut final Phase 2

`VALIDATION_INTERNE` avec decision interne `GO_INTERNE_SOUS_RESERVE`.

Le PV est valide pour decision interne fondateur/PO uniquement. Il reste
conditionne aux reserves ci-dessus et ne doit pas etre presente comme un GO
utilisateur externe. Un `GO_UTILISATEUR_EXTERNE` nominatif reste obligatoire
avant tout deploiement client reel.
