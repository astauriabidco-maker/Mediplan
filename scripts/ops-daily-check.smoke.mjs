#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const checkPath = path.join(scriptDir, 'ops-daily-check.mjs');
const source = await readFile(checkPath, 'utf8');

assert.match(
  source,
  /mutationsExecuted: false/,
  'daily check must declare that it executes no mutations',
);
assert.match(
  source,
  /backupRestoreExecuted: false/,
  'daily check must declare that it does not restore backups',
);
assert.match(
  source,
  /alertResolutionExecuted: false/,
  'daily check must declare that it does not resolve alerts',
);
assert.doesNotMatch(
  source,
  /\bmethod:\s*['"](POST|PATCH|PUT|DELETE)['"]/,
  'daily check must not define mutating HTTP methods',
);
assert.match(
  source,
  /ops-daily-check-\$\{report\.runDate\}\.json/,
  'JSON report filename must be generated',
);
assert.match(
  source,
  /ops-daily-check-\$\{report\.runDate\}\.md/,
  'Markdown report filename must be generated',
);

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mediplan-ops-daily-'));
const reportDir = path.join(tempDir, 'reports');
const callsPath = path.join(tempDir, 'fetch-calls.json');
const wrapperPath = path.join(tempDir, 'run-ops-daily.mjs');
const checkUrl = pathToFileURL(checkPath).href;

const wrapper = `
const calls = [];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(url);
  const method = options.method || 'GET';
  calls.push({
    path: parsed.pathname,
    method,
    search: parsed.search,
  });

  if (parsed.pathname === '/api/health/live') {
    return json({ status: 'ok' });
  }

  if (parsed.pathname === '/api/health/ready') {
    return json({ status: 'ready' });
  }

  if (parsed.pathname === '/api/planning/observability/health') {
    return json({
      status: 'OK',
      reasons: [],
      counters: {
        openAlerts: 0,
        highAlerts: 0,
        pendingShifts: 0,
        refusedPublications: 0,
      },
    });
  }

  if (parsed.pathname === '/api/audit/verify') {
    return json({ valid: true, total: 6, issues: [] });
  }

  if (parsed.pathname === '/api/tenant-backups/metrics') {
    return json({
      exportable: true,
      schemaVersion: 'smoke-v1',
      datasetCounts: { agents: 2, shifts: 4, auditLogs: 6 },
      planningComplianceSnapshot: { totals: { shifts: 4 } },
    });
  }

  if (parsed.pathname === '/api/agent-alerts') {
    return json([]);
  }

  return json({ message: \`Unexpected smoke request: \${method} \${parsed.pathname}\` }, 599);
};

process.env.API_TOKEN = 'readonly-smoke-token';
process.env.BASE_URL = 'http://127.0.0.1:65535';
process.env.TENANT_ID = 'POST-PROD-SMOKE';
process.env.REPORT_DIR = ${JSON.stringify(reportDir)};
process.env.OPS_DAILY_FROM = '2026-05-06T00:00:00.000Z';
process.env.OPS_DAILY_TO = '2026-05-07T00:00:00.000Z';

await import(${JSON.stringify(checkUrl)});
await import('node:fs/promises').then(({ writeFile }) =>
  writeFile(${JSON.stringify(callsPath)}, JSON.stringify(calls, null, 2)),
);
`;

try {
  await writeFile(wrapperPath, wrapper);
  const { spawnSync } = await import('node:child_process');
  const run = spawnSync(process.execPath, [wrapperPath], {
    cwd: path.dirname(scriptDir),
    encoding: 'utf8',
  });

  assert.equal(
    run.status,
    0,
    `ops daily smoke failed\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );

  const calls = JSON.parse(await readFile(callsPath, 'utf8'));
  const methods = calls.map((call) => call.method);
  assert.deepEqual(
    methods.filter((method) => method !== 'GET'),
    [],
    'daily check must only perform GET probes',
  );

  const paths = calls.map((call) => call.path);
  assert.equal(paths.includes('/api/health/live'), true);
  assert.equal(paths.includes('/api/health/ready'), true);
  assert.equal(paths.includes('/api/planning/observability/health'), true);
  assert.equal(paths.includes('/api/audit/verify'), true);
  assert.equal(paths.includes('/api/tenant-backups/metrics'), true);
  assert.equal(paths.includes('/api/agent-alerts'), true);

  const today = new Date().toISOString().slice(0, 10);
  const jsonReportPath = path.join(reportDir, `ops-daily-check-${today}.json`);
  const markdownReportPath = path.join(reportDir, `ops-daily-check-${today}.md`);

  assert.equal(existsSync(jsonReportPath), true, 'JSON report must be written');
  assert.equal(
    existsSync(markdownReportPath),
    true,
    'Markdown report must be written',
  );

  const report = JSON.parse(await readFile(jsonReportPath, 'utf8'));
  const markdown = await readFile(markdownReportPath, 'utf8');

  assert.equal(report.decision, 'POST_PROD_READY');
  assert.equal(report.nonDestructive, true);
  assert.equal(report.policy.mutationsExecuted, false);
  assert.equal(report.policy.backupRestoreExecuted, false);
  assert.equal(report.policy.alertResolutionExecuted, false);
  assert.equal(report.tenant.id, 'POST-PROD-SMOKE');
  assert.equal(report.auditChain.valid, true);
  assert.equal(report.backup.exportable, true);
  assert.equal(report.alerts.openCount, 0);
  assert.match(markdown, /# Check quotidien post-prod - \d{4}-\d{2}-\d{2}/);
  assert.match(markdown, /- Decision: POST_PROD_READY/);
  assert.match(markdown, /- Non destructif: oui/);

  console.log('ops-daily-check smoke passed');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
