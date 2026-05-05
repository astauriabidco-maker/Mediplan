#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const CHANGELOG_PATH = 'docs/release/CHANGELOG.md';
const DECISION_PATH = 'docs/release/SPRINT_18_RC_DECISION.md';
const REQUIRED_RISKS = [
  {
    id: 'dashboard-budget-watch',
    label: '/dashboard budget watch',
    level: 'medium',
    impact:
      'La route /dashboard concentre les indicateurs et peut depasser 450 KiB si des dependances lourdes remontent dans l entry app.',
    mitigation:
      'Conserver npm run frontend:budget:check vert; garder charts/widgets derriere des frontieres lazy; ouvrir une reserve si la route reste en zone watch.',
  },
  {
    id: 'preprod-dependent-validations',
    label: 'Validations preprod dependantes',
    level: 'medium',
    impact:
      'Les preuves env, smoke API, backup/restore et ops summary dependent de .env.preprod, Docker et services locaux.',
    mitigation:
      'Rattacher les rapports preprod avant freeze; passer en RC_NO_GO si smoke critique, backup recent ou rollback sont absents.',
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
  console.log(`Mediplan Sprint 18 release candidate finalizer

Usage:
  node scripts/release-candidate-finalize.mjs --dry-run [--include-git-status] [--format markdown|json|both]

Options:
  --dry-run              Required guard: aggregate read-only RC evidence only.
  --include-git-status   Include non-destructive git status --short output.
  --format <format>      Output markdown, json, or both (default: both).
  --help                 Show this help.

This script never tags, pushes, changes versions, writes changelog entries,
runs migrations, Docker, seed, backup, restore, or deployment commands.
`);
}

async function assertReadOnlyMode(options) {
  if (!options.dryRun) {
    throw new Error('Use --dry-run. The finalizer is intentionally read-only.');
  }
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

async function collectReleaseCandidateDryRun(includeGitStatus) {
  const args = ['scripts/release-candidate-check.mjs', '--dry-run', '--format', 'json'];
  if (includeGitStatus) {
    args.push('--include-git-status');
  }

  try {
    const { stdout, stderr } = await execFileAsync('node', args, {
      cwd: REPO_ROOT,
      maxBuffer: 1024 * 1024 * 8,
    });
    return {
      ok: true,
      command: `node ${args.join(' ')}`,
      checklist: JSON.parse(stdout),
      stderr: stderr.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      command: `node ${args.join(' ')}`,
      checklist: null,
      exitCode: error.code ?? 1,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? '',
      error: error.message,
    };
  }
}

async function collectGitStatus(includeGitStatus) {
  if (!includeGitStatus) {
    return {
      status: 'not_checked',
      clean: null,
      files: [],
      note: 'Git status intentionally skipped; run with --include-git-status at freeze time.',
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

function buildNoGoReasons({ releaseCandidate, rootPackage, changelog, git }) {
  const reasons = [];

  if (!releaseCandidate.ok) {
    reasons.push('release-candidate-check --dry-run failed');
  }
  if (!rootPackage.version) {
    reasons.push('root package version is missing');
  }
  if (!changelog.exists) {
    reasons.push(`${CHANGELOG_PATH} is missing`);
  }
  if (git.status === 'dirty') {
    reasons.push('git status has pending changes; attribute them before RC freeze');
  }

  return reasons;
}

async function buildDecision(options) {
  const [rootPackage, frontendPackage, changelogExists, decisionDocExists] =
    await Promise.all([
      readJson('package.json'),
      readJson('frontend/package.json'),
      fileExists(CHANGELOG_PATH),
      fileExists(DECISION_PATH),
    ]);
  const [releaseCandidate, git] = await Promise.all([
    collectReleaseCandidateDryRun(options.includeGitStatus),
    collectGitStatus(options.includeGitStatus),
  ]);

  const noGoReasons = buildNoGoReasons({
    releaseCandidate,
    rootPackage,
    changelog: { exists: changelogExists },
    git,
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    decision: noGoReasons.length === 0 ? 'RC_READY' : 'RC_NO_GO',
    noGoReasons,
    repository: {
      root: REPO_ROOT,
      packageName: rootPackage.name,
      version: rootPackage.version,
      frontendPackageName: frontendPackage.name,
      frontendVersion: frontendPackage.version,
    },
    documents: {
      changelog: {
        path: CHANGELOG_PATH,
        exists: changelogExists,
      },
      decision: {
        path: DECISION_PATH,
        exists: decisionDocExists,
      },
    },
    releaseCandidateDryRun: releaseCandidate,
    git,
    remainingRisks: REQUIRED_RISKS,
    safeguards: [
      'No tag creation.',
      'No package version mutation.',
      'No changelog mutation.',
      'No push.',
      'No migration, Docker, seed, backup, restore, or deployment command.',
    ],
  };
}

function renderMarkdown(decision) {
  const lines = [
    '# Sprint 18 RC decision',
    '',
    `Generated: ${decision.generatedAt}`,
    `Decision: \`${decision.decision}\``,
    '',
    '## Version and changelog',
    '',
    `- Root package: \`${decision.repository.packageName}\` ${decision.repository.version}`,
    `- Frontend package: \`${decision.repository.frontendPackageName}\` ${decision.repository.frontendVersion}`,
    `- Changelog: ${decision.documents.changelog.exists ? 'found' : 'missing'} (${decision.documents.changelog.path})`,
    `- Decision doc: ${decision.documents.decision.exists ? 'found' : 'missing'} (${decision.documents.decision.path})`,
    '',
    '## Aggregated checks',
    '',
    `- Release candidate dry-run: ${decision.releaseCandidateDryRun.ok ? 'passed' : 'failed'}`,
    `- Command: \`${decision.releaseCandidateDryRun.command}\``,
  ];

  if (decision.releaseCandidateDryRun.stderr) {
    lines.push(`- Stderr: \`${decision.releaseCandidateDryRun.stderr}\``);
  }

  lines.push('', '## Git status');
  if (decision.git.status === 'not_checked') {
    lines.push(`- ${decision.git.note}`);
  } else if (decision.git.clean) {
    lines.push('- Worktree clean.');
  } else {
    lines.push('- Pending changes detected:');
    for (const file of decision.git.files) {
      lines.push(`  - \`${file}\``);
    }
  }

  lines.push('', '## No-go reasons');
  if (decision.noGoReasons.length === 0) {
    lines.push('- None.');
  } else {
    for (const reason of decision.noGoReasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push('', '## Remaining risks', '');
  lines.push('| Risk | Level | Mitigation |');
  lines.push('| --- | --- | --- |');
  for (const risk of decision.remainingRisks) {
    lines.push(`| ${risk.label}: ${risk.impact} | ${risk.level} | ${risk.mitigation} |`);
  }

  lines.push('', '## Safeguards');
  for (const safeguard of decision.safeguards) {
    lines.push(`- ${safeguard}`);
  }

  lines.push('', '## JSON', '');
  lines.push('```json');
  lines.push(JSON.stringify(decision, null, 2));
  lines.push('```');

  return lines.join('\n');
}

function printOutput(decision, format) {
  if (format === 'json') {
    console.log(JSON.stringify(decision, null, 2));
    return;
  }

  if (format === 'markdown') {
    console.log(renderMarkdown(decision));
    return;
  }

  console.log(renderMarkdown(decision));
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    await assertReadOnlyMode(options);
    const decision = await buildDecision(options);
    printOutput(decision, options.format);
    if (decision.decision === 'RC_NO_GO') {
      process.exitCode = 2;
    }
  }
} catch (error) {
  console.error(`Release candidate finalizer error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
