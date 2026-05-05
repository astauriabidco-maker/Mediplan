#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const drillPath = path.join(scriptDir, 'preprod-incident-drill.mjs');
const source = await readFile(drillPath, 'utf8');

assert.match(
  source,
  /const dryRun = args\.has\('--dry-run'\) \|\| process\.env\.INCIDENT_DRY_RUN === 'true';/,
  'dry-run must be available via CLI flag or INCIDENT_DRY_RUN=true',
);
assert.match(
  source,
  /const allowPublish = requestedPublish && !dryRun;/,
  'publication must stay disabled unless INCIDENT_ALLOW_PUBLISH=true and dry-run is disabled',
);
assert.match(
  source,
  /const allowRestore = requestedRestore && !dryRun;/,
  'restore must stay disabled unless INCIDENT_ALLOW_RESTORE=true',
);
assert.match(
  source,
  /allowPublish\s*\?\s*'\/api\/planning\/publish'\s*:\s*'\/api\/planning\/publish\/preview'/s,
  'default publication path must use the non-mutating preview endpoint',
);
assert.match(
  source,
  /if \(allowRestore\) \{[\s\S]*\/api\/tenant-backups\/import\?[\s\S]*\} else \{/,
  'restore import must stay behind the explicit allowRestore guard',
);
assert.match(
  source,
  /const restoreGuard = dryRun[\s\S]*INCIDENT_ALLOW_RESTORE=true required to execute restore/,
  'skipped restore evidence must explain the active guard',
);
assert.match(
  source,
  /preprod-incident-drill-\$\{runDate\}\.json/,
  'JSON report filename must be generated',
);
assert.match(
  source,
  /preprod-incident-drill-\$\{runDate\}\.md/,
  'Markdown report filename must be generated',
);
assert.match(
  source,
  /# Rapport incidents preprod/,
  'Markdown title is required',
);
assert.match(
  source,
  /- Restauration executee:/,
  'Markdown restore summary is required',
);
assert.match(
  source,
  /- Publication executee:/,
  'Markdown publication summary is required',
);
assert.match(
  source,
  /const report = \{[\s\S]*mutations,/m,
  'JSON report must include mutations',
);
assert.match(
  source,
  /const report = \{[\s\S]*guards:/m,
  'JSON report must include guards',
);

const tempDir = await mkdtemp(
  path.join(os.tmpdir(), 'mediplan-incident-drill-'),
);
const reportDir = path.join(tempDir, 'reports');
const callsPath = path.join(tempDir, 'fetch-calls.json');
const wrapperPath = path.join(tempDir, 'run-drill.mjs');
const drillUrl = pathToFileURL(drillPath).href;

const wrapper = `
const calls = [];
let healthCalls = 0;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(url);
  const method = options.method || 'GET';
  const call = {
    path: parsed.pathname,
    method,
    search: parsed.search,
    body: options.body ? JSON.parse(options.body) : null,
  };
  calls.push(call);

  if (parsed.pathname === '/api/planning/publish/preview' && method === 'POST') {
    return json({
      publishable: false,
      message: 'Blocked by smoke drill preview',
      report: { violations: [{ code: 'SMOKE_INCIDENT' }], warnings: [] },
    });
  }

  if (parsed.pathname === '/api/planning/observability/health') {
    healthCalls += 1;
    return json({
      status: healthCalls === 1 ? 'DEGRADED' : 'OK',
      reasons: [],
      counters: { openAlerts: 0, highAlerts: 0 },
    });
  }

  if (parsed.pathname === '/api/tenant-backups/metrics') {
    return json({ exportable: true, datasets: { shifts: 2 } });
  }

  if (parsed.pathname === '/api/tenant-backups/export') {
    return json({
      kind: 'tenant-business-backup',
      schemaVersion: 'smoke-v1',
      integrity: { datasetCounts: { shifts: 2 } },
    });
  }

  if (parsed.pathname === '/api/audit/verify') {
    return json({ valid: true, total: 3 });
  }

  if (parsed.pathname === '/api/agent-alerts') {
    return json([]);
  }

  return json({ message: \`Unexpected smoke request: \${method} \${parsed.pathname}\` }, 599);
};

process.env.API_TOKEN = 'smoke-token';
process.env.BASE_URL = 'http://127.0.0.1:65535';
process.env.TENANT_ID = 'SMOKE-TENANT';
process.env.REPORT_DIR = ${JSON.stringify(reportDir)};
process.env.INCIDENT_FROM = '2026-05-04T00:00:00.000Z';
process.env.INCIDENT_TO = '2026-05-05T00:00:00.000Z';
process.env.INCIDENT_DRY_RUN = 'true';
delete process.env.INCIDENT_ALLOW_PUBLISH;
delete process.env.INCIDENT_ALLOW_RESTORE;
delete process.env.INCIDENT_EXPECT_BLOCKED_PUBLICATION;
delete process.env.INCIDENT_EXPECT_CRITICAL_ALERT;

await import(${JSON.stringify(drillUrl)});
await import('node:fs/promises').then(({ writeFile }) =>
  writeFile(${JSON.stringify(callsPath)}, JSON.stringify(calls, null, 2)),
);
`;

try {
  await writeFile(wrapperPath, wrapper);

  const run = spawnSync(process.execPath, [wrapperPath], {
    cwd: path.dirname(scriptDir),
    encoding: 'utf8',
  });

  assert.equal(
    run.status,
    0,
    `drill dry-run wrapper failed\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );

  const calls = JSON.parse(await readFile(callsPath, 'utf8'));
  const paths = calls.map((call) => `${call.method} ${call.path}`);

  assert.deepEqual(
    paths.filter((entry) => entry === 'POST /api/planning/publish'),
    [],
    'default dry-run must not call the mutating publish endpoint',
  );
  assert.deepEqual(
    paths.filter((entry) => entry === 'POST /api/tenant-backups/import'),
    [],
    'default dry-run must not call the restore import endpoint',
  );
  assert.deepEqual(
    paths.filter((entry) => entry === 'POST /api/auth/login'),
    [],
    'API_TOKEN should avoid the login request in the autonomous smoke',
  );
  assert.equal(
    paths.includes('POST /api/planning/publish/preview'),
    true,
    'default drill must use publication preview',
  );

  const today = new Date().toISOString().slice(0, 10);
  const jsonReportPath = path.join(
    reportDir,
    `preprod-incident-drill-${today}.json`,
  );
  const markdownReportPath = path.join(
    reportDir,
    `preprod-incident-drill-${today}.md`,
  );

  assert.equal(existsSync(jsonReportPath), true, 'JSON report must be written');
  assert.equal(
    existsSync(markdownReportPath),
    true,
    'Markdown report must be written',
  );

  const report = JSON.parse(await readFile(jsonReportPath, 'utf8'));
  const markdown = await readFile(markdownReportPath, 'utf8');
  const restoreScenario = report.scenarios.find(
    (scenario) => scenario.name === 'Restauration',
  );
  const publishMutation = report.mutations.find(
    (mutation) => mutation.name === 'planning.publish',
  );
  const restoreMutation = report.mutations.find(
    (mutation) => mutation.name === 'tenant-backups.import',
  );

  assert.equal(report.status, 'PASSED');
  assert.equal(report.goNoGo, 'GO');
  assert.equal(report.dryRun, true);
  assert.equal(report.guards.allowRestore, false);
  assert.equal(report.guards.allowPublish, false);
  assert.equal(report.tenant.id, 'SMOKE-TENANT');
  assert.equal(publishMutation?.action, 'simulated');
  assert.equal(restoreMutation?.action, 'skipped');
  assert.equal(restoreScenario?.observed, 'skipped');
  assert.equal(
    restoreScenario?.evidence?.guard,
    'dry-run active: restore mutation blocked',
  );
  assert.match(markdown, /# Rapport incidents preprod - \d{4}-\d{2}-\d{2}/);
  assert.match(markdown, /- Statut: PASSED/);
  assert.match(markdown, /- Go\/No-Go: GO/);
  assert.match(markdown, /- Dry-run: oui/);
  assert.match(markdown, /- Restauration executee: non/);
  assert.match(markdown, /- Publication executee: non, preview uniquement/);
  assert.match(markdown, /\| Restauration \| PASSED \| skipped \|/);
  assert.match(markdown, /\| tenant-backups\.import \| skipped \| POST \|/);

  console.log('preprod-incident-drill smoke passed');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
