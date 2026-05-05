#!/usr/bin/env node

const now = new Date();
const generatedAt = now.toISOString();
const runDate = generatedAt.slice(0, 10);

const signoffDefinitions = [
  {
    id: 'HR',
    label: 'Responsable RH',
    decisionEnv: 'PROD_SIGNOFF_HR',
    ownerEnv: 'PROD_SIGNOFF_HR_OWNER',
    dateEnv: 'PROD_SIGNOFF_HR_DATE',
    reasonEnv: 'PROD_SIGNOFF_HR_REASON',
    legacyDecisionEnv: 'PROD_SIGNOFF_RH',
    legacyOwnerEnv: 'PROD_SIGNOFF_RH_OWNER',
    legacyDateEnv: 'PROD_SIGNOFF_RH_DATE',
    legacyReasonEnv: 'PROD_SIGNOFF_RH_REASON',
    expectedOwner: 'Responsable RH nomme pour le pilote',
    signs: 'Validation metier RH du perimetre production.',
    expectedEvidence:
      'PV de recette RH, liste des ecarts acceptes, confirmation du support utilisateurs.',
  },
  {
    id: 'SECURITY',
    label: 'Referent securite',
    decisionEnv: 'PROD_SIGNOFF_SECURITY',
    ownerEnv: 'PROD_SIGNOFF_SECURITY_OWNER',
    dateEnv: 'PROD_SIGNOFF_SECURITY_DATE',
    reasonEnv: 'PROD_SIGNOFF_SECURITY_REASON',
    expectedOwner: 'Referent securite / RSSI delegue',
    signs: 'Validation securite, acces, dependances et risques residuels.',
    expectedEvidence:
      'Revue dependances, revue secrets/acces, journal des risques residuels acceptes.',
  },
  {
    id: 'OPERATIONS',
    label: 'Responsable exploitation',
    decisionEnv: 'PROD_SIGNOFF_OPERATIONS',
    ownerEnv: 'PROD_SIGNOFF_OPERATIONS_OWNER',
    dateEnv: 'PROD_SIGNOFF_OPERATIONS_DATE',
    reasonEnv: 'PROD_SIGNOFF_OPERATIONS_REASON',
    legacyDecisionEnv: 'PROD_SIGNOFF_EXPLOITATION',
    legacyOwnerEnv: 'PROD_SIGNOFF_EXPLOITATION_OWNER',
    legacyDateEnv: 'PROD_SIGNOFF_EXPLOITATION_DATE',
    legacyReasonEnv: 'PROD_SIGNOFF_EXPLOITATION_REASON',
    expectedOwner: 'Responsable exploitation / run',
    signs: 'Validation run, supervision, sauvegardes et procedure rollback.',
    expectedEvidence:
      'Checklist exploitation, preuve backup/restore, procedure rollback, astreinte identifiee.',
  },
  {
    id: 'TECHNICAL',
    label: 'Responsable technique',
    decisionEnv: 'PROD_SIGNOFF_TECHNICAL',
    ownerEnv: 'PROD_SIGNOFF_TECHNICAL_OWNER',
    dateEnv: 'PROD_SIGNOFF_TECHNICAL_DATE',
    reasonEnv: 'PROD_SIGNOFF_TECHNICAL_REASON',
    legacyDecisionEnv: 'PROD_SIGNOFF_MANAGER',
    legacyOwnerEnv: 'PROD_SIGNOFF_MANAGER_OWNER',
    legacyDateEnv: 'PROD_SIGNOFF_MANAGER_DATE',
    legacyReasonEnv: 'PROD_SIGNOFF_MANAGER_REASON',
    expectedOwner: 'Responsable technique / lead applicatif',
    signs:
      'Validation technique du runbook, des gates et de la fenetre de bascule.',
    expectedEvidence:
      'Compte rendu technique, plan de bascule, acceptation des impacts connus.',
  },
  {
    id: 'DIRECTION',
    label: 'Direction / sponsor metier',
    decisionEnv: 'PROD_SIGNOFF_DIRECTION',
    ownerEnv: 'PROD_SIGNOFF_DIRECTION_OWNER',
    dateEnv: 'PROD_SIGNOFF_DIRECTION_DATE',
    reasonEnv: 'PROD_SIGNOFF_DIRECTION_REASON',
    expectedOwner: 'Direction ou sponsor metier',
    signs:
      'Arbitrage final GO/NO-GO et acceptation du risque de mise en production.',
    expectedEvidence:
      'Decision sponsor datee, fenetre de lancement approuvee, criteres de retour arriere valides.',
  },
];

const validFormats = new Set(['markdown', 'json', 'both']);

