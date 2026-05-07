#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const schedulerPath = path.join(scriptDir, 'ops-routine-scheduler.mjs');
const source = await readFile(schedulerPath, 'utf8');

assert.match(
  source,
  /defaultMode: 'dry-run'/,
  'scheduler must declare dry-run as the default mode',
);
assert.match(
  source,
  /disabledModeAvailable: true/,
  'scheduler must expose a disabled mode',
);
assert.match(
  source,
  /shellExecution: false/,
  'scheduler must declare shell execution disabled',
);
assert.match(
  source,
  /backupRestoreExecuted: false/,
  'scheduler must declare that it does not restore backups',
);
assert.match(
  source,
  /alertResolutionExecuted: false/,
  'scheduler must declare that it does not resolve alerts',
);
assert.match(
  source,
  /migrationsExecuted: false/,
  'scheduler must declare that it does not run migrations',
);
assert.doesNotMatch(
  source,
  /\bmethod:\s*['"](POST|PATCH|PUT|DELETE)['"]/,
  'scheduler must not define mutating HTTP methods',
);

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mediplan-ops-routines-'));
const reportDir = path.join(tempDir, 'reports');
const journalPath = path.join(tempDir, 'journal', 'ops.jsonl');

try {
  const dryRun = spawnSync(
    process.execPath,
    [
      schedulerPath,
      '--dry-run',
      '--routines',
      'daily,backup,audit,slo',
      '--report-dir',
      reportDir,
      '--journal',
      journalPath,
      '--date',
      '2026-05-08',
      '--from',
      '2026-05-07T00:00:00.000Z',
      '--to',
      '2026-05-08T00:00:00.000Z',
      '--tenant',
      'OPS-SMOKE',
    ],
    { cwd: path.dirname(scriptDir), encoding: 'utf8' },
  );

  assert.equal(
    dryRun.status,
    0,
    `dry-run failed\nstdout:\n${dryRun.stdout}\nstderr:\n${dryRun.stderr}`,
  );

  const dryJsonPath = path.join(
    reportDir,
    'ops-routine-scheduler-2026-05-08.json',
  );
  const dryMarkdownPath = path.join(
    reportDir,
    'ops-routine-scheduler-2026-05-08.md',
  );
  assert.equal(
    existsSync(dryJsonPath),
    true,
    'dry-run JSON report must be written',
  );
  assert.equal(
    existsSync(dryMarkdownPath),
    true,
    'dry-run Markdown report must be written',
  );

  const dryReport = JSON.parse(await readFile(dryJsonPath, 'utf8'));
  const dryMarkdown = await readFile(dryMarkdownPath, 'utf8');
  assert.equal(dryReport.status, 'PLANNED');
  assert.equal(dryReport.mode, 'dry-run');
  assert.equal(dryReport.nonDestructive, true);
  assert.equal(dryReport.frequencies.daily, 'P1D');
  assert.equal(dryReport.attempts.length, 4);
  assert.equal(dryReport.policy.shellExecution, false);
  assert.equal(dryReport.policy.backupRestoreExecuted, false);
  assert.deepEqual(
    dryReport.routines.map((routine) => routine.id),
    ['daily', 'backup', 'audit', 'slo'],
  );
  assert.equal(
    dryReport.routines.every((routine) => routine.status === 'PLANNED'),
    true,
  );
  assert.match(
    dryMarkdown,
    /# Orchestration routines ops Sprint 25 - 2026-05-08/,
  );
  assert.match(dryMarkdown, /- Non destructif: oui/);

  const disabledDir = path.join(tempDir, 'disabled-reports');
  const disabledRun = spawnSync(
    process.execPath,
    [
      schedulerPath,
      '--disabled',
      '--routines',
      'daily,slo',
      '--report-dir',
      disabledDir,
      '--date',
      '2026-05-08',
      '--from',
      '2026-05-07T00:00:00.000Z',
      '--to',
      '2026-05-08T00:00:00.000Z',
      '--tenant',
      'OPS-SMOKE',
    ],
    { cwd: path.dirname(scriptDir), encoding: 'utf8' },
  );

  assert.equal(
    disabledRun.status,
    0,
    `disabled run failed\nstdout:\n${disabledRun.stdout}\nstderr:\n${disabledRun.stderr}`,
  );
  const disabledReport = JSON.parse(
    await readFile(
      path.join(disabledDir, 'ops-routine-scheduler-2026-05-08.json'),
      'utf8',
    ),
  );
  assert.equal(disabledReport.status, 'DISABLED');
  assert.equal(disabledReport.mode, 'disabled');
  assert.equal(
    disabledReport.routines.every((routine) => routine.status === 'DISABLED'),
    true,
  );

  const mockDir = path.join(tempDir, 'mock-reports');
  const mockJournal = path.join(tempDir, 'mock-journal.jsonl');
  const mockRun = spawnSync(
    process.execPath,
    [
      schedulerPath,
      '--mock',
      '--routines',
      'backup,audit,slo',
      '--report-dir',
      mockDir,
      '--journal',
      mockJournal,
      '--date',
      '2026-05-08',
      '--from',
      '2026-05-07T00:00:00.000Z',
      '--to',
      '2026-05-08T00:00:00.000Z',
      '--tenant',
      'OPS-SMOKE',
    ],
    { cwd: path.dirname(scriptDir), encoding: 'utf8' },
  );

  assert.equal(
    mockRun.status,
    0,
    `mock run failed\nstdout:\n${mockRun.stdout}\nstderr:\n${mockRun.stderr}`,
  );

  const mockReport = JSON.parse(
    await readFile(
      path.join(mockDir, 'ops-routine-scheduler-2026-05-08.json'),
      'utf8',
    ),
  );
  assert.equal(mockReport.status, 'PASSED');
  assert.equal(mockReport.mode, 'mock');
  assert.equal(
    mockReport.routines.every((routine) => routine.status === 'PASSED'),
    true,
  );

  const journalLines = (await readFile(mockJournal, 'utf8'))
    .trim()
    .split(/\r?\n/);
  assert.equal(journalLines.length, 1, 'mock journal must contain one line');
  const journalEntry = JSON.parse(journalLines[0]);
  assert.equal(journalEntry.status, 'PASSED');
  assert.equal(journalEntry.tenantId, 'OPS-SMOKE');
  assert.equal(journalEntry.attemptCount, 3);

  console.log('ops-routine-scheduler smoke passed');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
