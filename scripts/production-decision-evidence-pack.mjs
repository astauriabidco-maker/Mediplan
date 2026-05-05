#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const now = new Date();
const runDate = now.toISOString().slice(0, 10);
const generatedAt = now.toISOString();

const roles = [
  {
    id: 'HR',
    label: 'Responsable RH',
    decisionEnv: 'PROD_SIGNOFF_HR',
    ownerEnv: 'PROD_SIGNOFF_HR_OWNER',
    dateEnv: 'PROD_SIGNOFF_HR_DATE',
    reasonEnv: 'PROD_SIGNOFF_HR_REASON',
    evidenceEnv: 'PROD_SIGNOFF_HR_EVIDENCE',
    legacyDecisionEnv: 'PROD_SIGNOFF_RH',
    legacyOwnerEnv: 'PROD_SIGNOFF_RH_OWNER',
    legacyDateEnv: 'PROD_SIGNOFF_RH_DATE',
    legacyReasonEnv: 'PROD_SIGNOFF_RH_REASON',
    legacyEvidenceEnv: 'PROD_SIGNOFF_RH_EVIDENCE',
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
    evidenceEnv: 'PROD_SIGNOFF_SECURITY_EVIDENCE',
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
    evidenceEnv: 'PROD_SIGNOFF_OPERATIONS_EVIDENCE',
    legacyDecisionEnv: 'PROD_SIGNOFF_EXPLOITATION',
    legacyOwnerEnv: 'PROD_SIGNOFF_EXPLOITATION_OWNER',
    legacyDateEnv: 'PROD_SIGNOFF_EXPLOITATION_DATE',
    legacyReasonEnv: 'PROD_SIGNOFF_EXPLOITATION_REASON',
    legacyEvidenceEnv: 'PROD_SIGNOFF_EXPLOITATION_EVIDENCE',
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
    evidenceEnv: 'PROD_SIGNOFF_TECHNICAL_EVIDENCE',
    legacyDecisionEnv: 'PROD_SIGNOFF_MANAGER',
    legacyOwnerEnv: 'PROD_SIGNOFF_MANAGER_OWNER',
    legacyDateEnv: 'PROD_SIGNOFF_MANAGER_DATE',
    legacyReasonEnv: 'PROD_SIGNOFF_MANAGER_REASON',
    legacyEvidenceEnv: 'PROD_SIGNOFF_MANAGER_EVIDENCE',
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
    evidenceEnv: 'PROD_SIGNOFF_DIRECTION_EVIDENCE',
    expectedEvidence:
      'Decision sponsor datee, fenetre de lancement approuvee, criteres de retour arriere valides.',
  },
];

const gates = [
  ['PROD_FREEZE_STATUS', 'Freeze production', 'FREEZE_READY'],
  ['PROD_GATE_MIGRATION', 'Migration OK', 'PASSED'],
  ['PROD_GATE_SEED', 'Seed OK', 'PASSED'],
  ['PROD_GATE_SMOKE', 'Smoke API OK', 'PASSED'],
  ['PROD_GATE_COMPLIANCE', 'Conformite healthy', 'PASSED'],
  ['PROD_GATE_AUDIT', 'Audit valide', 'PASSED'],
  ['PROD_GATE_BACKUP', 'Backup exportable/restaurable', 'PASSED'],
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
const firstValue = (...keys) => keys.map(value).find(Boolean) || '';
const decision = (key) => value(key).toUpperCase();
const firstDecision = (...keys) => firstValue(...keys).toUpperCase();
const escapeMarkdownCell = (item) =>
  String(item || '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

function buildPack() {
  const roleRows = roles.map((role) => ({
    ...role,
    decision:
      firstDecision(role.decisionEnv, role.legacyDecisionEnv) || 'MISSING',
    owner: firstValue(role.ownerEnv, role.legacyOwnerEnv) || 'A_COMPLETER',
    signedAt: firstValue(role.dateEnv, role.legacyDateEnv) || 'A_COMPLETER',
    reason: firstValue(role.reasonEnv, role.legacyReasonEnv) || 'A_COMPLETER',
    evidence:
      firstValue(role.evidenceEnv, role.legacyEvidenceEnv) || 'A_COMPLETER',
    complete:
      firstDecision(role.decisionEnv, role.legacyDecisionEnv) === 'GO' &&
      Boolean(firstValue(role.ownerEnv, role.legacyOwnerEnv)) &&
      Boolean(firstValue(role.dateEnv, role.legacyDateEnv)) &&
      Boolean(firstValue(role.reasonEnv, role.legacyReasonEnv)) &&
      Boolean(firstValue(role.evidenceEnv, role.legacyEvidenceEnv)),
  }));
  const gateRows = gates.map(([envKey, label, expected]) => ({
    envKey,
    label,
    status: decision(envKey) || 'MISSING',
    expected,
    complete: decision(envKey) === expected,
  }));
  const missing = [
    ...roleRows
      .filter((role) => !role.complete)
      .map(
        (role) =>
          `${role.label}: GO, signataire, date, raison et preuve requis`,
      ),
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
        'PROD_SIGNOFF_HR=GO PROD_SIGNOFF_SECURITY=GO PROD_SIGNOFF_OPERATIONS=GO PROD_SIGNOFF_TECHNICAL=GO PROD_SIGNOFF_DIRECTION=GO npm run production:signoffs -- --format json',
      gates:
        'PROD_FREEZE_STATUS=FREEZE_READY PROD_GATE_MIGRATION=PASSED PROD_GATE_SEED=PASSED PROD_GATE_SMOKE=PASSED PROD_GATE_COMPLIANCE=PASSED PROD_GATE_AUDIT=PASSED PROD_GATE_BACKUP=PASSED npm run production:gates -- --format json',
      readiness:
        'PROD_SIGNOFF_HR=GO PROD_SIGNOFF_SECURITY=GO PROD_SIGNOFF_OPERATIONS=GO PROD_SIGNOFF_TECHNICAL=GO PROD_SIGNOFF_DIRECTION=GO PROD_FREEZE_STATUS=FREEZE_READY PROD_GATE_MIGRATION=PASSED PROD_GATE_SEED=PASSED PROD_GATE_SMOKE=PASSED PROD_GATE_COMPLIANCE=PASSED PROD_GATE_AUDIT=PASSED PROD_GATE_BACKUP=PASSED npm run production:readiness -- --format json',
      finalDecision:
        'PROD_SIGNOFF_HR=GO PROD_SIGNOFF_SECURITY=GO PROD_SIGNOFF_OPERATIONS=GO PROD_SIGNOFF_TECHNICAL=GO PROD_SIGNOFF_DIRECTION=GO PROD_FREEZE_STATUS=FREEZE_READY PROD_GATE_MIGRATION=PASSED PROD_GATE_SEED=PASSED PROD_GATE_SMOKE=PASSED PROD_GATE_COMPLIANCE=PASSED PROD_GATE_AUDIT=PASSED PROD_GATE_BACKUP=PASSED npm run production:decision -- --decision-dir preprod-reports',
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
    ...(pack.missing.length
      ? pack.missing.map((item) => `- ${item}`)
      : ['- Aucun.']),
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
    const jsonPath = join(
      options.reportDir,
      `production-decision-evidence-pack-${runDate}.json`,
    );
    const mdPath = join(
      options.reportDir,
      `production-decision-evidence-pack-${runDate}.md`,
    );
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
