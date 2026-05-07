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
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 7);

  const options = {
    mock: false,
    format: 'both',
    reportDir: process.env.REPORT_DIR || 'prod-reports',
    from: process.env.OPS_WEEKLY_FROM || process.env.FROM || defaultFrom.toISOString(),
    to: process.env.OPS_WEEKLY_TO || process.env.TO || now.toISOString(),
    tenantId: process.env.TENANT_ID || 'HGD-DOUALA',
    environment:
      process.env.OPS_WEEKLY_ENV ||
      process.env.APP_ENV ||
      process.env.NODE_ENV ||
      'postprod',
    openAlertLimit: Number.parseInt(
      process.env.OPS_WEEKLY_OPEN_ALERT_LIMIT || '0',
      10,
    ),
    highAlertLimit: Number.parseInt(
      process.env.OPS_WEEKLY_HIGH_ALERT_LIMIT || '0',
      10,
    ),
    openIncidentLimit: Number.parseInt(
      process.env.OPS_WEEKLY_OPEN_INCIDENT_LIMIT || '0',
      10,
    ),
    criticalIncidentLimit: Number.parseInt(
      process.env.OPS_WEEKLY_CRITICAL_INCIDENT_LIMIT || '0',
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
    } else if (arg === '--from') {
      options.from = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--to') {
      options.to = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--tenant') {
      options.tenantId = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--env') {
      options.environment = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--open-alert-limit') {
      options.openAlertLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--high-alert-limit') {
      options.highAlertLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--open-incident-limit') {
      options.openIncidentLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--critical-incident-limit') {
      options.criticalIncidentLimit = Number.parseInt(
        readValue(argv, index, arg),
        10,
      );
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

  for (const [name, value] of Object.entries({
    openAlertLimit: options.openAlertLimit,
    highAlertLimit: options.highAlertLimit,
    openIncidentLimit: options.openIncidentLimit,
    criticalIncidentLimit: options.criticalIncidentLimit,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`--${name} must be a positive integer or zero`);
    }
  }

  const fromDate = new Date(options.from);
  const toDate = new Date(options.to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error('--from and --to must be valid ISO dates');
  }
  if (fromDate >= toDate) {
    throw new Error('--from must be before --to');
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 24 post-prod weekly report

Usage:
  node scripts/ops-weekly-report.mjs [--format markdown|json|both]
  node scripts/ops-weekly-report.mjs --mock --report-dir /tmp/mediplan-weekly

This script is non destructive. It only performs GET probes and writes
Markdown/JSON reports. It does not deploy, migrate, seed, restore backups,
acknowledge alerts, resolve incidents, print secrets, or mutate business data.

Env:
  ENV_FILE=.env.production
  BASE_URL=https://...
  API_TOKEN=<readonly token>
  TENANT_ID=<tenant>
  OPS_WEEKLY_FROM=<ISO datetime>
  OPS_WEEKLY_TO=<ISO datetime>
  OPS_WEEKLY_OPEN_ALERT_LIMIT=0
  OPS_WEEKLY_HIGH_ALERT_LIMIT=0
  OPS_WEEKLY_OPEN_INCIDENT_LIMIT=0
  OPS_WEEKLY_CRITICAL_INCIDENT_LIMIT=0
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

const severityOf = (item) => String(item?.severity || 'UNKNOWN').toUpperCase();

const statusOf = (item) => String(item?.status || 'UNKNOWN').toUpperCase();

const isHighOrCritical = (item) =>
  ['HIGH', 'CRITICAL'].includes(severityOf(item));

const isIncidentOpen = (incident) =>
  !['RESOLVED', 'CLOSED'].includes(statusOf(incident));

const isJournalOpen = (entry) =>
  ['OPEN', 'IN_PROGRESS'].includes(statusOf(entry));

const inPeriod = (value, from, to) => {
  const date = new Date(value);
  return date >= from && date <= to;
};

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

const summarizeIncident = (incident) => ({
  id: incident.id,
  title: incident.title,
  severity: incident.severity,
  status: incident.status,
  impactedService: incident.impactedService,
  assignedToId: incident.assignedToId,
  declaredAt: incident.declaredAt,
  resolvedAt: incident.resolvedAt,
  closedAt: incident.closedAt,
  resolutionSummary: incident.resolutionSummary,
});

const summarizeJournalEntry = (entry) => ({
  id: entry.id,
  type: entry.type,
  severity: entry.severity,
  status: entry.status,
  title: entry.title,
  occurredAt: entry.occurredAt,
  resolvedAt: entry.resolvedAt,
  ownerId: entry.ownerId,
  relatedReference: entry.relatedReference,
  evidenceLabel: entry.evidenceLabel,
});

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
      name: 'Operations incidents',
      path: '/api/ops/incidents',
      status: 'MOCKED',
      ok: true,
      body: [
        {
          id: 42,
          title: 'Retard traitement alertes planning',
          severity: 'HIGH',
          status: 'RESOLVED',
          impactedService: 'planning',
          assignedToId: 7,
          declaredAt: '2026-05-02T08:20:00.000Z',
          resolvedAt: '2026-05-02T10:05:00.000Z',
          closedAt: '2026-05-02T11:00:00.000Z',
          resolutionSummary: 'Relance worker conformite et verification audit.',
        },
      ],
    },
    {
      name: 'Operations journal',
      path: '/api/ops/journal',
      status: 'MOCKED',
      ok: true,
      body: [
        {
          id: 12,
          type: 'EVIDENCE',
          severity: 'LOW',
          status: 'RECORDED',
          title: 'Restore drill hebdomadaire OK',
          occurredAt: '2026-05-03T07:00:00.000Z',
          resolvedAt: null,
          ownerId: 4,
          relatedReference: 'backup-restore-weekly',
          evidenceLabel: 'Rapport restore',
        },
      ],
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
      body: { valid: true, total: 48, issues: [] },
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
          shifts: 72,
          leaves: 4,
          auditLogs: 48,
        },
        planningComplianceSnapshot: {
          totals: {
            shifts: 72,
            approvedComplianceExceptions: 0,
            complianceAuditEvents: 48,
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
      reason: 'API_TOKEN missing for authenticated weekly probes',
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
      name: 'Operations incidents',
      path: `/api/ops/incidents?${tenantQuery}`,
      headers,
    }),
  );
  results.push(
    await requestJson({
      baseUrl,
      name: 'Operations journal',
      path: `/api/ops/journal?${query({ tenantId, from, to, limit: 500 })}`,
      headers,
    }),
  );
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

function hoursBetween(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5);
}

