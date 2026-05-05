#!/usr/bin/env node
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
const runDate = now.toISOString().slice(0, 10);
const args = new Set(process.argv.slice(2));
const apply =
  args.has('--apply') ||
  process.env.PREPROD_ALERT_REMEDIATION_APPLY === 'true';
const baseUrl = (process.env.BASE_URL || 'http://localhost:3005').replace(
  /\/$/,
  '',
);
const tenantId = process.env.TENANT_ID || 'HGD-DOUALA';
const email = process.env.SMOKE_EMAIL || 'superadmin@mediplan.demo';
const password = process.env.SMOKE_PASSWORD || 'password123';
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const expectedHighCount = Number(
  process.env.PREPROD_ALERT_REMEDIATION_EXPECTED_COUNT || 4,
);
const reason =
  process.env.PREPROD_ALERT_REMEDIATION_REASON ||
  [
    `Sprint 15 Phase 4 remediation ${runDate}`,
    'HGD-DOUALA preprod HIGH QVT alerts reviewed and closed as targeted non-destructive remediation.',
    'No DB reset, no bulk delete, no planning publish, no restore import.',
  ].join(' - ');

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

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
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
  fatigueScore: alert.metadata?.fatigueScore,
  totalHoursWeek: alert.metadata?.totalHoursWeek,
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
  isAcknowledged: alert.isAcknowledged,
  isResolved: alert.isResolved,
  resolvedAt: alert.resolvedAt,
  resolutionReason: alert.resolutionReason,
});

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const beforeAlerts = await listOpenHighAlerts();
const summariesBefore = beforeAlerts.map(summarizeAlert);
const guard = apply
  ? 'PREPROD_ALERT_REMEDIATION_APPLY=true or --apply provided'
  : 'dry-run default: no alert mutation executed';

if (beforeAlerts.length !== expectedHighCount) {
  const message = `Expected ${expectedHighCount} open HIGH alerts for targeted HGD-DOUALA remediation, observed ${beforeAlerts.length}.`;
  if (apply) {
    throw new Error(`${message} Refusing to apply targeted resolution.`);
  }
  console.warn(`${message} Continuing in dry-run documentation mode.`);
}

const resolutions = [];
if (apply) {
  for (const alert of beforeAlerts) {
    const result = await requestJson(
      `/api/agent-alerts/${alert.id}/resolve?${query({ tenantId })}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ reason }),
      },
    );
    resolutions.push({
      id: alert.id,
      httpStatus: result.httpStatus,
      durationMs: result.durationMs,
      result: summarizeAlert(result.body),
    });
  }
}

const afterAlerts = await listOpenHighAlerts();
const status = apply
  ? afterAlerts.length === 0
    ? 'PASSED'
    : 'FAILED'
  : beforeAlerts.length === expectedHighCount
    ? 'READY'
    : 'REVIEW';
const generatedAt = new Date().toISOString();
const report = {
  status,
  generatedAt,
  tenant: {
    id: tenantId,
    baseUrl,
  },
  apply,
  guard,
  expectedHighCount,
  reason,
  safety: {
    scope: 'PATCH /api/agent-alerts/:id/resolve for currently open HIGH alerts only',
    noBulkDelete: true,
    noDatabaseReset: true,
    noDestructiveMigration: true,
    noPlanningPublication: true,
    noBackupRestore: true,
  },
  before: {
    highOpenCount: beforeAlerts.length,
    highOpen: summariesBefore,
  },
  resolutions,
  after: {
    highOpenCount: afterAlerts.length,
    highOpen: afterAlerts.map(summarizeAlert),
  },
};

const markdown = [
  `# Remediation alertes HIGH preprod - ${runDate}`,
  '',
  `- Statut: ${status}`,
  `- Tenant: ${tenantId}`,
  `- Base URL: ${baseUrl}`,
  `- Genere: ${generatedAt}`,
  `- Mode: ${apply ? 'apply' : 'dry-run'}`,
  `- Garde: ${guard}`,
  `- Alertes HIGH avant: ${beforeAlerts.length}`,
  `- Alertes HIGH apres: ${afterAlerts.length}`,
  `- Raison resolution: ${reason}`,
  '',
  '## Securite',
  '',
  '- Resolution ciblee par API, une alerte a la fois.',
  '- Aucune suppression massive.',
  '- Aucun reset DB.',
  '- Aucune migration destructive.',
  '- Aucune publication planning.',
  '- Aucune restauration backup.',
  '',
  '## Alertes avant',
  '',
  '| ID | Agent | Type | Message | Metadata |',
  '| ---: | --- | --- | --- | --- |',
  ...summariesBefore.map(
    (alert) =>
      `| ${alert.id} | ${escapeMarkdownCell(
        alert.agentName || alert.agentId || '-',
      )} | ${escapeMarkdownCell(alert.type)} | ${escapeMarkdownCell(
        alert.message,
      )} | ${escapeMarkdownCell(
        [
          alert.ruleCode ? `rule=${alert.ruleCode}` : '',
          alert.serviceId ? `service=${alert.serviceId}` : '',
          alert.fatigueScore ? `fatigue=${alert.fatigueScore}` : '',
          alert.totalHoursWeek ? `hours=${alert.totalHoursWeek}` : '',
        ]
          .filter(Boolean)
          .join(', ') || '-',
      )} |`,
  ),
  '',
  '## Resolutions',
  '',
  '| ID | HTTP | Duree | Resultat |',
  '| ---: | ---: | ---: | --- |',
  ...(resolutions.length
    ? resolutions.map(
        (resolution) =>
          `| ${resolution.id} | ${resolution.httpStatus} | ${
            resolution.durationMs
          } ms | ${escapeMarkdownCell(
            resolution.result.isResolved ? 'resolved' : 'not-resolved',
          )} |`,
      )
    : ['| - | - | - | dry-run: aucune mutation |']),
  '',
  '## Alertes apres',
  '',
  '| ID | Agent | Type | Message |',
  '| ---: | --- | --- | --- |',
  ...(afterAlerts.length
    ? afterAlerts.map((alert) => {
        const summary = summarizeAlert(alert);
        return `| ${summary.id} | ${escapeMarkdownCell(
          summary.agentName || summary.agentId || '-',
        )} | ${escapeMarkdownCell(summary.type)} | ${escapeMarkdownCell(
          summary.message,
        )} |`;
      })
    : ['| - | - | - | aucune alerte HIGH ouverte |']),
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `preprod-alert-remediation-${runDate}.json`),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
  join(reportDir, `preprod-alert-remediation-${runDate}.md`),
  markdown,
);

console.log(markdown);

if (status === 'FAILED') {
  process.exitCode = 1;
}
