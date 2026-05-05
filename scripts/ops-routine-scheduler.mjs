#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));

const valueAfter = (name, fallback) => {
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }

  return fallback;
};

const now = new Date();
const runDate = valueAfter('--date', now.toISOString().slice(0, 10));
const reportDir = valueAfter(
  '--report-dir',
  process.env.REPORT_DIR || 'preprod-reports',
);
const environment =
  valueAfter('--env', process.env.OP_ROUTINE_ENV) ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'preprod';
const tenantId = valueAfter('--tenant', process.env.TENANT_ID || 'HGD-DOUALA');
const mode = flags.has('--mock')
  ? 'mock'
  : flags.has('--dry-run')
    ? 'dry-run'
    : 'plan';

const owners = {
  ops: 'Responsable exploitation',
  techLead: 'Tech lead backend',
  devops: 'Referent plateforme/DevOps',
  security: 'Referent securite',
  support: 'Astreinte niveau 1',
  product: 'Responsable metier/RH',
};

const command = (label, value, requiredPath = null) => ({
  label,
  value,
  requiredPath,
  available: requiredPath ? existsSync(requiredPath) : true,
});

const routines = [
  {
    id: 'backup-daily',
    title: 'Backup logique tenant',
    category: 'backups',
    frequency: 'Quotidien, avant la fenetre de correction planning',
    owner: owners.ops,
    deputy: owners.techLead,
    window: '08:00-09:00 Europe/Paris',
    statusCriteria: [
      'Export tenant disponible',
      'Compteurs agents/services/shifts/leaves/audit logs presents',
      'Rapport Markdown et JSON attaches au ticket du jour',
    ],
    commands: [
      command(
        'Synthese operationnelle avec verification backup',
        'ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api',
        'scripts/preprod-operational-summary.mjs',
      ),
      command(
        'Readiness preprod',
        'ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api',
        'scripts/preprod-ops-readiness.mjs',
      ),
    ],
    evidence: [
      'preprod-operational-summary-YYYY-MM-DD.md',
      'preprod-operational-summary-YYYY-MM-DD.json',
      'Ticket exploitation quotidien',
    ],
    noGo: [
      'Backup exportable=false',
      'Chaine audit invalide',
      'Endpoint readiness non joignable en mode strict-api',
    ],
  },
  {
    id: 'restore-drill-weekly',
    title: 'Restore drill controle',
    category: 'restore drill',
    frequency: 'Hebdomadaire, hors recette active',
    owner: owners.techLead,
    deputy: owners.ops,
    window: 'Mardi 14:00-15:00 Europe/Paris',
    statusCriteria: [
      'Snapshot exporte puis importe sur environnement autorise',
      'Compteurs avant/snapshot/apres identiques',
      'Audit verify valide apres drill',
    ],
    commands: [
      command(
        'Drill backup/restauration',
        'ENV_FILE=.env.preprod node scripts/preprod-backup-restore.mjs',
        'scripts/preprod-backup-restore.mjs',
      ),
    ],
    evidence: [
      'preprod-backup-restore-YYYY-MM-DD.md',
      'preprod-backup-restore-YYYY-MM-DD.json',
      'Validation RH/exploitation si donnees de recette actives',
    ],
    noGo: [
      'Recette active sans validation explicite',
      'Difference de compteurs sur datasets critiques',
      'Audit verify invalide',
    ],
  },
  {
    id: 'monitoring-health-daily',
    title: 'Monitoring health et alertes',
    category: 'monitoring health',
    frequency: 'Deux fois par jour pendant recette, puis quotidien',
    owner: owners.support,
    deputy: owners.ops,
    window: '09:30 et 16:30 Europe/Paris',
    statusCriteria: [
      'Liveness/readiness HTTP 2xx',
      'Observability planning non CRITICAL',
      'Aucune alerte HIGH ouverte hors correction suivie',
    ],
    commands: [
      command(
        'Readiness strict API',
        'ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api',
        'scripts/preprod-ops-readiness.mjs',
      ),
      command(
        'Smoke API preprod',
        'ENV_FILE=.env.preprod npm run smoke:api:preprod',
        'scripts/preprod-api-smoke.mjs',
      ),
      command(
        'Synthese operationnelle',
        'ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api',
        'scripts/preprod-operational-summary.mjs',
      ),
    ],
    evidence: [
      'preprod-ops-readiness-YYYY-MM-DD.md',
      'preprod-operational-summary-YYYY-MM-DD.md',
      'Capture du tableau de suivi alertes si HIGH',
    ],
    noGo: [
      'API live/ready KO',
      'Planning observability CRITICAL',
      'Alertes HIGH non assignees',
    ],
  },
  {
    id: 'secrets-env-rotation',
    title: 'Rotation secrets et revue env',
    category: 'rotation secrets/env',
    frequency: 'Mensuel pour tokens smoke, trimestriel pour secrets critiques',
    owner: owners.security,
    deputy: owners.devops,
    window: 'Fenetre de maintenance validee',
    statusCriteria: [
      'Nouveaux secrets generes hors depot',
      'Anciennes valeurs revoquees apres verification',
      'Readiness et smoke API relances apres rotation',
    ],
    commands: [
      command(
        'Controle env non secret',
        'ENV_FILE=.env.preprod node scripts/preprod-env-check.mjs',
        'scripts/preprod-env-check.mjs',
      ),
      command(
        'Readiness post-rotation',
        'ENV_FILE=.env.preprod node scripts/preprod-ops-readiness.mjs --strict-api',
        'scripts/preprod-ops-readiness.mjs',
      ),
    ],
    evidence: [
      'Ticket rotation avec horodatage',
      'Nom du coffre/env manager modifie, jamais la valeur du secret',
      'Rapports readiness/smoke post-rotation',
    ],
    noGo: [
      'Secret present dans git ou rapport',
      'JWT_SECRET absent ou trop court',
      'Smoke authentifie KO apres rotation',
    ],
  },
  {
    id: 'incident-review',
    title: 'Incident review et apprentissage',
    category: 'incident review',
    frequency: 'Sous 2 jours ouvres apres incident ou NO-GO',
    owner: owners.ops,
    deputy: owners.product,
    window: 'Revue 30 minutes apres stabilisation',
    statusCriteria: [
      'Chronologie, impact, cause et correction consignes',
      'Actions de prevention assignees',
      'Decision finale READY/NO-GO documentee',
    ],
    commands: [
      command(
        'Drill incident non destructif',
        'ENV_FILE=.env.preprod INCIDENT_DRY_RUN=true node scripts/preprod-incident-drill.mjs --dry-run',
        'scripts/preprod-incident-drill.mjs',
      ),
      command(
        'Synthese de sortie incident',
        'ENV_FILE=.env.preprod node scripts/preprod-operational-summary.mjs --strict-api',
        'scripts/preprod-operational-summary.mjs',
      ),
    ],
    evidence: [
      'Rapport incident drill dry-run',
      'Rapports Markdown/JSON avant et apres correction',
      'Compte-rendu incident review avec owner/date/action',
    ],
    noGo: [
      'Cause inconnue sans mitigation acceptee',
      'Action corrective non assignee',
      'Preuves avant/apres manquantes',
    ],
  },
];

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const unavailableCommands = routines.flatMap((routine) =>
  routine.commands
    .filter((item) => !item.available)
    .map((item) => ({
      routineId: routine.id,
      routineTitle: routine.title,
      command: item.label,
      requiredPath: item.requiredPath,
    })),
);
const dangerousCommandPatterns = [
  /\bdocker\s+compose\b.*\b(up|down|run|exec|build)\b/i,
  /\brm\s+-rf\b/i,
  /\bgit\s+(reset|checkout)\b/i,
  /\bmigration:run\b/i,
  /\bmigration:revert\b/i,
];
const dangerousCommands = routines.flatMap((routine) =>
  routine.commands
    .filter((item) =>
      dangerousCommandPatterns.some((pattern) => pattern.test(item.value)),
    )
    .map((item) => ({
      routineId: routine.id,
      routineTitle: routine.title,
      command: item.label,
      value: item.value,
    })),
);
const blockingReasons = [
  ...unavailableCommands.map(
    (item) =>
      `${item.routineId}: commande indisponible (${item.requiredPath}) pour ${item.command}`,
  ),
  ...dangerousCommands.map(
    (item) =>
      `${item.routineId}: commande hors politique non destructive (${item.command})`,
  ),
];
const status = blockingReasons.length === 0 ? 'READY' : 'NO-GO';
const generatedAt = now.toISOString();