function average(values) {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return null;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function roundMetric(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function buildReport({ options, settings, results }) {
  const generatedAt = new Date().toISOString();
  const runDate = generatedAt.slice(0, 10);
  const fromDate = new Date(settings.from);
  const toDate = new Date(settings.to);
  const compliance = firstBody(results, 'Planning compliance health') || {};
  const audit = firstBody(results, 'Audit chain verification') || {};
  const backup = firstBody(results, 'Backup metrics') || {};
  const rawIncidents = toArray(firstBody(results, 'Operations incidents'));
  const journalEntries = toArray(firstBody(results, 'Operations journal'));
  const openAlerts = toArray(firstBody(results, 'Open alerts'));
  const incidents = rawIncidents.filter((incident) =>
    [incident.declaredAt, incident.resolvedAt, incident.closedAt, incident.updatedAt]
      .filter(Boolean)
      .some((date) => inPeriod(date, fromDate, toDate)),
  );
  const openIncidents = incidents.filter(isIncidentOpen);
  const criticalOpenIncidents = openIncidents.filter(
    (incident) => severityOf(incident) === 'CRITICAL',
  );
  const highOrCriticalOpenIncidents = openIncidents.filter(isHighOrCritical);
  const incidentsWithoutOwner = openIncidents.filter(
    (incident) => !incident.assignedToId,
  );
  const resolvedIncidents = incidents.filter((incident) => incident.resolvedAt);
  const mttrHours = roundMetric(
    average(
      resolvedIncidents.map((incident) =>
        hoursBetween(incident.declaredAt, incident.resolvedAt),
      ),
    ),
  );
  const highOpenJournalEntries = journalEntries.filter(
    (entry) => isJournalOpen(entry) && isHighOrCritical(entry),
  );
  const restoreEvidenceEntries = journalEntries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.description,
      entry.relatedReference,
      entry.evidenceLabel,
      entry.metadata?.kind,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes('restore') || haystack.includes('backup');
  });
  const severityCounts = countBy(openAlerts, severityOf);
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
  const healthChecks = results.filter((result) =>
    ['API liveness', 'API readiness'].includes(result.name),
  );
  const healthCheckPassRate = roundMetric(
    healthChecks.length
      ? healthChecks.filter((result) => result.ok).length / healthChecks.length
      : null,
  );
  const incidentResolutionRate = roundMetric(
    incidents.length ? resolvedIncidents.length / incidents.length : 1,
  );

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
    ...(openIncidents.length > options.openIncidentLimit
      ? [`${openIncidents.length} open incidents exceed limit ${options.openIncidentLimit}`]
      : []),
    ...(criticalOpenIncidents.length > options.criticalIncidentLimit
      ? [
          `${criticalOpenIncidents.length} open CRITICAL incidents exceed limit ${options.criticalIncidentLimit}`,
        ]
      : []),
    ...(incidentsWithoutOwner.length
      ? [`${incidentsWithoutOwner.length} open incidents have no owner`]
      : []),
    ...(highOpenJournalEntries.length
      ? [`${highOpenJournalEntries.length} HIGH/CRITICAL journal items still open`]
      : []),
    ...(!auditValid ? ['audit chain invalid or unavailable'] : []),
    ...(auditIssues.length > 0
      ? [`${auditIssues.length} audit chain issues detected`]
      : []),
    ...(!backupExportable ? ['backup metrics not exportable'] : []),
  ];

  const recommendations = [
    ...(openIncidents.length
      ? ['Assign owner and target date to each open incident before the next ops committee.']
      : ['Keep incident closure evidence attached to the operations journal.']),
    ...(highOrCriticalOpenIncidents.length
      ? ['Run incident review for HIGH/CRITICAL open items and capture preventive actions.']
      : []),
    ...(openAlertCount
      ? ['Triage open alerts and link remediation evidence to the weekly report.']
      : []),
    ...(restoreEvidenceEntries.length
      ? []
      : ['Add a restore drill or backup verification evidence entry to the operations journal.']),
    ...(!auditValid || auditIssues.length
      ? ['Investigate audit chain anomalies before validating release readiness.']
      : []),
    ...(!backupExportable
      ? ['Block production decision until tenant backup metrics are exportable.']
      : []),
    ...(blockingReasons.length
      ? ['Publish blockers with named owners, target dates, and next checkpoint.']
      : ['Publish the report as weekly evidence and keep thresholds unchanged.']),
  ];

  const report = {
    status: failedChecks.length === 0 ? 'PASSED' : 'FAILED',
    decision:
      blockingReasons.length === 0 ? 'POST_PROD_WEEKLY_STABLE' : 'POST_PROD_WEEKLY_AT_RISK',
    generatedAt,
    runDate,
    mode: options.mock ? 'mock' : 'api',
    nonDestructive: true,
    policy: {
      methodsAllowed: ['GET'],
      authSource: options.mock ? 'mock' : 'API_TOKEN',
      mutationsExecuted: false,
      backupRestoreExecuted: false,
      incidentResolutionExecuted: false,
      alertResolutionExecuted: false,
      secretsPrinted: false,
      writesReportsOnly: true,
    },
    tenant: {
      id: settings.tenantId,
      env: settings.environment,
      baseUrl: settings.baseUrl,
    },
    period: { from: settings.from, to: settings.to },
    thresholds: {
      openAlertLimit: options.openAlertLimit,
      highAlertLimit: options.highAlertLimit,
      openIncidentLimit: options.openIncidentLimit,
      criticalIncidentLimit: options.criticalIncidentLimit,
    },
    counters: {
      incidents: incidents.length,
      openIncidents: openIncidents.length,
      highOrCriticalOpenIncidents: highOrCriticalOpenIncidents.length,
      criticalOpenIncidents: criticalOpenIncidents.length,
      incidentsWithoutOwner: incidentsWithoutOwner.length,
      journalEntries: journalEntries.length,
      highOpenJournalEntries: highOpenJournalEntries.length,
      restoreEvidenceEntries: restoreEvidenceEntries.length,
      openAlerts: openAlertCount,
      highOrCriticalAlerts: highAlertCount,
      auditIssues: auditIssues.length,
    },
    slaSlo: {
      healthCheckPassRate,
      incidentResolutionRate,
      meanTimeToResolveHours: mttrHours,
      planningComplianceStatus: complianceStatus,
      planningReasons: complianceReasons,
      planningCounters: compliance.counters || {},
    },
    incidents: {
      bySeverity: countBy(incidents, severityOf),
      byStatus: countBy(incidents, statusOf),
      open: openIncidents.map(summarizeIncident),
      recent: incidents.slice(0, 20).map(summarizeIncident),
    },
    journal: {
      byType: countBy(journalEntries, (entry) => entry.type || 'UNKNOWN'),
      byStatus: countBy(journalEntries, statusOf),
      highOpen: highOpenJournalEntries.map(summarizeJournalEntry),
      restoreEvidence: restoreEvidenceEntries.map(summarizeJournalEntry),
      recent: journalEntries.slice(0, 20).map(summarizeJournalEntry),
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
    recommendations,
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
    `# Rapport hebdomadaire post-prod - ${runDate}`,
    '',
    `- Statut checks: ${report.status}`,
    `- Decision: ${report.decision}`,
    `- Mode: ${report.mode}`,
    `- Base URL: ${settings.baseUrl}`,
    `- Tenant: ${settings.tenantId}`,
    `- Env: ${settings.environment}`,
    `- Genere: ${generatedAt}`,
    `- Periode: ${settings.from} -> ${settings.to}`,
    '- Non destructif: oui, probes GET uniquement et rapports locaux',
    '',
    '## Compteurs',
    '',
    `- Incidents semaine: ${report.counters.incidents}`,
    `- Incidents ouverts: ${report.counters.openIncidents}`,
    `- Incidents HIGH/CRITICAL ouverts: ${report.counters.highOrCriticalOpenIncidents}`,
    `- Alertes ouvertes: ${report.counters.openAlerts}`,
    `- Alertes HIGH/CRITICAL: ${report.counters.highOrCriticalAlerts}`,
    `- Entrees journal ops: ${report.counters.journalEntries}`,
    `- Preuves backup/restore: ${report.counters.restoreEvidenceEntries}`,
    `- Anomalies audit chain: ${report.counters.auditIssues}`,
    '',
    '## SLA / SLO',
    '',
    `- Health checks API: ${report.slaSlo.healthCheckPassRate ?? 'n/a'}`,
    `- Taux resolution incidents: ${report.slaSlo.incidentResolutionRate ?? 'n/a'}`,
    `- MTTR incidents resolus: ${
      report.slaSlo.meanTimeToResolveHours ?? 'n/a'
    } h`,
    `- Conformite planning: ${report.slaSlo.planningComplianceStatus}`,
    `- Raisons planning: ${report.slaSlo.planningReasons.join(', ') || 'aucune'}`,
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
          result.reason || result.error || result.source || '',
        )} |`,
    ),
    '',
    '## Incidents ouverts',
    '',
    ...(openIncidents.length
      ? [
          '| ID | Severite | Statut | Owner | Service | Titre |',
          '| ---: | --- | --- | ---: | --- | --- |',
          ...openIncidents.map(
            (incident) =>
              `| ${incident.id} | ${escapeMarkdownCell(
                incident.severity,
              )} | ${escapeMarkdownCell(incident.status)} | ${
                incident.assignedToId ?? '-'
              } | ${escapeMarkdownCell(
                incident.impactedService || '-',
              )} | ${escapeMarkdownCell(incident.title)} |`,
          ),
        ]
      : ['Aucun incident ouvert sur la periode.']),
    '',
    '## Journal ops',
    '',
    ...(journalEntries.length
      ? [
          '| ID | Type | Severite | Statut | Occurrence | Titre |',
          '| ---: | --- | --- | --- | --- | --- |',
          ...journalEntries.slice(0, 20).map(
            (entry) =>
              `| ${entry.id} | ${escapeMarkdownCell(entry.type)} | ${escapeMarkdownCell(
                entry.severity,
              )} | ${escapeMarkdownCell(entry.status)} | ${escapeMarkdownCell(
                entry.occurredAt,
              )} | ${escapeMarkdownCell(entry.title)} |`,
          ),
        ]
      : ['Aucune entree journal ops sur la periode.']),
    '',
    '## Backup / audit readiness',
    '',
    `- Backup exportable: ${backupExportable}`,
    `- Schema backup: ${backup.schemaVersion || 'n/a'}`,
    `- Datasets: ${
      Object.entries(backup.datasetCounts || {})
        .map(([name, count]) => `${name}=${count}`)
        .join(', ') || 'n/a'
    }`,
    `- Audit chain valide: ${auditValid}`,
    `- Evenements verifies: ${report.auditChain.events ?? 'n/a'}`,
    '',
    '## Points bloquants',
    '',
    ...(blockingReasons.length
      ? blockingReasons.map((reason) => `- ${reason}`)
      : ['Aucun point bloquant observe.']),
    '',
    '## Recommandations',
    '',
    ...recommendations.map((recommendation) => `- ${recommendation}`),
    '',
  ].join('\n');

  return { report, markdown };
}

async function writeReport({ options, report, markdown }) {
  await mkdir(options.reportDir, { recursive: true });
  const fileBase = `ops-weekly-report-${report.runDate}`;
  const jsonPath = path.join(options.reportDir, `${fileBase}.json`);
  const markdownPath = path.join(options.reportDir, `${fileBase}.md`);

  if (options.format === 'json' || options.format === 'both') {
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (options.format === 'markdown' || options.format === 'both') {
    await writeFile(markdownPath, markdown);
  }

  return { jsonPath, markdownPath };
}

try {
  await loadEnvFile(process.env.ENV_FILE);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
  } else {
    const settings = {
      baseUrl: (process.env.BASE_URL || 'http://localhost:3005').replace(/\/$/, ''),
      tenantId: options.tenantId,
      environment: options.environment,
      from: options.from,
      to: options.to,
    };
    const apiToken = process.env.API_TOKEN || '';
    const results = options.mock
      ? getMockResults()
      : await collectApiResults({ ...settings, apiToken });
    const { report, markdown } = buildReport({ options, settings, results });
    const paths = await writeReport({ options, report, markdown });

    console.log(markdown);
    console.log(`\nRapports generes:`);
    if (options.format === 'json' || options.format === 'both') {
      console.log(`- ${paths.jsonPath}`);
    }
    if (options.format === 'markdown' || options.format === 'both') {
      console.log(`- ${paths.markdownPath}`);
    }

    if (report.decision !== 'POST_PROD_WEEKLY_STABLE') {
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`Ops weekly report error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
