#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const now = new Date();
const runDate = now.toISOString().slice(0, 10);
const reportDir = process.env.REPORT_DIR || 'preprod-reports';
const envFile = process.env.ENV_FILE;
const explicitMock =
  args.has('--mock') ||
  args.has('--offline') ||
  process.env.OP_READINESS_MOCK === 'true' ||
  process.env.OP_READINESS_OFFLINE === 'true';
const strictApi =
  args.has('--strict-api') || process.env.OP_READINESS_STRICT_API === 'true';
const endpointTimeoutMs = Number(process.env.OP_READINESS_TIMEOUT_MS || 2500);
const baseUrl = (process.env.BASE_URL || 'http://localhost:3005').replace(
  /\/$/,
  '',
);

const runbookPointers = {
  sprint17: 'docs/ops/SPRINT_17_EXPLOITATION_RUNBOOK.md',
  monitoring: 'docs/SPRINT_12_PREPROD_MONITORING.md',
  productionRunbook: 'docs/SPRINT_11_PRODUCTION_RUNBOOK.md',
  observability: 'docs/recette/SPRINT_15_PHASE_5_OBSERVABILITY.md',
};

const requiredEnv = [
  'NODE_ENV',
  'PORT',
  'COUNTRY_CODE',
  'FRONTEND_URL',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'JWT_SECRET',
];

const recommendedEnv = [
  'BASE_URL',
  'TENANT_ID',
  'API_TOKEN',
  'SMOKE_EMAIL',
  'SMOKE_PASSWORD',
  'REPORT_DIR',
];

const scriptChecks = [
  {
    name: 'Environment check',
    path: 'scripts/preprod-env-check.mjs',
    pointer: 'npm run preprod:env:check',
  },
  {
    name: 'API smoke',
    path: 'scripts/preprod-api-smoke.mjs',
    pointer: 'npm run smoke:api:preprod',
  },
  {
    name: 'Backup restore drill',
    path: 'scripts/preprod-backup-restore.mjs',
    pointer: 'npm run preprod:backup:restore',
  },
  {
    name: 'Incident drill',
    path: 'scripts/preprod-incident-drill.mjs',
    pointer: 'npm run preprod:incident:dry-run',
  },
  {
    name: 'Operational summary',
    path: 'scripts/preprod-operational-summary.mjs',
    pointer: 'npm run preprod:ops:summary',
  },
];

const endpointChecks = [
  { name: 'API liveness', path: '/api/health/live', required: true },
  { name: 'API readiness', path: '/api/health/ready', required: true },
];

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

const loadEnvFile = async () => {
  if (!envFile) {
    return {
      status: 'WARN',
      path: null,
      message: 'ENV_FILE non renseigne: seules les variables shell sont lues.',
    };
  }

  if (!existsSync(envFile)) {
    return {
      status: 'WARN',
      path: envFile,
      message: `ENV_FILE introuvable: ${envFile}`,
    };
  }

  const content = await readFile(envFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed && !process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  }

  return {
    status: 'PASSED',
    path: envFile,
    message: `ENV_FILE charge: ${envFile}`,
  };
};

const envFileStatus = await loadEnvFile();

const envResult = (key, required) => {
  const present = Boolean(process.env[key]);
  const warnings = [];

  if (key === 'NODE_ENV' && present) {
    const allowed = ['preproduction', 'staging', 'production'];
    if (!allowed.includes(process.env[key])) {
      warnings.push(
        `NODE_ENV=${process.env[key]}: attendu preproduction/staging/production.`,
      );
    }
  }

  if (key === 'JWT_SECRET' && present && process.env[key].length < 64) {
    warnings.push('JWT_SECRET devrait contenir au moins 64 caracteres.');
  }

  return {
    key,
    required,
    present,
    status: present ? (warnings.length ? 'WARN' : 'PASSED') : required ? 'FAILED' : 'WARN',
    warnings,
  };
};

