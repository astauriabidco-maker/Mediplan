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

const now = new Date();
const defaultFrom = new Date(now);
defaultFrom.setDate(now.getDate() - 1);

const baseUrl = (process.env.BASE_URL || 'http://localhost:3005').replace(
  /\/$/,
  '',
);
const tenantId = process.env.TENANT_ID || 'HGD-DOUALA';
const email = process.env.SMOKE_EMAIL || 'superadmin@mediplan.demo';
const password = process.env.SMOKE_PASSWORD || 'password123';
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const from =
  process.env.INCIDENT_FROM || process.env.FROM || defaultFrom.toISOString();
const to = process.env.INCIDENT_TO || process.env.TO || now.toISOString();
const runDate = now.toISOString().slice(0, 10);
const allowPublish = process.env.INCIDENT_ALLOW_PUBLISH === 'true';
const allowRestore = process.env.INCIDENT_ALLOW_RESTORE === 'true';
const expectBlockedPublication =
  process.env.INCIDENT_EXPECT_BLOCKED_PUBLICATION === 'true';
const expectCriticalAlert =
  process.env.INCIDENT_EXPECT_CRITICAL_ALERT === 'true';
const importMode = process.env.INCIDENT_IMPORT_MODE || 'REPLACE_PLANNING_DATA';

let apiToken = process.env.API_TOKEN || '';

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

const requestJson = async (path, options = {}) => {
  const result = await request(path, options);
  if (!result.ok) {
    const message =
      typeof result.body === 'object' && result.body?.message
        ? JSON.stringify(result.body.message)
        : JSON.stringify(result.body);
    throw new Error(
      `${options.method || 'GET'} ${path} failed: ${result.httpStatus} ${message}`,
    );
  }
  return result;
};

if (!apiToken) {
  const login = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  apiToken = login.body.access_token;
}

const headers = {
  Authorization: `Bearer ${apiToken}`,
  'Content-Type': 'application/json',
};

const scenarioResults = [];

const record = (scenario) => {
  scenarioResults.push({
    ...scenario,
    status: scenario.ok ? 'PASSED' : 'FAILED',
  });
};

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.toString();
};

const listOpenHighAlerts = async () => {
  const alerts = await requestJson(
    `/api/agent-alerts?${query({
      tenantId,
      severity: 'HIGH',
      isResolved: 'false',
    })}`,
    { headers },
  );

  return Array.isArray(alerts.body) ? alerts.body : [];
};

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

const publishPath = allowPublish
  ? '/api/planning/publish'
  : '/api/planning/publish/preview';
const publishPayload = JSON.stringify({ start: from, end: to });
const publishAttempt = await request(publishPath, {
  method: 'POST',
  headers,
  body: publishPayload,
});
const blockedPublication = allowPublish
  ? !publishAttempt.ok &&
    (publishAttempt.httpStatus === 400 ||
      publishAttempt.body?.publishable === false ||
      /blocked/i.test(JSON.stringify(publishAttempt.body)))
  : publishAttempt.ok && publishAttempt.body?.publishable === false;

record({
  name: 'Publication bloquee',
  ok: expectBlockedPublication ? blockedPublication : true,
  observed: blockedPublication
    ? allowPublish
      ? 'blocked'
      : 'preview-not-publishable'
    : publishAttempt.ok
      ? allowPublish
        ? 'published'
        : 'preview-publishable'
      : 'failed',
  httpStatus: publishAttempt.httpStatus,
  durationMs: publishAttempt.durationMs,
  evidence: {
    publishable: publishAttempt.body?.publishable,
    message: publishAttempt.body?.message,
    violations: publishAttempt.body?.report?.violations?.length,
    warnings: publishAttempt.body?.report?.warnings?.length,
  },
  note: expectBlockedPublication
    ? 'Incident attendu: la publication doit etre refusee.'
    : 'Observation non bloquante: activer INCIDENT_EXPECT_BLOCKED_PUBLICATION=true pendant le drill incident.',
});

const observability = await requestJson(
  `/api/planning/observability/health?${query({ tenantId, from, to })}`,
  { headers },
);
const criticalAlert =
  observability.body?.status === 'CRITICAL' &&
  (observability.body?.reasons || []).includes('HIGH_ALERTS_OPEN');

record({
  name: 'Alerte critique',
  ok: expectCriticalAlert ? criticalAlert : true,
  observed: criticalAlert ? 'critical-alert-open' : observability.body?.status,
  httpStatus: observability.httpStatus,
  durationMs: observability.durationMs,
  evidence: {
    status: observability.body?.status,
    reasons: observability.body?.reasons || [],
    openAlerts: observability.body?.counters?.openAlerts,
    highAlerts: observability.body?.counters?.highAlerts,
  },
  note: expectCriticalAlert
    ? 'Incident attendu: observability doit exposer HIGH_ALERTS_OPEN.'
    : 'Observation non bloquante: activer INCIDENT_EXPECT_CRITICAL_ALERT=true pendant le drill incident.',
});

const metricsBefore = await requestJson(
  `/api/tenant-backups/metrics?${query({ tenantId, from, to })}`,
  { headers },
);
const snapshot = await requestJson(
  `/api/tenant-backups/export?${query({ tenantId, from, to })}`,
  { headers },
);

