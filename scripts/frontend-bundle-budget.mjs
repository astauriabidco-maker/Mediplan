#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROUTES = [
  { route: '/dashboard', chunks: ['DashboardPage', 'DashboardAnalyticsCharts'], maxKiB: 450 },
  { route: '/manager, /manager/cockpit', chunk: 'ManagerCockpitPage', maxKiB: 120 },
  { route: '/manager/worklist', chunk: 'ManagerWorklistPage', maxKiB: 120 },
  { route: '/planning', chunks: ['Planning', 'PlanningCalendar'], maxKiB: 320 },
  { route: '/planning/prepublication', chunk: 'PlanningPrepublicationPage', maxKiB: 160 },
  { route: '/attendance', chunk: 'AttendancePage', maxKiB: 120 },
  { route: '/leaves', chunk: 'LeavesPage', maxKiB: 160 },
  { route: '/agents', chunk: 'AgentsPage', maxKiB: 160 },
  { route: '/agents/services', chunk: 'HospitalServicesPage', maxKiB: 160 },
  { route: '/agents/hierarchy', chunk: 'HierarchyPage', maxKiB: 120 },
  { route: '/agents/templates', chunk: 'ContractTemplatesPage', maxKiB: 120 },
  { route: '/competencies', chunk: 'CompetenciesPage', maxKiB: 160 },
  { route: '/payment', chunk: 'PayrollPage', maxKiB: 160 },
  { route: '/ged', chunk: 'GedPage', maxKiB: 160 },
  { route: '/qvt', chunk: 'QvtPage', maxKiB: 120 },
  { route: '/sync', chunk: 'PlaceholderPages', maxKiB: 120 },
  { route: '/whatsapp-inbox', chunk: 'WhatsAppInbox', maxKiB: 120 },
  { route: '/settings', chunk: 'Settings', maxKiB: 120 },
  { route: '/login', chunk: 'LoginPage', maxKiB: 120 },
  { route: '/auth/accept-invite', chunk: 'AcceptInvitePage', maxKiB: 120 },
  { route: '/sign/:token', chunk: 'PublicSignPage', maxKiB: 120 },
];

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

function parseRouteBudgets(value) {
  if (!value) {
    return {};
  }

  return value.split(',').reduce((budgets, pair) => {
    const separator = pair.includes('=') ? pair.lastIndexOf('=') : pair.lastIndexOf(':');
    const rawName = separator >= 0 ? pair.slice(0, separator) : '';
    const rawLimit = separator >= 0 ? pair.slice(separator + 1) : '';
    const name = rawName?.trim();
    const limitKiB = Number(rawLimit);

    if (!name || !Number.isFinite(limitKiB) || limitKiB <= 0) {
      throw new Error(`Invalid route budget "${pair}". Use ChunkName=260 or /route=260.`);
    }

    budgets[name] = limitKiB;
    return budgets;
  }, {});
}

const DEFAULTS = {
  distDir: path.join(REPO_ROOT, 'frontend/dist'),
  maxChunkKiB: Number(process.env.FRONTEND_BUNDLE_MAX_CHUNK_KIB ?? 450),
  maxEntryKiB: Number(process.env.FRONTEND_BUNDLE_MAX_ENTRY_KIB ?? 350),
  maxRouteKiB: Number(process.env.FRONTEND_BUNDLE_MAX_ROUTE_KIB ?? 260),
  routeBudgets: parseRouteBudgets(process.env.FRONTEND_BUNDLE_ROUTE_BUDGETS),
  top: Number(process.env.FRONTEND_BUNDLE_TOP ?? 15),
};

const KiB = 1024;
const ASSET_EXTENSIONS = new Set(['.js', '.css']);

