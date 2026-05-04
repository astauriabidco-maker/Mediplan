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
let apiToken = process.env.API_TOKEN || '';
let tenantId = process.env.TENANT_ID || '';
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const requireAuth = process.env.SMOKE_REQUIRE_AUTH === 'true';
const smokeEmail = process.env.SMOKE_EMAIL || '';
const smokePassword = process.env.SMOKE_PASSWORD || '';

const now = new Date();
const defaultFrom = new Date(now);
defaultFrom.setDate(now.getDate() - 1);
const from = process.env.FROM || defaultFrom.toISOString();
const to = process.env.TO || now.toISOString();
const runDate = now.toISOString().slice(0, 10);

let headers = apiToken
  ? {
      Authorization: `Bearer ${apiToken}`,
    }
  : {};

const authenticate = async () => {
  if (apiToken || !smokeEmail || !smokePassword) return null;

  const url = `${baseUrl}/api/auth/login`;
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
    });
    const durationMs = Math.round(performance.now() - startedAt);
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.access_token) {
      return {
        name: 'Smoke authentication',
        path: '/api/auth/login',
        status: 'FAILED',
        ok: false,
        httpStatus: response.status,
        durationMs,
        reason: body?.message || 'access_token missing',
      };
    }

    apiToken = body.access_token;
    tenantId = tenantId || body.user?.tenantId || '';
    headers = {
      Authorization: `Bearer ${apiToken}`,
    };

    return {
      name: 'Smoke authentication',
      path: '/api/auth/login',
      status: 'PASSED',
      ok: true,
      httpStatus: response.status,
      durationMs,
      body: {
        user: body.user
          ? {
              email: body.user.email,
              tenantId: body.user.tenantId,
              role: body.user.role,
            }
          : null,
      },
    };
  } catch (error) {
    return {
      name: 'Smoke authentication',
      path: '/api/auth/login',
      status: 'FAILED',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const withQuery = (path, params = {}) => {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url;
};

const checkJson = async ({ name, path, params, authRequired = false }) => {
  if (authRequired && !apiToken) {
    return {
      name,
      path,
      status: 'SKIPPED',
      ok: !requireAuth,
      reason: 'API_TOKEN missing',
    };
  }

  const url = withQuery(path, params);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, { headers });
    const durationMs = Math.round(performance.now() - startedAt);
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return {
      name,
      path: `${url.pathname}${url.search}`,
      status: response.ok ? 'PASSED' : 'FAILED',
      ok: response.ok,
      httpStatus: response.status,
      durationMs,
      body,
    };
  } catch (error) {
    return {
      name,
      path: `${url.pathname}${url.search}`,
      status: 'FAILED',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const getChecks = () => [
  { name: 'API liveness', path: '/api/health/live' },
  { name: 'API readiness', path: '/api/health/ready' },
  {
    name: 'Planning observability',
    path: '/api/planning/observability/health',
    params: { tenantId, from, to },
    authRequired: true,
  },
  {
    name: 'Audit chain verification',
    path: '/api/audit/verify',
    params: { tenantId },
    authRequired: true,
  },
  {
    name: 'Backup metrics',
    path: '/api/tenant-backups/metrics',
    params: { tenantId, from, to },
    authRequired: true,
  },
];

const results = [];
const authResult = await authenticate();
if (authResult) {
  results.push(authResult);
}
for (const check of getChecks()) {
  results.push(await checkJson(check));
}

const failed = results.filter((result) => !result.ok);
const summary = {
  status: failed.length === 0 ? 'PASSED' : 'FAILED',
  generatedAt: now.toISOString(),
  baseUrl,
  tenantId: tenantId || null,
  period: { from, to },
  checks: results.map((result) => ({
    name: result.name,
    status: result.status,
    httpStatus: result.httpStatus,
    durationMs: result.durationMs,
    reason: result.reason,
    error: result.error,
  })),
};

const planning = results.find(
  (result) => result.name === 'Planning observability',
)?.body;
const audit = results.find(
  (result) => result.name === 'Audit chain verification',
)?.body;
const backup = results.find((result) => result.name === 'Backup metrics')?.body;

const markdown = [
  `# Rapport quotidien preprod - ${runDate}`,
  '',
  `- Statut: ${summary.status}`,
  `- Base URL: ${baseUrl}`,
  `- Tenant: ${tenantId || 'non renseigne'}`,
  `- Periode: ${from} -> ${to}`,
  '',
  '## Checks',
  '',
  '| Check | Statut | HTTP | Duree | Note |',
  '| --- | --- | ---: | ---: | --- |',
  ...results.map(
    (result) =>
      `| ${result.name} | ${result.status} | ${result.httpStatus || '-'} | ${
        result.durationMs ?? '-'
      } ms | ${result.reason || result.error || ''} |`,
  ),
  '',
  '## Metriques conformite',
  '',
  `- Health: ${planning?.status || 'n/a'}`,
  `- Raisons: ${(planning?.reasons || []).join(', ') || 'aucune'}`,
  `- Alertes ouvertes: ${planning?.counters?.openAlerts ?? 'n/a'}`,
  `- Shifts en attente: ${planning?.counters?.pendingShifts ?? 'n/a'}`,
  `- Publications refusees: ${
    planning?.counters?.refusedPublications ?? 'n/a'
  }`,
  '',
  '## Metriques audit',
  '',
  `- Chaine valide: ${audit?.valid ?? planning?.audit?.chain?.valid ?? 'n/a'}`,
  `- Evenements audites: ${
    audit?.total ?? planning?.audit?.chain?.total ?? 'n/a'
  }`,
  `- Anomalies chaine: ${
    audit?.issues?.length ?? planning?.audit?.chain?.issues?.length ?? 'n/a'
  }`,
  '',
  '## Metriques backup',
  '',
  `- Exportable: ${backup?.exportable ?? 'n/a'}`,
  `- Schema: ${backup?.schemaVersion ?? 'n/a'}`,
  `- Datasets: ${
    backup?.datasetCounts
      ? Object.entries(backup.datasetCounts)
          .map(([name, count]) => `${name}=${count}`)
          .join(', ')
      : 'n/a'
  }`,
  `- Shifts dans snapshot conformite: ${
    backup?.planningComplianceSnapshot?.totals?.shifts ?? 'n/a'
  }`,
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `preprod-smoke-${runDate}.json`),
  `${JSON.stringify({ summary, results }, null, 2)}\n`,
);
await writeFile(join(reportDir, `preprod-smoke-${runDate}.md`), markdown);

console.log(markdown);

if (failed.length > 0) {
  process.exitCode = 1;
}
