#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(scriptDir);
const args = process.argv.slice(2);

const ROUTINE_ORDER = [
  'daily',
  'weekly',
  'escalation',
  'backup',
  'audit',
  'slo',
];
const OUTPUT_FORMATS = ['json', 'markdown', 'both'];
const EXECUTION_MODES = ['disabled', 'dry-run', 'mock', 'api'];
const DEFAULT_FREQUENCIES = {
  daily: process.env.OPS_ROUTINE_DAILY_FREQUENCY || 'P1D',
  weekly: process.env.OPS_ROUTINE_WEEKLY_FREQUENCY || 'P7D',
  escalation: process.env.OPS_ROUTINE_ESCALATION_FREQUENCY || 'PT15M',
  backup: process.env.OPS_ROUTINE_BACKUP_FREQUENCY || 'P1D',
  audit: process.env.OPS_ROUTINE_AUDIT_FREQUENCY || 'P1D',
  slo: process.env.OPS_ROUTINE_SLO_FREQUENCY || 'PT1H',
};

function readValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${arg}`);
  }
  return value;
}

function readList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 1);
  const weeklyFrom = new Date(now);
  weeklyFrom.setDate(now.getDate() - 7);

  const options = {
    mode: process.env.OPS_ROUTINE_MODE || 'dry-run',
    routines: ['daily', 'backup', 'audit', 'slo'],
    format: 'both',
    reportDir: process.env.REPORT_DIR || 'prod-reports',
    date: process.env.OPS_ROUTINE_DATE || now.toISOString().slice(0, 10),
    from:
      process.env.OPS_ROUTINE_FROM ||
      process.env.OPS_DAILY_FROM ||
      defaultFrom.toISOString(),
    to:
      process.env.OPS_ROUTINE_TO ||
      process.env.OPS_DAILY_TO ||
      now.toISOString(),
    weeklyFrom:
      process.env.OPS_ROUTINE_WEEKLY_FROM ||
      process.env.OPS_WEEKLY_FROM ||
      weeklyFrom.toISOString(),
    weeklyTo:
      process.env.OPS_ROUTINE_WEEKLY_TO ||
      process.env.OPS_WEEKLY_TO ||
      now.toISOString(),
    tenantId: process.env.TENANT_ID || 'HGD-DOUALA',
    environment:
      process.env.OPS_ROUTINE_ENV ||
      process.env.APP_ENV ||
      process.env.NODE_ENV ||
      'postprod',
    baseUrl: (process.env.BASE_URL || 'http://localhost:3005').replace(
      /\/$/,
      '',
    ),
    incidentId: process.env.INCIDENT_ID || 'INC-DRY-RUN',
    week: process.env.OP_RUNBOOK_WEEK || '',
    journalPath: process.env.OPS_ROUTINE_JOURNAL || '',
    openAlertLimit: Number.parseInt(
      process.env.OPS_ROUTINE_OPEN_ALERT_LIMIT || '0',
      10,
    ),
    highAlertLimit: Number.parseInt(
      process.env.OPS_ROUTINE_HIGH_ALERT_LIMIT || '0',
      10,
    ),
    sloMaxHealthMs: Number.parseInt(
      process.env.OPS_ROUTINE_SLO_MAX_HEALTH_MS || '1500',
      10,
    ),
    help: false,
    frequencies: { ...DEFAULT_FREQUENCIES },
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--disabled') {
      options.mode = 'disabled';
    } else if (arg === '--dry-run') {
      options.mode = 'dry-run';
    } else if (arg === '--mock' || arg === '--smoke') {
      options.mode = 'mock';
    } else if (arg === '--api' || arg === '--execute') {
      options.mode = 'api';
    } else if (arg === '--routines' || arg === '--routine') {
      options.routines = readList(readValue(argv, index, arg));
      index += 1;
    } else if (arg.startsWith('--routines=')) {
      options.routines = readList(arg.slice('--routines='.length));
    } else if (arg.startsWith('--routine=')) {
      options.routines = readList(arg.slice('--routine='.length));
    } else if (arg === '--format') {
      options.format = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--report-dir') {
      options.reportDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--journal') {
      options.journalPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--date') {
      options.date = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--from') {
      options.from = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--to') {
      options.to = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--weekly-from') {
      options.weeklyFrom = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--weekly-to') {
      options.weeklyTo = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--tenant') {
      options.tenantId = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--env') {
      options.environment = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--base-url') {
      options.baseUrl = readValue(argv, index, arg).replace(/\/$/, '');
      index += 1;
    } else if (arg === '--incident-id') {
      options.incidentId = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--week') {
      options.week = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--open-alert-limit') {
      options.openAlertLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--high-alert-limit') {
      options.highAlertLimit = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--slo-max-health-ms') {
      options.sloMaxHealthMs = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--daily-frequency') {
      options.frequencies.daily = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--weekly-frequency') {
      options.frequencies.weekly = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--escalation-frequency') {
      options.frequencies.escalation = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--backup-frequency') {
      options.frequencies.backup = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--audit-frequency') {
      options.frequencies.audit = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--slo-frequency') {
      options.frequencies.slo = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.routines.includes('all')) {
    options.routines = [...ROUTINE_ORDER];
  }

  options.routines = [...new Set(options.routines)];

  if (!OUTPUT_FORMATS.includes(options.format)) {
    throw new Error('--format must be json, markdown, or both');
  }
  if (!EXECUTION_MODES.includes(options.mode)) {
    throw new Error('--mode must be disabled, dry-run, mock, or api');
  }

  const unknownRoutines = options.routines.filter(
    (routine) => !ROUTINE_ORDER.includes(routine),
  );
  if (unknownRoutines.length) {
    throw new Error(`Unknown routine(s): ${unknownRoutines.join(', ')}`);
  }

  for (const [name, value] of Object.entries({
    from: options.from,
    to: options.to,
    weeklyFrom: options.weeklyFrom,
    weeklyTo: options.weeklyTo,
  })) {
    if (Number.isNaN(new Date(value).getTime())) {
      throw new Error(`--${name} must be a valid ISO date`);
    }
  }
  if (new Date(options.from) >= new Date(options.to)) {
    throw new Error('--from must be before --to');
  }
  if (new Date(options.weeklyFrom) >= new Date(options.weeklyTo)) {
    throw new Error('--weekly-from must be before --weekly-to');
  }

  for (const [name, value] of Object.entries({
    openAlertLimit: options.openAlertLimit,
    highAlertLimit: options.highAlertLimit,
    sloMaxHealthMs: options.sloMaxHealthMs,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`--${name} must be a positive integer or zero`);
    }
  }

  if (!options.journalPath) {
    options.journalPath = path.join(
      options.reportDir,
      'ops-routine-journal.jsonl',
    );
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 25 ops routine scheduler

Usage:
  node scripts/ops-routine-scheduler.mjs --disabled
  node scripts/ops-routine-scheduler.mjs --dry-run
  node scripts/ops-routine-scheduler.mjs --mock --routines all
  node scripts/ops-routine-scheduler.mjs --api --routines daily,backup,audit,slo

Options:
  --routines daily,weekly,escalation,backup,audit,slo,all
  --disabled             Skip execution. Default for Nest scheduled worker.
  --dry-run              Plan only. Default and non destructive.
  --mock                 Execute only mocked/local non destructive routines.
  --api                  Execute GET probes and safe report scripts.
  --format json|markdown|both
  --report-dir <dir>
  --journal <jsonl-path>
  --from <ISO> --to <ISO>
  --weekly-from <ISO> --weekly-to <ISO>
  --tenant <tenant-id>
  --env <environment>
  --base-url <url>
  --incident-id <id>
  --week <YYYY-Www>
  --daily-frequency <ISO-8601 duration>
  --weekly-frequency <ISO-8601 duration>
  --escalation-frequency <ISO-8601 duration>
  --backup-frequency <ISO-8601 duration>
  --audit-frequency <ISO-8601 duration>
  --slo-frequency <ISO-8601 duration>

The scheduler never runs migrations, seed/reset commands, Docker mutations,
backup restores, alert resolutions, git resets, or shell-expanded commands.
Reports and the JSONL journal are the only local writes.
`);
}

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('='))
    return null;

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

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  return search.toString();
};

