#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const requiredFiles = [
  'docs/recette/SPRINT_35_PHASE_1_STATUT_COMMERCIAL_DEMO_READY.md',
  'docs/recette/SPRINT_35_PHASE_2_ENVIRONNEMENT_DEMO_PUBLIC.md',
  'docs/recette/SPRINT_35_PHASE_3_GARDE_FOUS_DONNEES_SENSIBLES.md',
  'docs/recette/SPRINT_35_PHASE_4_CONTACT_DEMANDE_DEMO.md',
  'docs/recette/SPRINT_35_PHASE_5_OBSERVABILITE_MINIMALE.md',
  'docs/recette/SPRINT_35_PHASE_6_CHECKLIST_LANCEMENT_PREMIER_CLIENT.md',
  'docs/recette/SPRINT_36_COMMERCIAL_DEMO_READY_DECISION.md',
  'frontend/src/App.tsx',
  'frontend/src/pages/OpsDashboardPage.tsx',
  'frontend/src/pages/AuditLogPage.tsx',
  'frontend/src/api/__mocks__/ops-pilot-demo.mock.ts',
  'scripts/preprod-demo-health-check.mjs',
  'scripts/ops-daily-check.mjs',
  'scripts/ops-weekly-report.mjs',
];

const requiredPackageScripts = [
  'preprod:demo:health',
  'ops:daily:postprod',
  'ops:weekly-report',
  'frontend:smoke:routes',
];

const forbiddenScriptPatterns = [
  /\bmigration:(run|revert)\b/i,
  /\bseed:(demo|hgd)\b/i,
  /\bdemo:reset\b/i,
  /\bdocker\s+compose\b/i,
  /\bcompose:(up|down|migrate|seed)\b/i,
  /\brm\s+-rf\b/i,
];

const checks = [];
const warnings = [];

function readText(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function addCheck(name, ok, details) {
  checks.push({ name, ok, details });
}

function requireIncludes(label, source, tokens) {
  for (const token of tokens) {
    addCheck(`${label}: ${token}`, source.includes(token), `Expected token "${token}".`);
  }
}

for (const relativePath of requiredFiles) {
  addCheck(`Required file present: ${relativePath}`, existsSync(path.join(REPO_ROOT, relativePath)));
}

const packageJson = JSON.parse(readText('package.json'));
const scripts = packageJson.scripts ?? {};

for (const scriptName of requiredPackageScripts) {
  addCheck(
    `Package script present: ${scriptName}`,
    typeof scripts[scriptName] === 'string' && scripts[scriptName].length > 0,
  );
}

for (const [scriptName, command] of Object.entries(scripts)) {
  if (!scriptName.startsWith('sprint36:commercial')) {
    continue;
  }

  const matchedPattern = forbiddenScriptPatterns.find((pattern) =>
    pattern.test(command),
  );
  addCheck(
    `Sprint 36 commercial script is non-destructive: ${scriptName}`,
    !matchedPattern,
    matchedPattern ? `Forbidden command pattern found in "${command}".` : command,
  );
}

const appSource = readText('frontend/src/App.tsx');
requireIncludes('Commercial monitoring route', appSource, [
  "path=\"ops\"",
  "path=\"audit\"",
  './pages/OpsDashboardPage',
  './pages/AuditLogPage',
]);

const demoFixture = readText('frontend/src/api/__mocks__/ops-pilot-demo.mock.ts');
requireIncludes('Demo fixture tenants', demoFixture, [
  'tenant-demo-sain',
  'tenant-demo-warning',
  'tenant-demo-critique',
]);

addCheck(
  'Demo fixture avoids obvious real-data labels',
  !/(patient|hospitalier reel|planning reel|donnee patient)/i.test(demoFixture),
);

const observabilityDoc = readText(
  'docs/recette/SPRINT_35_PHASE_5_OBSERVABILITE_MINIMALE.md',
);
requireIncludes('Minimal monitoring doc', observabilityDoc, [
  'Checklist monitoring minimal',
  'GO demo commerciale controlee',
  'NO-GO demo commerciale',
  'T+15 min',
  'T+24 h',
]);

const decisionDoc = readText(
  'docs/recette/SPRINT_36_COMMERCIAL_DEMO_READY_DECISION.md',
);
requireIncludes('Sprint 36 decision doc', decisionDoc, [
  'COMMERCIAL_DEMO_READY',
  'Monitoring minimal et smoke demo commercial disponibles',
  'npm run sprint36:commercial:check',
]);

const hasPublicDemoRoute = [
  'path="/demo"',
  'path="/demande-demo"',
  'path="/contact"',
  'path="demo"',
  'path="demande-demo"',
  'path="contact"',
].some((token) => appSource.includes(token));

if (!hasPublicDemoRoute) {
  warnings.push(
    'No public /demo, /demande-demo or /contact route detected yet; this remains covered by Sprint 36 contact/prospect phases, not by this monitoring smoke.',
  );
}

const failures = checks.filter((check) => !check.ok);

if (failures.length > 0) {
  console.error('Commercial demo smoke failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}${failure.details ? ` (${failure.details})` : ''}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Commercial demo smoke passed (${checks.length} checks).`);
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