record({
  name: 'Export backup',
  ok:
    snapshot.body?.kind === 'tenant-business-backup' &&
    Boolean(snapshot.body?.schemaVersion) &&
    Boolean(snapshot.body?.integrity?.datasetCounts),
  observed: snapshot.body?.kind || 'unknown',
  httpStatus: snapshot.httpStatus,
  durationMs: snapshot.durationMs,
  evidence: {
    schemaVersion: snapshot.body?.schemaVersion,
    exportable: metricsBefore.body?.exportable,
    datasetCounts: snapshot.body?.integrity?.datasetCounts,
  },
});

let restoreResult = null;
if (allowRestore) {
  restoreResult = await requestJson(
    `/api/tenant-backups/import?${query({ tenantId })}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        snapshot: snapshot.body,
        mode: importMode,
      }),
    },
  );

  record({
    name: 'Restauration',
    ok: Boolean(restoreResult.body?.imported),
    observed: restoreResult.body?.mode || importMode,
    httpStatus: restoreResult.httpStatus,
    durationMs: restoreResult.durationMs,
    evidence: {
      mode: restoreResult.body?.mode,
      imported: restoreResult.body?.imported,
    },
  });
} else {
  record({
    name: 'Restauration',
    ok: true,
    observed: 'skipped',
    evidence: {
      mode: importMode,
      guard: 'Set INCIDENT_ALLOW_RESTORE=true to execute import.',
    },
    note: 'Restauration non executee par defaut pour eviter une mutation preprod involontaire.',
  });
}

const metricsAfter = await requestJson(
  `/api/tenant-backups/metrics?${query({ tenantId, from, to })}`,
  { headers },
);
const auditVerification = await requestJson(
  `/api/audit/verify?${query({ tenantId })}`,
  { headers },
);
const recoveryObservability = await requestJson(
  `/api/planning/observability/health?${query({ tenantId, from, to })}`,
  { headers },
);
const openHighAlerts = await listOpenHighAlerts();

record({
  name: 'Reprise apres correction',
  ok:
    auditVerification.body?.valid === true &&
    metricsAfter.body?.exportable === true &&
    recoveryObservability.body?.status !== 'CRITICAL',
  observed: recoveryObservability.body?.status,
  httpStatus: recoveryObservability.httpStatus,
  durationMs: recoveryObservability.durationMs,
  evidence: {
    observabilityStatus: recoveryObservability.body?.status,
    reasons: recoveryObservability.body?.reasons || [],
    openHighAlerts: openHighAlerts.length,
    auditChainValid: auditVerification.body?.valid,
    auditEvents: auditVerification.body?.total,
    backupExportable: metricsAfter.body?.exportable,
  },
});

const status = scenarioResults.every((scenario) => scenario.ok)
  ? 'PASSED'
  : 'FAILED';

const markdown = [
  `# Rapport incidents preprod - ${runDate}`,
  '',
  `- Statut: ${status}`,
  `- Base URL: ${baseUrl}`,
  `- Tenant: ${tenantId}`,
  `- Periode: ${from} -> ${to}`,
  `- Restauration executee: ${allowRestore ? 'oui' : 'non'}`,
  `- Publication executee: ${allowPublish ? 'oui' : 'non, preview uniquement'}`,
  '',
  '## Scenarios',
  '',
  '| Scenario | Statut | Observe | HTTP | Duree | Note |',
  '| --- | --- | --- | ---: | ---: | --- |',
  ...scenarioResults.map(
    (scenario) =>
      `| ${scenario.name} | ${scenario.status} | ${scenario.observed || '-'} | ${
        scenario.httpStatus || '-'
      } | ${scenario.durationMs ?? '-'} ms | ${scenario.note || ''} |`,
  ),
  '',
  '## Synthese reprise',
  '',
  `- Observability finale: ${recoveryObservability.body?.status || 'n/a'}`,
  `- Raisons finales: ${
    (recoveryObservability.body?.reasons || []).join(', ') || 'aucune'
  }`,
  `- Alertes hautes ouvertes: ${openHighAlerts.length}`,
  `- Chaine audit valide: ${auditVerification.body?.valid}`,
  `- Evenements audit verifies: ${auditVerification.body?.total}`,
  `- Backup exportable: ${metricsAfter.body?.exportable}`,
  '',
  ...(openHighAlerts.length
    ? [
        '## Alertes critiques ouvertes',
        '',
        '| ID | Agent | Type | Regle | Message |',
        '| ---: | --- | --- | --- | --- |',
        ...openHighAlerts.map((alert) => {
          const summary = summarizeAlert(alert);
          return `| ${summary.id} | ${summary.agentName || summary.agentId || '-'} | ${
            summary.type || '-'
          } | ${summary.ruleCode || '-'} | ${String(summary.message || '').replace(/\|/g, '\\|')} |`;
        }),
        '',
      ]
    : []),
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `preprod-incident-drill-${runDate}.json`),
  `${JSON.stringify(
    {
      status,
      generatedAt: now.toISOString(),
      baseUrl,
      tenantId,
      period: { from, to },
      allowRestore,
      expectBlockedPublication,
      expectCriticalAlert,
      scenarios: scenarioResults,
      metricsBefore: metricsBefore.body,
      metricsAfter: metricsAfter.body,
      restoreResult: restoreResult?.body || null,
      auditVerification: auditVerification.body,
      openHighAlerts: openHighAlerts.map(summarizeAlert),
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  join(reportDir, `preprod-incident-drill-${runDate}.md`),
  markdown,
);

console.log(markdown);

if (status !== 'PASSED') {
  process.exitCode = 1;
}