const toArray = (value) => (Array.isArray(value) ? value : []);

async function parseBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
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

const command = (label, file, argsBuilder, envBuilder = () => ({})) => ({
  label,
  file,
  path: path.join('scripts', file),
  available: existsSync(path.join(scriptDir, file)),
  argsBuilder,
  envBuilder,
});

const routineCatalog = {
  daily: {
    title: 'Daily post-prod check',
    cadence: 'Quotidien',
    objective:
      'Collecter health, audit chain, backup metrics et alertes ouvertes.',
    type: 'script',
    command: command(
      'Daily check',
      'ops-daily-check.mjs',
      (options) => [
        path.join(scriptDir, 'ops-daily-check.mjs'),
        ...(options.mode === 'mock' ? ['--mock'] : []),
        '--format',
        'both',
        '--report-dir',
        options.reportDir,
        '--open-alert-limit',
        String(options.openAlertLimit),
        '--high-alert-limit',
        String(options.highAlertLimit),
      ],
      (options) => ({
        REPORT_DIR: options.reportDir,
        TENANT_ID: options.tenantId,
        BASE_URL: options.baseUrl,
        OPS_DAILY_FROM: options.from,
        OPS_DAILY_TO: options.to,
      }),
    ),
  },
  weekly: {
    title: 'Weekly ops report',
    cadence: 'Hebdomadaire',
    objective:
      'Consolider incidents, journal, restore evidence, audit et backup.',
    type: 'script',
    command: command(
      'Weekly report',
      'ops-weekly-report.mjs',
      (options) => [
        path.join(scriptDir, 'ops-weekly-report.mjs'),
        ...(options.mode === 'mock' ? ['--mock'] : []),
        '--format',
        'both',
        '--report-dir',
        options.reportDir,
        '--from',
        options.weeklyFrom,
        '--to',
        options.weeklyTo,
        '--tenant',
        options.tenantId,
        '--env',
        options.environment,
      ],
      (options) => ({
        REPORT_DIR: options.reportDir,
        TENANT_ID: options.tenantId,
        BASE_URL: options.baseUrl,
        OPS_WEEKLY_FROM: options.weeklyFrom,
        OPS_WEEKLY_TO: options.weeklyTo,
      }),
    ),
  },
  escalation: {
    title: 'Escalation runbook packet',
    cadence: 'Alerte HIGH/CRITICAL ou NO-GO',
    objective: 'Historiser la qualification incident et la chaine d escalade.',
    type: 'script',
    command: command(
      'Incident escalation runbook',
      'ops-runbook-automation.mjs',
      (options) => [
        path.join(scriptDir, 'ops-runbook-automation.mjs'),
        '--workflow',
        'incident',
        '--incident-id',
        options.incidentId,
        '--report-dir',
        options.reportDir,
        '--tenant',
        options.tenantId,
        '--env',
        options.environment,
      ],
      (options) => ({
        REPORT_DIR: options.reportDir,
        TENANT_ID: options.tenantId,
      }),
    ),
  },
  backup: {
    title: 'Backup metrics check',
    cadence: 'Quotidien',
    objective: 'Verifier que les metriques backup tenant sont exportables.',
    type: 'api',
  },
  audit: {
    title: 'Audit chain check',
    cadence: 'Quotidien et avant release',
    objective: 'Verifier la chaine audit sans mutation.',
    type: 'api',
  },
  slo: {
    title: 'SLO health check',
    cadence: 'Quotidien et avant comite ops',
    objective: 'Verifier liveness/readiness, latence et seuils d alertes.',
    type: 'api',
  },
};

