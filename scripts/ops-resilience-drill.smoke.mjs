#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const drillPath = path.join(scriptDir, 'ops-resilience-drill.mjs');
const source = await readFile(drillPath, 'utf8');

assert.match(source, /defaultMode: 'dry-run'/, 'dry-run must be the default mode');
assert.match(source, /dbResetExecuted: false/, 'drill must declare no DB reset');
assert.match(
  source,
  /backupRestoreExecuted: false/,
  'drill must declare no backup restore',
);
assert.match(
  source,
  /notificationSent: false/,
  'drill must declare that no real notification is sent',
);
assert.match(
  source,
  /shellExecution: false/,
  'drill must declare shell execution disabled',
);
assert.doesNotMatch(
  source,
  /\bmethod:\s*['"](POST|PATCH|PUT|DELETE)['"]/,
  'resilience drill must not define mutating HTTP methods',
);
assert.doesNotMatch(source, /\brm\s+-rf\b/, 'drill must not contain rm -rf');
assert.doesNotMatch(
  source,
  /\bgit\s+(reset|checkout|clean)\b/,
  'drill must not contain destructive git commands',
);
assert.doesNotMatch(
  source,
  /\b(migration:(run|revert)|seed:(demo|hgd)|demo:reset)\b/,
  'drill must not contain DB migration or reset commands',
);
assert.match(
  source,
  /ops-resilience-drill-\$\{options\.date\}\.json/,
  'JSON report filename must be generated',
);
assert.match(
  source,
  /ops-resilience-drill-\$\{options\.date\}\.md/,
  'Markdown report filename must be generated',
);
assert.match(
  source,
  /routine-failure[\s\S]*notification-failure[\s\S]*backup-stale[\s\S]*audit-invalid[\s\S]*escalation-late/,
  'all Sprint 26 resilience scenarios must be registered',
);

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mediplan-ops-resilience-'));
const reportDir = path.join(tempDir, 'reports');

try {
  const dryRun = spawnSync(
    process.execPath,
    [
      drillPath,
      '--dry-run',
      '--report-dir',
      reportDir,
      '--date',
      '2026-05-08',
      '--from',
      '2026-05-07T00:00:00.000Z',
      '--to',
      '2026-05-08T00:00:00.000Z',
      '--tenant',
      'OPS-SMOKE',
    ],
    { cwd: path.dirname(scriptDir), encoding: 'utf8' },
  );

  assert.equal(
    dryRun.status,
    0,
    `dry-run failed\nstdout:\n${dryRun.stdout}\nstderr:\n${dryRun.stderr}`,
  );

  const dryJsonPath = path.join(reportDir, 'ops-resilience-drill-2026-05-08.json');
  const dryMarkdownPath = path.join(
    reportDir,
    'ops-resilience-drill-2026-05-08.md',
  );
  assert.equal(existsSync(dryJsonPath), true, 'dry-run JSON report must exist');
  assert.equal(
    existsSync(dryMarkdownPath),
    true,
    'dry-run Markdown report must exist',
  );

  const dryReport = JSON.parse(await readFile(dryJsonPath, 'utf8'));
  const dryMarkdown = await readFile(dryMarkdownPath, 'utf8');
  assert.equal(dryReport.summary.status, 'PLANNED');
  assert.equal(dryReport.mode, 'dry-run');
  assert.equal(dryReport.policy.nonDestructive, true);
  assert.equal(dryReport.policy.dbResetExecuted, false);
  assert.equal(dryReport.policy.backupRestoreExecuted, false);
  assert.equal(dryReport.policy.notificationSent, false);
  assert.deepEqual(dryReport.scenarioIds, [
    'routine-failure',
    'notification-failure',
    'backup-stale',
    'audit-invalid',
    'escalation-late',
  ]);
  assert.equal(
    dryReport.scenarios.every((scenario) => scenario.status === 'PLANNED'),
    true,
  );
  assert.match(dryMarkdown, /# Drill resilience ops Sprint 26 - 2026-05-08/);
  assert.match(dryMarkdown, /- Non destructif: oui/);
  assert.match(dryMarkdown, /- Restore backup execute: non/);

  const mockDir = path.join(tempDir, 'mock-reports');
  const mockRun = spawnSync(
    process.execPath,
    [
      drillPath,
      '--mock',
      '--scenarios',
      'backup-stale,audit-invalid,escalation-late',
      '--report-dir',
      mockDir,
      '--date',
      '2026-05-08',
      '--from',
      '2026-05-07T00:00:00.000Z',
      '--to',
      '2026-05-08T00:00:00.000Z',
      '--tenant',
      'OPS-SMOKE',
      '--max-backup-age-hours',
      '12',
      '--escalation-sla-minutes',
      '20',
    ],
    { cwd: path.dirname(scriptDir), encoding: 'utf8' },
  );

  assert.equal(
    mockRun.status,
    0,
    `mock run failed\nstdout:\n${mockRun.stdout}\nstderr:\n${mockRun.stderr}`,
  );

  const mockReport = JSON.parse(
    await readFile(path.join(mockDir, 'ops-resilience-drill-2026-05-08.json'), 'utf8'),
  );
  assert.equal(mockReport.summary.status, 'PASSED');
  assert.equal(mockReport.summary.decision, 'RECOVERY_READY');
  assert.equal(
    mockReport.scenarios.every((scenario) => scenario.status === 'PASSED'),
    true,
  );
  assert.equal(
    mockReport.scenarios.find((scenario) => scenario.id === 'backup-stale')
      .evidence.restoreExecuted,
    false,
  );

  const apiDir = path.join(tempDir, 'api-reports');
  const callsPath = path.join(tempDir, 'api-calls.json');
  const wrapperPath = path.join(tempDir, 'run-api-drill.mjs');
  const drillUrl = pathToFileURL(drillPath).href;
  const wrapper = `
const calls = [];
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(url);
  calls.push({
    path: parsed.pathname,
    method: options.method || 'GET',
    search: parsed.search,
  });

  if (parsed.pathname === '/api/tenant-backups/metrics') {
    return json({ exportable: true, lastSuccessfulBackupAt: '2026-05-08T00:00:00.000Z' });
  }
  if (parsed.pathname === '/api/audit/verify') {
    return json({ valid: true, total: 5, issues: [] });
  }
  if (parsed.pathname === '/api/ops/incidents') {
    return json([]);
  }
  return json({ message: \`Unexpected smoke request: \${parsed.pathname}\` }, 599);
};

process.env.API_TOKEN = 'smoke-token';
process.env.REPORT_DIR = ${JSON.stringify(apiDir)};
process.env.OPS_RESILIENCE_DATE = '2026-05-08';
process.env.OPS_RESILIENCE_FROM = '2026-05-07T00:00:00.000Z';
process.env.OPS_RESILIENCE_TO = '2026-05-08T00:00:00.000Z';

await import(${JSON.stringify(drillUrl)});
await import('node:fs/promises').then(({ writeFile }) =>
  writeFile(${JSON.stringify(callsPath)}, JSON.stringify(calls, null, 2)),
);
`;

  await writeFile(wrapperPath, wrapper);
  const apiRun = spawnSync(
    process.execPath,
    [
      wrapperPath,
      '--api',
      '--scenarios',
      'backup-stale,audit-invalid,escalation-late',
      '--tenant',
      'OPS-SMOKE',
      '--base-url',
      'http://127.0.0.1:65535',
    ],
    { cwd: path.dirname(scriptDir), encoding: 'utf8' },
  );

  assert.equal(
    apiRun.status,
    0,
    `api wrapper failed\nstdout:\n${apiRun.stdout}\nstderr:\n${apiRun.stderr}`,
  );

  const calls = JSON.parse(await readFile(callsPath, 'utf8'));
  assert.equal(
    calls.every((call) => call.method === 'GET'),
    true,
    'api mode must only use GET requests',
  );
  assert.deepEqual(
    calls.map((call) => call.path),
    ['/api/tenant-backups/metrics', '/api/audit/verify', '/api/ops/incidents'],
  );

  console.log('ops-resilience-drill smoke passed');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
