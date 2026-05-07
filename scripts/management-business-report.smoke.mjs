#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const reportPath = path.join(scriptDir, 'management-business-report.mjs');
const source = await readFile(reportPath, 'utf8');

assert.match(
  source,
  /mutationsExecuted: false/,
  'management report must declare that it executes no mutations',
);
assert.match(
  source,
  /planningPublicationExecuted: false/,
  'management report must declare that it does not publish planning',
);
assert.match(
  source,
  /incidentResolutionExecuted: false/,
  'management report must declare that it does not resolve incidents',
);
assert.match(
  source,
  /backupRestoreExecuted: false/,
  'management report must declare that it does not restore backups',
);
assert.doesNotMatch(
  source,
  /\bmethod:\s*['"](POST|PATCH|PUT|DELETE)['"]/,
  'management report must not define mutating HTTP methods',
);
assert.match(
  source,
  /management-business-report-\$\{report\.runDate\}/,
  'report filename base must include the run date',
);

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mediplan-management-report-'));
const outputDir = path.join(tempDir, 'reports');
const callsPath = path.join(tempDir, 'fetch-calls.json');
const wrapperPath = path.join(tempDir, 'run-management-report.mjs');
const reportUrl = pathToFileURL(reportPath).href;

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
      status: 'HEALTHY',
      reasons: [],
      counters: {
        openAlerts: 0,
        highAlerts: 0,
        mediumAlerts: 0,
        lowAlerts: 0,
        pendingShifts: 2,
        validatedShifts: 18,
        publishedShifts: 40,
        publicationAttempts: 4,
        refusedPublications: 0,
        successfulPublications: 4,
      },
      audit: {
        chain: {
          checkedAt: '2026-05-05T08:00:00.000Z',
          total: 44,
          valid: true,
          issues: [],
        },
      },
    });
  }

  if (parsed.pathname === '/api/planning/compliance/summary') {
    return json({
      counters: {
        openAlerts: 0,
        blockedShifts: 0,
        agentsAtRisk: 0,
        refusedPublications: 0,
      },
      openAlertsBySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      blockedShiftPreview: [],
    });
  }

  if (parsed.pathname === '/api/ops/incidents') {
    return json([
      {
        id: 9,
        title: 'Incident resolu dans la periode',
        severity: 'HIGH',
        status: 'RESOLVED',
        impactedService: 'planning',
        assignedToId: 3,
        declaredAt: '2026-05-02T08:00:00.000Z',
        resolvedAt: '2026-05-02T09:30:00.000Z',
        closedAt: '2026-05-02T10:00:00.000Z',
        resolutionSummary: 'Verification OK',
      },
    ]);
  }

  if (parsed.pathname === '/api/ops/alerts') {
    return json([]);
  }

  if (parsed.pathname === '/api/agent-alerts') {
    return json([]);
  }

  if (parsed.pathname === '/api/audit/verify') {
    return json({ valid: true, total: 44, issues: [] });
  }

  if (parsed.pathname === '/api/tenant-backups/metrics') {
    return json({
      exportable: true,
      schemaVersion: 'smoke-v1',
      datasetCounts: { agents: 12, shifts: 40, auditLogs: 44 },
      planningComplianceSnapshot: {
        totals: {
          shifts: 40,
          approvedComplianceExceptions: 0,
          complianceAuditEvents: 44,
        },
      },
    });
  }

  return json({ message: \`Unexpected smoke request: \${method} \${parsed.pathname}\` }, 599);
};

process.env.API_TOKEN = 'readonly-management-smoke-token';
process.env.BASE_URL = 'http://127.0.0.1:65535';
process.env.TENANT_ID = 'MANAGEMENT-SMOKE';
process.env.REPORT_DIR = ${JSON.stringify(outputDir)};
process.env.MANAGEMENT_REPORT_FROM = '2026-05-01T00:00:00.000Z';
process.env.MANAGEMENT_REPORT_TO = '2026-05-08T00:00:00.000Z';

await import(${JSON.stringify(reportUrl)});
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
    `management report smoke failed\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );

  const calls = JSON.parse(await readFile(callsPath, 'utf8'));
  const methods = calls.map((call) => call.method);
  assert.deepEqual(
    methods.filter((method) => method !== 'GET'),
    [],
    'management report must only perform GET probes',
  );

  const paths = calls.map((call) => call.path);
  assert.equal(paths.includes('/api/health/live'), true);
  assert.equal(paths.includes('/api/health/ready'), true);
  assert.equal(paths.includes('/api/planning/observability/health'), true);
  assert.equal(paths.includes('/api/planning/compliance/summary'), true);
  assert.equal(paths.includes('/api/ops/incidents'), true);
  assert.equal(paths.includes('/api/ops/alerts'), true);
  assert.equal(paths.includes('/api/agent-alerts'), true);
  assert.equal(paths.includes('/api/audit/verify'), true);
  assert.equal(paths.includes('/api/tenant-backups/metrics'), true);

  const today = new Date().toISOString().slice(0, 10);
  const jsonReportPath = path.join(
    outputDir,
    `management-business-report-${today}.json`,
  );
  const markdownReportPath = path.join(
    outputDir,
    `management-business-report-${today}.md`,
  );

  assert.equal(existsSync(jsonReportPath), true, 'JSON report must be written');
  assert.equal(
    existsSync(markdownReportPath),
    true,
    'Markdown report must be written',
  );

  const report = JSON.parse(await readFile(jsonReportPath, 'utf8'));
  const markdown = await readFile(markdownReportPath, 'utf8');

  assert.equal(report.executiveDecision, 'MAITRISE');
  assert.equal(report.nonDestructive, true);
  assert.equal(report.policy.mutationsExecuted, false);
  assert.equal(report.policy.planningPublicationExecuted, false);
  assert.equal(report.tenant.id, 'MANAGEMENT-SMOKE');
  assert.equal(report.indicators.incidents.total, 1);
  assert.equal(report.indicators.incidents.closed, 1);
  assert.equal(report.indicators.resolution.meanTimeToResolveHours, 1.5);
  assert.equal(report.indicators.refusedPublications, 0);
  assert.equal(report.residualRisks.length, 0);
  assert.match(markdown, /# Rapport direction \/ metier - \d{4}-\d{2}-\d{2}/);
  assert.match(markdown, /Decision direction: MAITRISE/);
  assert.match(markdown, /## Indicateurs cles/);

  console.log('management-business-report smoke passed');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