const dangerousPatterns = [
  /\bdocker\b/i,
  /\brm\s+-rf\b/i,
  /\bgit\s+(reset|checkout|clean)\b/i,
  /\bmigration:(run|revert)\b/i,
  /\bseed:(demo|hgd)\b/i,
  /\bbackup-restore\b/i,
  /\bpreprod-backup-restore\b/i,
  /\bmethod:\s*['"](POST|PATCH|PUT|DELETE)['"]/i,
];

function isSafeCommand(commandSpec) {
  const printable = [
    process.execPath,
    ...commandSpec.argsBuilder({ mode: 'dry-run', reportDir: '' }),
  ]
    .filter(Boolean)
    .join(' ');
  return !dangerousPatterns.some((pattern) => pattern.test(printable));
}

function buildScriptPlan(id, options) {
  const routine = routineCatalog[id];
  const commandSpec = routine.command;
  const commandArgs = commandSpec.argsBuilder(options);
  const printable = [process.execPath, ...commandArgs].join(' ');
  const blockingReasons = [
    ...(!commandSpec.available ? [`Script missing: ${commandSpec.path}`] : []),
    ...(!isSafeCommand(commandSpec)
      ? [`Command blocked by non destructive policy: ${printable}`]
      : []),
  ];

  return {
    id,
    title: routine.title,
    cadence: routine.cadence,
    configuredFrequency: options.frequencies[id],
    objective: routine.objective,
    type: routine.type,
    command: {
      executable: process.execPath,
      args: commandArgs,
      printable,
      shell: false,
      available: commandSpec.available,
    },
    status: blockingReasons.length ? 'BLOCKED' : 'PLANNED',
    blockingReasons,
  };
}

function mockedApiResult(id, options) {
  const generatedAt = new Date().toISOString();
  const bodies = {
    backup: {
      exportable: true,
      schemaVersion: 'mock-v1',
      datasetCounts: { agents: 8, shifts: 24, auditLogs: 12 },
    },
    audit: { valid: true, total: 12, issues: [] },
    slo: {
      healthPassRate: 1,
      maxDurationMs: 42,
      openAlerts: 0,
      highAlerts: 0,
    },
  };

  return {
    id,
    title: routineCatalog[id].title,
    cadence: routineCatalog[id].cadence,
    configuredFrequency: options.frequencies[id],
    objective: routineCatalog[id].objective,
    type: 'api',
    status: 'PASSED',
    startedAt: generatedAt,
    finishedAt: generatedAt,
    mode: 'mock',
    checks: [
      {
        name: routineCatalog[id].title,
        status: 'MOCKED',
        ok: true,
        path: id,
        body: bodies[id],
      },
    ],
    blockingReasons: [],
    thresholds: {
      openAlertLimit: options.openAlertLimit,
      highAlertLimit: options.highAlertLimit,
      sloMaxHealthMs: options.sloMaxHealthMs,
    },
  };
}

function buildApiPlan(id, options) {
  return {
    id,
    title: routineCatalog[id].title,
    cadence: routineCatalog[id].cadence,
    configuredFrequency: options.frequencies[id],
    objective: routineCatalog[id].objective,
    type: 'api',
    status: 'PLANNED',
    mode: options.mode,
    endpoints:
      id === 'backup'
        ? ['/api/tenant-backups/metrics']
        : id === 'audit'
          ? ['/api/audit/verify']
          : [
              '/api/health/live',
              '/api/health/ready',
              '/api/planning/observability/health',
              '/api/agent-alerts',
            ],
    blockingReasons: [],
  };
}

async function runChild(plan, options) {
  const routine = routineCatalog[plan.id];
  const startedAt = new Date().toISOString();

  if (options.mode === 'disabled') {
    return {
      ...plan,
      status: 'DISABLED',
      blockingReasons: ['OPS_ROUTINE_MODE disabled'],
    };
  }

  if (options.mode === 'dry-run') {
    return {
      ...plan,
      status: plan.status === 'BLOCKED' ? 'BLOCKED' : 'PLANNED',
    };
  }

  if (plan.status === 'BLOCKED') {
    return plan;
  }

  const env = {
    ...process.env,
    ...routine.command.envBuilder(options),
  };

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, plan.command.args, {
      cwd: repoRoot,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      const finishedAt = new Date().toISOString();
      resolve({
        ...plan,
        status: code === 0 ? 'PASSED' : 'FAILED',
        startedAt,
        finishedAt,
        exitCode: code,
        stdoutTail: stdout.slice(-4000),
        stderrTail: stderr.slice(-4000),
        blockingReasons:
          code === 0
            ? plan.blockingReasons
            : [...plan.blockingReasons, `${plan.id} exited with code ${code}`],
      });
    });
  });
}