const checkEndpoint = async ({ name, path, required }) => {
  if (explicitMock) {
    return {
      name,
      path,
      required,
      status: 'MOCKED',
      ok: true,
      note: 'Mode mock/offline: appel reseau ignore.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), endpointTimeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      signal: controller.signal,
    });
    const durationMs = Math.round(performance.now() - startedAt);
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return {
      name,
      path,
      required,
      status: response.ok ? 'PASSED' : 'FAILED',
      ok: response.ok,
      httpStatus: response.status,
      durationMs,
      body,
    };
  } catch (error) {
    return {
      name,
      path,
      required,
      status: strictApi && required ? 'FAILED' : 'WARN',
      ok: !strictApi || !required,
      error: error instanceof Error ? error.message : String(error),
      note: strictApi
        ? 'Endpoint requis indisponible en mode strict.'
        : 'Endpoint inaccessible: avertissement seulement hors strict-api.',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const envChecks = [
  ...requiredEnv.map((key) => envResult(key, true)),
  ...recommendedEnv.map((key) => envResult(key, false)),
];
const scripts = scriptChecks.map((script) => ({
  ...script,
  status: existsSync(script.path) ? 'PASSED' : 'FAILED',
  ok: existsSync(script.path),
}));
const endpoints = [];
for (const endpoint of endpointChecks) {
  endpoints.push(await checkEndpoint(endpoint));
}

const missingRequiredEnv = envChecks.filter(
  (check) => check.required && !check.present,
);
const failedScripts = scripts.filter((script) => !script.ok);
const failedEndpoints = endpoints.filter((endpoint) => !endpoint.ok);
const warnings = [
  ...(envFileStatus.status === 'WARN' ? [envFileStatus.message] : []),
  ...envChecks.flatMap((check) => check.warnings.map((warning) => `${check.key}: ${warning}`)),
  ...envChecks
    .filter((check) => !check.required && !check.present)
    .map((check) => `${check.key} recommande mais absent.`),
  ...endpoints
    .filter((endpoint) => endpoint.status === 'WARN')
    .map((endpoint) => `${endpoint.name}: ${endpoint.error || endpoint.note}`),
];
const blockingReasons = [
  ...missingRequiredEnv.map((check) => `variable requise absente: ${check.key}`),
  ...failedScripts.map((script) => `script exploitation absent: ${script.path}`),
  ...failedEndpoints.map((endpoint) => `endpoint requis indisponible: ${endpoint.path}`),
];
const status = blockingReasons.length === 0 ? 'READY' : 'NO-GO';
const generatedAt = new Date().toISOString();

const report = {
  status,
  generatedAt,
  mode: explicitMock ? 'mock/offline' : strictApi ? 'api-strict' : 'api-best-effort',
  baseUrl,
  envFile: envFileStatus,
  timeoutMs: endpointTimeoutMs,
  env: {
    required: envChecks.filter((check) => check.required),
    recommended: envChecks.filter((check) => !check.required),
  },
  scripts,
  endpoints,
  warnings,
  blockingReasons,
  runbookPointers,
  nonDestructive: true,
};

const markdown = [
  `# Readiness exploitation preprod - ${runDate}`,
  '',
  `- Statut: ${status}`,
  `- Mode: ${report.mode}`,
  `- Base URL: ${baseUrl}`,
  `- Genere: ${generatedAt}`,
  `- Non destructif: oui, lectures env/fichiers et GET health uniquement`,
  `- Runbook principal: ${runbookPointers.sprint17}`,
  '',
  '## Variables environnement',
  '',
  '| Variable | Requise | Statut | Note |',
  '| --- | --- | --- | --- |',
  ...envChecks.map(
    (check) =>
      `| ${check.key} | ${check.required ? 'oui' : 'non'} | ${
        check.status
      } | ${escapeMarkdownCell(check.warnings.join(' ; '))} |`,
  ),
  '',
  '## Endpoints health/readiness',
  '',
  '| Check | Endpoint | Statut | HTTP | Duree | Note |',
  '| --- | --- | --- | ---: | ---: | --- |',
  ...endpoints.map(
    (endpoint) =>
      `| ${escapeMarkdownCell(endpoint.name)} | ${endpoint.path} | ${
        endpoint.status
      } | ${endpoint.httpStatus || '-'} | ${
        endpoint.durationMs ?? '-'
      } ms | ${escapeMarkdownCell(endpoint.error || endpoint.note || '')} |`,
  ),
  '',
  '## Scripts exploitation requis',
  '',
  '| Script | Statut | Commande/pointeur |',
  '| --- | --- | --- |',
  ...scripts.map(
    (script) =>
      `| ${script.path} | ${script.status} | ${escapeMarkdownCell(script.pointer)} |`,
  ),
  '',
  '## Decision READY/NO-GO',
  '',
  `Decision: ${status}`,
  '',
  ...(blockingReasons.length
    ? ['Raisons bloquantes:', '', ...blockingReasons.map((reason) => `- ${reason}`)]
    : ['Aucune raison bloquante detectee.']),
  '',
  ...(warnings.length
    ? ['Avertissements:', '', ...warnings.map((warning) => `- ${warning}`), '']
    : []),
  '## Runbook pointers',
  '',
  ...Object.entries(runbookPointers).map(([name, pointer]) => `- ${name}: ${pointer}`),
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `preprod-ops-readiness-${runDate}.json`),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(join(reportDir, `preprod-ops-readiness-${runDate}.md`), markdown);

console.log(markdown);

if (status !== 'READY') {
  process.exitCode = 1;
}
