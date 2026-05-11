#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const generatedAt = new Date().toISOString();

const requiredFiles = [
  'docs/recette/SPRINT_34_PRODUCTION_GO_LIVE_GATE.md',
  'docs/recette/SPRINT_35_PHASE_6_CHECKLIST_LANCEMENT_PREMIER_CLIENT.md',
  'docs/recette/SPRINT_36_COMMERCIAL_DEMO_READY_DECISION.md',
  'docs/recette/SPRINT_37_PHASE_3_SMOKE_PROD_CLIENT.md',
  'scripts/preprod-api-smoke.mjs',
  'scripts/ops-daily-check.mjs',
  'scripts/production-final-gates.mjs',
  'scripts/prod-client-smoke-plan.mjs',
];

const expectedConfig = [
  {
    key: 'NODE_ENV',
    required: true,
    expected: ['production'],
    note: 'Doit etre production sur la cible client.',
  },
  {
    key: 'COUNTRY_CODE',
    required: true,
    expected: [process.env.PROD_CLIENT_EXPECTED_COUNTRY_CODE || 'FR'],
    note: 'Pays attendu pour la cible client Sprint 37.',
  },
  {
    key: 'PORT',
    required: true,
    validate: (value) => /^\d+$/.test(value),
    note: 'Port applicatif expose par le backend.',
  },
  {
    key: 'FRONTEND_URL',
    required: true,
    validate: (value) => /^https:\/\//.test(value),
    note: 'Origine frontend HTTPS attendue pour CORS et liens documents.',
  },
  {
    key: 'BASE_URL',
    required: true,
    validate: (value) => /^https:\/\//.test(value),
    note: 'URL API HTTPS cible pour smoke manuel approuve.',
  },
  {
    key: 'POSTGRES_HOST',
    required: true,
    note: 'Hote PostgreSQL cible.',
  },
  {
    key: 'POSTGRES_PORT',
    required: true,
    validate: (value) => /^\d+$/.test(value),
    note: 'Port PostgreSQL cible.',
  },
  {
    key: 'POSTGRES_USER',
    required: true,
    note: 'Utilisateur PostgreSQL cible.',
  },
  {
    key: 'POSTGRES_PASSWORD',
    required: true,
    secret: true,
    note: 'Secret present hors depot et non affiche.',
  },
  {
    key: 'POSTGRES_DB',
    required: true,
    note: 'Base PostgreSQL cible.',
  },
  {
    key: 'JWT_SECRET',
    required: true,
    secret: true,
    validate: (value) => value.length >= 64,
    note: 'Secret JWT fort, longueur minimale 64 caracteres.',
  },
  {
    key: 'DB_SYNCHRONIZE',
    required: false,
    expected: ['', 'false'],
    note: 'Ne doit pas etre true en production client.',
  },
  {
    key: 'MISTRAL_API_KEY',
    required: false,
    secret: true,
    note: 'Optionnel, presence seulement verifiee si fourni.',
  },
];