function parseArgs(argv) {
  const options = {
    format: 'both',
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
      if (!validFormats.has(format)) {
        throw new Error('--format must be markdown, json, or both');
      }
      options.format = format;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan Sprint 20 Phase 3 production signoff matrix

Usage:
  node scripts/production-signoff-matrix.mjs [--format markdown|json|both]

This script is non destructive. It only reads production signoff environment
variables and prints a formal Markdown and/or JSON matrix.

Required GO variables:
  PROD_SIGNOFF_HR=GO
  PROD_SIGNOFF_SECURITY=GO
  PROD_SIGNOFF_OPERATIONS=GO
  PROD_SIGNOFF_TECHNICAL=GO
  PROD_SIGNOFF_DIRECTION=GO

Optional metadata per role:
  PROD_SIGNOFF_<ROLE>_OWNER
  PROD_SIGNOFF_<ROLE>_DATE
  PROD_SIGNOFF_<ROLE>_REASON
`);
}

const normalize = (value) => String(value || '').trim();
const normalizeDecision = (value) => normalize(value).toUpperCase();
const readEnv = (env, primaryKey, legacyKey) =>
  normalize(env[primaryKey]) || normalize(env[legacyKey]);

function collectSignoffs(env) {
  return signoffDefinitions.map((definition) => {
    const decision = normalizeDecision(
      readEnv(env, definition.decisionEnv, definition.legacyDecisionEnv),
    );
    const owner =
      readEnv(env, definition.ownerEnv, definition.legacyOwnerEnv) ||
      definition.expectedOwner;
    const signedAt =
      readEnv(env, definition.dateEnv, definition.legacyDateEnv) || null;
    const reason =
      readEnv(env, definition.reasonEnv, definition.legacyReasonEnv) || null;
    const ok = decision === 'GO';

    return {
      id: definition.id,
      label: definition.label,
      decisionEnv: definition.decisionEnv,
      ownerEnv: definition.ownerEnv,
      dateEnv: definition.dateEnv,
      reasonEnv: definition.reasonEnv,
      legacyDecisionEnv: definition.legacyDecisionEnv,
      expectedOwner: definition.expectedOwner,
      owner,
      signedAt,
      decision: decision || 'MISSING',
      ok,
      reason,
      signs: definition.signs,
      expectedEvidence: definition.expectedEvidence,
      note: ok
        ? 'GO explicite fourni.'
        : `${definition.decisionEnv}=GO requis avant SIGNOFF_READY.`,
    };
  });
}

function buildMatrix(env = process.env) {
  const signoffs = collectSignoffs(env);
  const noGoReasons = signoffs
    .filter((signoff) => !signoff.ok)
    .map((signoff) => {
      const suffix = signoff.reason ? `: ${signoff.reason}` : '';
      return `${signoff.label} (${signoff.decisionEnv}) is ${signoff.decision}${suffix}`;
    });

  return {
    generatedAt,
    runDate,
    decision: noGoReasons.length === 0 ? 'SIGNOFF_READY' : 'SIGNOFF_NO_GO',
    noGoReasons,
    signoffs,
    safeguards: [
      'No deployment.',
      'No tag creation.',
      'No push.',
      'No package version mutation.',
      'No migration, seed, backup restore, Docker, API, or database mutation.',
      'SIGNOFF_READY requires all five PROD_SIGNOFF_* values to be GO.',
    ],
  };
}

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

function renderMarkdown(matrix) {
  const lines = [
    '# Sprint 20 Phase 3 - Production Signoff Matrix',
    '',
    `Generated: ${matrix.generatedAt}`,
    `Decision: \`${matrix.decision}\``,
    '',
    '## Signoffs',
    '',
    '| Role | Signs | Owner | Env | Decision | Date | Reason / note | Expected evidence |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...matrix.signoffs.map(
      (signoff) =>
        `| ${escapeMarkdownCell(signoff.label)} | ${escapeMarkdownCell(
          signoff.signs,
        )} | ${escapeMarkdownCell(signoff.owner)} | \`${signoff.decisionEnv}\` | ${
          signoff.decision
        } | ${escapeMarkdownCell(signoff.signedAt)} | ${escapeMarkdownCell(
          signoff.reason || signoff.note,
        )} | ${escapeMarkdownCell(signoff.expectedEvidence)} |`,
    ),
    '',
    '## Optional metadata env',
    '',
    '| Role | Owner env | Date env | Reason env |',
    '| --- | --- | --- | --- |',
    ...matrix.signoffs.map(
      (signoff) =>
        `| ${escapeMarkdownCell(signoff.label)} | \`${signoff.ownerEnv}\` | \`${signoff.dateEnv}\` | \`${signoff.reasonEnv}\` |`,
    ),
    '',
    '## No-go reasons',
    '',
    ...(matrix.noGoReasons.length
      ? matrix.noGoReasons.map((reason) => `- ${reason}`)
      : ['- None.']),
    '',
    '## Safeguards',
    '',
    ...matrix.safeguards.map((item) => `- ${item}`),
  ];

  return lines.join('\n');
}

function printOutput(matrix, format) {
  if (format === 'markdown') {
    console.log(renderMarkdown(matrix));
    return;
  }
  if (format === 'json') {
    console.log(JSON.stringify(matrix, null, 2));
    return;
  }
  console.log(renderMarkdown(matrix));
  console.log('');
  console.log('## JSON');
  console.log('');
  console.log('```json');
  console.log(JSON.stringify(matrix, null, 2));
  console.log('```');
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    printOutput(buildMatrix(), options.format);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
