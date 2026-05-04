# Sprint 8 - Architecture frontend manager

## Decision framework

Le repo contient deja un frontend structure dans `frontend/`:

- React 18 + Vite
- React Router v6
- TanStack Query
- Zustand pour l'authentification
- Axios centralise dans `frontend/src/api/axios.ts`
- Tailwind CSS + lucide-react

La phase 1 conserve ce stack. Aucun nouveau framework ni package n'est ajoute.

## Structure ajoutee

- `frontend/src/api/manager.api.ts`: client API type pour les surfaces Sprint 7 manager/conformite.
- `frontend/src/pages/ManagerCockpitPage.tsx`: page route `/manager`.
- `frontend/src/components/manager/`: composants de base du cockpit manager.

## Endpoints raccordes dans le client

- `GET /planning/manager/cockpit`
- `GET /planning/compliance/worklist`
- `GET /planning/shifts/:id/correction-guidance`
- `GET /planning/alerts/:id/correction-guidance`
- `GET /planning/compliance/recommendations`
- `GET /planning/shifts/:id/suggestions`
- `POST /planning/publish/preview`
- `GET /planning/compliance/timeline`
- `GET /planning/compliance/service-indicators`

## Routage et permission UI

La page manager est exposee via `/manager` sous le `ProtectedRoute` existant.
L'entree sidebar est visible pour les non-agents ayant `planning:read`, ou les roles deja consideres managers/admins par le layout.

## Prochaines phases

Les phases suivantes peuvent remplir les composants avec les parcours interactifs:

- tri/filtrage de la worklist,
- drawer "pourquoi ce shift est bloque",
- actions guidees de correction,
- prepublication et timeline detaillees.
