#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);

function readValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${arg}`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    mock: false,
    format: 'both',
    reportDir: process.env.REPORT_DIR || 'prod-reports',
    highAlertLimit: Number.parseInt(
      process.env.OPS_DAILY_HIGH_ALERT_LIMIT || '0',
      10,
    ),
    openAlertLimit: Number.parseInt(
      process.env.OPS_DAILY_OPEN_ALERT_LIMIT || '0',
      10,
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--mock' || arg === '--smoke') {
      options.mock = true;
    } else if (arg === '--format') {
      options.format = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--report-dir') {
      options.reportDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--high-alert-limit') {
      options.highAlertLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--open-alert-limit') {
      options.openAlertLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!['markdown', 'json', 'both'].includes(options.format)) {
    throw new Error('--format must be markdown, json, or both');
  }
  if (!Number.isFinite(options.highAlertLimit) || options.highAlertLimit < 0) {
    throw new Error('--high-alert-limit must be a positive integer or zero');
  }
  if (!Number.isFinite(options.openAlertLimit) || options.openAlertLimit < 0) {
    throw new Error('--open-alert-limit must be a positive integer or zero');
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 23 post-prod daily check

Usage:
  node scripts/ops-daily-check.mjs [--format markdown|json|both] [--report-dir <dir>]
  node scripts/ops-daily-check.mjs --mock

This script is non destructive. It only performs health/authenticated GET probes
and writes Markdown/JSON reports. It does not deploy, migrate, seed, restore,
acknowledge alerts, resolve alerts, export secrets, or mutate business data.

Env:
  ENV_FILE=.env.production
  BASE_URL=https://...
  API_TOKEN=<readonly token>
  TENANT_ID=<tenant>
  OPS_DAILY_FROM=<ISO datetime>
  OPS_DAILY_TO=<ISO datetime>
  OPS_DAILY_OPEN_ALERT_LIMIT=0
  OPS_DAILY_HIGH_ALERT_LIMIT=0
`);
}

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
};

