import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const appPath = resolve(root, 'frontend/src/App.tsx');
const appSource = readFileSync(appPath, 'utf8');

const criticalRoutes = [
  { path: '/dashboard', page: 'frontend/src/pages/DashboardPage.tsx', importToken: './pages/DashboardPage' },
  { path: '/manager/cockpit', page: 'frontend/src/pages/ManagerCockpitPage.tsx', importToken: './pages/ManagerCockpitPage' },
  { path: '/manager/worklist', page: 'frontend/src/pages/ManagerWorklistPage.tsx', importToken: './pages/ManagerWorklistPage' },
  { path: '/planning', page: 'frontend/src/pages/Planning.tsx', importToken: './pages/Planning' },
  {
    path: '/planning/prepublication',
    page: 'frontend/src/pages/PlanningPrepublicationPage.tsx',
    importToken: './pages/PlanningPrepublicationPage',
  },
  { path: '/agents', page: 'frontend/src/pages/AgentsPage.tsx', importToken: './pages/AgentsPage' },
  { path: '/leaves', page: 'frontend/src/pages/LeavesPage.tsx', importToken: './pages/LeavesPage' },
];

const failures = [];

if (!appSource.includes('lazy(() => import(')) {
  failures.push('App.tsx must keep route-level lazy imports enabled.');
}

for (const route of criticalRoutes) {
  if (!existsSync(resolve(root, route.page))) {
    failures.push(`${route.path}: page file missing (${route.page}).`);
  }

  if (!appSource.includes(route.importToken)) {
    failures.push(`${route.path}: lazy import token missing (${route.importToken}).`);
  }
}

if (!appSource.includes('path="manager/cockpit"')) {
  failures.push('/manager/cockpit route is missing from App.tsx.');
}

if (!appSource.includes('path="planning/prepublication"')) {
  failures.push('/planning/prepublication route is missing from App.tsx.');
}

if (failures.length > 0) {
  console.error('Frontend route smoke failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Frontend route smoke passed for ${criticalRoutes.length} critical routes.`);
