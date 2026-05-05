#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { DEFAULT_ROUTES } from './frontend-bundle-budget.mjs';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const CHANGELOG_CANDIDATES = [
  'CHANGELOG.md',
  'docs/CHANGELOG.md',
  'docs/release/CHANGELOG.md',
];

const RELEASE_COMMANDS = [
  {
    id: 'syntax-release-candidate-script',
    label: 'Syntaxe script RC',
    command: 'node --check scripts/release-candidate-check.mjs',
    required: true,
  },
  {
    id: 'release-candidate-dry-run',
    label: 'Checklist RC non executante',
    command: 'node scripts/release-candidate-check.mjs --dry-run',
    required: true,
  },
  {
    id: 'ci-product',
    label: 'Gate produit complete',
    command: 'npm run ci:product',
    required: true,
  },
  {
    id: 'frontend-budget',
    label: 'Budget bundle frontend',
    command: 'npm run frontend:budget:check',
    required: true,
  },
  {
    id: 'frontend-route-smoke',
    label: 'Smoke routes frontend',
    command: 'npm run frontend:smoke:routes',
    required: true,
  },
  {
    id: 'frontend-audit',
    label: 'Audit dependances frontend',
    command: 'npm run frontend:audit',
    required: true,
  },
  {
    id: 'backend-quality',
    label: 'Qualite backend et e2e isolation',
    command: 'npm run ci:quality',
    required: true,
  },
  {
    id: 'preprod-env',
    label: 'Configuration preprod',
    command: 'ENV_FILE=.env.preprod npm run preprod:env:check',
    required: true,
  },
  {
    id: 'preprod-smoke',
    label: 'Smoke API preprod',
    command: 'npm run preprod:compose:smoke',
    required: true,
  },
  {
    id: 'backup-restore',
    label: 'Backup restauration preprod',
    command: 'npm run preprod:backup:restore',
    required: true,
  },
  {
    id: 'ops-summary',
    label: 'Synthese operationnelle preprod',
    command: 'npm run preprod:ops:summary',
    required: false,
  },
];

const RC_CRITERIA = [
  {
    id: 'version-changelog',
    label: 'Version et changelog',
    go: 'Version package racine identifiee, changelog release candidate publie ou decision explicite de non-changelog.',
    noGo: 'Version inconnue, changement produit non trace, ou notes release absentes.',
  },
  {
    id: 'git-status',
    label: 'Statut Git optionnel',
    go: 'Worktree propre ou ecarts attribues aux agents en cours avant tag RC.',
    noGo: 'Fichiers critiques modifies sans owner, conflit non resolu, ou artefacts secrets suivis.',
  },
  {
    id: 'frontend-dashboard-budget',
    label: 'Budget route /dashboard',
    go: '`/dashboard` reste sous son budget et hors zone watch durable.',
    noGo: '`/dashboard` depasse le budget, chunk attendu manquant, ou croissance non justifiee.',
  },
  {
    id: 'audits',
    label: 'Audits securite et dependances',
    go: '`npm run frontend:audit` retourne zero vulnerabilite moderate ou plus; controles API/RBAC restent verts.',
    noGo: 'Vulnerabilite high/critical, DTO permissif, fuite interne, ou permission excessive.',
  },
  {
    id: 'build-test',
    label: 'Build et tests',
    go: '`npm run ci:product` passe sur la branche candidate.',
    noGo: 'Une gate requise echoue sans exception documentee et acceptee.',
  },
  {
    id: 'deployment',
    label: 'Notes de deploiement',
    go: 'Migrations, backup, rollback et smoke post-bascule sont documentes.',
    noGo: 'Rollback inconnu, migration non revue, ou backup recent indisponible.',
  },
];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    includeGitStatus: false,
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
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Mediplan release candidate checklist

Usage:
  node scripts/release-candidate-check.mjs [--dry-run] [--include-git-status] [--format markdown|json|both]

Options:
  --dry-run              Compile the checklist and command plan only.
  --include-git-status   Include non-destructive git status --short output.
  --format <format>      Output markdown, json, or both (default: both).
  --help                 Show this help.

