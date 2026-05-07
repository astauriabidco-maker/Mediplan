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
  defaultFrom.setDate(now.getDate() - 30);

  const options = {
    mock: false,
    dryRun: false,
    format: 'both',
    reportDir: process.env.REPORT_DIR || 'business-reports',
    from: process.env.MANAGEMENT_REPORT_FROM || process.env.FROM || defaultFrom.toISOString(),
    to: process.env.MANAGEMENT_REPORT_TO || process.env.TO || now.toISOString(),
    tenantId: process.env.TENANT_ID || 'HGD-DOUALA',
    environment:
      process.env.MANAGEMENT_REPORT_ENV ||
      process.env.APP_ENV ||
      process.env.NODE_ENV ||
      'postprod',
    availabilityTarget: Number.parseFloat(
      process.env.MANAGEMENT_REPORT_AVAILABILITY_TARGET || '0.99',
    ),
    criticalAlertLimit: Number.parseInt(
      process.env.MANAGEMENT_REPORT_CRITICAL_ALERT_LIMIT || '0',
      10,
    ),
    openIncidentLimit: Number.parseInt(
      process.env.MANAGEMENT_REPORT_OPEN_INCIDENT_LIMIT || '0',
      10,
    ),
    refusedPublicationLimit: Number.parseInt(
      process.env.MANAGEMENT_REPORT_REFUSED_PUBLICATION_LIMIT || '0',
      10,
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--mock') {
      options.mock = true;
    } else if (arg === '--dry-run' || arg === '--smoke') {
      options.dryRun = true;
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
    } else if (arg === '--availability-target') {
      options.availabilityTarget = Number.parseFloat(readValue(argv, index, arg));
      index += 1;
    } else if (arg === '--critical-alert-limit') {
      options.criticalAlertLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--open-incident-limit') {
      options.openIncidentLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--refused-publication-limit') {
      options.refusedPublicationLimit = Number.parseInt(
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

  if (
    !Number.isFinite(options.availabilityTarget) ||
    options.availabilityTarget <= 0 ||
    options.availabilityTarget > 1
  ) {
    throw new Error('--availability-target must be between 0 and 1');
  }

  for (const [name, value] of Object.entries({
    criticalAlertLimit: options.criticalAlertLimit,
    openIncidentLimit: options.openIncidentLimit,
    refusedPublicationLimit: options.refusedPublicationLimit,
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
  console.log(`Mediplan Sprint 25 phase 6 management business report

Usage:
  node scripts/management-business-report.mjs --mock
  node scripts/management-business-report.mjs --tenant HGD-DOUALA --from 2026-05-01T00:00:00Z --to 2026-05-31T23:59:59Z

This script is non destructive. It only performs GET probes and writes
Markdown/JSON reports. It does not deploy, migrate, seed, restore backups,
resolve incidents, acknowledge alerts, publish planning, or mutate data.

Env:
  ENV_FILE=.env.production
  BASE_URL=https://...
  API_TOKEN=<readonly token>
  TENANT_ID=<tenant>
  MANAGEMENT_REPORT_FROM=<ISO datetime>
  MANAGEMENT_REPORT_TO=<ISO datetime>
  MANAGEMENT_REPORT_AVAILABILITY_TARGET=0.99
  MANAGEMENT_REPORT_CRITICAL_ALERT_LIMIT=0
  MANAGEMENT_REPORT_OPEN_INCIDENT_LIMIT=0
  MANAGEMENT_REPORT_REFUSED_PUBLICATION_LIMIT=0
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

const statusOf = (item) => String(item?.status || 'UNKNOWN').toUpperCase();

const severityOf = (item) => String(item?.severity || 'UNKNOWN').toUpperCase();

const isIncidentOpen = (incident) =>
  !['RESOLVED', 'CLOSED'].includes(statusOf(incident));

const isCriticalAlert = (alert) => severityOf(alert) === 'CRITICAL';

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
      name: 'Planning observability',
      path: '/api/planning/observability/health',
      status: 'MOCKED',
      ok: true,
      body: {
        status: 'DEGRADED',
        reasons: ['REFUSED_PUBLICATIONS'],
        counters: {
          openAlerts: 2,
          highAlerts: 1,
          mediumAlerts: 1,
          lowAlerts: 0,
          pendingShifts: 8,
          validatedShifts: 86,
          publishedShifts: 312,
          publicationAttempts: 14,
          refusedPublications: 1,
          successfulPublications: 13,
        },
        audit: {
          chain: {
            checkedAt: '2026-05-05T08:00:00.000Z',
            total: 128,
            valid: true,
            issues: [],
          },
        },
      },
    },
    {
      name: 'Planning compliance summary',
      path: '/api/planning/compliance/summary',
      status: 'MOCKED',
      ok: true,
      body: {
        counters: {
          openAlerts: 2,
          blockedShifts: 3,
          agentsAtRisk: 2,
          refusedPublications: 1,
        },
        openAlertsBySeverity: { HIGH: 1, MEDIUM: 1, LOW: 0 },
        blockedShiftPreview: [
          {
            shiftId: 901,
            agentId: 44,
            blockingReasons: ['REST_TIME_BELOW_MINIMUM'],
          },
        ],
      },
    },
    {
      name: 'Operations incidents',
      path: '/api/ops/incidents',
      status: 'MOCKED',
      ok: true,
      body: [
        {
          id: 101,
          title: 'Retard validation planning urgences',
          severity: 'HIGH',
          status: 'RESOLVED',
          impactedService: 'urgences',
          assignedToId: 12,
          declaredAt: '2026-05-02T07:00:00.000Z',
          resolvedAt: '2026-05-02T10:30:00.000Z',
          closedAt: '2026-05-02T11:00:00.000Z',
          resolutionSummary: 'Astreinte renforcee et controles relances.',
        },
        {
          id: 102,
          title: 'Alerte backup a surveiller',
          severity: 'MEDIUM',
          status: 'ASSIGNED',
          impactedService: 'exploitation',
          assignedToId: 7,
          declaredAt: '2026-05-04T09:15:00.000Z',
          resolvedAt: null,
          closedAt: null,
        },
      ],
    },
    {
      name: 'Operations alerts',
      path: '/api/ops/alerts',
      status: 'MOCKED',
      ok: true,
      body: [
        {
          id: 18,
          type: 'SLO_BREACH',
          severity: 'HIGH',
          status: 'OPEN',
          source: 'planning-observability',
          sourceReference: 'refused-publications',
          message: 'Publication planning refusee sur la periode.',
          openedAt: '2026-05-04T08:00:00.000Z',
          lastSeenAt: '2026-05-04T08:00:00.000Z',
        },
      ],
    },
    {
      name: 'Agent alerts',
      path: '/api/agent-alerts',
      status: 'MOCKED',
      ok: true,
      body: [
        {
          id: 77,
          agentId: 44,
          type: 'COMPLIANCE',
          severity: 'HIGH',
          message: 'Repos insuffisant avant garde.',
          isResolved: false,
          createdAt: '2026-05-04T07:40:00.000Z',
          metadata: { ruleCode: 'REST_TIME_BELOW_MINIMUM', serviceId: 2 },
        },
      ],
    },
    {
      name: 'Audit chain verification',
      path: '/api/audit/verify',
      status: 'MOCKED',
      ok: true,
      body: { valid: true, total: 128, issues: [] },
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
          hospitalServices: 4,
          agents: 96,
          shifts: 312,
          auditLogs: 128,
        },
        planningComplianceSnapshot: {
          totals: {
            shifts: 312,
            approvedComplianceExceptions: 1,
            complianceAuditEvents: 128,
          },
        },
      },
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
      reason: 'API_TOKEN missing for authenticated management report probes',
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
      name: 'Planning observability',
      path: `/api/planning/observability/health?${periodQuery}`,
      headers,
    }),
  );
  results.push(
    await requestJson({
      baseUrl,
      name: 'Planning compliance summary',
      path: `/api/planning/compliance/summary?${periodQuery}`,
      headers,
    }),
  );
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
      name: 'Operations alerts',
      path: `/api/ops/alerts?${query({ tenantId, status: 'OPEN', limit: 500 })}`,
      headers,
    }),
  );
  results.push(
    await requestJson({
      baseUrl,
      name: 'Agent alerts',
      path: `/api/agent-alerts?${query({ tenantId, isResolved: 'false' })}`,
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

function percentage(value) {
  return Number.isFinite(value) ? `${Math.round(value * 1000) / 10}%` : 'n/a';
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

const summarizeAlert = (alert, sourceKind) => ({
  id: alert.id,
  sourceKind,
  type: alert.type,
  severity: alert.severity,
  status: alert.status || (alert.isResolved ? 'RESOLVED' : 'OPEN'),
  message: alert.message,
  source: alert.source,
  sourceReference: alert.sourceReference,
  ruleCode: alert.metadata?.ruleCode,
  serviceId: alert.metadata?.serviceId,
  agentId: alert.agentId,
  openedAt: alert.openedAt || alert.createdAt,
  lastSeenAt: alert.lastSeenAt || alert.updatedAt,
});

function buildReport({ options, settings, results }) {
  const generatedAt = new Date().toISOString();
  const runDate = generatedAt.slice(0, 10);
  const fromDate = new Date(settings.from);
  const toDate = new Date(settings.to);
  const failedChecks = results.filter((result) => !result.ok);
  const healthChecks = results.filter((result) =>
    ['API liveness', 'API readiness'].includes(result.name),
  );
  const availability =
    healthChecks.length > 0
      ? healthChecks.filter((result) => result.ok).length / healthChecks.length
      : null;

  const observability = firstBody(results, 'Planning observability') || {};
  const complianceSummary = firstBody(results, 'Planning compliance summary') || {};
  const audit = firstBody(results, 'Audit chain verification') || {};
  const backup = firstBody(results, 'Backup metrics') || {};
  const rawIncidents = toArray(firstBody(results, 'Operations incidents'));
  const operationsAlerts = toArray(firstBody(results, 'Operations alerts'));
  const agentAlerts = toArray(firstBody(results, 'Agent alerts'));

  const incidents = rawIncidents.filter((incident) =>
    [incident.declaredAt, incident.resolvedAt, incident.closedAt, incident.updatedAt]
      .filter(Boolean)
      .some((date) => inPeriod(date, fromDate, toDate)),
  );
  const openIncidents = incidents.filter(isIncidentOpen);
  const closedIncidents = incidents.filter((incident) => !isIncidentOpen(incident));
  const resolvedIncidents = incidents.filter((incident) => incident.resolvedAt);
  const mttrHours = roundMetric(
    average(
      resolvedIncidents.map((incident) =>
        hoursBetween(incident.declaredAt, incident.resolvedAt),
      ),
    ),
  );
  const alerts = [
    ...operationsAlerts.map((alert) => summarizeAlert(alert, 'OPERATIONAL_ALERT')),
    ...agentAlerts.map((alert) => summarizeAlert(alert, 'AGENT_ALERT')),
  ];
  const criticalAlerts = alerts.filter(isCriticalAlert);
  const openAlerts = alerts.filter((alert) => statusOf(alert) === 'OPEN');
  const planningCounters = observability.counters || {};
  const summaryCounters = complianceSummary.counters || {};
  const refusedPublications = Math.max(
    planningCounters.refusedPublications || 0,
    summaryCounters.refusedPublications || 0,
  );
  const auditIssues = toArray(audit.issues || observability.audit?.chain?.issues);
  const auditValid =
    audit.valid === true || observability.audit?.chain?.valid === true;
  const backupExportable = backup.exportable === true;
  const complianceStatus = observability.status || 'UNKNOWN';
  const complianceReasons = toArray(observability.reasons);
  const complianceExceptionCount =
    backup.planningComplianceSnapshot?.totals?.approvedComplianceExceptions ?? null;

  const residualRisks = [
    ...(openIncidents.length
      ? [`${openIncidents.length} incident(s) restent ouverts.`]
      : []),
    ...(criticalAlerts.length
      ? [`${criticalAlerts.length} alerte(s) critique(s) ouvertes.`]
      : []),
    ...(refusedPublications
      ? [`${refusedPublications} publication(s) planning refusee(s).`]
      : []),
    ...(summaryCounters.blockedShifts
      ? [`${summaryCounters.blockedShifts} shift(s) bloques par conformite.`]
      : []),
    ...(summaryCounters.agentsAtRisk
      ? [`${summaryCounters.agentsAtRisk} agent(s) avec risque planning.`]
      : []),
    ...(!auditValid ? ['Chaine audit invalide ou indisponible.'] : []),
    ...(auditIssues.length ? [`${auditIssues.length} anomalie(s) audit.`] : []),
    ...(!backupExportable ? ['Sauvegarde tenant non exportable.'] : []),
  ];

  const blockingReasons = [
    ...failedChecks.map(
      (check) => `${check.name} failed${check.reason ? `: ${check.reason}` : ''}`,
    ),
    ...(availability !== null && availability < options.availabilityTarget
      ? [
          `availability ${percentage(availability)} below target ${percentage(
            options.availabilityTarget,
          )}`,
        ]
      : []),
    ...(criticalAlerts.length > options.criticalAlertLimit
      ? [
          `${criticalAlerts.length} critical alerts exceed limit ${options.criticalAlertLimit}`,
        ]
      : []),
    ...(openIncidents.length > options.openIncidentLimit
      ? [`${openIncidents.length} open incidents exceed limit ${options.openIncidentLimit}`]
      : []),
    ...(refusedPublications > options.refusedPublicationLimit
      ? [
          `${refusedPublications} refused publications exceed limit ${options.refusedPublicationLimit}`,
        ]
      : []),
    ...(!auditValid ? ['audit chain invalid or unavailable'] : []),
    ...(!backupExportable ? ['backup metrics not exportable'] : []),
  ];

  const executiveDecision =
    blockingReasons.length === 0
      ? 'MAITRISE'
      : criticalAlerts.length || !auditValid || !backupExportable
        ? 'A_ARBITRER'
        : 'SOUS_SURVEILLANCE';

  const report = {
    status: failedChecks.length === 0 ? 'PASSED' : 'FAILED',
    executiveDecision,
    generatedAt,
    runDate,
    mode: options.dryRun ? 'dry-run' : options.mock ? 'mock' : 'api',
    nonDestructive: true,
    policy: {
      methodsAllowed: ['GET'],
      authSource: options.mock ? 'mock' : 'API_TOKEN',
      mutationsExecuted: false,
      planningPublicationExecuted: false,
      incidentResolutionExecuted: false,
      alertResolutionExecuted: false,
      backupRestoreExecuted: false,
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
      availabilityTarget: options.availabilityTarget,
      criticalAlertLimit: options.criticalAlertLimit,
      openIncidentLimit: options.openIncidentLimit,
      refusedPublicationLimit: options.refusedPublicationLimit,
    },
    indicators: {
      availability: {
        value: roundMetric(availability),
        label: percentage(availability),
        target: options.availabilityTarget,
        checksPassed: healthChecks.filter((result) => result.ok).length,
        checksTotal: healthChecks.length,
      },
      compliance: {
        status: complianceStatus,
        reasons: complianceReasons,
        openAlerts: Math.max(
          planningCounters.openAlerts || 0,
          summaryCounters.openAlerts || 0,
        ),
        blockedShifts: summaryCounters.blockedShifts || 0,
        agentsAtRisk: summaryCounters.agentsAtRisk || 0,
        approvedExceptions: complianceExceptionCount,
      },
      incidents: {
        total: incidents.length,
        open: openIncidents.length,
        closed: closedIncidents.length,
        bySeverity: countBy(incidents, severityOf),
        byStatus: countBy(incidents, statusOf),
      },
      resolution: {
        resolvedIncidents: resolvedIncidents.length,
        meanTimeToResolveHours: mttrHours,
      },
      criticalAlerts: {
        total: criticalAlerts.length,
        openAlerts: openAlerts.length,
        bySeverity: countBy(alerts, severityOf),
      },
      refusedPublications,
      audit: {
        valid: auditValid,
        events: audit.total ?? observability.audit?.chain?.total ?? null,
        issues: auditIssues,
      },
      backup: {
        exportable: backupExportable,
        schemaVersion: backup.schemaVersion || null,
        datasetCounts: backup.datasetCounts || {},
      },
    },
    residualRisks,
    blockingReasons,
    managementSummary: {
      audience: 'Direction, RH, cadres hospitaliers',
      headline:
        executiveDecision === 'MAITRISE'
          ? 'Exploitation maitrisee sur la periode.'
          : executiveDecision === 'SOUS_SURVEILLANCE'
            ? 'Exploitation globalement tenue avec points de vigilance metier.'
            : 'Arbitrage requis avant communication de stabilite.',
      recommendedActions: [
        ...(openIncidents.length
          ? ['Nommer un responsable et une echeance pour chaque incident ouvert.']
          : []),
        ...(refusedPublications
          ? ['Revoir les publications refusees avec le cadre planning et tracer la correction.']
          : []),
        ...(criticalAlerts.length
          ? ['Traiter les alertes critiques en priorite et partager le statut au comite.']
          : []),
        ...(summaryCounters.agentsAtRisk
          ? ['Suivre les agents a risque pour prevenir surcharge et non-conformite RH.']
          : []),
        ...(!backupExportable
          ? ['Bloquer la decision tant que la sauvegarde tenant n est pas exportable.']
          : []),
        ...(!auditValid
          ? ['Verifier la chaine audit avant diffusion aux instances de gouvernance.']
          : []),
        ...(residualRisks.length
          ? ['Conserver ces risques residuels dans le prochain point direction.']
          : ['Conserver le rythme de surveillance et archiver le rapport comme preuve.']),
      ],
    },
    incidents: {
      open: openIncidents.map(summarizeIncident),
      closed: closedIncidents.map(summarizeIncident),
      recent: incidents.slice(0, 20).map(summarizeIncident),
    },
    alerts: {
      critical: criticalAlerts,
      open: openAlerts,
    },
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
    `# Rapport direction / metier - ${runDate}`,
    '',
    `- Decision direction: ${report.executiveDecision}`,
    `- Synthese: ${report.managementSummary.headline}`,
    `- Mode: ${report.mode}`,
    `- Tenant: ${settings.tenantId}`,
    `- Environnement: ${settings.environment}`,
    `- Periode: ${settings.from} -> ${settings.to}`,
    `- Genere: ${generatedAt}`,
    '- Garde-fou: lecture seule, probes GET uniquement, aucun changement metier',
    '',
    '## Indicateurs cles',
    '',
    '| Indicateur | Valeur | Lecture metier |',
    '| --- | ---: | --- |',
    `| Disponibilite API | ${report.indicators.availability.label} | Objectif ${percentage(
      options.availabilityTarget,
    )} |`,
    `| Conformite planning | ${escapeMarkdownCell(complianceStatus)} | ${
      complianceReasons.join(', ') || 'aucun signal bloquant'
    } |`,
    `| Incidents ouverts | ${openIncidents.length} | ${incidents.length} incident(s) sur la periode |`,
    `| Incidents clos | ${closedIncidents.length} | MTTR ${mttrHours ?? 'n/a'} h |`,
    `| Alertes critiques | ${criticalAlerts.length} | ${openAlerts.length} alerte(s) ouverte(s) au total |`,
    `| Publications refusees | ${refusedPublications} | Planning / conformite |`,
    `| Risques residuels | ${residualRisks.length} | A suivre en comite |`,
    '',
    '## Lecture RH / hopital',
    '',
    `- Shifts bloques par conformite: ${summaryCounters.blockedShifts || 0}`,
    `- Agents a risque planning: ${summaryCounters.agentsAtRisk || 0}`,
    `- Exceptions de conformite approuvees: ${
      complianceExceptionCount ?? 'n/a'
    }`,
    `- Audit chain valide: ${auditValid}`,
    `- Sauvegarde tenant exportable: ${backupExportable}`,
    '',
    '## Incidents',
    '',
    ...(incidents.length
      ? [
          '| ID | Severite | Statut | Service | Ouverture | Resolution | Titre |',
          '| ---: | --- | --- | --- | --- | --- | --- |',
          ...incidents.slice(0, 20).map(
            (incident) =>
              `| ${incident.id} | ${escapeMarkdownCell(
                incident.severity,
              )} | ${escapeMarkdownCell(incident.status)} | ${escapeMarkdownCell(
                incident.impactedService || '-',
              )} | ${escapeMarkdownCell(incident.declaredAt)} | ${escapeMarkdownCell(
                incident.resolvedAt || '-',
              )} | ${escapeMarkdownCell(incident.title)} |`,
          ),
        ]
      : ['Aucun incident sur la periode.']),
    '',
    '## Alertes critiques',
    '',
    ...(criticalAlerts.length
      ? [
          '| ID | Source | Type | Message |',
          '| ---: | --- | --- | --- |',
          ...criticalAlerts.map(
            (alert) =>
              `| ${alert.id} | ${escapeMarkdownCell(
                alert.sourceKind,
              )} | ${escapeMarkdownCell(alert.type)} | ${escapeMarkdownCell(
                alert.message,
              )} |`,
          ),
        ]
      : ['Aucune alerte critique ouverte.']),
    '',
    '## Risques residuels',
    '',
    ...(residualRisks.length
      ? residualRisks.map((risk) => `- ${risk}`)
      : ['Aucun risque residuel majeur identifie.']),
    '',
    '## Actions recommandees',
    '',
    ...report.managementSummary.recommendedActions.map((action) => `- ${action}`),
    '',
    '## Checks techniques lus',
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
  ].join('\n');

  return { report, markdown };
}

async function writeReport({ options, report, markdown }) {
  await mkdir(options.reportDir, { recursive: true });
  const fileBase = `management-business-report-${report.runDate}`;
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

    if (report.executiveDecision === 'A_ARBITRER' || report.status === 'FAILED') {
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`Management business report error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
