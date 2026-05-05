#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const knownArgs = new Set(['--mock', '--skip-preprod', '--help', '-h']);
const unknownArgs = [...args].filter((arg) => !knownArgs.has(arg));

const now = new Date();
const runDate = now.toISOString().slice(0, 10);
const generatedAt = now.toISOString();
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const tenantId = process.env.TENANT_ID || 'HGD-DOUALA';
const baseUrl = (process.env.BASE_URL || 'http://localhost:3005').replace(
  /\/$/,
  '',
);
const runtimeEnv =
  process.env.GO_NO_GO_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'preprod';
const mockMode =
  args.has('--mock') ||
  args.has('--skip-preprod') ||
  process.env.GO_NO_GO_MOCK === 'true';

function usage() {
  console.log(`Mediplan Sprint 15 final preprod GO/NO-GO

Usage:
  node scripts/preprod-go-no-go-final.mjs [--mock|--skip-preprod]

Default:
  Relaunches non-destructive/read-only preprod evidence and writes final
  Markdown/JSON reports into REPORT_DIR (preprod-reports by default).

Modes:
  --mock          Local smoke: skip preprod API calls, keep CI dry-run/list.
  --skip-preprod Alias of --mock.
`);
}

if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  usage();
  process.exit(1);
}

if (args.has('--help') || args.has('-h')) {
  usage();
  process.exit(0);
}

const shellCommand = (command) =>
  command
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(' ');

const escapeMarkdownCell = (value) =>
  String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');

const readJsonIfExists = async (path) => {
  if (!existsSync(path)) return null;
  const content = await readFile(path, 'utf8');
  return JSON.parse(content);
};

const runCommand = (check) =>
  new Promise((resolve) => {
    const [command, ...commandArgs] = check.command;
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: { ...process.env, ...check.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const startedAt = performance.now();

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({
        ...check,
        status: 'FAILED',
        ok: false,
        exitCode: 1,
        durationMs: Math.round(performance.now() - startedAt),
        stdout,
        stderr,
        error: error.message,
      });
    });
    child.on('close', (exitCode, signal) => {
      resolve({
        ...check,
        status: exitCode === 0 ? 'PASSED' : 'FAILED',
        ok: exitCode === 0,
        exitCode,
        signal,
        durationMs: Math.round(performance.now() - startedAt),
        stdout,
        stderr,
      });
    });
  });

const skippedCheck = (check, reason) => ({
  ...check,
  status: 'SKIPPED',
  ok: true,
  skipped: true,
  exitCode: null,
  durationMs: 0,
  reason,
});

const evidencePath = (fileName) => join(reportDir, fileName);

const checks = [
  {
    id: 'incident-dry-run',
    label: 'Incident drill dry-run',
    command: ['node', 'scripts/preprod-incident-drill.mjs', '--dry-run'],
    env: {
      ENV_FILE: process.env.ENV_FILE || '.env.preprod',
      INCIDENT_DRY_RUN: 'true',
      INCIDENT_ALLOW_PUBLISH: 'false',
      INCIDENT_ALLOW_RESTORE: 'false',
      REPORT_DIR: reportDir,
    },
    evidenceJson: evidencePath(`preprod-incident-drill-${runDate}.json`),
    evidenceMarkdown: evidencePath(`preprod-incident-drill-${runDate}.md`),
    destructive: false,
    preprodApi: true,
  },
  {
    id: 'operational-summary',
    label: 'Operational summary',
    command: ['node', 'scripts/preprod-operational-summary.mjs'],
    env: {
      ENV_FILE: process.env.ENV_FILE || '.env.preprod',
      REPORT_DIR: reportDir,
    },
    mockCommand: ['node', 'scripts/preprod-operational-summary.mjs', '--mock'],
    mockEnv: {
      REPORT_DIR: reportDir,
      OPERATIONAL_SUMMARY_MOCK: 'true',
      TENANT_ID: tenantId,
    },
    evidenceJson: evidencePath(`preprod-operational-summary-${runDate}.json`),
    evidenceMarkdown: evidencePath(`preprod-operational-summary-${runDate}.md`),
    destructive: false,
    preprodApi: true,
  },
  {
    id: 'demo-health-check',
    label: 'Demo health check',
    command: ['node', 'scripts/preprod-demo-health-check.mjs'],
    env: {
      ENV_FILE: process.env.ENV_FILE || '.env.preprod',
      REPORT_DIR: reportDir,
    },
    evidenceJson: evidencePath(`preprod-demo-health-check-${runDate}.json`),
    evidenceMarkdown: evidencePath(`preprod-demo-health-check-${runDate}.md`),
    destructive: false,
    preprodApi: true,
  },
  {
    id: 'ci-product-list',
    label: 'Product CI list',
    command: ['node', 'scripts/ci-product-verify.mjs', '--list'],
    env: {},
    destructive: false,
    preprodApi: false,
  },
  {
    id: 'ci-product-dry-run',
    label: 'Product CI dry-run',
    command: ['node', 'scripts/ci-product-verify.mjs', '--dry-run'],
    env: {},
    destructive: false,
    preprodApi: false,
  },
];

await mkdir(reportDir, { recursive: true });

