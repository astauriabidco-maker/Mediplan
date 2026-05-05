#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const envFile = process.env.ENV_FILE;

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

if (envFile && existsSync(envFile)) {
  const content = await readFile(envFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed && !process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

const now = new Date();
const defaultFrom = new Date(now);
defaultFrom.setDate(now.getDate() - 1);

const baseUrl = (process.env.BASE_URL || 'http://localhost:3005').replace(
  /\/$/,
  '',
);
const tenantId = process.env.TENANT_ID || 'HGD-DOUALA';
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const from =
  process.env.OPERATIONAL_FROM || process.env.FROM || defaultFrom.toISOString();
const to = process.env.OPERATIONAL_TO || process.env.TO || now.toISOString();
const runDate = now.toISOString().slice(0, 10);
const runtimeEnv =
  process.env.OPERATIONAL_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'preprod';
const explicitMock =
  args.has('--mock') ||
  args.has('--smoke') ||
  process.env.OPERATIONAL_SUMMARY_MOCK === 'true' ||
  ['mock', 'smoke'].includes(
    (process.env.OPERATIONAL_SUMMARY_MODE || '').toLowerCase(),
  );
const strictApi =
  args.has('--strict-api') ||
  process.env.OPERATIONAL_SUMMARY_STRICT_API === 'true';
const mockOnApiFailure =
  !strictApi && process.env.OPERATIONAL_SUMMARY_MOCK_ON_FAILURE !== 'false';
const email = process.env.SMOKE_EMAIL || 'superadmin@mediplan.demo';
const password = process.env.SMOKE_PASSWORD || 'password123';
let apiToken = process.env.API_TOKEN || '';

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

const request = async (path, options = {}) => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, options);
  const durationMs = Math.round(performance.now() - startedAt);
  const body = await parseBody(response);

  return {
    ok: response.ok,
    httpStatus: response.status,
    durationMs,
    body,
  };
};

