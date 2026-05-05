#!/usr/bin/env node
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

function parseArgs(argv) {
  const options = {
    dryRun: false,
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
  console.log(`Mediplan Sprint 20 Phase 1 production freeze check

Usage:
  node scripts/production-freeze-check.mjs --dry-run [--format markdown|json|both]

Options:
  --dry-run          Required guard: aggregate read-only freeze evidence only.
  --format <format>  Output markdown, json, or both (default: both).
  --help             Show this help.

This script never pushes, pulls, fetches, tags, commits, writes files, changes
versions, runs migrations, Docker, seed, backup, restore, or deployment commands.
`);
}

function assertDryRun(options) {
  if (!options.dryRun) {
    throw new Error('Use --dry-run. Production freeze check is read-only.');
  }
}

async function runCommand(command, args, { allowFailure = false } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: REPO_ROOT,
      maxBuffer: 1024 * 1024 * 12,
    });
    return {
      ok: true,
      command: [command, ...args].join(' '),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error) {
    const result = {
      ok: false,
      command: [command, ...args].join(' '),
      exitCode: error.code ?? 1,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? '',
      error: error.message,
    };
    if (allowFailure) return result;
    throw Object.assign(error, { commandResult: result });
  }
}

async function collectGitStatus() {
  const result = await runCommand('git', ['status', '--short']);
  const files = result.stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return {
    command: result.command,
    clean: files.length === 0,
    files,
  };
}

async function collectLastCommit() {
  const result = await runCommand('git', [
    'log',
    '-1',
    '--format=%H%x00%h%x00%cI%x00%an%x00%s',
  ]);
  const [sha, shortSha, committedAt, author, subject] = result.stdout.split('\0');

  return {
    command: result.command,
    sha,
    shortSha,
    committedAt,
    author,
    subject,
  };
}

async function collectBranch() {
  const current = await runCommand('git', ['branch', '--show-current']);
  const branch = current.stdout || 'DETACHED_HEAD';
  const upstream = await runCommand(
    'git',
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
    { allowFailure: true },
  );

  return {
    command: current.command,
    name: branch,
    detached: branch === 'DETACHED_HEAD',
    upstream: upstream.ok ? upstream.stdout : null,
    upstreamStatus: upstream.ok ? 'available' : 'unavailable',
    upstreamError: upstream.ok ? null : upstream.stderr || upstream.error,
  };
}

async function collectDivergence(upstream) {
  if (!upstream) {
    return {
      status: 'unavailable',
      ahead: null,
      behind: null,
      note: 'No upstream configured; divergence from origin cannot be computed without network mutation.',
    };
  }

  const result = await runCommand(
    'git',
    ['rev-list', '--left-right', '--count', `HEAD...${upstream}`],
    { allowFailure: true },
  );

  if (!result.ok) {
    return {
      status: 'unavailable',
      command: result.command,
      ahead: null,
      behind: null,
      note: result.stderr || result.error,
    };
  }

  const [aheadRaw, behindRaw] = result.stdout.split(/\s+/);
  const ahead = Number(aheadRaw);
  const behind = Number(behindRaw);

  return {
    status: 'available',
    command: result.command,
    ahead,
    behind,
    aligned: ahead === 0 && behind === 0,
  };
}

async function collectReleaseCandidateFinalize() {
  const args = [
    '--silent',
    'run',
    'release:candidate:finalize',
    '--',
    '--include-git-status',
    '--format',
    'json',
  ];
  const result = await runCommand('npm', args, { allowFailure: true });

  let decision = null;
  let parseError = null;
  if (result.stdout) {
    try {
      decision = JSON.parse(result.stdout);
    } catch (error) {
      parseError = error.message;
    }
  }

  return {
    ok: Boolean(decision) && !parseError,
    command: 'npm --silent run release:candidate:finalize -- --include-git-status --format json',
    packageScript: 'release:candidate:finalize',
    packageScriptIncludesDryRun: true,
    exitCode: result.exitCode ?? 0,
    decision,
    parseError,
    stdout: decision ? undefined : result.stdout,
    stderr: result.stderr,
    error: result.error,
  };
}

