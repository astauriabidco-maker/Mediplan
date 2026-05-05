#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const now = new Date();
const runDate = now.toISOString().slice(0, 10);
const generatedAt = now.toISOString();

const roles = [
  {
    id: 'rh',
    label: 'Responsable RH',
    decisionEnv: 'PROD_SIGNOFF_RH',
    ownerEnv: 'PROD_SIGNOFF_RH_OWNER',
    dateEnv: 'PROD_SIGNOFF_RH_DATE',
    reasonEnv: 'PROD_SIGNOFF_RH_REASON',
    evidenceEnv: 'PROD_SIGNOFF_RH_EVIDENCE',
    expectedEvidence:
      'PV de recette RH, liste des ecarts acceptes, confirmation du support utilisateurs.',
  },
  {
    id: 'manager',
    label: 'Manager pilote',
    decisionEnv: 'PROD_SIGNOFF_MANAGER',
    ownerEnv: 'PROD_SIGNOFF_MANAGER_OWNER',
    dateEnv: 'PROD_SIGNOFF_MANAGER_DATE',
    reasonEnv: 'PROD_SIGNOFF_MANAGER_REASON',
    evidenceEnv: 'PROD_SIGNOFF_MANAGER_EVIDENCE',
    expectedEvidence:
      'Compte rendu pilote, plan de communication equipe, acceptation des impacts connus.',
  },
  {
    id: 'exploitation',
    label: 'Responsable exploitation',
    decisionEnv: 'PROD_SIGNOFF_EXPLOITATION',
    ownerEnv: 'PROD_SIGNOFF_EXPLOITATION_OWNER',
    dateEnv: 'PROD_SIGNOFF_EXPLOITATION_DATE',
    reasonEnv: 'PROD_SIGNOFF_EXPLOITATION_REASON',
    evidenceEnv: 'PROD_SIGNOFF_EXPLOITATION_EVIDENCE',
    expectedEvidence:
      'Checklist exploitation, preuve backup/restore, procedure rollback, astreinte identifiee.',
  },
  {
    id: 'security',
    label: 'Referent securite',
    decisionEnv: 'PROD_SIGNOFF_SECURITY',
    ownerEnv: 'PROD_SIGNOFF_SECURITY_OWNER',
    dateEnv: 'PROD_SIGNOFF_SECURITY_DATE',
    reasonEnv: 'PROD_SIGNOFF_SECURITY_REASON',
    evidenceEnv: 'PROD_SIGNOFF_SECURITY_EVIDENCE',
    expectedEvidence:
      'Revue dependances, revue secrets/acces, journal des risques residuels acceptes.',
  },
  {
    id: 'direction',
    label: 'Direction / sponsor metier',
    decisionEnv: 'PROD_SIGNOFF_DIRECTION',
    ownerEnv: 'PROD_SIGNOFF_DIRECTION_OWNER',
    dateEnv: 'PROD_SIGNOFF_DIRECTION_DATE',
    reasonEnv: 'PROD_SIGNOFF_DIRECTION_REASON',
    evidenceEnv: 'PROD_SIGNOFF_DIRECTION_EVIDENCE',
    expectedEvidence:
      'Decision sponsor datee, fenetre de lancement approuvee, criteres de retour arriere valides.',
  },
];

const gates = [
  ['PROD_GATE_CI_PRODUCT', 'CI produit complete'],
  ['PROD_GATE_FRONTEND_BUDGET', 'Budget frontend'],
  ['PROD_GATE_AUDITS', 'Audits securite/dependances'],
  ['PROD_GATE_PREPROD_GO_NO_GO', 'Preprod go/no-go'],
  ['PROD_GATE_OPS_READINESS', 'Ops readiness'],
  ['PROD_GATE_BACKUP_RESTORE_RECENT', 'Backup/restore recent'],
  ['PROD_GATE_BACKUP_RESTORE', 'Backup/restore accepte par production readiness'],
  ['PROD_GATE_SECURITY_AUDIT', 'Audit securite accepte par production readiness'],
  ['PROD_GATE_ROLLBACK', 'Rollback accepte par production readiness'],
];