const checklist = routines.map((routine) => ({
  id: routine.id,
  title: routine.title,
  category: routine.category,
  frequency: routine.frequency,
  owner: routine.owner,
  deputy: routine.deputy,
  window: routine.window,
  status: routine.commands.every((item) => item.available) ? 'READY' : 'NO-GO',
  checklist: [
    'Ticket ou canal de suivi ouvert',
    ...routine.statusCriteria,
    'Preuves Markdown/JSON archivees',
    'Decision READY/NO-GO annoncee',
  ],
  commands: routine.commands,
  evidence: routine.evidence,
  noGo: routine.noGo,
}));

const report = {
  status,
  generatedAt,
  runDate,
  mode,
  environment,
  tenantId,
  nonDestructive: true,
  policy: {
    cronCreated: false,
    dockerMutated: false,
    destructiveReset: false,
    commandsExecuted: false,
    writesReportsOnly: true,
  },
  onCall: {
    primary: owners.support,
    secondary: owners.ops,
    escalationOrder: [
      owners.support,
      owners.ops,
      owners.techLead,
      owners.devops,
      owners.security,
      owners.product,
    ],
    responseTargets: {
      critical: '15 minutes',
      high: '30 minutes',
      medium: '1 jour ouvre',
    },
  },
  checklist,
  blockingReasons,
};

