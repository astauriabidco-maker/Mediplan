# Sprint 10 - Frontend performance budget

Phase 1 adds a Vite bundle budget guard for CI.

## Commands

- `npm run frontend:budget` builds the frontend and checks the generated bundle.
- `npm run frontend:budget:check` checks an existing `frontend/dist` output.
- `npm run frontend:budget:smoke` validates the budget script against a temporary fixture.
- `npm run ci:frontend` now runs build, bundle budget, lint, tests, audit and route smoke.

## Thresholds

Defaults are intentionally conservative against the current Vite output:

- any JS/CSS asset: `450 KiB`
- entry chunk `index-*.js`: `350 KiB`
- route chunk default: `260 KiB`
- route-specific budgets are defined in `scripts/frontend-bundle-budget.mjs`

CI can tune thresholds without editing code:

```sh
FRONTEND_BUNDLE_MAX_CHUNK_KIB=500 npm run frontend:budget
FRONTEND_BUNDLE_MAX_ENTRY_KIB=320 npm run frontend:budget:check
FRONTEND_BUNDLE_MAX_ROUTE_KIB=220 npm run frontend:budget:check
FRONTEND_BUNDLE_ROUTE_BUDGETS="DashboardPage=430,/planning=300" npm run frontend:budget:check
```

The report lists the largest assets with raw and gzip sizes, then the expected lazy route chunks. Route budgets sum the known chunks for routes that split their heavy view code into secondary lazy chunks.
