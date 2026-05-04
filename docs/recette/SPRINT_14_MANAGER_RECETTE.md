# Sprint 14 Phase 1 - Recette manager guidee

Date: 2026-05-04

## Objectif

Prouver qu'un manager peut suivre un parcours exploitable de bout en bout:

- detecter un blocage avant publication;
- comprendre la cause metier et les seuils concernes;
- corriger avec une action guidee et tracee;
- publier apres preview conforme.

Cette recette se concentre volontairement sur le parcours manager. Elle ne modifie pas les donnees partagees ni les contrats globaux.

## Preuve automatisee

Test ajoute: `test/sprint14-manager-recette.e2e-spec.ts`.

Le test est faisable avec les patterns existants car `test/sprint12-phase5-workflow.e2e-spec.ts` fournit deja un precedent robuste: application Nest montee en memoire, authentification JWT reelle, repositories in-memory, service planning mocke autour du scenario metier. Le nouveau test garde ce format pour eviter toute dependance a une base partagee ou a des fixtures globales.

Scenario couvert:

| Etape | Endpoint | Preuve attendue |
| --- | --- | --- |
| Detecter | `GET /planning/manager/cockpit` | `blockedShifts=1`, action prioritaire `DETECT`, `nextAction=OPEN_WORKLIST` |
| Prioriser | `GET /planning/compliance/worklist` | item `shiftId=1401`, `ruleCode=WEEKLY_HOURS_LIMIT_EXCEEDED`, actions `REASSIGN_SHIFT` et `REVALIDATE_SHIFT` |
| Comprendre | `GET /planning/shifts/1401/compliance` | `isValid=false`, metadata `projected=52`, `limit=48` |
| Guider | `GET /planning/shifts/1401/correction-guidance` | sequence `UNDERSTAND`, `FIX`, `PUBLISH` |
| Bloquer avant correction | `POST /planning/publish/preview` | `publishable=false`, violation sur le shift `1401` |
| Corriger | `POST /planning/shifts/1401/reassign` | agent remplace par `102`, audit `REASSIGN_SHIFT` |
| Revalider | `POST /planning/shifts/1401/revalidate` | `isValid=true`, `blockingReasons=[]` |
| Verifier avant publication | `POST /planning/publish/preview` | `publishable=true`, `violations=[]` |
| Publier | `POST /planning/publish` | `affected=1`, `validatedShiftIds=[1401]`, audit `PUBLISH_PLANNING` |
| Controler la preuve | `GET /audit/verify` | chaine audit valide avec deux evenements |

Commande cible:

```bash
npm run test:e2e -- sprint14-manager-recette.e2e-spec.ts --runInBand
```

## Donnees de recette manuelle

Preparer un tenant de recette equivalent a `tenant-sprint14` avec:

- un manager disposant de `planning:read`, `planning:write`, `planning:publish`;
- un auditeur disposant de `audit:read`;
- un agent surcharge `101`;
- un agent disponible `102`;
- un shift pending `1401` sur `2026-08-03T08:00:00.000Z` -> `2026-08-03T20:00:00.000Z`;
- un historique ou une politique qui provoque `WEEKLY_HOURS_LIMIT_EXCEEDED` avec `projected=52` et `limit=48`.

## Checklist recette manager

| Statut | Controle |
| --- | --- |
| A faire | Ouvrir le cockpit manager sur `2026-08-03` et capturer le KPI de shift bloque. |
| A faire | Ouvrir la worklist et confirmer que le shift `1401` est prioritaire. |
| A faire | Ouvrir l'explication conformite et conserver les seuils `projected` / `limit`. |
| A faire | Verifier que la preview publication refuse la publication avant correction. |
| A faire | Reassigner le shift a l'agent `102` avec une justification explicite. |
| A faire | Revalider le shift et verifier que les blocages sont vides. |
| A faire | Relancer la preview publication et verifier `publishable=true`. |
| A faire | Publier puis verifier l'audit `REASSIGN_SHIFT` et `PUBLISH_PLANNING`. |

## Criteres d'acceptation

- La publication n'est pas possible tant que la violation bloquante existe.
- Le manager voit une cause comprehensible avant d'agir.
- La correction exige une justification non vide.
- La preview confirme l'absence de violations avant publication definitive.
- La publication genere une preuve audit verifiable.

## Limites

Cette Phase 1 valide le contrat HTTP et le guidage metier dans un e2e backend cible. Elle ne valide pas les clics navigateur React, car le perimetre d'ecriture interdit de modifier les surfaces frontend ou d'ajouter des fixtures UI partagees. Une recette UI pourra reprendre exactement les memes etapes sur `/manager/cockpit`, `/manager/worklist` et `/planning/prepublication`.
