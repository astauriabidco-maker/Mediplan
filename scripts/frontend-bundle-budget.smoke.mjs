#!/usr/bin/env node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DEFAULT_ROUTES, runBudget } from './frontend-bundle-budget.mjs';

const tempDir = await mkdtemp(
  path.join(os.tmpdir(), 'mediplan-bundle-budget-'),
);
const distDir = path.join(tempDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

try {
  await mkdir(assetsDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(assetsDir, 'index-test.js'), 'x'.repeat(12 * 1024)),
    ...DEFAULT_ROUTES.flatMap(
      (routeBudget) => routeBudget.chunks ?? [routeBudget.chunk],
    ).map((chunkName) => {
      const size = chunkName === 'DashboardPage' ? 20 * 1024 : 4 * 1024;
      return writeFile(
        path.join(assetsDir, `${chunkName}-test.js`),
        'x'.repeat(size),
      );
    }),
  ]);

  const pass = await runBudget({
    distDir,
    maxChunkKiB: 30,
    maxEntryKiB: 15,
    maxRouteKiB: 30,
    top: 2,
  });

  assert.equal(
    pass.evaluation.violations.some((violation) => violation.scope === 'entry'),
    false,
  );
  assert.match(pass.report, /Largest 2 assets by impact/);
  assert.match(pass.report, /Routes closest to budget/);
  assert.match(pass.report, /Budget\s+Signal/);

  const fail = await runBudget({
    distDir,
    maxChunkKiB: 30,
    maxEntryKiB: 10,
    maxRouteKiB: 30,
    top: 2,
  });

  assert.equal(
    fail.evaluation.violations.some((violation) => violation.scope === 'entry'),
    true,
  );
  assert.match(fail.report, /Actionable recommendations/);
  assert.match(fail.report, /Entry assets\/index-test\.js/);
  console.log('frontend-bundle-budget smoke passed');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
