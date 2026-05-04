# Sprint 8 - Workflow manager complet

Objectif: fournir au frontend un parcours manager exploitable de bout en bout: detecter un probleme, comprendre pourquoi, corriger, publier, puis tracer l'action.

## Stack UI observee

- Frontend React 18 + Vite + TypeScript dans `frontend/`.
- Data fetching deja present avec `@tanstack/react-query`.
- Client HTTP centralise dans `frontend/src/api/axios.ts`.
- Aucun runner de tests UI detecte cote frontend (`vitest`, Testing Library, Playwright et Cypress absents du `frontend/package.json`).

Consequence Sprint 8 Phase 6: la consolidation se fait par contrats TypeScript compiles par `npm --prefix frontend run build`, mocks API deterministes, et documentation de workflow. Les tests de composants pourront etre ajoutes quand un runner UI sera installe.

## Routes UI recommandees

| Route UI                          | Objectif                      | Endpoints principaux                                                                  |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `/planning/manager`               | Cockpit manager               | `GET /planning/manager/cockpit`, `GET /planning/observability/health`                 |
| `/planning/manager/worklist`      | File de correction            | `GET /planning/compliance/worklist`, `GET /planning/compliance/recommendations`       |
| `/planning/shifts/:id/compliance` | Comprendre un blocage         | `GET /planning/shifts/:id/compliance`, `GET /planning/shifts/:id/correction-guidance` |
| `/planning/shifts/:id/correct`    | Corriger un shift             | `GET /planning/shifts/:id/suggestions`, actions `POST /planning/shifts/:id/*`         |
| `/planning/publish`               | Prepublication et publication | `POST /planning/publish/preview`, `POST /planning/publish`                            |
| `/planning/manager/timeline`      | Tracabilite lisible           | `GET /planning/compliance/timeline`, `GET /planning/compliance/reports`               |

## Endpoints consommes

Les fonctions frontend sont centralisees dans `frontend/src/api/manager-workflow.api.ts`.

| Etape      | Endpoint                                        | Permission                         | Etat UI attendu                                 |
| ---------- | ----------------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| Detecter   | `GET /planning/manager/cockpit`                 | `planning:read`                    | KPI, sante globale, actions prioritaires        |
| Detecter   | `GET /planning/compliance/worklist`             | `planning:read`                    | Liste triee par criticite et categorie          |
| Detecter   | `GET /planning/compliance/service-indicators`   | `planning:read`                    | Couverture, surcharge et alertes par service    |
| Comprendre | `GET /planning/shifts/:id/compliance`           | `planning:read`                    | Raisons bloquantes, warnings, metadonnees       |
| Comprendre | `GET /planning/shifts/:id/correction-guidance`  | `planning:read`                    | Actions disponibles et permissions requises     |
| Comprendre | `GET /planning/shifts/:id/suggestions`          | `planning:read`                    | Remplacants scores, raisons, action recommandee |
| Corriger   | `POST /planning/shifts/:id/reassign`            | `planning:write`                   | Shift reattribue, relancer validation           |
| Corriger   | `POST /planning/shifts/:id/request-replacement` | `planning:write`                   | Remplacement demande, timeline mise a jour      |
| Corriger   | `POST /planning/shifts/:id/exception`           | `planning:exception`               | Exception justifiee, warning de publication     |
| Corriger   | `POST /planning/shifts/:id/revalidate`          | `planning:write`                   | Probleme resolu ou encore bloque                |
| Corriger   | `PATCH /planning/alerts/:id/resolve`            | `planning:write` + `alerts:manage` | Alerte fermee avec raison                       |
| Publier    | `POST /planning/publish/preview`                | `planning:read`                    | Rapport publishable, violations, warnings       |
| Publier    | `POST /planning/publish`                        | `planning:manage`                  | Publication acceptee ou bloquee                 |
| Tracer     | `GET /planning/compliance/timeline`             | `audit:read`                       | Historique des corrections et publications      |

Le mapping contractuel est aussi disponible dans `frontend/src/api/manager-workflow.contract.ts`.

## Mocks API

Les mocks deterministes sont dans `frontend/src/api/__mocks__/manager-workflow.mock.ts`.

Ils couvrent:

- cockpit degrade avec surcharge hebdomadaire,
- worklist avec `WEEKLY_OVERLOAD` et `MISSING_COMPETENCY`,
- indicateurs par service,
- explication de shift bloque,
- guidance de correction,
- recommandations decisionnelles,
- suggestions de remplacants,
- prepublication bloquee,
- publication reussie apres correction,
- timeline detecter/corriger/publier.

Usage recommande dans Storybook, tests futurs ou vues en developpement:

```ts
import { managerWorkflowMockApi } from '@/api/__mocks__/manager-workflow.mock';

const cockpit = await managerWorkflowMockApi.cockpit();
const worklist = await managerWorkflowMockApi.worklist();
```

## Parcours nominal

1. Detecter
   Le manager ouvre `/planning/manager`. Le frontend charge `cockpit`, `worklist`, `service-indicators` et `observability`. Si `blockedShifts > 0` ou `health !== HEALTHY`, le premier bloc affiche une priorite "A corriger avant publication".

2. Comprendre
   Depuis un item worklist, ouvrir `shiftCompliance` et `shiftCorrectionGuidance`. L'UI affiche les `blockingReasons`, les metadonnees de regle, les permissions requises et les actions disponibles.

3. Corriger
   Le manager choisit une action. Pour une surcharge, l'UI appelle d'abord `shiftSuggestions`, puis `reassignShift` avec l'agent choisi. En cas d'impossibilite operationnelle, `approveException` exige une justification visible.

4. Revalider
   Apres correction, appeler `revalidateShift`. Si `validation.isValid` reste `false`, l'item demeure dans la file et l'erreur est affichee localement sur le shift.

5. Publier
   Appeler `previewPublish`. Si `publishable=false`, afficher les violations et renvoyer vers la worklist. Si `publishable=true`, appeler `publish`.

6. Tracer
   Apres publication ou correction, charger `timeline` pour afficher les evenements: scan, reassignation, exception, resolution d'alerte et publication.

## Etats et erreurs UI

| Cas                                | Affichage attendu                                                       |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `400` date invalide                | Message de filtre pres du selecteur de periode                          |
| `400` exception sans justification | Message pres du champ justification                                     |
| `401`                              | Redirection login via l'intercepteur existant                           |
| `403`                              | Etat "permission insuffisante", action desactivee                       |
| `404` shift/alerte introuvable     | Recharger la worklist et afficher "element deja traite ou inaccessible" |
| `409` etat concurrent              | Recharger cockpit + worklist, demander confirmation                     |
| `publishable=false`                | Ne pas afficher le bouton final comme action primaire                   |
| warnings avec exception            | Afficher raison, approbateur et date avant publication                  |

## Garde-fous de contrat

- `frontend/src/api/manager-workflow.api.ts` type les payloads consommes par le frontend.
- `frontend/src/api/manager-workflow.contract.ts` liste les endpoints du parcours et expose `getMissingManagerWorkflowSteps`.
- Le build frontend compile ces contrats et les mocks.
- Les e2e backend existants couvrent deja le parcours manager detecter/comprendre/corriger/publier.

Quand un runner UI sera ajoute, les premiers tests a ecrire sont:

- rendu cockpit degrade avec `managerWorkflowMockCockpit`,
- clic worklist -> chargement `shiftCompliance`,
- reassignation -> revalidation -> disparition de l'item,
- prepublication bloquee puis publication apres correction,
- timeline affichee apres action.
