#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);

const SCENARIO_ORDER = [
  'routine-failure',
  'notification-failure',
  'backup-stale',
  'audit-invalid',
  'escalation-late',
];
const OUTPUT_FORMATS = ['json', 'markdown', 'both'];
const EXECUTION_MODES = ['dry-run', 'mock', 'api'];

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

  const options = {
    mode: process.env.OPS_RESILIENCE_MODE || 'dry-run',
    scenarios: readList(
      process.env.OPS_RESILIENCE_SCENARIOS || SCENARIO_ORDER.join(','),
    ),
    format: process.env.OPS_RESILIENCE_FORMAT || 'both',
    reportDir: process.env.REPORT_DIR || 'prod-reports',
    date: process.env.OPS_RESILIENCE_DATE || now.toISOString().slice(0, 10),
    from: process.env.OPS_RESILIENCE_FROM || defaultFrom.toISOString(),
    to: process.env.OPS_RESILIENCE_TO || now.toISOString(),
    tenantId: process.env.TENANT_ID || 'HGD-DOUALA',
    environment:
      process.env.OPS_RESILIENCE_ENV ||
      process.env.APP_ENV ||
      process.env.NODE_ENV ||
      'postprod',
    baseUrl: (process.env.BASE_URL || 'http://localhost:3005').replace(/\/$/, ''),
    routineName: process.env.OPS_RESILIENCE_ROUTINE || 'daily-postprod-check',
    notificationChannel:
      process.env.OPS_RESILIENCE_NOTIFICATION_CHANNEL || 'ops-alerts',
    maxBackupAgeHours: Number.parseInt(
      process.env.OPS_RESILIENCE_MAX_BACKUP_AGE_HOURS || '24',
      10,
    ),
    escalationSlaMinutes: Number.parseInt(
      process.env.OPS_RESILIENCE_ESCALATION_SLA_MINUTES || '30',
      10,
    ),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.mode = 'dry-run';
    } else if (arg === '--mock' || arg === '--smoke') {
      options.mode = 'mock';
    } else if (arg === '--api') {
      options.mode = 'api';
    } else if (arg === '--scenarios' || arg === '--scenario') {
      options.scenarios = readList(readValue(argv, index, arg));
      index += 1;
    } else if (arg.startsWith('--scenarios=')) {
      options.scenarios = readList(arg.slice('--scenarios='.length));
    } else if (arg.startsWith('--scenario=')) {
      options.scenarios = readList(arg.slice('--scenario='.length));
    } else if (arg === '--format') {
      options.format = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--report-dir') {
      options.reportDir = readValue(argv, index, arg);
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
    } else if (arg === '--tenant') {
      options.tenantId = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--env') {
      options.environment = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--base-url') {
      options.baseUrl = readValue(argv, index, arg).replace(/\/$/, '');
      index += 1;
    } else if (arg === '--routine') {
      options.routineName = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--notification-channel') {
      options.notificationChannel = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--max-backup-age-hours') {
      options.maxBackupAgeHours = Number.parseInt(readValue(argv, index, arg), 10);
      index += 1;
    } else if (arg === '--escalation-sla-minutes') {
      options.escalationSlaMinutes = Number.parseInt(
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

  if (options.scenarios.includes('all')) {
    options.scenarios = [...SCENARIO_ORDER];
  }
  options.scenarios = [...new Set(options.scenarios)];

  if (!OUTPUT_FORMATS.includes(options.format)) {
    throw new Error('--format must be json, markdown, or both');
  }
  if (!EXECUTION_MODES.includes(options.mode)) {
    throw new Error('--mode must be dry-run, mock, or api');
  }

  const unknownScenarios = options.scenarios.filter(
    (scenario) => !SCENARIO_ORDER.includes(scenario),
  );
  if (unknownScenarios.length) {
    throw new Error(`Unknown scenario(s): ${unknownScenarios.join(', ')}`);
  }

  for (const [name, value] of Object.entries({
    from: options.from,
    to: options.to,
  })) {
    if (Number.isNaN(new Date(value).getTime())) {
      throw new Error(`--${name} must be a valid ISO date`);
    }
  }
  if (new Date(options.from) >= new Date(options.to)) {
    throw new Error('--from must be before --to');
  }

  for (const [name, value] of Object.entries({
    maxBackupAgeHours: options.maxBackupAgeHours,
    escalationSlaMinutes: options.escalationSlaMinutes,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`--${name} must be a positive integer or zero`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 26 resilience ops drill

Usage:
  node scripts/ops-resilience-drill.mjs --dry-run
  node scripts/ops-resilience-drill.mjs --mock --scenarios all
  node scripts/ops-resilience-drill.mjs --api --scenarios backup-stale,audit-invalid

Options:
  --scenarios routine-failure,notification-failure,backup-stale,audit-invalid,escalation-late,all
  --dry-run              Plan only. Default and non destructive.
  --mock                 Simulate failures and validate recovery playbooks locally.
  --api                  Read-only probes only. No restore, no notification send, no DB mutation.
  --format json|markdown|both
  --report-dir <dir>
  --from <ISO> --to <ISO>
  --tenant <tenant-id>
  --env <environment>
  --base-url <url>
  --routine <name>
  --notification-channel <name>
  --max-backup-age-hours <hours>
  --escalation-sla-minutes <minutes>

The drill never resets databases, never restores backups, never sends real
notifications, never resolves alerts/incidents, and never executes shell
commands. Reports are the only local writes.
`);
}

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return null;

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

const toArray = (value) => (Array.isArray(value) ? value : []);

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  return search.toString();
};

async function parseBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function requestJson({ baseUrl, name, requestPath, headers = {} }) {
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

const scenarioCatalog = {
  'routine-failure': {
    title: 'Routine ops en echec',
    objective:
      'Verifier que l echec routine est detecte, journalise et relance sans mutation metier.',
    expectedSignal: 'routine status FAILED or missing completion evidence',
    recovery: [
      'Geler les routines dependantes',
      'Associer un owner ops',
      'Relancer uniquement le controle non destructif',
      'Attacher rapport avant/apres au ticket',
    ],
  },
  'notification-failure': {
    title: 'Notification ops en echec',
    objective:
      'Verifier le fallback de notification sans envoyer de message reel.',
    expectedSignal: 'notification provider timeout or channel delivery failed',
    recovery: [
      'Basculer sur canal secondaire',
      'Confirmer la prise en charge humaine',
      'Tracer le message non remis',
      'Rejouer le test en mock uniquement',
    ],
  },
  'backup-stale': {
    title: 'Backup stale',
    objective:
      'Verifier que les metriques backup trop anciennes bloquent la reprise automatique.',
    expectedSignal: 'last successful backup older than threshold',
    recovery: [
      'Interdire tout restore automatique',
      'Demander validation ops avant export/restore',
      'Relancer un controle backup metrics',
      'Documenter l age et le dernier dataset exportable',
    ],
  },
  'audit-invalid': {
    title: 'Audit invalide',
    objective:
      'Verifier que la chaine audit invalide classe la reprise en NO-GO.',
    expectedSignal: 'audit verification valid=false or issues present',
    recovery: [
      'Bloquer publication et decision GO',
      'Extraire les issues audit',
      'Assigner tech lead et referent securite',
      'Valider un nouveau /audit/verify apres correction',
    ],
  },
  'escalation-late': {
    title: 'Escalade en retard',
    objective:
      'Verifier que le depassement SLA d escalade reste visible et actionnable.',
    expectedSignal: 'incident open longer than escalation SLA without escalation',
    recovery: [
      'Declarer Incident Commander',
      'Notifier canal humain secondaire hors script',
      'Assigner prochaine action datee',
      'Archiver preuve du retard et mitigation',
    ],
  },
};

function plannedScenario(id, options) {
  const catalog = scenarioCatalog[id];
  return {
    id,
    title: catalog.title,
    objective: catalog.objective,
    mode: options.mode,
    status: 'PLANNED',
    expectedSignal: catalog.expectedSignal,
    recovery: catalog.recovery,
    checks: [
      {
        name: `${catalog.title} plan`,
        status: 'PLANNED',
        ok: true,
        evidence: 'dry-run only: no probes or mutations executed',
      },
    ],
    evidence: {
      tenantId: options.tenantId,
      routine: options.routineName,
      notificationChannel: options.notificationChannel,
      maxBackupAgeHours: options.maxBackupAgeHours,
      escalationSlaMinutes: options.escalationSlaMinutes,
    },
  };
}

function mockScenario(id, options) {
  const catalog = scenarioCatalog[id];
  const generatedAt = new Date().toISOString();
  const mockEvidence = {
    'routine-failure': {
      injectedFailure: true,
      routine: options.routineName,
      observed: 'routine failed and retry playbook available',
    },
    'notification-failure': {
      injectedFailure: true,
      channel: options.notificationChannel,
      observed: 'primary notification failed, fallback documented',
      notificationSent: false,
    },
    'backup-stale': {
      injectedFailure: true,
      backupAgeHours: options.maxBackupAgeHours + 6,
      thresholdHours: options.maxBackupAgeHours,
      restoreExecuted: false,
    },
    'audit-invalid': {
      injectedFailure: true,
      valid: false,
      issues: ['MOCK_HASH_CHAIN_BREAK'],
    },
    'escalation-late': {
      injectedFailure: true,
      minutesLate: options.escalationSlaMinutes + 15,
      thresholdMinutes: options.escalationSlaMinutes,
    },
  }[id];

  return {
    id,
    title: catalog.title,
    objective: catalog.objective,
    mode: 'mock',
    status: 'PASSED',
    startedAt: generatedAt,
    finishedAt: generatedAt,
    expectedSignal: catalog.expectedSignal,
    recovery: catalog.recovery,
    checks: [
      {
        name: `${catalog.title} detection`,
        status: 'PASSED',
        ok: true,
        evidence: mockEvidence,
      },
      {
        name: `${catalog.title} recovery guard`,
        status: 'PASSED',
        ok: true,
        evidence:
          'Recovery path documented with no restore, no notification send and no DB reset.',
      },
    ],
    evidence: mockEvidence,
  };
}

async function apiScenario(id, options, headers) {
  const catalog = scenarioCatalog[id];
  const tenantQuery = query({ tenantId: options.tenantId });
  const periodQuery = query({
    tenantId: options.tenantId,
    from: options.from,
    to: options.to,
  });
  const requestMap = {
    'routine-failure': [
      {
        name: 'Ops action center',
        requestPath: `/api/ops/action-center?${tenantQuery}`,
      },
    ],
    'notification-failure': [
      {
        name: 'Ops alerts',
        requestPath: `/api/ops/alerts?${tenantQuery}`,
      },
    ],
    'backup-stale': [
      {
        name: 'Backup metrics',
        requestPath: `/api/tenant-backups/metrics?${periodQuery}`,
      },
    ],
    'audit-invalid': [
      {
        name: 'Audit verify',
        requestPath: `/api/audit/verify?${tenantQuery}`,
      },
    ],
    'escalation-late': [
      {
        name: 'Ops incidents',
        requestPath: `/api/ops/incidents?${tenantQuery}`,
      },
    ],
  };

  const startedAt = new Date().toISOString();
  const checks = [];
  for (const requestSpec of requestMap[id]) {
    checks.push(
      await requestJson({
        baseUrl: options.baseUrl,
        headers,
        ...requestSpec,
      }),
    );
  }

  const blockingReasons = [];
  const body = checks[0]?.body || {};

  if (id === 'backup-stale') {
    const lastBackupAt =
      body.lastSuccessfulBackupAt || body.lastBackupAt || body.latestBackupAt;
    if (lastBackupAt) {
      const ageHours =
        (Date.now() - new Date(lastBackupAt).getTime()) / (60 * 60 * 1000);
      if (ageHours > options.maxBackupAgeHours) {
        blockingReasons.push(
          `backup age ${Math.round(ageHours)}h exceeds ${options.maxBackupAgeHours}h`,
        );
      }
    }
    if (body.exportable === false) {
      blockingReasons.push('backup metrics exportable=false');
    }
  }

  if (id === 'audit-invalid') {
    if (body.valid === false || toArray(body.issues).length > 0) {
      blockingReasons.push('audit chain invalid or issues present');
    }
  }

  const failedReads = checks.filter((check) => !check.ok);
  const status =
    failedReads.length || blockingReasons.length
      ? 'FAILED'
      : checks.length
        ? 'PASSED'
        : 'BLOCKED';

  return {
    id,
    title: catalog.title,
    objective: catalog.objective,
    mode: 'api',
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    expectedSignal: catalog.expectedSignal,
    recovery: catalog.recovery,
    checks,
    blockingReasons,
    evidence: {
      readOnlyEndpoints: checks.map((check) => check.path),
      note:
        status === 'PASSED'
          ? 'No failing signal observed by read-only probes.'
          : 'Read-only probes exposed a recovery risk.',
    },
  };
}

function buildSummary(scenarios, options) {
  const failed = scenarios.filter((scenario) => scenario.status === 'FAILED');
  const blocked = scenarios.filter((scenario) => scenario.status === 'BLOCKED');
  const planned = scenarios.filter((scenario) => scenario.status === 'PLANNED');

  const status =
    failed.length > 0
      ? 'FAILED'
      : blocked.length > 0
        ? 'BLOCKED'
        : planned.length === scenarios.length
          ? 'PLANNED'
          : 'PASSED';

  return {
    status,
    total: scenarios.length,
    passed: scenarios.filter((scenario) => scenario.status === 'PASSED').length,
    planned: planned.length,
    failed: failed.length,
    blocked: blocked.length,
    decision:
      status === 'PASSED'
        ? 'RECOVERY_READY'
        : status === 'PLANNED'
          ? 'DRY_RUN_ONLY'
          : 'RECOVERY_NO_GO',
    nonDestructive: true,
    dryRunDefault: options.mode === 'dry-run',
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Drill resilience ops Sprint 26 - ${report.date}`,
    '',
    `- Statut: ${report.summary.status}`,
    `- Decision: ${report.summary.decision}`,
    `- Mode: ${report.mode}`,
    `- Tenant: ${report.tenantId}`,
    `- Environnement: ${report.environment}`,
    `- Periode: ${report.from} -> ${report.to}`,
    `- Non destructif: ${report.policy.nonDestructive ? 'oui' : 'non'}`,
    `- Reset DB execute: ${report.policy.dbResetExecuted ? 'oui' : 'non'}`,
    `- Restore backup execute: ${report.policy.backupRestoreExecuted ? 'oui' : 'non'}`,
    `- Notification reelle envoyee: ${report.policy.notificationSent ? 'oui' : 'non'}`,
    '',
    '## Scenarios',
    '',
    '| Scenario | Statut | Signal attendu | Evidence |',
    '| --- | --- | --- | --- |',
  ];

  for (const scenario of report.scenarios) {
    const evidence = scenario.blockingReasons?.length
      ? scenario.blockingReasons.join('; ')
      : scenario.evidence?.observed ||
        scenario.evidence?.note ||
        scenario.checks?.[0]?.evidence ||
        'ok';
    lines.push(
      `| ${escapeMarkdownCell(scenario.title)} | ${escapeMarkdownCell(
        scenario.status,
      )} | ${escapeMarkdownCell(scenario.expectedSignal)} | ${escapeMarkdownCell(
        evidence,
      )} |`,
    );
  }

  lines.push(
    '',
    '## Gardes de reprise',
    '',
    '| Controle | Valeur |',
    '| --- | --- |',
  );

  for (const [key, value] of Object.entries(report.policy)) {
    lines.push(`| ${escapeMarkdownCell(key)} | ${escapeMarkdownCell(value)} |`);
  }

  lines.push('', '## Actions attendues', '');
  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.title}`);
    for (const action of scenario.recovery) {
      lines.push(`- ${action}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  await loadEnvFile(process.env.ENV_FILE);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    return;
  }

  const headers = process.env.API_TOKEN
    ? { Authorization: `Bearer ${process.env.API_TOKEN}` }
    : {};
  const policy = {
    defaultMode: 'dry-run',
    nonDestructive: true,
    shellExecution: false,
    dangerousMutations: false,
    dbResetExecuted: false,
    backupRestoreExecuted: false,
    backupRestoreReal: false,
    notificationSent: false,
    alertResolutionExecuted: false,
    incidentMutationExecuted: false,
    migrationsExecuted: false,
    destructiveMigrationExecuted: false,
  };

  const scenarios = [];
  for (const id of options.scenarios) {
    if (options.mode === 'dry-run') {
      scenarios.push(plannedScenario(id, options));
    } else if (options.mode === 'mock') {
      scenarios.push(mockScenario(id, options));
    } else {
      scenarios.push(await apiScenario(id, options, headers));
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    date: options.date,
    mode: options.mode,
    tenantId: options.tenantId,
    environment: options.environment,
    from: options.from,
    to: options.to,
    baseUrl: options.mode === 'api' ? options.baseUrl : undefined,
    scenarioIds: options.scenarios,
    policy,
    summary: buildSummary(scenarios, options),
    scenarios,
  };

  await mkdir(options.reportDir, { recursive: true });
  const jsonPath = path.join(
    options.reportDir,
    `ops-resilience-drill-${options.date}.json`,
  );
  const markdownPath = path.join(
    options.reportDir,
    `ops-resilience-drill-${options.date}.md`,
  );

  if (options.format === 'json' || options.format === 'both') {
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (options.format === 'markdown' || options.format === 'both') {
    await writeFile(markdownPath, renderMarkdown(report));
  }

  console.log(
    JSON.stringify(
      {
        status: report.summary.status,
        decision: report.summary.decision,
        mode: report.mode,
        scenarios: report.scenarioIds,
        reports: {
          json: options.format === 'markdown' ? null : jsonPath,
          markdown: options.format === 'json' ? null : markdownPath,
        },
      },
      null,
      2,
    ),
  );

  if (report.summary.status === 'FAILED' || report.summary.status === 'BLOCKED') {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