async function runApiRoutine(id, options) {
  if (options.mode === 'disabled') {
    return {
      ...buildApiPlan(id, options),
      status: 'DISABLED',
      blockingReasons: ['OPS_ROUTINE_MODE disabled'],
    };
  }

  if (options.mode === 'dry-run') {
    return buildApiPlan(id, options);
  }
  if (options.mode === 'mock') {
    return mockedApiResult(id, options);
  }

  const startedAt = new Date().toISOString();
  const tenantQuery = query({ tenantId: options.tenantId });
  const periodQuery = query({
    tenantId: options.tenantId,
    from: options.from,
    to: options.to,
  });
  const apiToken = process.env.API_TOKEN;
  const authHeaders = apiToken ? { Authorization: `Bearer ${apiToken}` } : {};
  const checks = [];

  if (id === 'backup' || id === 'audit') {
    if (!apiToken) {
      checks.push({
        name: 'API token',
        path: 'API_TOKEN',
        status: 'FAILED',
        ok: false,
        reason: `API_TOKEN missing for ${id} probe`,
      });
    } else if (id === 'backup') {
      checks.push(
        await requestJson({
          baseUrl: options.baseUrl,
          name: 'Backup metrics',
          path: `/api/tenant-backups/metrics?${periodQuery}`,
          headers: authHeaders,
        }),
      );
    } else {
      checks.push(
        await requestJson({
          baseUrl: options.baseUrl,
          name: 'Audit chain verification',
          path: `/api/audit/verify?${tenantQuery}`,
          headers: authHeaders,
        }),
      );
    }
  }

  if (id === 'slo') {
    checks.push(
      await requestJson({
        baseUrl: options.baseUrl,
        name: 'API liveness',
        path: '/api/health/live',
      }),
    );
    checks.push(
      await requestJson({
        baseUrl: options.baseUrl,
        name: 'API readiness',
        path: '/api/health/ready',
      }),
    );
    if (apiToken) {
      checks.push(
        await requestJson({
          baseUrl: options.baseUrl,
          name: 'Planning compliance health',
          path: `/api/planning/observability/health?${periodQuery}`,
          headers: authHeaders,
        }),
      );
      checks.push(
        await requestJson({
          baseUrl: options.baseUrl,
          name: 'Open alerts',
          path: `/api/agent-alerts?${query({
            tenantId: options.tenantId,
            isResolved: 'false',
          })}`,
          headers: authHeaders,
        }),
      );
    }
  }

  const backupBody =
    checks.find((check) => check.name === 'Backup metrics')?.body || {};
  const auditBody =
    checks.find((check) => check.name === 'Audit chain verification')?.body ||
    {};
  const compliance =
    checks.find((check) => check.name === 'Planning compliance health')?.body ||
    {};
  const alerts = toArray(
    checks.find((check) => check.name === 'Open alerts')?.body,
  );
  const maxHealthMs = Math.max(
    0,
    ...checks
      .filter((check) => ['API liveness', 'API readiness'].includes(check.name))
      .map((check) => check.durationMs || 0),
  );
  const highAlerts = Math.max(
    alerts.filter((alert) =>
      ['HIGH', 'CRITICAL'].includes(
        String(alert?.severity || '').toUpperCase(),
      ),
    ).length,
    compliance.counters?.highAlerts || 0,
  );
  const openAlerts = Math.max(
    alerts.length,
    compliance.counters?.openAlerts || 0,
  );

  const blockingReasons = [
    ...checks
      .filter((check) => !check.ok)
      .map(
        (check) =>
          `${check.name} failed${check.reason ? `: ${check.reason}` : ''}`,
      ),
    ...(id === 'backup' && backupBody.exportable !== true
      ? ['backup metrics not exportable']
      : []),
    ...(id === 'audit' && auditBody.valid !== true
      ? ['audit chain invalid or unavailable']
      : []),
    ...(id === 'audit' && toArray(auditBody.issues).length
      ? [`${toArray(auditBody.issues).length} audit issues detected`]
      : []),
    ...(id === 'slo' && maxHealthMs > options.sloMaxHealthMs
      ? [
          `health latency ${maxHealthMs} ms exceeds ${options.sloMaxHealthMs} ms`,
        ]
      : []),
    ...(id === 'slo' && openAlerts > options.openAlertLimit
      ? [`${openAlerts} open alerts exceed limit ${options.openAlertLimit}`]
      : []),
    ...(id === 'slo' && highAlerts > options.highAlertLimit
      ? [
          `${highAlerts} HIGH/CRITICAL alerts exceed limit ${options.highAlertLimit}`,
        ]
      : []),
  ];

  return {
    id,
    title: routineCatalog[id].title,
    cadence: routineCatalog[id].cadence,
    configuredFrequency: options.frequencies[id],
    objective: routineCatalog[id].objective,
    type: 'api',
    status: blockingReasons.length ? 'FAILED' : 'PASSED',
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: 'api',
    checks,
    thresholds: {
      openAlertLimit: options.openAlertLimit,
      highAlertLimit: options.highAlertLimit,
      sloMaxHealthMs: options.sloMaxHealthMs,
    },
    metrics: {
      backupExportable: backupBody.exportable ?? null,
      auditValid: auditBody.valid ?? null,
      auditIssues: toArray(auditBody.issues).length,
      maxHealthMs: id === 'slo' ? maxHealthMs : null,
      openAlerts: id === 'slo' ? openAlerts : null,
      highAlerts: id === 'slo' ? highAlerts : null,
    },
    blockingReasons,
  };
}

