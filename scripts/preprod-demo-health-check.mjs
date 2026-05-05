import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

const tenantId = process.env.TENANT_ID || 'HGD-DOUALA';
const baseUrl = (process.env.BASE_URL || 'http://localhost:3005').replace(
  /\/$/,
  '',
);
const email = process.env.SMOKE_EMAIL || 'superadmin@mediplan.demo';
const password = process.env.SMOKE_PASSWORD || 'password123';
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const outputFormat = (process.env.OUTPUT_FORMAT || 'markdown').toLowerCase();
const runDate = new Date().toISOString().slice(0, 10);

const thresholds = {
  facilities: Number(process.env.MIN_DEMO_FACILITIES || 3),
  hospitalServices: Number(process.env.MIN_DEMO_SERVICES || 21),
  agents: Number(process.env.MIN_DEMO_AGENTS || 35),
  shifts: Number(process.env.MIN_DEMO_SHIFTS || 28),
  leaves: Number(process.env.MIN_DEMO_LEAVES || 11),
  openAlerts: Number(process.env.MIN_DEMO_OPEN_ALERTS || 1),
  auditLogs: Number(process.env.MIN_DEMO_AUDIT_LOGS || 1),
};

const expectedServiceCodes = [
  'ADM',
  'CHIR',
  'LAB',
  'MAT',
  'PED',
  'PHARMA',
  'RAD',
  'REA',
  'URG',
];
const expectedFacilityCodes = ['HGD', 'HGD-BNJ', 'HGD-LOG'];

const getCurrentWeekWindow = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);

  const from = new Date(monday);
  from.setDate(monday.getDate() - 7);

  const to = new Date(monday);
  to.setDate(monday.getDate() + 14);
  to.setHours(23, 59, 59, 999);

  return {
    from: (process.env.FROM || from.toISOString()).toString(),
    to: (process.env.TO || to.toISOString()).toString(),
  };
};

const period = getCurrentWeekWindow();
let headers = {};

const withQuery = (path, params = {}) => {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
};

const apiPath = (path, params = {}) => {
  const url = withQuery(path, params);
  return `${url.pathname}${url.search}`;
};

const requestJson = async (name, path, options = {}) => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, options);
  const durationMs = Math.round(performance.now() - startedAt);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body?.message
        ? JSON.stringify(body.message)
        : text;
    const error = new Error(
      `${options.method || 'GET'} ${path} failed: ${response.status} ${message}`,
    );
    error.result = {
      name,
      path,
      ok: false,
      status: 'FAILED',
      httpStatus: response.status,
      durationMs,
      error: message,
    };
    throw error;
  }

  return {
    name,
    path,
    ok: true,
    status: 'PASSED',
    httpStatus: response.status,
    durationMs,
    body,
  };
};