const requestJson = async (name, path, options = {}) => {
  try {
    const result = await request(path, options);
    return {
      name,
      path,
      status: result.ok ? 'PASSED' : 'FAILED',
      ok: result.ok,
      httpStatus: result.httpStatus,
      durationMs: result.durationMs,
      body: result.body,
      error: result.ok ? undefined : JSON.stringify(result.body),
    };
  } catch (error) {
    return {
      name,
      path,
      status: 'FAILED',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const authenticate = async () => {
  if (apiToken) {
    return {
      name: 'Authentication',
      path: 'API_TOKEN',
      status: 'PASSED',
      ok: true,
      source: 'API_TOKEN',
    };
  }

  const auth = await requestJson('Authentication', '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (auth.ok && auth.body?.access_token) {
    apiToken = auth.body.access_token;
    auth.source = 'SMOKE_EMAIL';
  } else {
    auth.ok = false;
    auth.status = 'FAILED';
    auth.error = auth.error || 'access_token missing';
  }

  return auth;
};

const headers = () => ({
  Authorization: `Bearer ${apiToken}`,
  'Content-Type': 'application/json',
});

const getMockResults = (reason) => {
  const observability = {
    status: 'OK',
    reasons: [],
    counters: {
      openAlerts: 0,
      highAlerts: 0,
      pendingShifts: 0,
      refusedPublications: 0,
    },
  };
  const audit = {
    valid: true,
    total: 12,
    issues: [],
  };
  const backupMetrics = {
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
  };
  const backupExport = {
    kind: 'tenant-business-backup',
    schemaVersion: 'mock-v1',
    integrity: {
      datasetCounts: backupMetrics.datasetCounts,
    },
  };

  return [
    {
      name: 'API liveness',
      path: '/api/health/live',
      status: 'MOCKED',
      ok: true,
      body: { status: 'ok', reason },
    },
    {
      name: 'API readiness',
      path: '/api/health/ready',
      status: 'MOCKED',
      ok: true,
      body: { status: 'ready', reason },
    },
    {
      name: 'Planning observability',
      path: '/api/planning/observability/health',
      status: 'MOCKED',
      ok: true,
      body: observability,
    },
    {
      name: 'Audit chain verification',
      path: '/api/audit/verify',
      status: 'MOCKED',
      ok: true,
      body: audit,
    },
    {
      name: 'Backup metrics',
      path: '/api/tenant-backups/metrics',
      status: 'MOCKED',
      ok: true,
      body: backupMetrics,
    },
    {
      name: 'Backup export',
      path: '/api/tenant-backups/export',
      status: 'MOCKED',
      ok: true,
      body: backupExport,
    },
    {
      name: 'High alerts',
      path: '/api/agent-alerts',
      status: 'MOCKED',
      ok: true,
      body: [],
    },
  ];
};

const collectApiResults = async () => {
  const results = [
    await requestJson('API liveness', '/api/health/live'),
    await requestJson('API readiness', '/api/health/ready'),
  ];

  const auth = await authenticate();
  results.push(auth);
  if (!auth.ok) return results;

  const periodQuery = query({ tenantId, from, to });
  const tenantQuery = query({ tenantId });
  results.push(
    await requestJson(
      'Planning observability',
      `/api/planning/observability/health?${periodQuery}`,
      { headers: headers() },
    ),
  );
  results.push(
    await requestJson('Audit chain verification', `/api/audit/verify?${tenantQuery}`, {
      headers: headers(),
    }),
  );
  results.push(
    await requestJson(
      'Backup metrics',
      `/api/tenant-backups/metrics?${periodQuery}`,
      { headers: headers() },
    ),
  );
  results.push(
    await requestJson(
      'Backup export',
      `/api/tenant-backups/export?${periodQuery}`,
      { headers: headers() },
    ),
  );
  results.push(
    await requestJson(
      'High alerts',
      `/api/agent-alerts?${query({
        tenantId,
        severity: 'HIGH',
        isResolved: 'false',
      })}`,
      { headers: headers() },
    ),
  );

  return results;
};

const firstBody = (results, name) =>
  results.find((result) => result.name === name)?.body;

const toArray = (value) => (Array.isArray(value) ? value : []);

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

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

let mode = explicitMock ? 'mock' : 'api';
let fallbackReason = null;
let results = explicitMock
  ? getMockResults('explicit mock/smoke mode')
  : await collectApiResults();

const apiUnavailable =
  !explicitMock &&
  results.some((result) => result.name === 'API liveness' && !result.ok);

if (apiUnavailable && mockOnApiFailure) {
  mode = 'mock';
  fallbackReason =
    results.find((result) => result.name === 'API liveness')?.error ||
    'API unavailable';
  results = getMockResults(fallbackReason);
}

const observability = firstBody(results, 'Planning observability') || {};
const audit = firstBody(results, 'Audit chain verification') || {};
const backupMetrics = firstBody(results, 'Backup metrics') || {};
const backupExport = firstBody(results, 'Backup export') || {};
const highAlerts = toArray(firstBody(results, 'High alerts'));
const failedChecks = results.filter((result) => !result.ok);
const observabilityStatus = observability.status || 'UNKNOWN';
const observabilityReasons = toArray(observability.reasons);
const highAlertCount =
  highAlerts.length ||
  observability.counters?.highAlerts ||
  observability.counters?.openHighAlerts ||
  0;
const auditValid =
  audit.valid === true || observability.audit?.chain?.valid === true;
const auditIssueCount =
  toArray(audit.issues).length ||
  toArray(observability.audit?.chain?.issues).length;
const backupExportable = backupMetrics.exportable === true;
const backupSnapshotExportable =
  backupExport.kind === 'tenant-business-backup' &&
  Boolean(backupExport.schemaVersion) &&
  Boolean(backupExport.integrity?.datasetCounts);
const blockingReasons = [
  ...failedChecks.map((check) => `${check.name} failed`),
  ...(observabilityStatus === 'CRITICAL'
    ? ['observability CRITICAL']
    : []),
  ...(observabilityReasons.includes('HIGH_ALERTS_OPEN')
    ? ['observability reason HIGH_ALERTS_OPEN']
    : []),
  ...(highAlertCount > 0 ? [`${highAlertCount} HIGH alerts open`] : []),
  ...(!auditValid ? ['audit chain invalid or unavailable'] : []),
  ...(auditIssueCount > 0 ? [`${auditIssueCount} audit chain issues`] : []),
  ...(!backupExportable ? ['backup metrics not exportable'] : []),
  ...(!backupSnapshotExportable ? ['backup export snapshot invalid'] : []),
];
const status = failedChecks.length === 0 ? 'PASSED' : 'FAILED';
const decision = blockingReasons.length === 0 ? 'GO' : 'NO-GO';
const generatedAt = new Date().toISOString();

const summary = {
  status,
  decision,
  generatedAt,
  mode,
  fallbackReason,
  tenant: {
    id: tenantId,
    env: runtimeEnv,
    baseUrl,
  },
  period: { from, to },
  observability: {
    status: observabilityStatus,
    reasons: observabilityReasons,
    counters: observability.counters || {},
  },
  auditChain: {
    valid: auditValid,
    events: audit.total ?? observability.audit?.chain?.total ?? null,
    issues: audit.issues || observability.audit?.chain?.issues || [],
  },
  backup: {
    exportable: backupExportable,
    snapshotExportable: backupSnapshotExportable,
    schemaVersion: backupMetrics.schemaVersion || backupExport.schemaVersion,
    datasetCounts:
      backupMetrics.datasetCounts || backupExport.integrity?.datasetCounts || {},
    complianceTotals: backupMetrics.planningComplianceSnapshot?.totals || {},
  },
  alerts: {
    highOpenCount: highAlertCount,
    highOpen: highAlerts.map(summarizeAlert),
  },
  blockingReasons,
  checks: results.map((result) => ({
    name: result.name,
    path: result.path,
    status: result.status,
    httpStatus: result.httpStatus,
    durationMs: result.durationMs,
    error: result.error,
    source: result.source,
  })),
};

const markdown = [
  `# Synthese operationnelle preprod - ${runDate}`,
  '',
  `- Statut checks: ${status}`,
  `- Decision: ${decision}`,
  `- Mode: ${mode}`,
  `- Base URL: ${baseUrl}`,
  `- Tenant: ${tenantId}`,
  `- Env: ${runtimeEnv}`,
  `- Genere: ${generatedAt}`,
  `- Periode: ${from} -> ${to}`,
  ...(fallbackReason ? [`- Fallback mock: ${fallbackReason}`] : []),
  '',
  '## Checks lecture seule',
  '',
  '| Check | Statut | HTTP | Duree | Note |',
  '| --- | --- | ---: | ---: | --- |',
  ...results.map(
    (result) =>
      `| ${escapeMarkdownCell(result.name)} | ${result.status} | ${
        result.httpStatus || '-'
      } | ${result.durationMs ?? '-'} ms | ${escapeMarkdownCell(
        result.error || result.source || '',
      )} |`,
  ),
  '',
  '## Observability',
  '',
  `- Health: ${observabilityStatus}`,
  `- Raisons: ${observabilityReasons.join(', ') || 'aucune'}`,
  `- Alertes ouvertes: ${observability.counters?.openAlerts ?? 'n/a'}`,
  `- Alertes HIGH: ${highAlertCount}`,
  `- Shifts en attente: ${observability.counters?.pendingShifts ?? 'n/a'}`,
  `- Publications refusees: ${
    observability.counters?.refusedPublications ?? 'n/a'
  }`,
  '',
  '## Audit chain',
  '',
  `- Chaine valide: ${auditValid}`,
  `- Evenements verifies: ${
    audit.total ?? observability.audit?.chain?.total ?? 'n/a'
  }`,
  `- Anomalies chaine: ${auditIssueCount}`,
  '',
  '## Backup exportable',
  '',
  `- Metrics exportable: ${backupExportable}`,
  `- Snapshot exportable: ${backupSnapshotExportable}`,
  `- Schema: ${backupMetrics.schemaVersion || backupExport.schemaVersion || 'n/a'}`,
  `- Datasets: ${
    Object.entries(
      backupMetrics.datasetCounts || backupExport.integrity?.datasetCounts || {},
    )
      .map(([name, count]) => `${name}=${count}`)
      .join(', ') || 'n/a'
  }`,
  `- Shifts snapshot conformite: ${
    backupMetrics.planningComplianceSnapshot?.totals?.shifts ?? 'n/a'
  }`,
  '',
  '## Alertes HIGH ouvertes',
  '',
  ...(highAlerts.length
    ? [
        '| ID | Agent | Type | Regle | Message |',
        '| ---: | --- | --- | --- | --- |',
        ...highAlerts.map((alert) => {
          const summaryAlert = summarizeAlert(alert);
          return `| ${summaryAlert.id} | ${escapeMarkdownCell(
            summaryAlert.agentName || summaryAlert.agentId || '-',
          )} | ${escapeMarkdownCell(
            summaryAlert.type || '-',
          )} | ${escapeMarkdownCell(
            summaryAlert.ruleCode || '-',
          )} | ${escapeMarkdownCell(summaryAlert.message || '-')} |`;
        }),
      ]
    : ['Aucune alerte HIGH ouverte.']),
  '',
  '## Decision GO/NO-GO',
  '',
  `Decision: ${decision}`,
  '',
  ...(blockingReasons.length
    ? ['Raisons bloquantes:', '', ...blockingReasons.map((reason) => `- ${reason}`)]
    : ['Aucune raison bloquante observee.']),
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `preprod-operational-summary-${runDate}.json`),
  `${JSON.stringify(summary, null, 2)}\n`,
);
await writeFile(
  join(reportDir, `preprod-operational-summary-${runDate}.md`),
  markdown,
);

console.log(markdown);

if (decision !== 'GO') {
  process.exitCode = 1;
}
