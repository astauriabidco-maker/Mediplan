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

const baseUrl = (process.env.BASE_URL || 'http://localhost:3005').replace(
  /\/$/,
  '',
);
const tenantId = process.env.TENANT_ID || 'HGD-DOUALA';
const email = process.env.SMOKE_EMAIL || 'superadmin@mediplan.demo';
const password = process.env.SMOKE_PASSWORD || 'password123';
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const runDate = new Date().toISOString().slice(0, 10);

const comparedDatasets = [
  'facilities',
  'hospitalServices',
  'agents',
  'shifts',
  'leaves',
  'auditLogs',
];

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
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
    throw new Error(
      `${options.method || 'GET'} ${path} failed: ${response.status} ${message}`,
    );
  }

  return body;
};

const login = await requestJson('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const headers = {
  Authorization: `Bearer ${login.access_token}`,
  'Content-Type': 'application/json',
};

const metricsBefore = await requestJson(
  `/api/tenant-backups/metrics?tenantId=${encodeURIComponent(tenantId)}`,
  { headers },
);
const snapshot = await requestJson(
  `/api/tenant-backups/export?tenantId=${encodeURIComponent(tenantId)}`,
  { headers },
);
const importResult = await requestJson(
  `/api/tenant-backups/import?tenantId=${encodeURIComponent(tenantId)}`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      snapshot,
      mode: 'REPLACE_PLANNING_DATA',
    }),
  },
);
const metricsAfter = await requestJson(
  `/api/tenant-backups/metrics?tenantId=${encodeURIComponent(tenantId)}`,
  { headers },
);
const auditVerification = await requestJson(
  `/api/audit/verify?tenantId=${encodeURIComponent(tenantId)}`,
  { headers },
);

const comparisons = Object.fromEntries(
  comparedDatasets.map((dataset) => [
    dataset,
    {
      before: metricsBefore.datasetCounts[dataset] ?? 0,
      snapshot: snapshot.integrity.datasetCounts[dataset] ?? 0,
      imported: importResult.imported[dataset] ?? null,
      after: metricsAfter.datasetCounts[dataset] ?? 0,
      matches:
        (metricsBefore.datasetCounts[dataset] ?? 0) ===
          (snapshot.integrity.datasetCounts[dataset] ?? 0) &&
        (snapshot.integrity.datasetCounts[dataset] ?? 0) ===
          (metricsAfter.datasetCounts[dataset] ?? 0),
    },
  ]),
);

const failedComparisons = Object.entries(comparisons).filter(
  ([, value]) => !value.matches,
);
const status =
  failedComparisons.length === 0 && auditVerification.valid
    ? 'PASSED'
    : 'FAILED';

const markdown = [
  `# Rapport backup/restauration preprod - ${runDate}`,
  '',
  `- Statut: ${status}`,
  `- Base URL: ${baseUrl}`,
  `- Tenant: ${tenantId}`,
  `- Mode import: ${importResult.mode}`,
  `- Chaine audit valide: ${auditVerification.valid}`,
  `- Evenements audit verifies: ${auditVerification.total}`,
  '',
  '## Comparaison compteurs',
  '',
  '| Dataset | Avant | Snapshot | Importe | Apres | Statut |',
  '| --- | ---: | ---: | ---: | ---: | --- |',
  ...Object.entries(comparisons).map(
    ([dataset, value]) =>
      `| ${dataset} | ${value.before} | ${value.snapshot} | ${
        value.imported ?? '-'
      } | ${value.after} | ${value.matches ? 'OK' : 'FAILED'} |`,
  ),
  '',
  '## Snapshot conformite',
  '',
  `- Shifts snapshot: ${snapshot.planningComplianceSnapshot.totals.shifts}`,
  `- Exceptions approuvees: ${snapshot.planningComplianceSnapshot.totals.approvedComplianceExceptions}`,
  `- Evenements conformite/audit: ${snapshot.planningComplianceSnapshot.totals.complianceAuditEvents}`,
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `preprod-backup-restore-${runDate}.json`),
  `${JSON.stringify(
    {
      status,
      tenantId,
      comparedDatasets,
      comparisons,
      importResult,
      auditVerification,
      metricsBefore,
      metricsAfter,
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  join(reportDir, `preprod-backup-restore-${runDate}.md`),
  markdown,
);

console.log(markdown);

if (status !== 'PASSED') {
  process.exitCode = 1;
}