The script does not run build, test, audit, migration, docker, or deployment commands.
`);
}

async function readJson(relativePath) {
  const raw = await readFile(path.join(REPO_ROOT, relativePath), 'utf8');
  return JSON.parse(raw);
}

async function fileExists(relativePath) {
  try {
    await access(path.join(REPO_ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectChangelogStatus() {
  const files = [];
  for (const candidate of CHANGELOG_CANDIDATES) {
    if (await fileExists(candidate)) {
      files.push(candidate);
    }
  }

  return {
    status: files.length > 0 ? 'found' : 'missing',
    files,
    expected: CHANGELOG_CANDIDATES,
  };
}

async function collectGitStatus(includeGitStatus) {
  if (!includeGitStatus) {
    return {
      status: 'not_checked',
      clean: null,
      files: [],
      note: 'Run with --include-git-status when agents are ready to freeze a candidate.',
    };
  }

  const { stdout } = await execFileAsync('git', ['status', '--short'], {
    cwd: REPO_ROOT,
  });
  const files = stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return {
    status: files.length === 0 ? 'clean' : 'dirty',
    clean: files.length === 0,
    files,
  };
}

function getDashboardBudget() {
  const dashboard = DEFAULT_ROUTES.find((route) => route.route === '/dashboard');
  const limitKiB = dashboard?.maxKiB ?? 450;

  return {
    route: '/dashboard',
    chunks: dashboard?.chunks ?? [dashboard?.chunk].filter(Boolean),
    limitKiB,
    watchFromPercent: 85,
    watchFromKiB: Number(((limitKiB * 85) / 100).toFixed(1)),
    command: 'npm run frontend:budget:check',
    risk:
      'Route critique proche budget: tout import charting, dashboard ou provider global doit rester lazy ou etre compense par une reduction equivalente.',
  };
}

function buildDeploymentNotes() {
  return [
    'Geler la branche candidate seulement apres attribution des modifications concurrentes.',
    'Verifier migrations TypeORM avec `npm run migration:show` avant execution preprod.',
    'Executer un backup recent puis `npm run preprod:backup:restore` en environnement isole.',
    'Executer smoke post-deploiement: login manager, `/dashboard`, `/manager/cockpit`, `/manager/worklist`, preview publication, audit verify/export.',
    'Rollback applicatif: revenir au tag ou commit precedent, redeployer backend et frontend ensemble, puis relancer les smokes critiques sans publication directe.',
    'Rollback donnees: restaurer backup en environnement isole, comparer agents/services/shifts/leaves/work policies/audit, puis valider avec RH.',
  ];
}

async function buildChecklist(options) {
  const rootPackage = await readJson('package.json');
  const frontendPackage = await readJson('frontend/package.json');
  const changelog = await collectChangelogStatus();
  const git = await collectGitStatus(options.includeGitStatus);
  const dashboardBudget = getDashboardBudget();

  const risks = [
    {
      id: 'dashboard-budget-watch',
      level: 'medium',
      description: `Route /dashboard critique avec un budget ${dashboardBudget.limitKiB} KiB et une zone watch a ${dashboardBudget.watchFromPercent}%.`,
      mitigation:
        'Surveiller le rapport budget; garder charts et widgets lourds derriere des frontieres lazy.',
    },
    {
      id: 'concurrent-agents',
      level: 'medium',
      description:
        'Plusieurs agents modifient le codebase en parallele; la RC doit etre gelee apres relecture du statut Git.',
      mitigation:
        'Inclure `--include-git-status` au moment de la freeze et attribuer chaque modification restante.',
    },
    {
      id: 'changelog-missing',
      level: changelog.status === 'missing' ? 'medium' : 'low',
      description:
        changelog.status === 'missing'
          ? 'Aucun changelog standard detecte dans les emplacements attendus.'
          : `Changelog detecte: ${changelog.files.join(', ')}.`,
      mitigation:
        'Documenter la note de version RC dans le changelog ou dans le dossier docs/release.',
    },
    {
      id: 'preprod-evidence',
      level: 'medium',
      description:
        'Les commandes preprod peuvent dependre de `.env.preprod`, Docker et services externes locaux.',
      mitigation:
        'Conserver les rapports markdown/json preprod et noter tout ecart environnemental.',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    repository: {
      root: REPO_ROOT,
      packageName: rootPackage.name,
      version: rootPackage.version,
      frontendPackageName: frontendPackage.name,
      frontendVersion: frontendPackage.version,
    },
    versionAndChangelog: {
      version: rootPackage.version,
      frontendVersion: frontendPackage.version,
      changelog,
    },
    git,
    dashboardBudget,
    criteria: RC_CRITERIA,
    commands: RELEASE_COMMANDS.map((command) => ({
      ...command,
      execution: options.dryRun ? 'planned_only' : 'manual_required',
    })),
    audits: {
      requiredCommands: [
        'npm run frontend:audit',
        'npm test -- api-security.spec.ts --runInBand',
        'npm run test:e2e -- rbac-work-policies-isolation.e2e-spec.ts planning-security-isolation.e2e-spec.ts --runInBand',
      ],
      acceptance:
        'Zero vulnerabilite frontend moderate ou plus; aucune regression API security, RBAC, audit chain ou isolation tenant.',
    },
    deploymentNotes: buildDeploymentNotes(),
    remainingRisks: risks,
  };
}

function renderMarkdown(checklist) {
  const lines = [
    '# Release Candidate Checklist',
    '',
    `Generated: ${checklist.generatedAt}`,
    `Mode: ${checklist.dryRun ? 'dry-run' : 'checklist-only'}`,
    '',
    '## Version and changelog',
    '',
    `- Root package: \`${checklist.repository.packageName}\` ${checklist.versionAndChangelog.version}`,
    `- Frontend package: \`${checklist.repository.frontendPackageName}\` ${checklist.versionAndChangelog.frontendVersion}`,
    `- Changelog status: ${checklist.versionAndChangelog.changelog.status}`,
  ];

  if (checklist.versionAndChangelog.changelog.files.length > 0) {
    lines.push(
      `- Changelog files: ${checklist.versionAndChangelog.changelog.files.map((file) => `\`${file}\``).join(', ')}`,
    );
  } else {
    lines.push(
      `- Expected changelog paths: ${checklist.versionAndChangelog.changelog.expected.map((file) => `\`${file}\``).join(', ')}`,
    );
  }

  lines.push('', '## Git status');
  if (checklist.git.status === 'not_checked') {
    lines.push(`- ${checklist.git.note}`);
  } else if (checklist.git.clean) {
    lines.push('- Worktree clean at checklist generation.');
  } else {
    lines.push('- Worktree has pending changes:');
    for (const file of checklist.git.files) {
      lines.push(`  - \`${file}\``);
    }
  }

  lines.push('', '## RC criteria', '');
  lines.push('| Criterion | Go | No-go |');
  lines.push('| --- | --- | --- |');
  for (const criterion of checklist.criteria) {
    lines.push(`| ${criterion.label} | ${criterion.go} | ${criterion.noGo} |`);
  }

  lines.push('', '## Frontend dashboard budget watch', '');
  lines.push(`- Route: \`${checklist.dashboardBudget.route}\``);
  lines.push(`- Expected chunks: ${checklist.dashboardBudget.chunks.map((chunk) => `\`${chunk}\``).join(', ')}`);
  lines.push(`- Budget: ${checklist.dashboardBudget.limitKiB} KiB`);
  lines.push(
    `- Watch threshold: ${checklist.dashboardBudget.watchFromPercent}% (${checklist.dashboardBudget.watchFromKiB} KiB)`,
  );
  lines.push(`- Command: \`${checklist.dashboardBudget.command}\``);
  lines.push(`- Note: ${checklist.dashboardBudget.risk}`);

  lines.push('', '## Commands to execute', '');
  lines.push('| Required | Check | Command |');
  lines.push('| --- | --- | --- |');
  for (const command of checklist.commands) {
    lines.push(
      `| ${command.required ? 'yes' : 'optional'} | ${command.label} | \`${command.command}\` |`,
    );
  }

  lines.push('', '## Audits', '');
  for (const command of checklist.audits.requiredCommands) {
    lines.push(`- \`${command}\``);
  }
  lines.push(`- Acceptance: ${checklist.audits.acceptance}`);

  lines.push('', '## Deployment notes', '');
  for (const note of checklist.deploymentNotes) {
    lines.push(`- ${note}`);
  }

  lines.push('', '## Remaining risks', '');
  lines.push('| Risk | Level | Mitigation |');
  lines.push('| --- | --- | --- |');
  for (const risk of checklist.remainingRisks) {
    lines.push(`| ${risk.description} | ${risk.level} | ${risk.mitigation} |`);
  }

  lines.push('', '## JSON', '');
  lines.push('```json');
  lines.push(JSON.stringify(checklist, null, 2));
  lines.push('```');

  return lines.join('\n');
}

function printOutput(checklist, format) {
  if (format === 'json') {
    console.log(JSON.stringify(checklist, null, 2));
    return;
  }

  if (format === 'markdown') {
    console.log(renderMarkdown(checklist));
    return;
  }

  console.log(renderMarkdown(checklist));
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    const checklist = await buildChecklist(options);
    printOutput(checklist, options.format);
  }
} catch (error) {
  console.error(`Release candidate checklist error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
