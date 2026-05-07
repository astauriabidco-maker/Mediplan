#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);

function parseOptions(argv) {
  const options = {
    workflow: process.env.OP_RUNBOOK_WORKFLOW || 'daily',
    reportDir: process.env.REPORT_DIR || 'preprod-reports',
    environment:
      process.env.OP_RUNBOOK_ENV ||
      process.env.APP_ENV ||
      process.env.NODE_ENV ||
      'preprod',
    tenant: process.env.TENANT_ID || 'HGD-DOUALA',
    incidentId: process.env.INCIDENT_ID || '',
    week: process.env.OP_RUNBOOK_WEEK || '',
    help: false,
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

    if (arg === '--workflow') {
      options.workflow = readValue();
    } else if (arg.startsWith('--workflow=')) {
      options.workflow = arg.slice('--workflow='.length);
    } else if (arg === '--report-dir') {
      options.reportDir = readValue();
    } else if (arg.startsWith('--report-dir=')) {
      options.reportDir = arg.slice('--report-dir='.length);
    } else if (arg === '--env') {
      options.environment = readValue();
    } else if (arg.startsWith('--env=')) {
      options.environment = arg.slice('--env='.length);
    } else if (arg === '--tenant') {
      options.tenant = readValue();
    } else if (arg.startsWith('--tenant=')) {
      options.tenant = arg.slice('--tenant='.length);
    } else if (arg === '--incident-id') {
      options.incidentId = readValue();
    } else if (arg.startsWith('--incident-id=')) {
      options.incidentId = arg.slice('--incident-id='.length);
    } else if (arg === '--week') {
      options.week = readValue();
    } else if (arg.startsWith('--week=')) {
      options.week = arg.slice('--week='.length);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan automated ops runbook

Usage:
  node scripts/ops-runbook-automation.mjs --workflow daily
  node scripts/ops-runbook-automation.mjs --workflow incident --incident-id INC-YYYY-NNN
  node scripts/ops-runbook-automation.mjs --workflow weekly-report --week YYYY-Www

Options:
  --workflow daily|incident|weekly-report
  --report-dir <dir>
  --env <environment>
  --tenant <tenant-id>
  --incident-id <id>
  --week <YYYY-Www>

The script is non destructive. It creates Markdown/JSON runbook packets only.
It never executes operational commands, never mutates Docker, never runs
migrations, never restores backups, and never resets git or data.
`);
}

const owners = {
  support: 'Astreinte niveau 1',
  ops: 'Responsable exploitation',
  techLead: 'Tech lead backend',
  security: 'Referent securite',
  product: 'Responsable metier/RH',
};

const command = (label, value, requiredPath = null) => ({
  label,
  value,
  requiredPath,
  available: requiredPath ? existsSync(requiredPath) : true,
});

const workflows = {
  daily: {
    title: 'Runbook quotidien exploitation',
    cadence: 'Chaque jour ouvre avant ouverture recette ou support',
    owner: owners.support,
    deputy: owners.ops,
    npmScript: 'ops:daily',
    objective:
      'Preparer le paquet de controle quotidien readiness, monitoring, backup exportable et alertes ouvertes.',
    commands: [
      command(
        'Readiness exploitation strict API',
        'ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api',
        'scripts/preprod-ops-readiness.mjs',
      ),
      command(
        'Synthese operationnelle',
        'ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api',
        'scripts/preprod-operational-summary.mjs',
      ),
      command(
        'Smoke API preprod',
        'ENV_FILE=.env.preprod npm run smoke:api:preprod',
        'scripts/preprod-api-smoke.mjs',
      ),
    ],
    checklist: [
      'Ouvrir le ticket exploitation du jour',
      'Joindre readiness Markdown/JSON',
      'Joindre operational summary Markdown/JSON',
      'Verifier API live/ready, audit chain, backup exportable et alertes HIGH',
      'Assigner toute anomalie HIGH ou NO-GO avant la fenetre de correction',
      'Annoncer la decision READY/NO-GO dans le canal exploitation',
    ],
    evidence: [
      'preprod-ops-readiness-YYYY-MM-DD.md',
      'preprod-operational-summary-YYYY-MM-DD.md',
      'Lien ticket exploitation quotidien',
    ],
    blockers: [
      'Endpoint health non 2xx',
      'Audit chain invalide',
      'Backup exportable=false',
      'Alerte HIGH ouverte non assignee',
    ],
  },
  incident: {
    title: 'Runbook incident automatise',
    cadence: 'A chaque incident, NO-GO ou alerte HIGH non resolue',
    owner: owners.ops,
    deputy: owners.techLead,
    npmScript: 'ops:incident',
    objective:
      'Structurer la qualification, la stabilisation, les preuves avant/apres et la decision de sortie incident.',
    commands: [
      command(
        'Incident drill dry-run',
        'ENV_FILE=.env.preprod INCIDENT_DRY_RUN=true node scripts/preprod-incident-drill.mjs --dry-run',
        'scripts/preprod-incident-drill.mjs',
      ),
      command(
        'Synthese avant/apres incident',
        'ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api',
        'scripts/preprod-operational-summary.mjs',
      ),
      command(
        'Readiness de sortie incident',
        'ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api',
        'scripts/preprod-ops-readiness.mjs',
      ),
    ],
    checklist: [
      'Nommer un incident commander et un scribe',
      'Geler publications planning, imports backup et corrections non urgentes',
      'Qualifier impact utilisateur, tenant et fenetre temporelle',
      'Collecter preuves avant correction',
      'Documenter cause probable, mitigation et owner de correction',
      'Relancer readiness, summary et smoke API apres correction',
      'Clore uniquement avec decision READY ou NO-GO acceptee',
    ],
    evidence: [
      'Incident ID et chronologie horodatee',
      'Rapports avant correction',
      'Rapports apres correction',
      'Actions preventives assignees',
    ],
    blockers: [
      'Cause inconnue sans mitigation explicite',
      'Correction non verifiee par readiness ou summary',
      'Action preventive sans owner',
      'Impact RH/metier non arbitre',
    ],
  },
  'weekly-report': {
    title: 'Rapport hebdomadaire exploitation',
    cadence: 'Hebdomadaire, avant comite exploitation ou release',
    owner: owners.ops,
    deputy: owners.product,
    npmScript: 'ops:weekly-report',
    objective:
      'Assembler les signaux hebdomadaires: readiness, incidents, backup/restore, rotations et risques residuels.',
    commands: [
      command(
        'Planning routines operationnelles',
        'node scripts/ops-routine-scheduler.mjs --dry-run',
        'scripts/ops-routine-scheduler.mjs',
      ),
      command(
        'Restore drill hebdomadaire controle',
        'ENV_FILE=.env.preprod node scripts/preprod-backup-restore.mjs',
        'scripts/preprod-backup-restore.mjs',
      ),
      command(
        'Synthese operationnelle de cloture',
        'ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api',
        'scripts/preprod-operational-summary.mjs',
      ),
    ],
    checklist: [
      'Lister decisions READY/NO-GO de la semaine',
      'Consolider incidents, causes, delais et actions preventives',
      'Verifier presence du restore drill ou justification de report',
      'Verifier rotation secrets/env si echeance mensuelle ou trimestrielle',
      'Identifier risques ouverts et owners',
      'Publier le rapport dans le canal exploitation et ticket release si applicable',
    ],
    evidence: [
      'ops-routine-scheduler-YYYY-MM-DD.md',
      'preprod-backup-restore-YYYY-MM-DD.md',
      'preprod-operational-summary-YYYY-MM-DD.md',
      'Liste incidents et actions preventives',
    ],
    blockers: [
      'Restore drill absent sans justification',
      'Incident critique sans post-mortem',
      'Risque HIGH sans owner ou date cible',
      'Decision release dependante de preuves manquantes',
    ],
  },
};

const dangerousCommandPatterns = [
  /\bdocker\s+compose\b.*\b(up|down|run|exec|build)\b/i,
  /\brm\s+-rf\b/i,
  /\bgit\s+(reset|checkout|clean)\b/i,
  /\bmigration:run\b/i,
  /\bmigration:revert\b/i,
  /\bseed:demo\b/i,
];

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function buildPacket(options) {
  const workflow = workflows[options.workflow];
  if (!workflow) {
    throw new Error(
      `Unknown workflow "${options.workflow}". Expected: ${Object.keys(workflows).join(', ')}`,
    );
  }

  const now = new Date();
  const runDate = now.toISOString().slice(0, 10);
  const generatedAt = now.toISOString();
  const unavailableCommands = workflow.commands.filter(
    (item) => !item.available,
  );
  const dangerousCommands = workflow.commands.filter((item) =>
    dangerousCommandPatterns.some((pattern) => pattern.test(item.value)),
  );
  const blockingReasons = [
    ...unavailableCommands.map(
      (item) =>
        `Commande indisponible: ${item.label} (${item.requiredPath})`,
    ),
    ...dangerousCommands.map(
      (item) => `Commande hors politique non destructive: ${item.label}`,
    ),
  ];
  const status = blockingReasons.length === 0 ? 'READY' : 'NO-GO';

  return {
    status,
    generatedAt,
    runDate,
    workflow: options.workflow,
    title: workflow.title,
    cadence: workflow.cadence,
    owner: workflow.owner,
    deputy: workflow.deputy,
    npmScript: workflow.npmScript,
    objective: workflow.objective,
    environment: options.environment,
    tenant: options.tenant,
    incidentId: options.incidentId || 'A_COMPLETER',
    week: options.week || 'A_COMPLETER',
    nonDestructive: true,
    policy: {
      commandsExecuted: false,
      writesReportsOnly: true,
      dockerMutated: false,
      migrationsRun: false,
      backupsRestored: false,
      gitMutated: false,
    },
    commands: workflow.commands,
    checklist: workflow.checklist,
    evidence: workflow.evidence,
    blockers: workflow.blockers,
    blockingReasons,
  };
}

function renderMarkdown(packet) {
  const lines = [
    `# ${packet.title}`,
    '',
    `- Statut: ${packet.status}`,
    `- Workflow: ${packet.workflow}`,
    `- Script npm: ${packet.npmScript}`,
    `- Environnement: ${packet.environment}`,
    `- Tenant: ${packet.tenant}`,
    `- Incident: ${packet.incidentId}`,
    `- Semaine: ${packet.week}`,
    `- Genere: ${packet.generatedAt}`,
    '- Non destructif: oui, aucune commande operationnelle executee',
    '',
    '## Objectif',
    '',
    packet.objective,
    '',
    '## Commandes a executer manuellement',
    '',
    '| Controle | Commande | Disponible |',
    '| --- | --- | --- |',
    ...packet.commands.map(
      (item) =>
        `| ${escapeMarkdownCell(item.label)} | \`${escapeMarkdownCell(
          item.value,
        )}\` | ${item.available ? 'oui' : 'non'} |`,
    ),
    '',
    '## Checklist',
    '',
    ...packet.checklist.map((item) => `- [ ] ${item}`),
    '',
    '## Preuves attendues',
    '',
    ...packet.evidence.map((item) => `- ${item}`),
    '',
    '## Criteres NO-GO',
    '',
    ...packet.blockers.map((item) => `- ${item}`),
    '',
    '## Garde-fous automatisation',
    '',
    '- Le script genere uniquement ce paquet Markdown/JSON.',
    '- Les commandes listees restent des preuves a lancer manuellement par le responsable operationnel.',
    '- Aucun deploy, migration, seed, restore, mutation Docker ou reset git.',
    '- Aucun secret, token ou fichier env ne doit etre copie dans le rapport.',
    '',
    '## Decision',
    '',
    `Decision: ${packet.status}`,
    '',
    ...(packet.blockingReasons.length
      ? [
          'Raisons bloquantes:',
          '',
          ...packet.blockingReasons.map((reason) => `- ${reason}`),
        ]
      : ['Aucune raison bloquante detectee dans la definition du runbook.']),
    '',
  ];

  return lines.join('\n');
}

async function writePacket(options, packet, markdown) {
  await mkdir(options.reportDir, { recursive: true });
  const fileBase = `ops-${slug(packet.workflow)}-${packet.runDate}`;
  const markdownPath = join(options.reportDir, `${fileBase}.md`);
  const jsonPath = join(options.reportDir, `${fileBase}.json`);

  await writeFile(markdownPath, markdown);
  await writeFile(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);

  return { markdownPath, jsonPath };
}

try {
  const options = parseOptions(args);

  if (options.help) {
    printHelp();
  } else {
    const packet = buildPacket(options);
    const markdown = renderMarkdown(packet);
    const paths = await writePacket(options, packet, markdown);

    console.log(markdown);
    console.log(`\nRapports generes:\n- ${paths.markdownPath}\n- ${paths.jsonPath}`);

    if (packet.status !== 'READY') {
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`Ops runbook automation error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