const runStep = async (name, path, options = {}) => {
  try {
    return await requestJson(name, path, options);
  } catch (error) {
    return (
      error.result || {
        name,
        path,
        ok: false,
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
};

const countRows = (value) => {
  if (Array.isArray(value)) return value.length;
  if (Array.isArray(value?.data)) return value.data.length;
  if (Array.isArray(value?.items)) return value.items.length;
  if (Array.isArray(value?.logs)) return value.logs.length;
  if (typeof value?.total === 'number') return value.total;
  if (typeof value?.count === 'number') return value.count;
  return 0;
};

const uniqueValues = (rows, field) =>
  Array.from(
    new Set(
      (Array.isArray(rows) ? rows : [])
        .map((row) => row?.[field])
        .filter((value) => value !== undefined && value !== null),
    ),
  ).sort();

const compareCounts = (label, left, right) => ({
  name: `${label} API/backup alignment`,
  ok: left === right,
  expected: right,
  actual: left,
  message:
    left === right
      ? `${label}: API and backup counts match`
      : `${label}: API count ${left} differs from backup count ${right}`,
});

const minCheck = (name, actual, expected) => ({
  name,
  ok: actual >= expected,
  expected: `>= ${expected}`,
  actual,
  message:
    actual >= expected
      ? `${name}: ${actual} >= ${expected}`
      : `${name}: expected at least ${expected}, got ${actual}`,
});

const containsAllCheck = (name, actual, expected) => {
  const missing = expected.filter((value) => !actual.includes(value));
  return {
    name,
    ok: missing.length === 0,
    expected,
    actual,
    message:
      missing.length === 0
        ? `${name}: expected codes present`
        : `${name}: missing ${missing.join(', ')}`,
  };
};

const login = await runStep('Demo authentication', '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

if (login.ok && login.body?.access_token) {
  headers = {
    Authorization: `Bearer ${login.body.access_token}`,
    'Content-Type': 'application/json',
  };
}

const authOptions = { headers };
const endpointSteps = [login];

if (login.ok) {
  const endpoints = [
    ['Facilities', apiPath('/api/facilities', { tenantId })],
    ['Hospital services', apiPath('/api/hospital-services', { tenantId })],
    ['Agents', apiPath('/api/agents', { tenantId })],
    [
      'Shifts window',
      apiPath('/api/planning/shifts', {
        tenantId,
        start: period.from,
        end: period.to,
      }),
    ],
    ['Leaves', apiPath('/api/planning/leaves', { tenantId })],
    ['Open alerts', apiPath('/api/agent-alerts', { tenantId, isResolved: false })],
    ['Audit verification', apiPath('/api/audit/verify', { tenantId })],
    ['Audit export sample', apiPath('/api/audit', { tenantId, limit: 50 })],
    [
      'Backup metrics',
      apiPath('/api/tenant-backups/metrics', {
        tenantId,
        from: period.from,
        to: period.to,
      }),
    ],
    [
      'Backup export',
      apiPath('/api/tenant-backups/export', {
        tenantId,
        from: period.from,
        to: period.to,
      }),
    ],
  ];

  for (const [name, path] of endpoints) {
    endpointSteps.push(await runStep(name, path, authOptions));
  }
}

const findStep = (name) => endpointSteps.find((step) => step.name === name);
const facilities = findStep('Facilities')?.body || [];
const hospitalServices = findStep('Hospital services')?.body || [];
const agents = findStep('Agents')?.body || [];
const shifts = findStep('Shifts window')?.body || [];
const leaves = findStep('Leaves')?.body || [];
const openAlerts = findStep('Open alerts')?.body || [];
const auditVerification = findStep('Audit verification')?.body;
const auditSample = findStep('Audit export sample')?.body || [];
const backupMetrics = findStep('Backup metrics')?.body;
const backupExport = findStep('Backup export')?.body;
const datasetCounts = backupMetrics?.datasetCounts || {};
const snapshotCounts = backupExport?.integrity?.datasetCounts || {};

const evidence = {
  facilities: {
    api: countRows(facilities),
    backup: datasetCounts.facilities ?? 0,
    codes: uniqueValues(facilities, 'code'),
  },
  hospitalServices: {
    api: countRows(hospitalServices),
    backup: datasetCounts.hospitalServices ?? 0,
    codes: uniqueValues(hospitalServices, 'code'),
    withFacility: (Array.isArray(hospitalServices) ? hospitalServices : [])
      .filter((service) => Boolean(service?.facilityId))
      .length,
  },
  agents: {
    api: countRows(agents),
    backup: datasetCounts.agents ?? 0,
    withService: (Array.isArray(agents) ? agents : []).filter((agent) =>
      Boolean(agent?.hospitalServiceId || agent?.hospitalService?.id),
    ).length,
    demoAccounts: (Array.isArray(agents) ? agents : []).filter((agent) =>
      ['superadmin@mediplan.demo', 'directeur@hgd-douala.cm'].includes(
        agent?.email,
      ),
    ).length,
  },
  shifts: {
    apiWindow: countRows(shifts),
    backup: datasetCounts.shifts ?? 0,
    snapshot: backupMetrics?.planningComplianceSnapshot?.totals?.shifts ?? 0,
  },
  leaves: {
    api: countRows(leaves),
    backup: datasetCounts.leaves ?? 0,
  },
  openAlerts: {
    api: countRows(openAlerts),
  },
  audit: {
    valid: auditVerification?.valid === true,
    total: auditVerification?.total ?? countRows(auditSample),
    sample: countRows(auditSample),
    issues: auditVerification?.issues?.length ?? null,
  },
  backup: {
    exportable: backupMetrics?.exportable === true,
    kind: backupExport?.kind || null,
    schemaVersion: backupMetrics?.schemaVersion ?? backupExport?.schemaVersion,
    snapshotCounts,
  },
};

const checks = [
  {
    name: 'Demo authentication succeeded',
    ok: login.ok && Boolean(login.body?.access_token),
    expected: 'access_token',
    actual: login.ok ? 'access_token' : login.error || 'missing',
    message: login.ok
      ? 'Demo authentication returned an access token'
      : login.error || 'Demo authentication failed',
  },
  minCheck(
    'Facilities seeded',
    evidence.facilities.backup,
    thresholds.facilities,
  ),
  minCheck(
    'Hospital services seeded',
    evidence.hospitalServices.backup,
    thresholds.hospitalServices,
  ),
  minCheck('Agents seeded', evidence.agents.backup, thresholds.agents),
  minCheck('Shifts seeded', evidence.shifts.backup, thresholds.shifts),
  minCheck('Leaves seeded', evidence.leaves.backup, thresholds.leaves),
  minCheck(
    'Open alerts available',
    evidence.openAlerts.api,
    thresholds.openAlerts,
  ),
  minCheck('Audit events available', evidence.audit.total, thresholds.auditLogs),
  {
    name: 'Audit chain valid',
    ok: evidence.audit.valid,
    expected: true,
    actual: evidence.audit.valid,
    message: evidence.audit.valid
      ? 'Audit chain verification passed'
      : 'Audit chain verification failed or unavailable',
  },
  {
    name: 'Backup exportable',
    ok:
      evidence.backup.exportable &&
      evidence.backup.kind === 'tenant-business-backup',
    expected: 'tenant-business-backup exportable',
    actual: `${evidence.backup.kind || 'missing'} / exportable=${
      evidence.backup.exportable
    }`,
    message:
      evidence.backup.exportable &&
      evidence.backup.kind === 'tenant-business-backup'
        ? 'Backup metrics and export are available'
        : 'Backup metrics or export are not available',
  },
  containsAllCheck(
    'Expected facility codes',
    evidence.facilities.codes,
    expectedFacilityCodes,
  ),
  containsAllCheck(
    'Expected service codes',
    evidence.hospitalServices.codes,
    expectedServiceCodes,
  ),
  {
    name: 'Agents assigned to services',
    ok: evidence.agents.withService === evidence.agents.api,
    expected: evidence.agents.api,
    actual: evidence.agents.withService,
    message:
      evidence.agents.withService === evidence.agents.api
        ? 'All visible agents have a service assignment'
        : 'Some visible agents are missing a service assignment',
  },
  compareCounts('Facilities', evidence.facilities.api, evidence.facilities.backup),
  compareCounts(
    'Hospital services',
    evidence.hospitalServices.api,
    evidence.hospitalServices.backup,
  ),
  compareCounts('Agents', evidence.agents.api, evidence.agents.backup),
  compareCounts('Leaves', evidence.leaves.api, evidence.leaves.backup),
  compareCounts(
    'Backup metrics/export facilities',
    datasetCounts.facilities ?? 0,
    snapshotCounts.facilities ?? 0,
  ),
  compareCounts(
    'Backup metrics/export services',
    datasetCounts.hospitalServices ?? 0,
    snapshotCounts.hospitalServices ?? 0,
  ),
  compareCounts(
    'Backup metrics/export agents',
    datasetCounts.agents ?? 0,
    snapshotCounts.agents ?? 0,
  ),
  compareCounts(
    'Backup metrics/export shifts',
    datasetCounts.shifts ?? 0,
    snapshotCounts.shifts ?? 0,
  ),
  compareCounts(
    'Backup metrics/export leaves',
    datasetCounts.leaves ?? 0,
    snapshotCounts.leaves ?? 0,
  ),
];

const failedChecks = checks.filter((check) => !check.ok);
const failedEndpoints = endpointSteps.filter((step) => !step.ok);
const status =
  failedChecks.length === 0 && failedEndpoints.length === 0
    ? 'PASSED'
    : 'FAILED';

const report = {
  status,
  generatedAt: new Date().toISOString(),
  baseUrl,
  tenantId,
  period,
  thresholds,
  endpointSteps: endpointSteps.map((step) => ({
    name: step.name,
    path: step.path,
    status: step.status,
    ok: step.ok,
    httpStatus: step.httpStatus,
    durationMs: step.durationMs,
    error: step.error,
  })),
  evidence,
  checks,
};

const markdown = [
  `# Health-check donnees demo HGD-DOUALA - ${runDate}`,
  '',
  `- Statut: ${status}`,
  `- Base URL: ${baseUrl}`,
  `- Tenant: ${tenantId}`,
  `- Fenetre shifts: ${period.from} -> ${period.to}`,
  `- Non destructif: authentification + GET API uniquement`,
  '',
  '## Evidence',
  '',
  '| Domaine | API | Backup | Detail |',
  '| --- | ---: | ---: | --- |',
  `| Etablissements | ${evidence.facilities.api} | ${evidence.facilities.backup} | ${evidence.facilities.codes.join(', ') || '-'} |`,
  `| Services | ${evidence.hospitalServices.api} | ${evidence.hospitalServices.backup} | ${evidence.hospitalServices.codes.length} codes, ${evidence.hospitalServices.withFacility} rattachements etablissement |`,
  `| Agents | ${evidence.agents.api} | ${evidence.agents.backup} | ${evidence.agents.withService} rattachements service, ${evidence.agents.demoAccounts} comptes demo critiques visibles |`,
  `| Shifts | ${evidence.shifts.apiWindow} | ${evidence.shifts.backup} | snapshot periode=${evidence.shifts.snapshot} |`,
  `| Conges | ${evidence.leaves.api} | ${evidence.leaves.backup} | planning/leaves vs backup |`,
  `| Alertes ouvertes | ${evidence.openAlerts.api} | - | isResolved=false |`,
  `| Audit | ${evidence.audit.sample} | ${evidence.audit.total} | chaine valide=${evidence.audit.valid}, anomalies=${evidence.audit.issues ?? 'n/a'} |`,
  `| Backup export | - | - | kind=${evidence.backup.kind || 'n/a'}, schema=${evidence.backup.schemaVersion ?? 'n/a'}, exportable=${evidence.backup.exportable} |`,
  '',
  '## Checks',
  '',
  '| Check | Statut | Attendu | Observe |',
  '| --- | --- | --- | --- |',
  ...checks.map(
    (check) =>
      `| ${check.name} | ${check.ok ? 'OK' : 'FAILED'} | ${Array.isArray(check.expected) ? check.expected.join(', ') : check.expected} | ${Array.isArray(check.actual) ? check.actual.join(', ') : check.actual} |`,
  ),
  '',
  '## Endpoints',
  '',
  '| Endpoint | Statut | HTTP | Duree | Note |',
  '| --- | --- | ---: | ---: | --- |',
  ...endpointSteps.map(
    (step) =>
      `| ${step.name} | ${step.status} | ${step.httpStatus || '-'} | ${
        step.durationMs ?? '-'
      } ms | ${step.error || ''} |`,
  ),
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `preprod-demo-health-check-${runDate}.json`),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
  join(reportDir, `preprod-demo-health-check-${runDate}.md`),
  `${markdown}\n`,
);

if (outputFormat === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(markdown);
}

if (status !== 'PASSED') {
  process.exitCode = 1;
}
