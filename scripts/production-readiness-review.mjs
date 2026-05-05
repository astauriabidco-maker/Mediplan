#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const runDate = new Date().toISOString().slice(0, 10);
const generatedAt = new Date().toISOString();

function parseArgs(argv) {
  const options = {
    dryRun: false,
    includeGitStatus: false,
    format: 'both',
    reportDir: process.env.REPORT_DIR || 'preprod-reports',
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
    } else if (arg === '--report-dir') {
      options.reportDir = readValue();
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 19 production readiness review

Usage:
  node scripts/production-readiness-review.mjs --dry-run [--include-git-status] [--format markdown|json|both]

This script is non destructive. It never deploys, tags, pushes, runs Docker,
runs migrations, seeds data, or restores backups. It aggregates RC readiness,
preprod evidence files and explicit production signoffs.

Production signoffs and gates are provided through env variables:
  PROD_SIGNOFF_HR=GO
  PROD_SIGNOFF_SECURITY=GO
  PROD_SIGNOFF_OPERATIONS=GO
  PROD_SIGNOFF_TECHNICAL=GO
  PROD_SIGNOFF_DIRECTION=GO
  PROD_FREEZE_STATUS=FREEZE_READY
  PROD_GATE_MIGRATION=PASSED
  PROD_GATE_SEED=PASSED
  PROD_GATE_SMOKE=PASSED
  PROD_GATE_COMPLIANCE=PASSED
  PROD_GATE_AUDIT=PASSED
  PROD_GATE_BACKUP=PASSED
`);
}

function assertDryRun(options) {
  if (!options.dryRun) {
    throw new Error('Use --dry-run. Production readiness review is read-only.');
  }
}

async function readJson(relativePath) {
  const raw = await readFile(path.join(REPO_ROOT, relativePath), 'utf8');
  return JSON.parse(raw);
}

async function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function collectRcDecision(includeGitStatus) {
  const args = [
    'scripts/release-candidate-finalize.mjs',
    '--dry-run',
    '--format',
    'json',
  ];
  if (includeGitStatus) args.push('--include-git-status');

  try {
    const { stdout, stderr } = await execFileAsync('node', args, {
      cwd: REPO_ROOT,
      maxBuffer: 1024 * 1024 * 12,
    });
    return {
      ok: true,
      command: `node ${args.join(' ')}`,
      decision: JSON.parse(stdout),
      stderr: stderr.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      command: `node ${args.join(' ')}`,
      exitCode: error.code ?? 1,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? '',
      error: error.message,
    };
  }
}

const signoffDefinitions = [
  ['HR', 'PROD_SIGNOFF_HR', 'Responsable RH', 'PROD_SIGNOFF_RH'],
  ['SECURITY', 'PROD_SIGNOFF_SECURITY', 'Referent securite'],
  [
    'OPERATIONS',
    'PROD_SIGNOFF_OPERATIONS',
    'Responsable exploitation',
    'PROD_SIGNOFF_EXPLOITATION',
  ],
  [
    'TECHNICAL',
    'PROD_SIGNOFF_TECHNICAL',
    'Responsable technique',
    'PROD_SIGNOFF_MANAGER',
  ],
  ['DIRECTION', 'PROD_SIGNOFF_DIRECTION', 'Direction / sponsor metier'],
];

const gateDefinitions = [
  ['FREEZE', 'PROD_FREEZE_STATUS', 'Freeze production', 'FREEZE_READY'],
  ['MIGRATION', 'PROD_GATE_MIGRATION', 'Migration OK', 'PASSED'],
  ['SEED', 'PROD_GATE_SEED', 'Seed OK', 'PASSED'],
  ['SMOKE', 'PROD_GATE_SMOKE', 'Smoke API OK', 'PASSED'],
  ['COMPLIANCE', 'PROD_GATE_COMPLIANCE', 'Conformite healthy', 'PASSED'],
  ['AUDIT', 'PROD_GATE_AUDIT', 'Audit valide', 'PASSED'],
  ['BACKUP', 'PROD_GATE_BACKUP', 'Backup exportable/restaurable', 'PASSED'],
];

const normalizeDecision = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

function collectSignoffs() {
  return signoffDefinitions.map(([id, envKey, label, legacyEnvKey]) => {
    const value = normalizeDecision(
      process.env[envKey] || process.env[legacyEnvKey],
    );
    const ok = value === 'GO';
    return {
      id,
      envKey,
      legacyEnvKey,
      label,
      decision: value || 'MISSING',
      ok,
      note: ok ? 'Signoff GO fourni.' : `${envKey}=GO requis avant PROD_READY.`,
    };
  });
}

function collectGates() {
  return gateDefinitions.map(([id, envKey, label, expected]) => {
    const value = normalizeDecision(process.env[envKey]);
    const ok = value === expected;
    return {
      id,
      envKey,
      label,
      status: value || 'MISSING',
      ok,
      note: ok
        ? `Gate declaree ${expected}.`
        : `${envKey}=${expected} requis avant PROD_READY.`,
    };
  });
}

async function collectEvidence(reportDir) {
  const files = {
    goNoGo: path.join(reportDir, `preprod-go-no-go-final-${runDate}.json`),
    opsReadiness: path.join(reportDir, `preprod-ops-readiness-${runDate}.json`),
    demoHealth: path.join(
      reportDir,
      `preprod-demo-health-check-${runDate}.json`,
    ),
    opsSummary: path.join(
      reportDir,
      `preprod-operational-summary-${runDate}.json`,
    ),
  };

  const entries = [];
  for (const [id, filePath] of Object.entries(files)) {
    const json = await readJsonIfExists(filePath);
    entries.push({
      id,
      path: filePath,
      exists: Boolean(json),
      json,
    });
  }
  return entries;
}

function evidenceStatus(entry) {
  if (!entry.exists) return { status: 'MISSING', ok: false };
  const body = entry.json;
  if (body.decision === 'GO' || body.decision === 'READY') {
    return { status: body.decision, ok: true };
  }
  if (body.status === 'PASSED' || body.status === 'READY') {
    return { status: body.status, ok: true };
  }
  return { status: body.decision || body.status || 'UNKNOWN', ok: false };
}

function buildNoGoReasons({ rc, signoffs, gates, evidence }) {
  const reasons = [];
  if (!rc.ok || rc.decision?.decision !== 'RC_READY') {
    reasons.push('RC_READY not confirmed by release-candidate-finalize');
  }
  for (const signoff of signoffs) {
    if (!signoff.ok) reasons.push(`${signoff.label} signoff missing`);
  }
  for (const gate of gates) {
    if (!gate.ok) reasons.push(`${gate.label} gate not declared PASSED`);
  }
  for (const entry of evidence) {
    const status = evidenceStatus(entry);
    if (!status.ok) reasons.push(`${entry.id} evidence ${status.status}`);
  }
  return reasons;
}

async function buildReview(options) {
  const [rootPackage, frontendPackage, rc, evidence] = await Promise.all([
    readJson('package.json'),
    readJson('frontend/package.json'),
    collectRcDecision(options.includeGitStatus),
    collectEvidence(options.reportDir),
  ]);
  const signoffs = collectSignoffs();
  const gates = collectGates();
  const noGoReasons = buildNoGoReasons({ rc, signoffs, gates, evidence });

  return {
    generatedAt,
    runDate,
    mode: 'dry-run',
    decision: noGoReasons.length === 0 ? 'PROD_READY' : 'PROD_NO_GO',
    noGoReasons,
    repository: {
      root: REPO_ROOT,
      packageName: rootPackage.name,
      version: rootPackage.version,
      frontendPackageName: frontendPackage.name,
      frontendVersion: frontendPackage.version,
    },
    rc,
    signoffs,
    gates,
    evidence: evidence.map((entry) => ({
      id: entry.id,
      path: entry.path,
      exists: entry.exists,
      ...evidenceStatus(entry),
    })),
    safeguards: [
      'No deployment.',
      'No tag creation.',
      'No push.',
      'No package version mutation.',
      'No migration, Docker, seed, backup restore, or data mutation.',
      'PROD_READY requires explicit GO/PASSED env declarations.',
    ],
  };
}

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

function renderMarkdown(review) {
  const lines = [
    '# Sprint 19 - Production Readiness Review',
    '',
    `Generated: ${review.generatedAt}`,
    `Decision: \`${review.decision}\``,
    `Mode: ${review.mode}`,
    '',
    '## Version',
    '',
    `- Backend/root: \`${review.repository.packageName}\` ${review.repository.version}`,
    `- Frontend: \`${review.repository.frontendPackageName}\` ${review.repository.frontendVersion}`,
    '',
    '## RC readiness',
    '',
    `- Command: \`${review.rc.command}\``,
    `- Status: ${review.rc.ok ? 'PASSED' : 'FAILED'}`,
    `- Decision: ${review.rc.decision?.decision || '-'}`,
    '',
    '## Signoffs',
    '',
    '| Role | Env | Decision | Note |',
    '| --- | --- | --- | --- |',
    ...review.signoffs.map(
      (item) =>
        `| ${escapeMarkdownCell(item.label)} | \`${item.envKey}\` | ${item.decision} | ${escapeMarkdownCell(item.note)} |`,
    ),
    '',
    '## Gates',
    '',
    '| Gate | Env | Status | Note |',
    '| --- | --- | --- | --- |',
    ...review.gates.map(
      (item) =>
        `| ${escapeMarkdownCell(item.label)} | \`${item.envKey}\` | ${item.status} | ${escapeMarkdownCell(item.note)} |`,
    ),
    '',
    '## Evidence',
    '',
    '| Evidence | Status | Path |',
    '| --- | --- | --- |',
    ...review.evidence.map(
      (item) =>
        `| ${item.id} | ${item.status} | \`${escapeMarkdownCell(item.path)}\` |`,
    ),
    '',
    '## No-go reasons',
    '',
    ...(review.noGoReasons.length
      ? review.noGoReasons.map((reason) => `- ${reason}`)
      : ['- None.']),
    '',
    '## Safeguards',
    '',
    ...review.safeguards.map((item) => `- ${item}`),
    '',
    '## JSON',
    '',
    '```json',
    JSON.stringify(review, null, 2),
    '```',
  ];
  return lines.join('\n');
}

function printOutput(review, format) {
  if (format === 'json') {
    console.log(JSON.stringify(review, null, 2));
    return;
  }
  console.log(renderMarkdown(review));
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    assertDryRun(options);
    await mkdir(options.reportDir, { recursive: true });
    const review = await buildReview(options);
    const jsonPath = path.join(
      options.reportDir,
      `production-readiness-review-${runDate}.json`,
    );
    const mdPath = path.join(
      options.reportDir,
      `production-readiness-review-${runDate}.md`,
    );
    await writeFile(jsonPath, `${JSON.stringify(review, null, 2)}\n`);
    await writeFile(mdPath, `${renderMarkdown(review)}\n`);
    printOutput(review, options.format);
    if (review.decision !== 'PROD_READY') {
      process.exitCode = 2;
    }
  }
} catch (error) {
  console.error(`Production readiness review error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
