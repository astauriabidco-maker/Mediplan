#!/usr/bin/env node
import { spawn } from 'node:child_process';

const CHECKS = [
  {
    id: 'frontend-build',
    label: 'Frontend build',
    command: ['npm', 'run', 'frontend:build'],
    destructive: false,
  },
  {
    id: 'frontend-budget',
    label: 'Frontend bundle budget',
    command: ['npm', 'run', 'frontend:budget:check'],
    destructive: false,
  },
  {
    id: 'frontend-lint',
    label: 'Frontend lint',
    command: ['npm', 'run', 'frontend:lint'],
    destructive: false,
  },
  {
    id: 'frontend-test',
    label: 'Frontend tests',
    command: ['npm', 'run', 'frontend:test'],
    destructive: false,
  },
  {
    id: 'frontend-audit',
    label: 'Frontend npm audit',
    command: ['npm', 'run', 'frontend:audit'],
    destructive: false,
  },
  {
    id: 'backend-build',
    label: 'Backend build',
    command: ['npm', 'run', 'build'],
    destructive: false,
  },
  {
    id: 'incident-smoke',
    label: 'Incident drill smoke',
    command: ['npm', 'run', 'preprod:incident:smoke'],
    destructive: false,
  },
  {
    id: 'route-smoke',
    label: 'Frontend route smoke',
    command: ['npm', 'run', 'frontend:smoke:routes'],
    destructive: false,
  },
];

const args = new Set(process.argv.slice(2));

function printUsage() {
  console.log(`Mediplan product CI verifier

Usage:
  node scripts/ci-product-verify.mjs [--list|--dry-run|--help]

Modes:
  --list      List the product CI checks and exit without running commands
  --dry-run   Print the commands in execution order and exit without running them
  --help      Show this help

Default:
  Runs every check sequentially and stops on the first failure.
`);
}

function formatCommand(command) {
  return command
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(' ');
}

function printChecks({ dryRun = false } = {}) {
  const title = dryRun
    ? 'Product CI dry-run command plan:'
    : 'Product CI checks:';

  console.log(title);
  for (const [index, check] of CHECKS.entries()) {
    const prefix = String(index + 1).padStart(2, ' ');
    const safety = check.destructive ? 'destructive' : 'non-destructive';
    console.log(
      `${prefix}. ${check.id} - ${check.label} [${safety}] :: ${formatCommand(check.command)}`,
    );
  }
}

function validateArgs() {
  const knownArgs = new Set(['--list', '--dry-run', '--help', '-h']);
  const unknownArgs = [...args].filter((arg) => !knownArgs.has(arg));

  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  }

  const modes = ['--list', '--dry-run', '--help', '-h'].filter((mode) =>
    args.has(mode),
  );
  if (modes.length > 1) {
    throw new Error(`Choose only one mode: ${modes.join(', ')}`);
  }
}

function runCheck(check) {
  return new Promise((resolve) => {
    const [command, ...commandArgs] = check.command;
    console.log(`\n==> ${check.label}`);
    console.log(`$ ${formatCommand(check.command)}`);

    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      resolve({
        check,
        status: 'failed',
        exitCode: 1,
        error,
      });
    });

    child.on('close', (exitCode, signal) => {
      resolve({
        check,
        status: exitCode === 0 ? 'passed' : 'failed',
        exitCode,
        signal,
      });
    });
  });
}

async function runAllChecks() {
  const startedAt = Date.now();

  for (const check of CHECKS) {
    const result = await runCheck(check);
    if (result.status !== 'passed') {
      const reason = result.error
        ? result.error.message
        : `exit code ${result.exitCode ?? 'unknown'}${result.signal ? `, signal ${result.signal}` : ''}`;
      console.error(`\nProduct CI failed at ${check.id}: ${reason}`);
      process.exitCode = result.exitCode || 1;
      return;
    }
  }

  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nProduct CI passed (${CHECKS.length} checks, ${durationSeconds}s).`);
}

try {
  validateArgs();

  if (args.has('--help') || args.has('-h')) {
    printUsage();
  } else if (args.has('--list')) {
    printChecks();
  } else if (args.has('--dry-run')) {
    printChecks({ dryRun: true });
  } else {
    await runAllChecks();
  }
} catch (error) {
  console.error(`Product CI verifier error: ${error.message}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
