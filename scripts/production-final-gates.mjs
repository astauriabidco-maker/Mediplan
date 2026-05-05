#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const generatedAt = new Date().toISOString();
const runDate = generatedAt.slice(0, 10);

const VALID_DECLARATIONS = new Set(['PASSED', 'FAILED', 'NO_GO', 'WAIVED']);

const commandGroups = [
  {
    id: 'migration',
    label: 'Migration OK',
    envKey: 'PROD_GATE_MIGRATION',
    required: true,
    commands: [
      {
        id: 'migration-show',
        label: 'Inventaire migrations',
        file: 'npm',
        args: ['run', 'migration:show'],
        display: 'npm run migration:show',
        preferred: true,
      },
    ],
  },
  {
    id: 'seed',
    label: 'Seed OK',
    envKey: 'PROD_GATE_SEED',
    required: true,
    declarativeOnly: true,
    commands: [
      {
        id: 'seed-declaration',
        label: 'Declaration seed preprod',
        display: 'PROD_GATE_SEED=PASSED with seed report attached',
      },
    ],
  },
  {
    id: 'smoke',
    label: 'Smoke API OK',
    envKey: 'PROD_GATE_SMOKE',
    required: true,
    commands: [
      {
        id: 'preprod-smoke',
        label: 'Smoke API preprod',
        file: 'npm',
        args: ['run', 'preprod:compose:smoke'],
        display: 'npm run preprod:compose:smoke',
        env: { ENV_FILE: process.env.ENV_FILE || '.env.preprod' },
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Conformite healthy',
    envKey: 'PROD_GATE_COMPLIANCE',
    required: true,
    commands: [
      {
        id: 'preprod-go-no-go-final',
        label: 'Decision preprod finale',
        file: 'npm',
        args: ['run', 'preprod:go-no-go'],
        display: 'ENV_FILE=.env.preprod npm run preprod:go-no-go',
        env: { ENV_FILE: process.env.ENV_FILE || '.env.preprod' },
      },
    ],
  },
  {
    id: 'audit',
    label: 'Audit valide',
    envKey: 'PROD_GATE_AUDIT',
    required: true,
    commands: [
      {
        id: 'frontend-audit',
        label: 'Audit dependances frontend',
        file: 'npm',
        args: ['run', 'frontend:audit'],
        display: 'npm run frontend:audit',
      },
      {
        id: 'backend-audit-production',
        label: 'Audit dependances backend production',
        file: 'npm',
        args: ['audit', '--omit=dev', '--audit-level=moderate'],
        display: 'npm audit --omit=dev --audit-level=moderate',
      },
    ],
  },
  {
    id: 'backup',
    label: 'Backup exportable/restaurable',
    envKey: 'PROD_GATE_BACKUP',
    required: true,
    declarativeOnly: true,
    commands: [
      {
        id: 'backup-restore-declaration',
        label: 'Declaration backup/restore',
        display:
          'PROD_GATE_BACKUP=PASSED with evidence path/date in release ticket',
      },
    ],
  },
];

function parseArgs(argv) {
  const options = {
    execute: false,
    format: 'both',
    only: null,
    ciCommand: 'verify',
    maxBufferMiB: 24,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    if (arg === '--execute') {
      options.execute = true;
    } else if (arg === '--format') {
      const format = readValue();
      if (!['markdown', 'json', 'both'].includes(format)) {
        throw new Error('--format must be markdown, json, or both');
      }
      options.format = format;
    } else if (arg === '--only') {
      options.only = readValue()
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    } else if (arg === '--ci-command') {
      const ciCommand = readValue();
      if (!['verify', 'full'].includes(ciCommand)) {
        throw new Error('--ci-command must be verify or full');
      }
      options.ciCommand = ciCommand;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 20 Phase 2 final production gates

Usage:
  node scripts/production-final-gates.mjs [--format markdown|json|both]
  node scripts/production-final-gates.mjs --execute [--only gate-id[,gate-id]]

Default mode is dry-run/plan. It prints the final gate plan and declarations,
but does not run CI, builds, audits, preprod checks, Docker, migrations,
backup restore, deployment, git tag, git push, or package mutation.

Required declarations:
  PROD_GATE_MIGRATION=PASSED
  PROD_GATE_SEED=PASSED
  PROD_GATE_SMOKE=PASSED
  PROD_GATE_COMPLIANCE=PASSED
  PROD_GATE_AUDIT=PASSED
  PROD_GATE_BACKUP=PASSED

Accepted declaration values: PASSED, FAILED, NO_GO, WAIVED.
Decision is FINAL_GATES_READY only when all required PROD_GATE_* values are PASSED.
`);
}

async function readJson(relativePath) {
  const raw = await readFile(path.join(REPO_ROOT, relativePath), 'utf8');
  return JSON.parse(raw);
}

const normalizeDeclaration = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

function collectDeclaration(group) {
  const value = normalizeDeclaration(process.env[group.envKey]);
  const status = value || 'MISSING';
  const valid = value === '' || VALID_DECLARATIONS.has(value);
  const passed = status === 'PASSED';
  return {
    envKey: group.envKey,
    status,
    valid,
    passed,
    note: passed
      ? 'Declared PASSED.'
      : `${group.envKey}=PASSED required before FINAL_GATES_READY.`,
  };
}

function selectExecutableCommands(group, options) {
  if (group.declarativeOnly) return [];
  if (group.id !== 'ci-product') return group.commands;

  return group.commands.filter((command) =>
    options.ciCommand === 'full'
      ? command.id === 'ci-product-full'
      : command.id === 'ci-product-verify',
  );
}

function commandToPlan(command, execute) {
  return {
    id: command.id,
    label: command.label,
    command: command.display,
    execution: execute ? 'eligible' : 'planned_only',
  };
}

function filterGroups(options) {
  if (!options.only) return commandGroups;
  const knownIds = new Set(commandGroups.map((group) => group.id));
  const unknown = options.only.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown gate id(s): ${unknown.join(', ')}`);
  }
  return commandGroups.filter((group) => options.only.includes(group.id));
}

async function runCommand(command, options) {
  const startedAt = new Date().toISOString();
  try {
    const { stdout, stderr } = await execFileAsync(command.file, command.args, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...(command.env || {}) },
      maxBuffer: options.maxBufferMiB * 1024 * 1024,
    });
    return {
      id: command.id,
      command: command.display,
      status: 'PASSED',
      exitCode: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error) {
    return {
      id: command.id,
      command: command.display,
      status: 'FAILED',
      exitCode: error.code ?? 1,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? '',
      error: error.message,
    };
  }
}

async function buildReport(options) {
  const [rootPackage, frontendPackage] = await Promise.all([
    readJson('package.json'),
    readJson('frontend/package.json'),
  ]);
  const selectedGroups = filterGroups(options);

  const gates = selectedGroups.map((group) => {
    const declaration = collectDeclaration(group);
    const executableCommands = selectExecutableCommands(group, options);
    return {
      id: group.id,
      label: group.label,
      required: group.required,
      declarativeOnly: Boolean(group.declarativeOnly),
      declaration,
      commands: group.declarativeOnly
        ? group.commands.map((command) => commandToPlan(command, false))
        : executableCommands.map((command) =>
            commandToPlan(command, options.execute),
          ),
      executionResults: [],
    };
  });

  if (options.execute) {
    for (const gate of gates) {
      const group = commandGroups.find((candidate) => candidate.id === gate.id);
      const commands = selectExecutableCommands(group, options);
      for (const command of commands) {
        gate.executionResults.push(await runCommand(command, options));
      }
    }
  }

  const noGoReasons = [];
  for (const gate of gates) {
    if (!gate.declaration.valid) {
      noGoReasons.push(
        `${gate.declaration.envKey} has invalid declaration ${gate.declaration.status}`,
      );
    }
    if (gate.required && !gate.declaration.passed) {
      noGoReasons.push(
        `${gate.label} not declared PASSED via ${gate.declaration.envKey}`,
      );
    }
    for (const result of gate.executionResults) {
      if (result.status !== 'PASSED') {
        noGoReasons.push(`${gate.label} command failed: ${result.command}`);
      }
    }
  }

  return {
    generatedAt,
    runDate,
    mode: options.execute ? 'execute' : 'dry-run-plan',
    decision:
      noGoReasons.length === 0 ? 'FINAL_GATES_READY' : 'FINAL_GATES_NO_GO',
    noGoReasons,
    repository: {
      root: REPO_ROOT,
      packageName: rootPackage.name,
      version: rootPackage.version,
      frontendPackageName: frontendPackage.name,
      frontendVersion: frontendPackage.version,
    },
    gates,
    safeguards: [
      'Default mode is dry-run/plan and does not run heavy or mutating commands.',
      'Commands execute only when --execute is provided.',
      'Backup gate is declarative only and no restore is launched by this orchestrator.',
      'No Docker compose up/down, migration, seed, deploy, git tag, git push, or package mutation.',
      'FINAL_GATES_READY depends on explicit PROD_GATE_* declarations set to PASSED.',
    ],
  };
}

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

function renderMarkdown(report) {
  const lines = [
    '# Sprint 20 Phase 2 - Final Production Gates',
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: \`${report.mode}\``,
    `Decision: \`${report.decision}\``,
    '',
    '## Repository',
    '',
    `- Root: \`${report.repository.packageName}\` ${report.repository.version}`,
    `- Frontend: \`${report.repository.frontendPackageName}\` ${report.repository.frontendVersion}`,
    '',
    '## Gate Declarations',
    '',
    '| Gate | Env | Declared status | Execution |',
    '| --- | --- | --- | --- |',
  ];

  for (const gate of report.gates) {
    const execution = gate.declarativeOnly
      ? 'declarative only'
      : gate.commands.map((command) => command.execution).join(', ');
    lines.push(
      `| ${escapeMarkdownCell(gate.label)} | \`${gate.declaration.envKey}\` | ${gate.declaration.status} | ${escapeMarkdownCell(execution)} |`,
    );
  }

  lines.push('', '## Command Plan', '');
  for (const gate of report.gates) {
    lines.push(`### ${gate.label}`);
    for (const command of gate.commands) {
      lines.push(`- ${command.execution}: \`${command.command}\``);
    }
    if (gate.executionResults.length > 0) {
      for (const result of gate.executionResults) {
        lines.push(
          `- result ${result.status}: \`${result.command}\` (exit ${result.exitCode})`,
        );
      }
    }
    lines.push('');
  }

  lines.push('## No-go Reasons', '');
  if (report.noGoReasons.length === 0) {
    lines.push('- None.');
  } else {
    for (const reason of report.noGoReasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push('', '## Safeguards', '');
  for (const item of report.safeguards) {
    lines.push(`- ${item}`);
  }

  lines.push('', '## JSON', '', '```json');
  lines.push(JSON.stringify(report, null, 2));
  lines.push('```');

  return lines.join('\n');
}

function printOutput(report, format) {
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (format === 'markdown') {
    console.log(renderMarkdown(report));
    return;
  }

  console.log(renderMarkdown(report));
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    const report = await buildReport(options);
    printOutput(report, options.format);
  }
} catch (error) {
  console.error(`Production final gates error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