const forbiddenScriptPatterns = [
  /\bmigration:(run|revert)\b/i,
  /\bseed:(demo|hgd)\b/i,
  /\bdemo:reset\b/i,
  /\bdocker\s+compose\b/i,
  /\bcompose:(up|down|migrate|seed)\b/i,
  /\brm\s+-rf\b/i,
  /\bgit\s+(push|reset|clean)\b/i,
  /\bmethod:\s*['"](POST|PATCH|PUT|DELETE)['"]/i,
  /\bfetch\s*\(/i,
];

function parseArgs(argv) {
  const options = {
    format: 'both',
    strict: false,
    envFile: process.env.ENV_FILE || '',
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

    if (arg === '--format') {
      const format = readValue();
      if (!['markdown', 'json', 'both'].includes(format)) {
        throw new Error('--format must be markdown, json, or both');
      }
      options.format = format;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--env-file') {
      options.envFile = readValue();
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 37 Phase 3 prod client smoke plan

Usage:
  node scripts/prod-client-smoke-plan.mjs [--format markdown|json|both]
  ENV_FILE=.env.prod-client node scripts/prod-client-smoke-plan.mjs --strict

Default mode is non destructive and local-only. It reads repository files,
package.json, process.env and an optional env file. It never calls network,
never runs Docker, never runs migrations, never seeds, never resets data,
never deletes files and never pushes.

Use --strict when running inside the prepared target shell to fail if required
production client variables are missing or invalid.
`);
}

function parseEnvFile(envFile) {
  if (!envFile) return { path: null, exists: false, values: {} };

  const absolutePath = path.isAbsolute(envFile)
    ? envFile
    : path.join(REPO_ROOT, envFile);

  if (!existsSync(absolutePath)) {
    return { path: envFile, exists: false, values: {} };
  }

  const values = {};
  const content = readFileSync(absolutePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
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
    values[key] = value;
  }

  return { path: envFile, exists: true, values };
}

function readText(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function envValue(key, envFileValues) {
  return process.env[key] ?? envFileValues[key] ?? '';
}

function maskValue(value, secret) {
  if (!value) return null;
  if (secret) return 'present';
  if (value.length > 96) return `${value.slice(0, 93)}...`;
  return value;
}

function collectFileChecks() {
  return requiredFiles.map((relativePath) => ({
    id: relativePath,
    status: existsSync(path.join(REPO_ROOT, relativePath))
      ? 'PASSED'
      : 'FAILED',
  }));
}

function collectPackageChecks() {
  const packageJson = readJson('package.json');
  const scripts = packageJson.scripts ?? {};
  const command = scripts['sprint37:prod-client:smoke'] || '';
  const strictCommand = scripts['sprint37:prod-client:smoke:strict'] || '';
  const matchedPattern = forbiddenScriptPatterns.find((pattern) =>
    pattern.test(command),
  );

  return [
    {
      id: 'sprint37:prod-client:smoke',
      status: command ? 'PASSED' : 'FAILED',
      command: command || null,
    },
    {
      id: 'sprint37:prod-client:smoke non destructive',
      status: command && !matchedPattern ? 'PASSED' : 'FAILED',
      command: command || null,
      reason: matchedPattern
        ? `Forbidden pattern detected: ${matchedPattern}`
        : null,
    },
    {
      id: 'sprint37:prod-client:smoke:strict',
      status: strictCommand ? 'PASSED' : 'FAILED',
      command: strictCommand || null,
    },
  ];
}

function collectScriptSourceChecks() {
  const source = readText('scripts/prod-client-smoke-plan.mjs');
  return [
    {
      id: 'No network call in default script',
      status: !/\bfetch\s*\(/.test(source) ? 'PASSED' : 'FAILED',
    },
    {
      id: 'No mutating HTTP method in default script',
      status: !/\bmethod:\s*['"](POST|PATCH|PUT|DELETE)['"]/i.test(source)
        ? 'PASSED'
        : 'FAILED',
    },
    {
      id: 'No destructive command execution in default script',
      status: !/\bexec(File|Sync)?\b|\bspawn(Sync)?\b/.test(source)
        ? 'PASSED'
        : 'FAILED',
    },
  ];
}

function collectConfigChecks(envFileValues) {
  return expectedConfig.map((definition) => {
    const value = envValue(definition.key, envFileValues);
    const missing = definition.required && !value;
    const expectedFailed =
      value &&
      definition.expected &&
      !definition.expected.includes(String(value).trim());
    const validationFailed =
      value && definition.validate && !definition.validate(String(value));
    const optionalMissing = !definition.required && !value;

    let status = 'PASSED';
    if (missing || expectedFailed || validationFailed) {
      status = 'FAILED';
    } else if (optionalMissing) {
      status = 'NOT_SET';
    }

    return {
      key: definition.key,
      status,
      required: definition.required,
      value: maskValue(value, definition.secret),
      expected: definition.expected ?? null,
      note: definition.note,
    };
  });
}

function buildPlan() {
  return [
    {
      step: '1-config-locale',
      action:
        'Executer ce script dans le shell cible avec ENV_FILE pointe vers le fichier prod client, sans --strict pour une premiere lecture.',
      command: 'ENV_FILE=<fichier-prod-client> npm run sprint37:prod-client:smoke',
      network: false,
      destructive: false,
    },
    {
      step: '2-config-strict',
      action:
        'Quand les variables cible sont pretes, relancer en strict pour bloquer les manques de configuration.',
      command:
        'ENV_FILE=<fichier-prod-client> npm run sprint37:prod-client:smoke:strict',
      network: false,
      destructive: false,
    },
    {
      step: '3-smoke-api-approuve',
      action:
        'Apres accord explicite, executer le smoke API lecture seule sur BASE_URL cible avec API_TOKEN ou compte smoke.',
      command: 'ENV_FILE=<fichier-prod-client> npm run smoke:api:preprod',
      network: true,
      destructive: false,
    },
    {
      step: '4-preuves',
      action:
        'Rattacher resultats, horodatage, version, URL, tenant smoke et reserves dans le ticket de recette client.',
      command: null,
      network: false,
      destructive: false,
    },
  ];
}

function buildReport(options) {
  const envFile = parseEnvFile(options.envFile);
  const files = collectFileChecks();
  const packageScripts = collectPackageChecks();
  const sourceSafety = collectScriptSourceChecks();
  const config = collectConfigChecks(envFile.values);
  const plan = buildPlan();
  const blockingFailures = [
    ...files,
    ...packageScripts,
    ...sourceSafety,
  ].filter((check) => check.status === 'FAILED');
  const configFailures = config.filter((check) => check.status === 'FAILED');
  const strictFailures = options.strict ? configFailures : [];
  const status =
    blockingFailures.length === 0 && strictFailures.length === 0
      ? 'PASSED'
      : 'FAILED';
  const decision =
    status === 'FAILED'
      ? 'PROD_CLIENT_SMOKE_PLAN_BLOCKED'
      : configFailures.length === 0
        ? 'PROD_CLIENT_SMOKE_PLAN_READY'
        : 'PROD_CLIENT_SMOKE_PLAN_READY_WITH_RESERVES';

  return {
    status,
    decision,
    generatedAt,
    strict: options.strict,
    envFile: {
      path: envFile.path,
      exists: envFile.exists,
      loadedKeys: Object.keys(envFile.values).sort(),
    },
    policy: {
      networkCallsByDefault: false,
      migrationsExecuted: false,
      seedExecuted: false,
      resetExecuted: false,
      destructiveDeletionExecuted: false,
      pushExecuted: false,
    },
    files,
    packageScripts,
    sourceSafety,
    config,
    plan,
    reserves: configFailures.map((check) => ({
      key: check.key,
      status: check.status,
      note: check.note,
      expected: check.expected,
    })),
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Sprint 37 Phase 3 - Smoke prod client`,
    '',
    `- Statut: ${report.status}`,
    `- Decision: ${report.decision}`,
    `- Genere le: ${report.generatedAt}`,
    `- Mode strict: ${report.strict ? 'oui' : 'non'}`,
    `- Env file: ${report.envFile.path || 'non renseigne'} (${report.envFile.exists ? 'lu' : 'non lu'})`,
    '',
    '## Garde-fous',
    '',
    `- Appels reseau par defaut: ${report.policy.networkCallsByDefault ? 'oui' : 'non'}`,
    `- Migrations executees: ${report.policy.migrationsExecuted ? 'oui' : 'non'}`,
    `- Seed execute: ${report.policy.seedExecuted ? 'oui' : 'non'}`,
    `- Reset execute: ${report.policy.resetExecuted ? 'oui' : 'non'}`,
    `- Push execute: ${report.policy.pushExecuted ? 'oui' : 'non'}`,
    '',
    '## Fichiers',
    '',
    '| Fichier | Statut |',
    '| --- | --- |',
    ...report.files.map((check) => `| \`${check.id}\` | ${check.status} |`),
    '',
    '## Scripts package',
    '',
    '| Controle | Statut | Commande |',
    '| --- | --- | --- |',
    ...report.packageScripts.map(
      (check) =>
        `| ${check.id} | ${check.status} | ${check.command ? `\`${check.command}\`` : '-'} |`,
    ),
    '',
    '## Configuration cible',
    '',
    '| Variable | Statut | Valeur | Attendu |',
    '| --- | --- | --- | --- |',
    ...report.config.map(
      (check) =>
        `| \`${check.key}\` | ${check.status} | ${check.value ?? '-'} | ${check.expected ? check.expected.join(', ') : '-'} |`,
    ),
    '',
    '## Plan smoke',
    '',
    '| Etape | Reseau | Destructif | Commande |',
    '| --- | --- | --- | --- |',
    ...report.plan.map(
      (step) =>
        `| ${step.step} | ${step.network ? 'oui' : 'non'} | ${step.destructive ? 'oui' : 'non'} | ${step.command ? `\`${step.command}\`` : '-'} |`,
    ),
  ];

  if (report.reserves.length > 0) {
    lines.push('', '## Reserves', '');
    for (const reserve of report.reserves) {
      lines.push(
        `- \`${reserve.key}\`: ${reserve.note}${
          reserve.expected ? ` Attendu: ${reserve.expected.join(', ')}.` : ''
        }`,
      );
    }
  }

  return lines.join('\n');
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const report = buildReport(options);
  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.format === 'markdown') {
    console.log(renderMarkdown(report));
  } else {
    console.log(renderMarkdown(report));
    console.log('\n--- JSON ---\n');
    console.log(JSON.stringify(report, null, 2));
  }

  if (report.status === 'FAILED') {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