async function loadEnvFile(envFile) {
  if (!envFile || !existsSync(envFile)) return;

  const content = await readFile(envFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed && !process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  return search.toString();
};

const parseBody = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const severityOf = (alert) => String(alert?.severity || 'UNKNOWN').toUpperCase();

const summarizeAlert = (alert) => ({
  id: alert.id,
  agentId: alert.agentId,
  agentName: [alert.agent?.firstName, alert.agent?.nom]
    .filter(Boolean)
    .join(' '),
  type: alert.type,
  severity: alert.severity,
  message: alert.message,
  ruleCode: alert.metadata?.ruleCode,
  serviceId: alert.metadata?.serviceId,
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
});

function getMockResults() {
  return [
    {
      name: 'API liveness',
      path: '/api/health/live',
      status: 'MOCKED',
      ok: true,
      body: { status: 'ok' },
    },
    {
      name: 'API readiness',
      path: '/api/health/ready',
      status: 'MOCKED',
      ok: true,
      body: { status: 'ready' },
    },
    {
      name: 'API token',
      path: 'API_TOKEN',
      status: 'MOCKED',
      ok: true,
      source: 'mock',
    },
    {
      name: 'Planning compliance health',
      path: '/api/planning/observability/health',
      status: 'MOCKED',
      ok: true,
      body: {
        status: 'OK',
        reasons: [],
        counters: {
          openAlerts: 0,
          highAlerts: 0,
          pendingShifts: 0,
          refusedPublications: 0,
        },
      },
    },
    {
      name: 'Audit chain verification',
      path: '/api/audit/verify',
      status: 'MOCKED',
      ok: true,
      body: { valid: true, total: 12, issues: [] },
    },
    {
      name: 'Backup metrics',
      path: '/api/tenant-backups/metrics',
      status: 'MOCKED',
      ok: true,
      body: {
        exportable: true,
        schemaVersion: 'mock-v1',
        datasetCounts: {
          facilities: 1,
          hospitalServices: 3,
          agents: 8,
          shifts: 24,
          leaves: 2,
          auditLogs: 12,
        },
        planningComplianceSnapshot: {
          totals: {
            shifts: 24,
            approvedComplianceExceptions: 0,
            complianceAuditEvents: 12,
          },
        },
      },
    },
    {
      name: 'Open alerts',
      path: '/api/agent-alerts',
      status: 'MOCKED',
      ok: true,
      body: [],
    },
  ];
}

async function requestJson({ baseUrl, name, path: requestPath, headers = {} }) {
  const startedAt = performance.now();

  try {
    const response = await fetch(`${baseUrl}${requestPath}`, { headers });
    const durationMs = Math.round(performance.now() - startedAt);
    const body = await parseBody(response);

    return {
      name,
      path: requestPath,
      status: response.ok ? 'PASSED' : 'FAILED',
      ok: response.ok,
      httpStatus: response.status,
      durationMs,
      body,
      error: response.ok ? undefined : JSON.stringify(body),
    };
  } catch (error) {
    return {
      name,
      path: requestPath,
      status: 'FAILED',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectApiResults({ baseUrl, tenantId, from, to, apiToken }) {
  const results = [
    await requestJson({ baseUrl, name: 'API liveness', path: '/api/health/live' }),
    await requestJson({
      baseUrl,
      name: 'API readiness',
      path: '/api/health/ready',
    }),
  ];

  if (!apiToken) {
    results.push({
      name: 'API token',
      path: 'API_TOKEN',
      status: 'FAILED',
      ok: false,
      reason: 'API_TOKEN missing for authenticated post-prod probes',
    });
    return results;
  }

  results.push({
    name: 'API token',
    path: 'API_TOKEN',
    status: 'PASSED',
    ok: true,
    source: 'API_TOKEN',
  });

  const headers = { Authorization: `Bearer ${apiToken}` };
  const periodQuery = query({ tenantId, from, to });
  const tenantQuery = query({ tenantId });

  results.push(
    await requestJson({
      baseUrl,
      name: 'Planning compliance health',
      path: `/api/planning/observability/health?${periodQuery}`,
      headers,
    }),
  );
  results.push(
    await requestJson({
      baseUrl,
      name: 'Audit chain verification',
      path: `/api/audit/verify?${tenantQuery}`,
      headers,
    }),
  );
  results.push(
    await requestJson({
      baseUrl,
      name: 'Backup metrics',
      path: `/api/tenant-backups/metrics?${periodQuery}`,
      headers,
    }),
  );
  results.push(
    await requestJson({
      baseUrl,
      name: 'Open alerts',
      path: `/api/agent-alerts?${query({ tenantId, isResolved: 'false' })}`,
      headers,
    }),
  );

  return results;
}

const firstBody = (results, name) =>
  results.find((result) => result.name === name)?.body;

function countBySeverity(alerts) {
  return alerts.reduce((counts, alert) => {
    const severity = severityOf(alert);
    counts[severity] = (counts[severity] || 0) + 1;
    return counts;
  }, {});
}

function buildReport({ options, settings, results }) {
  const generatedAt = new Date().toISOString();
  const runDate = generatedAt.slice(0, 10);
  const compliance = firstBody(results, 'Planning compliance health') || {};
  const audit = firstBody(results, 'Audit chain verification') || {};
  const backup = firstBody(results, 'Backup metrics') || {};
  const openAlerts = toArray(firstBody(results, 'Open alerts'));
  const severityCounts = countBySeverity(openAlerts);
  const highAlertCount = Math.max(
    (severityCounts.HIGH || 0) + (severityCounts.CRITICAL || 0),
    compliance.counters?.highAlerts || 0,
  );
  const openAlertCount = Math.max(
    openAlerts.length,
    compliance.counters?.openAlerts || 0,
  );
  const complianceStatus = compliance.status || 'UNKNOWN';
  const complianceReasons = toArray(compliance.reasons);
  const auditIssues = toArray(audit.issues);
  const auditValid =
    audit.valid === true || compliance.audit?.chain?.valid === true;
  const backupExportable = backup.exportable === true;
  const failedChecks = results.filter((result) => !result.ok);

  const blockingReasons = [
    ...failedChecks.map(
      (check) => `${check.name} failed${check.reason ? `: ${check.reason}` : ''}`,
    ),
    ...(complianceStatus === 'CRITICAL'
      ? ['planning compliance health is CRITICAL']
      : []),
    ...(complianceReasons.includes('HIGH_ALERTS_OPEN')
      ? ['planning compliance reports HIGH_ALERTS_OPEN']
      : []),
    ...(openAlertCount > options.openAlertLimit
      ? [`${openAlertCount} open alerts exceed limit ${options.openAlertLimit}`]
      : []),
    ...(highAlertCount > options.highAlertLimit
      ? [`${highAlertCount} HIGH/CRITICAL alerts exceed limit ${options.highAlertLimit}`]
      : []),
    ...(!auditValid ? ['audit chain invalid or unavailable'] : []),
    ...(auditIssues.length > 0
      ? [`${auditIssues.length} audit chain issues detected`]
      : []),
    ...(!backupExportable ? ['backup metrics not exportable'] : []),
  ];

  const report = {
    status: failedChecks.length === 0 ? 'PASSED' : 'FAILED',
    decision: blockingReasons.length === 0 ? 'POST_PROD_READY' : 'POST_PROD_NO_GO',
    generatedAt,
    runDate,
    mode: options.mock ? 'mock' : 'api',
    nonDestructive: true,
    policy: {
      methodsAllowed: ['GET'],
      authSource: options.mock ? 'mock' : 'API_TOKEN',
      mutationsExecuted: false,
      backupRestoreExecuted: false,
      alertResolutionExecuted: false,
      secretsPrinted: false,
      writesReportsOnly: true,
    },
    tenant: {
      id: settings.tenantId,
      env: settings.runtimeEnv,
      baseUrl: settings.baseUrl,
    },
    period: { from: settings.from, to: settings.to },
    thresholds: {
      openAlertLimit: options.openAlertLimit,
      highAlertLimit: options.highAlertLimit,
    },
    compliance: {
      status: complianceStatus,
      reasons: complianceReasons,
      counters: compliance.counters || {},
    },
    auditChain: {
      valid: auditValid,
      events: audit.total ?? compliance.audit?.chain?.total ?? null,
      issues: auditIssues.length ? auditIssues : compliance.audit?.chain?.issues || [],
    },
    backup: {
      exportable: backupExportable,
      schemaVersion: backup.schemaVersion || null,
      datasetCounts: backup.datasetCounts || {},
      complianceTotals: backup.planningComplianceSnapshot?.totals || {},
    },
    alerts: {
      openCount: openAlertCount,
      highOrCriticalCount: highAlertCount,
      bySeverity: severityCounts,
      open: openAlerts.map(summarizeAlert),
    },
    blockingReasons,
    checks: results.map((result) => ({
      name: result.name,
      path: result.path,
      status: result.status,
      httpStatus: result.httpStatus,
      durationMs: result.durationMs,
      reason: result.reason,
      error: result.error,
      source: result.source,
    })),
  };

  const markdown = [
    `# Check quotidien post-prod - ${runDate}`,
    '',
    `- Statut checks: ${report.status}`,
    `- Decision: ${report.decision}`,
    `- Mode: ${report.mode}`,
    `- Base URL: ${settings.baseUrl}`,
    `- Tenant: ${settings.tenantId}`,
    `- Env: ${settings.runtimeEnv}`,
    `- Genere: ${generatedAt}`,
    `- Periode: ${settings.from} -> ${settings.to}`,
    '- Non destructif: oui, probes GET uniquement et rapports locaux',
    '',
    '## Checks',
    '',
    '| Check | Statut | HTTP | Duree | Note |',
    '| --- | --- | ---: | ---: | --- |',
    ...results.map(
      (result) =>
        `| ${escapeMarkdownCell(result.name)} | ${result.status} | ${
          result.httpStatus || '-'
        } | ${result.durationMs ?? '-'} ms | ${escapeMarkdownCell(
          result.reason || result.error || result.source || '',
        )} |`,
    ),
    '',
    '## Conformite',
    '',
    `- Health: ${complianceStatus}`,
    `- Raisons: ${complianceReasons.join(', ') || 'aucune'}`,
    `- Alertes ouvertes: ${openAlertCount}`,
    `- Alertes HIGH/CRITICAL: ${highAlertCount}`,
    `- Shifts en attente: ${compliance.counters?.pendingShifts ?? 'n/a'}`,
    `- Publications refusees: ${compliance.counters?.refusedPublications ?? 'n/a'}`,
    '',
    '## Audit chain',
    '',
    `- Chaine valide: ${auditValid}`,
    `- Evenements verifies: ${report.auditChain.events ?? 'n/a'}`,
    `- Anomalies chaine: ${report.auditChain.issues.length}`,
    '',
    '## Backup',
    '',
    `- Metrics exportable: ${backupExportable}`,
    `- Schema: ${backup.schemaVersion || 'n/a'}`,
    `- Datasets: ${
      Object.entries(backup.datasetCounts || {})
        .map(([name, count]) => `${name}=${count}`)
        .join(', ') || 'n/a'
    }`,
    `- Shifts snapshot conformite: ${
      backup.planningComplianceSnapshot?.totals?.shifts ?? 'n/a'
    }`,
    '',
    '## Alertes ouvertes',
    '',
    ...(openAlerts.length
      ? [
          '| ID | Severite | Agent | Type | Regle | Message |',
          '| ---: | --- | --- | --- | --- | --- |',
          ...openAlerts.map((alert) => {
            const item = summarizeAlert(alert);
            return `| ${item.id} | ${escapeMarkdownCell(
              item.severity || '-',
            )} | ${escapeMarkdownCell(
              item.agentName || item.agentId || '-',
            )} | ${escapeMarkdownCell(item.type || '-')} | ${escapeMarkdownCell(
              item.ruleCode || '-',
            )} | ${escapeMarkdownCell(item.message || '-')} |`;
          }),
        ]
      : ['Aucune alerte ouverte.']),
    '',
    '## Decision',
    '',
    `Decision: ${report.decision}`,
    '',
    ...(blockingReasons.length
      ? ['Raisons bloquantes:', '', ...blockingReasons.map((reason) => `- ${reason}`)]
      : ['Aucune raison bloquante observee.']),
    '',
  ].join('\n');

  return { report, markdown };
}

async function main() {
  const options = parseArgs(args);
  if (options.help) {
    printHelp();
    return;
  }

  await loadEnvFile(process.env.ENV_FILE);

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 1);
  const settings = {
    baseUrl: (process.env.BASE_URL || 'http://localhost:3005').replace(/\/$/, ''),
    tenantId: process.env.TENANT_ID || 'HGD-DOUALA',
    runtimeEnv:
      process.env.POST_PROD_ENV ||
      process.env.APP_ENV ||
      process.env.NODE_ENV ||
      'production',
    from: process.env.OPS_DAILY_FROM || process.env.FROM || defaultFrom.toISOString(),
    to: process.env.OPS_DAILY_TO || process.env.TO || now.toISOString(),
    apiToken: process.env.API_TOKEN || '',
  };

  const results = options.mock ? getMockResults() : await collectApiResults(settings);
  const { report, markdown } = buildReport({ options, settings, results });

  await mkdir(options.reportDir, { recursive: true });
  const jsonPath = path.join(
    options.reportDir,
    `ops-daily-check-${report.runDate}.json`,
  );
  const markdownPath = path.join(
    options.reportDir,
    `ops-daily-check-${report.runDate}.md`,
  );

  if (['json', 'both'].includes(options.format)) {
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (['markdown', 'both'].includes(options.format)) {
    await writeFile(markdownPath, markdown);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(markdown);
  }

  if (report.decision !== 'POST_PROD_READY') {
    process.exitCode = 1;
  }
}

await main();
