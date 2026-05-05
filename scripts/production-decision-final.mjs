#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const runDate = new Date().toISOString().slice(0, 10);

const requiredChecks = [
  {
    id: 'productionReadinessReview',
    label: 'Production readiness review',
    script: 'scripts/production-readiness-review.mjs',
    args: ['--dry-run', '--format', 'json'],
    includeGitStatus: true,
    requiredDecision: 'PROD_READY',
    missingReason: 'production-readiness-review script is missing',
  },
  {
    id: 'freezeCheck',
    label: 'Production freeze check',
    script: process.env.PROD_FREEZE_CHECK_SCRIPT || 'scripts/production-freeze-check.mjs',
    args: ['--dry-run', '--format', 'json'],
    requiredDecision: 'FREEZE_READY',
    missingReason: 'production freeze check script is missing',
  },
  {
    id: 'finalGates',
    label: 'Production final gates',
    script: process.env.PROD_FINAL_GATES_SCRIPT || 'scripts/production-final-gates.mjs',
    args: ['--format', 'json'],
    requiredDecision: 'FINAL_GATES_READY',
    missingReason: 'production final gates script is missing',
  },
  {
    id: 'signoffMatrix',
    label: 'Production signoff matrix',
    script: process.env.PROD_SIGNOFF_MATRIX_SCRIPT || 'scripts/production-signoff-matrix.mjs',
    args: ['--format', 'json'],
    requiredDecision: 'SIGNOFF_READY',
    missingReason: 'production signoff matrix script is missing',
  },
];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    includeGitStatus: false,
    format: 'both',
    decisionDir: process.env.PROD_DECISION_DIR || 'prod-decision-reports',
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

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--include-git-status') {
      options.includeGitStatus = true;
    } else if (arg === '--format') {
      const format = readValue();
      if (!['markdown', 'json', 'both'].includes(format)) {
        throw new Error('--format must be markdown, json, or both');
      }
      options.format = format;
    } else if (arg === '--decision-dir') {
      options.decisionDir = readValue();
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 20 Phase 4 production decision finalizer

Usage:
  node scripts/production-decision-final.mjs --dry-run [--include-git-status] [--format markdown|json|both] [--decision-dir <dir>]

This script is non destructive. It never deploys, tags, pushes, runs Docker,
runs migrations, seeds data, restores backups, or mutates package versions.

It aggregates:
  - node scripts/production-readiness-review.mjs --dry-run
  - a freeze check script when present
  - a final gates script when present
  - a signoff matrix script when present

Default optional Phase 1-3 script paths:
  - scripts/production-freeze-check.mjs --dry-run
  - scripts/production-final-gates.mjs
  - scripts/production-signoff-matrix.mjs

Override optional script paths with:
  PROD_FREEZE_CHECK_SCRIPT
  PROD_FINAL_GATES_SCRIPT
  PROD_SIGNOFF_MATRIX_SCRIPT
`);
}

function assertDryRun(options) {
  if (!options.dryRun) {
    throw new Error('Use --dry-run. Production decision finalizer is read-only.');
  }
}

function parseJsonFromStdout(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
    if (!fencedMatch) return null;
    return JSON.parse(fencedMatch[1]);
  }
}

async function runCheck(definition, options) {
  const scriptPath = path.join(REPO_ROOT, definition.script);
  if (!existsSync(scriptPath)) {
    return {
      id: definition.id,
      label: definition.label,
      command: `node ${definition.script} ${definition.args.join(' ')}`,
      present: false,
      ok: false,
      decision: 'MISSING',
      expectedDecision: definition.requiredDecision,
      reason: definition.missingReason,
    };
  }

  const args = [definition.script, ...definition.args];
  if (options.includeGitStatus && definition.includeGitStatus) {
    args.push('--include-git-status');
  }

  try {
    const { stdout, stderr } = await execFileAsync('node', args, {
      cwd: REPO_ROOT,
      maxBuffer: 1024 * 1024 * 12,
    });
    const payload = parseJsonFromStdout(stdout);
    const decision = payload?.decision || payload?.status || 'UNKNOWN';

    return {
      id: definition.id,
      label: definition.label,
      command: `node ${args.join(' ')}`,
      present: true,
      ok: decision === definition.requiredDecision,
      exitCode: 0,
      decision,
      expectedDecision: definition.requiredDecision,
      stderr: stderr.trim(),
      payload,
    };
  } catch (error) {
    const payload = parseJsonFromStdout(error.stdout || '');
    const decision = payload?.decision || payload?.status || 'FAILED';

    return {
      id: definition.id,
      label: definition.label,
      command: `node ${args.join(' ')}`,
      present: true,
      ok: decision === definition.requiredDecision,
      exitCode: error.code ?? 1,
      decision,
      expectedDecision: definition.requiredDecision,
      stdout: payload ? undefined : error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? '',
      error: error.message,
      payload,
    };
  }
}

function buildNoGoReasons(checks) {
  return checks.flatMap((check) => {
    if (check.ok) return [];
    if (!check.present) return [check.reason];
    return [
      `${check.label} returned ${check.decision}; expected ${check.expectedDecision}`,
    ];
  });
}

async function buildDecision(options) {
  const generatedAt = new Date().toISOString();
  const checks = [];

  for (const definition of requiredChecks) {
    checks.push(await runCheck(definition, options));
  }

  const noGoReasons = buildNoGoReasons(checks);
  return {
    generatedAt,
    runDate,
    mode: 'dry-run',
    decision: noGoReasons.length === 0 ? 'PROD_READY' : 'PROD_NO_GO',
    noGoReasons,
    repository: {
      root: REPO_ROOT,
    },
    checks,
    outputs: {
      decisionDir: path.resolve(REPO_ROOT, options.decisionDir),
    },
    safeguards: [
      'No deployment.',
      'No tag creation.',
      'No push.',
      'No package version mutation.',
      'No migration, Docker, seed, backup restore, or data mutation.',
      'PROD_READY requires all Phase 1-4 checks to return their expected decision.',
    ],
  };
}

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

function renderMarkdown(decision) {
  const lines = [
    '# Sprint 20 Phase 4 - Production Decision Final',
    '',
    `Generated: ${decision.generatedAt}`,
    `Decision: \`${decision.decision}\``,
    `Mode: ${decision.mode}`,
    '',
    '## Aggregated checks',
    '',
    '| Check | Present | Decision | Expected | Command |',
    '| --- | --- | --- | --- | --- |',
    ...decision.checks.map(
      (check) =>
        `| ${escapeMarkdownCell(check.label)} | ${check.present ? 'yes' : 'no'} | ${escapeMarkdownCell(check.decision)} | ${escapeMarkdownCell(check.expectedDecision)} | \`${escapeMarkdownCell(check.command)}\` |`,
    ),
    '',
    '## No-go reasons',
    '',
    ...(decision.noGoReasons.length
      ? decision.noGoReasons.map((reason) => `- ${reason}`)
      : ['- None.']),
    '',
    '## Decision dossier',
    '',
    `- JSON and Markdown written to \`${decision.outputs.decisionDir}\`.`,
    '',
    '## Safeguards',
    '',
    ...decision.safeguards.map((item) => `- ${item}`),
    '',
    '## JSON',
    '',
    '```json',
    JSON.stringify(decision, null, 2),
    '```',
  ];

  return lines.join('\n');
}

async function writeDecisionDossier(decision, decisionDir) {
  const outputDir = path.resolve(REPO_ROOT, decisionDir);
  await mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `production-decision-final-${runDate}.json`);
  const markdownPath = path.join(outputDir, `production-decision-final-${runDate}.md`);
  const dossier = {
    ...decision,
    outputs: {
      ...decision.outputs,
      jsonPath,
      markdownPath,
    },
  };

  await writeFile(jsonPath, `${JSON.stringify(dossier, null, 2)}\n`);
  await writeFile(markdownPath, `${renderMarkdown(dossier)}\n`);
  return dossier;
}

function printOutput(decision, format) {
  if (format === 'json') {
    console.log(JSON.stringify(decision, null, 2));
    return;
  }

  if (format === 'markdown') {
    console.log(renderMarkdown(decision));
    return;
  }

  console.log(renderMarkdown(decision));
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    assertDryRun(options);
    const decision = await buildDecision(options);
    const dossier = await writeDecisionDossier(decision, options.decisionDir);
    printOutput(dossier, options.format);
    if (dossier.decision !== 'PROD_READY') {
      process.exitCode = 2;
    }
  }
} catch (error) {
  console.error(`Production decision finalizer error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