function parseArgs(argv) {
  const options = { ...DEFAULTS };

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

    if (arg === '--dist') {
      options.distDir = path.resolve(readValue());
    } else if (arg === '--max-chunk-kib') {
      options.maxChunkKiB = Number(readValue());
    } else if (arg === '--max-entry-kib') {
      options.maxEntryKiB = Number(readValue());
    } else if (arg === '--max-route-kib') {
      options.maxRouteKiB = Number(readValue());
    } else if (arg === '--route-budget') {
      options.routeBudgets = {
        ...options.routeBudgets,
        ...parseRouteBudgets(readValue()),
      };
    } else if (arg === '--top') {
      options.top = Number(readValue());
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const [key, value] of Object.entries(options)) {
    if (key.endsWith('KiB') || key === 'top') {
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${key} must be a positive number`);
      }
    }
  }

  return options;
}

function printHelp() {
  console.log(`Vite frontend bundle budget

Usage:
  node scripts/frontend-bundle-budget.mjs [options]

Options:
  --dist <path>             Vite dist directory (default: frontend/dist)
  --max-chunk-kib <n>       Max size for any emitted JS/CSS asset (default: 450)
  --max-entry-kib <n>       Max size for the app entry chunk index-*.js (default: 350)
  --max-route-kib <n>       Max size for route chunks without a specific budget (default: 260)
  --route-budget <a=b>      Override route budgets, comma-separated by route or chunk
  --top <n>                 Number of largest assets to report (default: 15)

Environment overrides:
  FRONTEND_BUNDLE_MAX_CHUNK_KIB
  FRONTEND_BUNDLE_MAX_ENTRY_KIB
  FRONTEND_BUNDLE_MAX_ROUTE_KIB
  FRONTEND_BUNDLE_ROUTE_BUDGETS (example: DashboardPage=430,/planning=300)
  FRONTEND_BUNDLE_TOP
`);
}

async function listAssetFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listAssetFiles(fullPath));
      continue;
    }

    if (ASSET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectAssets(distDir) {
  const assetsDir = path.join(distDir, 'assets');
  const files = await listAssetFiles(assetsDir);

  return Promise.all(files.map(async (file) => {
    const bytes = await stat(file).then((details) => details.size);
    const content = await readFile(file);

    return {
      name: path.relative(distDir, file).replaceAll(path.sep, '/'),
      basename: path.basename(file),
      bytes,
      gzipBytes: gzipSync(content).byteLength,
      type: path.extname(file).slice(1),
    };
  }));
}

function kib(bytes) {
  return bytes / KiB;
}

function fmtKiB(bytes) {
  return `${kib(bytes).toFixed(1)} KiB`;
}

function findChunk(assets, chunkName) {
  return assets.find((asset) => asset.type === 'js' && asset.basename.startsWith(`${chunkName}-`));
}

function routeChunkNames(routeBudget) {
  return routeBudget.chunks ?? [routeBudget.chunk];
}

function normalizeOptions(options) {
  return {
    ...DEFAULTS,
    ...options,
    routeBudgets: {
      ...DEFAULTS.routeBudgets,
      ...(options.routeBudgets ?? {}),
    },
  };
}

function evaluateBudgets(assets, options) {
  const normalizedOptions = normalizeOptions(options);
  const violations = [];
  const routes = DEFAULT_ROUTES.map((routeBudget) => {
    const chunkNames = routeChunkNames(routeBudget);
    const routeAssets = chunkNames.map((chunkName) => ({ chunkName, asset: findChunk(assets, chunkName) }));
    const missingChunks = routeAssets.filter((routeAsset) => !routeAsset.asset);
    const totalBytes = routeAssets.reduce((sum, routeAsset) => sum + (routeAsset.asset?.bytes ?? 0), 0);
    const limitKiB = chunkNames
      .map((chunkName) => normalizedOptions.routeBudgets[chunkName])
      .find((limit) => limit !== undefined)
      ?? normalizedOptions.routeBudgets[routeBudget.route]
      ?? routeBudget.maxKiB
      ?? normalizedOptions.maxRouteKiB;

    for (const missingChunk of missingChunks) {
      violations.push({
        scope: 'route',
        name: routeBudget.route,
        message: `missing expected chunk ${missingChunk.chunkName}-*.js`,
      });
    }

    if (missingChunks.length === 0 && kib(totalBytes) > limitKiB) {
      violations.push({
        scope: 'route',
        name: routeBudget.route,
        actualBytes: totalBytes,
        limitKiB,
        message: `${routeBudget.route} is ${fmtKiB(totalBytes)} > ${limitKiB} KiB`,
      });
    }

    return {
      ...routeBudget,
      chunkNames,
      limitKiB,
      assets: routeAssets.map((routeAsset) => routeAsset.asset).filter(Boolean),
      totalBytes,
    };
  });

  for (const asset of assets) {
    if (kib(asset.bytes) > normalizedOptions.maxChunkKiB) {
      violations.push({
        scope: 'chunk',
        name: asset.name,
        actualBytes: asset.bytes,
        limitKiB: normalizedOptions.maxChunkKiB,
        message: `${asset.name} is ${fmtKiB(asset.bytes)} > ${normalizedOptions.maxChunkKiB} KiB`,
      });
    }

    if (asset.type === 'js' && asset.basename.startsWith('index-') && kib(asset.bytes) > normalizedOptions.maxEntryKiB) {
      violations.push({
        scope: 'entry',
        name: asset.name,
        actualBytes: asset.bytes,
        limitKiB: normalizedOptions.maxEntryKiB,
        message: `${asset.name} entry is ${fmtKiB(asset.bytes)} > ${normalizedOptions.maxEntryKiB} KiB`,
      });
    }
  }

  return { routes, violations };
}

function padRight(value, size) {
  return String(value).padEnd(size, ' ');
}

function renderReport(assets, evaluation, options) {
  const sorted = [...assets].sort((left, right) => right.bytes - left.bytes);
  const lines = [
    'Frontend bundle budget report',
    `Dist: ${path.relative(process.cwd(), options.distDir) || options.distDir}`,
    `Thresholds: chunk <= ${options.maxChunkKiB} KiB, entry <= ${options.maxEntryKiB} KiB, route default <= ${options.maxRouteKiB} KiB`,
    '',
    `Largest ${Math.min(options.top, sorted.length)} assets:`,
    `${padRight('Asset', 52)} ${padRight('Raw', 10)} ${padRight('Gzip', 10)}`,
    `${'-'.repeat(52)} ${'-'.repeat(10)} ${'-'.repeat(10)}`,
  ];

  for (const asset of sorted.slice(0, options.top)) {
    lines.push(`${padRight(asset.name, 52)} ${padRight(fmtKiB(asset.bytes), 10)} ${padRight(fmtKiB(asset.gzipBytes), 10)}`);
  }

  lines.push('', 'Route chunks:');
  lines.push(`${padRight('Route', 30)} ${padRight('Chunk', 36)} ${padRight('Raw', 10)} Budget`);
  lines.push(`${'-'.repeat(30)} ${'-'.repeat(36)} ${'-'.repeat(10)} ${'-'.repeat(10)}`);

  for (const route of evaluation.routes) {
    const chunkLabel = route.assets.length > 0
      ? route.assets.map((asset) => asset.basename).join(', ')
      : route.chunkNames.map((chunkName) => `${chunkName}-*.js`).join(', ');
    lines.push(`${padRight(route.route, 30)} ${padRight(chunkLabel, 36)} ${padRight(route.assets.length > 0 ? fmtKiB(route.totalBytes) : 'missing', 10)} ${route.limitKiB} KiB`);
  }

  if (evaluation.violations.length > 0) {
    lines.push('', 'Budget violations:');
    for (const violation of evaluation.violations) {
      lines.push(`- [${violation.scope}] ${violation.message}`);
    }
  } else {
    lines.push('', 'All bundle budgets passed.');
  }

  return lines.join('\n');
}

export async function runBudget(options) {
  const normalizedOptions = normalizeOptions(options);
  const assets = await collectAssets(normalizedOptions.distDir);
  const evaluation = evaluateBudgets(assets, normalizedOptions);
  return {
    assets,
    evaluation,
    report: renderReport(assets, evaluation, normalizedOptions),
  };
}

export { DEFAULT_ROUTES, evaluateBudgets, normalizeOptions, parseArgs, parseRouteBudgets, renderReport };

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runBudget(options);
    console.log(result.report);
    process.exit(result.evaluation.violations.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(`Bundle budget check failed: ${error.message}`);
    process.exit(1);
  }
}