const markdown = [
  `# Planning routines operationnelles Sprint 17 - ${runDate}`,
  '',
  `- Statut: ${status}`,
  `- Mode: ${mode}`,
  `- Environnement: ${environment}`,
  `- Tenant: ${tenantId}`,
  `- Genere: ${generatedAt}`,
  '- Non destructif: oui, aucune commande metier executee, aucun cron cree, aucune mutation Docker, aucun reset',
  '',
  '## Planning et checklist',
  '',
  '| Routine | Frequence | Owner | Fenetre | Statut | Commandes |',
  '| --- | --- | --- | --- | --- | --- |',
  ...checklist.map(
    (routine) =>
      `| ${escapeMarkdownCell(routine.title)} | ${escapeMarkdownCell(
        routine.frequency,
      )} | ${escapeMarkdownCell(routine.owner)} | ${escapeMarkdownCell(
        routine.window,
      )} | ${routine.status} | ${escapeMarkdownCell(
        routine.commands.map((item) => item.value).join(' ; '),
      )} |`,
  ),
  '',
  ...checklist.flatMap((routine) => [
    `### ${routine.title}`,
    '',
    `- Statut: ${routine.status}`,
    `- Categorie: ${routine.category}`,
    `- Owner: ${routine.owner}`,
    `- Backup: ${routine.deputy}`,
    '',
    'Checklist:',
    '',
    ...routine.checklist.map((item) => `- [ ] ${item}`),
    '',
    'Preuves attendues:',
    '',
    ...routine.evidence.map((item) => `- ${item}`),
    '',
    'Criteres NO-GO:',
    '',
    ...routine.noGo.map((item) => `- ${item}`),
    '',
  ]),
  '## Astreinte et escalade',
  '',
  `- Niveau 1: ${report.onCall.primary}`,
  `- Niveau 2: ${report.onCall.secondary}`,
  `- Escalade: ${report.onCall.escalationOrder.join(' -> ')}`,
  `- SLA critique: ${report.onCall.responseTargets.critical}`,
  `- SLA high: ${report.onCall.responseTargets.high}`,
  `- SLA medium: ${report.onCall.responseTargets.medium}`,
  '',
  '## Decision READY/NO-GO',
  '',
  `Decision: ${status}`,
  '',
  ...(blockingReasons.length
    ? ['Raisons bloquantes:', '', ...blockingReasons.map((reason) => `- ${reason}`)]
    : ['Aucune raison bloquante detectee.']),
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
const jsonPath = join(reportDir, `ops-routine-scheduler-${runDate}.json`);
const markdownPath = join(reportDir, `ops-routine-scheduler-${runDate}.md`);

await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, markdown);

console.log(markdown);
console.log(`\nRapports generes:\n- ${markdownPath}\n- ${jsonPath}`);

if (status !== 'READY') {
  process.exitCode = 1;
}