const results = [];
for (const check of checks) {
  if (mockMode && check.preprodApi && !check.mockCommand) {
    results.push(
      skippedCheck(
        check,
        'mock local: preuve preprod non relancee pour eviter un appel API',
      ),
    );
    continue;
  }

  const command = mockMode && check.mockCommand ? check.mockCommand : check.command;
  const env = mockMode && check.mockEnv ? check.mockEnv : check.env;
  results.push(await runCommand({ ...check, command, env }));
}

const evidenceResults = [];
for (const result of results) {
  const evidence = result.evidenceJson
    ? await readJsonIfExists(result.evidenceJson)
    : null;
  evidenceResults.push({ ...result, evidence });
}

const getEvidenceStatus = (result) => {
  if (result.status === 'SKIPPED') return 'SKIPPED';
  if (result.evidence?.decision) return result.evidence.decision;
  if (result.evidence?.goNoGo) return result.evidence.goNoGo;
  if (result.evidence?.status) return result.evidence.status;
  return result.status;
};

const getBlockingReasons = (result) => {
  const reasons = [];
  if (result.status === 'FAILED') {
    const stderr = result.stderr?.trim().split(/\r?\n/).slice(-3).join(' ');
    reasons.push(
      `${result.label}: commande echouee (exit ${result.exitCode ?? 'n/a'})${
        stderr ? ` - ${stderr}` : ''
      }`,
    );
  }
  if (result.evidence?.decision === 'NO-GO') {
    reasons.push(`${result.label}: decision NO-GO`);
  }
  if (result.evidence?.goNoGo === 'NO-GO') {
    reasons.push(`${result.label}: Go/No-Go NO-GO`);
  }
  if (result.evidence?.status === 'FAILED') {
    reasons.push(`${result.label}: statut FAILED`);
  }
  for (const reason of result.evidence?.blockingReasons || []) {
    reasons.push(`${result.label}: ${reason}`);
  }
  return reasons;
};

const blockingReasons = evidenceResults.flatMap(getBlockingReasons);
const missingEvidence = evidenceResults
  .filter((result) => result.evidenceJson && !result.evidence && !result.skipped)
  .map((result) => `${result.label}: rapport JSON attendu absent`);
const modeBlockingReasons = mockMode
  ? ['Mode mock local: validation technique uniquement, decision preprod non engagee']
  : [];
const finalBlockingReasons = [
  ...blockingReasons,
  ...missingEvidence,
  ...modeBlockingReasons,
];
const decision =
  !mockMode && finalBlockingReasons.length === 0 ? 'GO' : 'NO-GO';
const decisionMode = mockMode ? 'mock-local' : 'preprod-readonly';

const report = {
  decision,
  decisionMode,
  generatedAt,
  tenant: {
    id: tenantId,
    env: runtimeEnv,
    baseUrl,
  },
  checks: evidenceResults.map((result) => ({
    id: result.id,
    label: result.label,
    command: shellCommand(result.command),
    status: result.status,
    evidenceStatus: getEvidenceStatus(result),
    destructive: result.destructive,
    skipped: Boolean(result.skipped),
    reason: result.reason,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    evidenceJson: result.evidenceJson,
    evidenceMarkdown: result.evidenceMarkdown,
  })),
  blockingReasons: finalBlockingReasons,
};

const markdown = [
  `# Cloture Sprint 15 preprod GO/NO-GO - ${runDate}`,
  '',
  `- Decision: ${decision}`,
  `- Mode: ${decisionMode}`,
  `- Tenant: ${tenantId}`,
  `- Env: ${runtimeEnv}`,
  `- Base URL: ${baseUrl}`,
  `- Genere: ${generatedAt}`,
  '',
  '## Checks agreges',
  '',
  '| Check | Statut commande | Statut preuve | Commande | Rapport JSON |',
  '| --- | --- | --- | --- | --- |',
  ...report.checks.map(
    (check) =>
      `| ${escapeMarkdownCell(check.label)} | ${check.status} | ${
        check.evidenceStatus
      } | \`${escapeMarkdownCell(check.command)}\` | ${
        check.evidenceJson ? `\`${escapeMarkdownCell(check.evidenceJson)}\`` : '-'
      } |`,
  ),
  '',
  '## Raisons bloquantes',
  '',
  ...(finalBlockingReasons.length
    ? finalBlockingReasons.map((reason) => `- ${reason}`)
    : ['Aucune raison bloquante observee.']),
  '',
  '## Criteres',
  '',
  '- GO: toutes les commandes obligatoires terminent a 0, les rapports JSON attendus existent, aucune preuve ne retourne FAILED ou NO-GO, et le mode est preprod-readonly.',
  '- NO-GO: au moins une commande echoue, une preuve manque, une preuve retourne FAILED/NO-GO, une raison bloquante est remontee, ou le script est lance en mock local.',
  '- Non destructif: drill incident force en dry-run, publication/restauration interdites, operational summary et demo health en lecture seule, CI produit en list/dry-run.',
  '',
].join('\n');

await writeFile(
  join(reportDir, `preprod-go-no-go-final-${runDate}.json`),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
  join(reportDir, `preprod-go-no-go-final-${runDate}.md`),
  markdown,
);

console.log(markdown);

if (decision !== 'GO') {
  process.exitCode = 1;
}