async function runRoutine(id, options) {
  const routine = routineCatalog[id];
  if (routine.type === 'script') {
    return await runChild(buildScriptPlan(id, options), options);
  }
  return await runApiRoutine(id, options);
}

function buildMarkdown(report) {
  return [
    `# Orchestration routines ops Sprint 25 - ${report.runDate}`,
    '',
    `- Statut: ${report.status}`,
    `- Mode: ${report.mode}`,
    `- Environnement: ${report.environment}`,
    `- Tenant: ${report.tenantId}`,
    `- Base URL: ${report.baseUrl}`,
    `- Genere: ${report.generatedAt}`,
    `- Periode daily: ${report.period.from} -> ${report.period.to}`,
    `- Periode weekly: ${report.period.weeklyFrom} -> ${report.period.weeklyTo}`,
    `- Journal: ${report.outputs.journalPath}`,
    '- Non destructif: oui, dry-run par defaut, probes GET et scripts de rapport uniquement',
    '',
    '## Routines',
    '',
    '| Routine | Type | Cadence | Statut | Commande/Endpoints |',
    '| --- | --- | --- | --- | --- |',
    ...report.routines.map((routine) => {
      const commandOrEndpoints =
        routine.command?.printable || routine.endpoints?.join(', ') || '-';
      return `| ${escapeMarkdownCell(routine.title)} | ${routine.type} | ${escapeMarkdownCell(
        `${routine.cadence} (${routine.configuredFrequency || 'n/a'})`,
      )} | ${routine.status} | ${escapeMarkdownCell(commandOrEndpoints)} |`;
    }),
    '',
    '## Details',
    '',
    ...report.routines.flatMap((routine) => [
      `### ${routine.title}`,
      '',
      `- ID: ${routine.id}`,
      `- Statut: ${routine.status}`,
      `- Objectif: ${routine.objective}`,
      ...(routine.exitCode !== undefined
        ? [`- Exit code: ${routine.exitCode}`]
        : []),
      ...(routine.metrics
        ? [
            `- Backup exportable: ${routine.metrics.backupExportable ?? 'n/a'}`,
            `- Audit valide: ${routine.metrics.auditValid ?? 'n/a'}`,
            `- Max health ms: ${routine.metrics.maxHealthMs ?? 'n/a'}`,
            `- Alertes ouvertes: ${routine.metrics.openAlerts ?? 'n/a'}`,
            `- Alertes HIGH/CRITICAL: ${routine.metrics.highAlerts ?? 'n/a'}`,
          ]
        : []),
      '',
      ...(routine.checks?.length
        ? [
            '| Check | Statut | HTTP | Duree | Note |',
            '| --- | --- | ---: | ---: | --- |',
            ...routine.checks.map(
              (check) =>
                `| ${escapeMarkdownCell(check.name)} | ${check.status} | ${
                  check.httpStatus || '-'
                } | ${check.durationMs ?? '-'} ms | ${escapeMarkdownCell(
                  check.reason || check.error || '',
                )} |`,
            ),
            '',
          ]
        : []),
      ...(routine.blockingReasons?.length
        ? [
            'Raisons bloquantes:',
            '',
            ...routine.blockingReasons.map((reason) => `- ${reason}`),
            '',
          ]
        : ['Aucune raison bloquante.', '']),
    ]),
    '## Historique',
    '',
    'Une entree JSONL est ajoutee au journal local pour historiser cette orchestration.',
    '',
  ].join('\n');
}