function parseArgs(argv) {
  const options = {
    reportDir: process.env.REPORT_DIR || 'preprod-reports',
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

    if (arg === '--report-dir') {
      options.reportDir = readValue();
    } else if (arg === '--format') {
      const format = readValue();
      if (!['markdown', 'json', 'both'].includes(format)) {
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
  console.log(`Mediplan production decision evidence pack

Usage:
  node scripts/production-decision-evidence-pack.mjs [--report-dir preprod-reports] [--format markdown|json|both]

The script is non destructive. It creates a Markdown/JSON ticket template for
real production signoffs and evidence attachment. It never deploys, tags,
pushes, migrates, seeds, restores backups or mutates data.
`);
}

const value = (key) => String(process.env[key] || '').trim();
const decision = (key) => value(key).toUpperCase();
const escapeMarkdownCell = (item) =>
  String(item || '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

function buildPack() {
  const roleRows = roles.map((role) => ({
    ...role,
    decision: decision(role.decisionEnv) || 'MISSING',
    owner: value(role.ownerEnv) || 'A_COMPLETER',
    signedAt: value(role.dateEnv) || 'A_COMPLETER',
    reason: value(role.reasonEnv) || 'A_COMPLETER',
    evidence: value(role.evidenceEnv) || 'A_COMPLETER',
    complete:
      decision(role.decisionEnv) === 'GO' &&
      Boolean(value(role.ownerEnv)) &&
      Boolean(value(role.dateEnv)) &&
      Boolean(value(role.reasonEnv)) &&
      Boolean(value(role.evidenceEnv)),
  }));
  const gateRows = gates.map(([envKey, label]) => ({
    envKey,
    label,
    status: decision(envKey) || 'MISSING',
    complete: decision(envKey) === 'PASSED',
  }));
  const missing = [
    ...roleRows
      .filter((role) => !role.complete)
      .map((role) => `${role.label}: GO, signataire, date, raison et preuve requis`),
    ...gateRows
      .filter((gate) => !gate.complete)
      .map((gate) => `${gate.label}: ${gate.envKey}=PASSED requis`),
  ];

  return {
    generatedAt,
    runDate,
    status: missing.length === 0 ? 'EVIDENCE_READY' : 'EVIDENCE_INCOMPLETE',
    missing,
    signoffs: roleRows,
    gates: gateRows,
    commands: {
      signoffs:
        'PROD_SIGNOFF_RH=GO PROD_SIGNOFF_MANAGER=GO PROD_SIGNOFF_EXPLOITATION=GO PROD_SIGNOFF_SECURITY=GO PROD_SIGNOFF_DIRECTION=GO npm run production:signoffs -- --format json',
      gates:
        'PROD_GATE_CI_PRODUCT=PASSED PROD_GATE_FRONTEND_BUDGET=PASSED PROD_GATE_AUDITS=PASSED PROD_GATE_PREPROD_GO_NO_GO=PASSED PROD_GATE_OPS_READINESS=PASSED PROD_GATE_BACKUP_RESTORE_RECENT=PASSED npm run production:gates -- --format json',
      readiness:
        'PROD_SIGNOFF_RH=GO PROD_SIGNOFF_MANAGER=GO PROD_SIGNOFF_EXPLOITATION=GO PROD_SIGNOFF_SECURITY=GO PROD_SIGNOFF_DIRECTION=GO PROD_GATE_CI_PRODUCT=PASSED PROD_GATE_BACKUP_RESTORE=PASSED PROD_GATE_SECURITY_AUDIT=PASSED PROD_GATE_ROLLBACK=PASSED npm run production:readiness -- --format json',
      finalDecision:
        'PROD_SIGNOFF_RH=GO PROD_SIGNOFF_MANAGER=GO PROD_SIGNOFF_EXPLOITATION=GO PROD_SIGNOFF_SECURITY=GO PROD_SIGNOFF_DIRECTION=GO PROD_GATE_CI_PRODUCT=PASSED PROD_GATE_BACKUP_RESTORE=PASSED PROD_GATE_SECURITY_AUDIT=PASSED PROD_GATE_ROLLBACK=PASSED PROD_GATE_FRONTEND_BUDGET=PASSED PROD_GATE_AUDITS=PASSED PROD_GATE_PREPROD_GO_NO_GO=PASSED PROD_GATE_OPS_READINESS=PASSED PROD_GATE_BACKUP_RESTORE_RECENT=PASSED npm run production:decision -- --decision-dir preprod-reports',
    },
    safeguards: [
      'No deployment.',
      'No tag creation.',
      'No push.',
      'No package version mutation.',
      'No migration, seed, backup restore, Docker, API, or database mutation.',
      'Evidence pack is a ticket template; real names and proofs must be attached before prod.',
    ],
  };
}

function renderMarkdown(pack) {
  const lines = [
    '# Production Decision Evidence Pack',
    '',
    `Generated: ${pack.generatedAt}`,
    `Status: \`${pack.status}\``,
    '',
    '## Signoffs a rattacher',
    '',
    '| Role | Decision | Signataire | Date | Raison | Preuve jointe | Preuve attendue |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...pack.signoffs.map(
      (role) =>
        `| ${escapeMarkdownCell(role.label)} | ${role.decision} | ${escapeMarkdownCell(
          role.owner,
        )} | ${escapeMarkdownCell(role.signedAt)} | ${escapeMarkdownCell(
          role.reason,
        )} | ${escapeMarkdownCell(role.evidence)} | ${escapeMarkdownCell(
          role.expectedEvidence,
        )} |`,
    ),
    '',
    '## Gates a rattacher',
    '',
    '| Gate | Env | Statut |',
    '| --- | --- | --- |',
    ...pack.gates.map(
      (gate) =>
        `| ${escapeMarkdownCell(gate.label)} | \`${gate.envKey}\` | ${gate.status} |`,
    ),
    '',
    '## Champs manquants',
    '',
    ...(pack.missing.length ? pack.missing.map((item) => `- ${item}`) : ['- Aucun.']),
    '',
    '## Commandes de relance',
    '',
    '```bash',
    pack.commands.signoffs,
    '',
    pack.commands.gates,
    '',
    pack.commands.readiness,
    '',
    pack.commands.finalDecision,
    '```',
    '',
    '## Garde-fous',
    '',
    ...pack.safeguards.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    const pack = buildPack();
    await mkdir(options.reportDir, { recursive: true });
    const jsonPath = join(options.reportDir, `production-decision-evidence-pack-${runDate}.json`);
    const mdPath = join(options.reportDir, `production-decision-evidence-pack-${runDate}.md`);
    await writeFile(jsonPath, `${JSON.stringify(pack, null, 2)}\n`);
    await writeFile(mdPath, `${renderMarkdown(pack)}\n`);

    if (options.format === 'json') {
      console.log(JSON.stringify(pack, null, 2));
    } else {
      console.log(renderMarkdown(pack));
    }
  }
} catch (error) {
  console.error(`Production decision evidence pack error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