function buildNoGoReasons({ gitStatus, branch, divergence, releaseCandidate }) {
  const reasons = [];

  if (!gitStatus.clean) {
    reasons.push('git status --short has pending entries');
  }
  if (branch.detached) {
    reasons.push('current Git checkout is detached');
  }
  if (divergence.status !== 'available') {
    reasons.push('origin divergence could not be computed from local refs');
  } else if (!divergence.aligned) {
    reasons.push(`branch diverges from upstream: ahead ${divergence.ahead}, behind ${divergence.behind}`);
  }
  if (!releaseCandidate.ok) {
    reasons.push('release:candidate:finalize dry-run failed or did not return JSON');
  } else if (releaseCandidate.decision?.decision !== 'RC_READY') {
    reasons.push(`release:candidate:finalize returned ${releaseCandidate.decision?.decision || 'UNKNOWN'}`);
  }

  return reasons;
}

async function buildFreezeCheck() {
  const [gitStatus, lastCommit, branch, releaseCandidate] = await Promise.all([
    collectGitStatus(),
    collectLastCommit(),
    collectBranch(),
    collectReleaseCandidateFinalize(),
  ]);
  const divergence = await collectDivergence(branch.upstream);
  const noGoReasons = buildNoGoReasons({
    gitStatus,
    branch,
    divergence,
    releaseCandidate,
  });

  return {
    generatedAt: new Date().toISOString(),
    sprint: '20',
    phase: '1',
    mode: 'dry-run',
    decision: noGoReasons.length === 0 ? 'FREEZE_READY' : 'FREEZE_NO_GO',
    noGoReasons,
    repository: {
      root: REPO_ROOT,
      branch,
      lastCommit,
      divergence,
      gitStatus,
    },
    releaseCandidateFinalize: releaseCandidate,
    safeguards: [
      'No push.',
      'No pull or fetch.',
      'No tag creation.',
      'No commit.',
      'No file write.',
      'No package version mutation.',
      'No migration, Docker, seed, backup restore, or deployment command.',
    ],
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Sprint 20 Phase 1 - Freeze Git',
    '',
    `Generated: ${report.generatedAt}`,
    `Decision: \`${report.decision}\``,
    `Mode: ${report.mode}`,
    '',
    '## Git snapshot',
    '',
    `- Branch: \`${report.repository.branch.name}\``,
    `- Upstream: ${report.repository.branch.upstream ? `\`${report.repository.branch.upstream}\`` : 'unavailable'}`,
    `- Last commit: \`${report.repository.lastCommit.shortSha}\` ${report.repository.lastCommit.subject}`,
    `- Commit date: ${report.repository.lastCommit.committedAt}`,
    '',
    '## Origin divergence',
    '',
  ];

  if (report.repository.divergence.status === 'available') {
    lines.push(
      `- Ahead: ${report.repository.divergence.ahead}`,
      `- Behind: ${report.repository.divergence.behind}`,
      `- Aligned: ${report.repository.divergence.aligned ? 'yes' : 'no'}`,
    );
  } else {
    lines.push(`- Unavailable: ${report.repository.divergence.note}`);
  }

  lines.push(
    '',
    '## Git status',
    '',
    `- Command: \`${report.repository.gitStatus.command}\``,
  );

  if (report.repository.gitStatus.clean) {
    lines.push('- Worktree clean.');
  } else {
    lines.push('- Pending entries:');
    for (const file of report.repository.gitStatus.files) {
      lines.push(`  - \`${file}\``);
    }
  }

  lines.push(
    '',
    '## Release candidate finalize',
    '',
    `- Command: \`${report.releaseCandidateFinalize.command}\``,
    `- Output: ${report.releaseCandidateFinalize.ok ? 'JSON parsed' : 'FAILED'}`,
    `- Decision: ${report.releaseCandidateFinalize.decision?.decision || '-'}`,
    '',
    '## No-go reasons',
    '',
    ...(report.noGoReasons.length
      ? report.noGoReasons.map((reason) => `- ${reason}`)
      : ['- None.']),
    '',
    '## Safeguards',
    '',
    ...report.safeguards.map((item) => `- ${item}`),
    '',
    '## JSON',
    '',
    '```json',
    JSON.stringify(report, null, 2),
    '```',
  );

  return lines.join('\n');
}

function printOutput(report, format) {
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(renderMarkdown(report));
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    assertDryRun(options);
    const report = await buildFreezeCheck();
    printOutput(report, options.format);
    if (report.decision !== 'FREEZE_READY') {
      process.exitCode = 2;
    }
  }
} catch (error) {
  console.error(`Production freeze check error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