function computeStatus(routines) {
  if (routines.every((routine) => routine.status === 'DISABLED'))
    return 'DISABLED';
  if (routines.some((routine) => routine.status === 'FAILED')) return 'FAILED';
  if (routines.some((routine) => routine.status === 'BLOCKED'))
    return 'BLOCKED';
  if (routines.every((routine) => routine.status === 'PLANNED'))
    return 'PLANNED';
  return 'PASSED';
}

async function writeOutputs(report, markdown, options) {
  await mkdir(options.reportDir, { recursive: true });
  await mkdir(path.dirname(options.journalPath), { recursive: true });

  const outputs = {};
  const basename = `ops-routine-scheduler-${report.runDate}`;

  if (options.format === 'json' || options.format === 'both') {
    outputs.jsonPath = path.join(options.reportDir, `${basename}.json`);
    await writeFile(outputs.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (options.format === 'markdown' || options.format === 'both') {
    outputs.markdownPath = path.join(options.reportDir, `${basename}.md`);
    await writeFile(outputs.markdownPath, markdown);
  }

  await appendFile(
    options.journalPath,
    `${JSON.stringify({
      generatedAt: report.generatedAt,
      runDate: report.runDate,
      status: report.status,
      mode: report.mode,
      environment: report.environment,
      tenantId: report.tenantId,
      attemptCount: report.attempts.length,
      attempts: report.attempts,
      outputs,
    })}\n`,
  );

  return outputs;
}

async function main() {
  await loadEnvFile(process.env.ENV_FILE);

  const options = parseArgs(args);
  if (options.help) {
    printHelp();
    return;
  }

  const orderedRoutines = ROUTINE_ORDER.filter((id) =>
    options.routines.includes(id),
  );
  const routines = [];
  for (const id of orderedRoutines) {
    routines.push(await runRoutine(id, options));
  }

  const generatedAt = new Date().toISOString();
  const attempts = routines.map((routine) => ({
    id: routine.id,
    status: routine.status,
    mode: options.mode,
    configuredFrequency: options.frequencies[routine.id],
    startedAt: routine.startedAt || generatedAt,
    finishedAt: routine.finishedAt || generatedAt,
    exitCode: routine.exitCode ?? null,
    blockingReasons: routine.blockingReasons || [],
  }));

  const report = {
    status: computeStatus(routines),
    generatedAt,
    runDate: options.date,
    mode: options.mode,
    environment: options.environment,
    tenantId: options.tenantId,
    baseUrl: options.baseUrl,
    period: {
      from: options.from,
      to: options.to,
      weeklyFrom: options.weeklyFrom,
      weeklyTo: options.weeklyTo,
    },
    thresholds: {
      openAlertLimit: options.openAlertLimit,
      highAlertLimit: options.highAlertLimit,
      sloMaxHealthMs: options.sloMaxHealthMs,
    },
    frequencies: options.frequencies,
    attempts,
    nonDestructive: true,
    policy: {
      defaultMode: 'dry-run',
      disabledModeAvailable: true,
      shellExecution: false,
      methodsAllowed: ['GET'],
      migrationsExecuted: false,
      seedsExecuted: false,
      dockerMutated: false,
      backupRestoreExecuted: false,
      alertResolutionExecuted: false,
      gitMutated: false,
      writesReportsOnly: true,
    },
    outputs: {
      reportDir: options.reportDir,
      journalPath: options.journalPath,
    },
    routines,
  };
  const markdown = buildMarkdown(report);
  const outputs = await writeOutputs(report, markdown, options);
  report.outputs = { ...report.outputs, ...outputs };

  if (outputs.jsonPath) {
    await writeFile(outputs.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(markdown);
  }
  console.log(`\nRapports generes: ${Object.values(outputs).join(', ')}`);
  console.log(`Journal: ${options.journalPath}`);

  if (['FAILED', 'BLOCKED'].includes(report.status)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
