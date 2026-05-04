import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const envFile = process.env.ENV_FILE;

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
};

if (envFile && existsSync(envFile)) {
  const content = await readFile(envFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed && !process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

const required = [
  'NODE_ENV',
  'PORT',
  'COUNTRY_CODE',
  'FRONTEND_URL',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'JWT_SECRET',
];

const optionalSmoke = [
  'BASE_URL',
  'TENANT_ID',
  'SMOKE_EMAIL',
  'SMOKE_PASSWORD',
  'API_TOKEN',
];

const missing = required.filter((key) => !process.env[key]);
const warnings = [];

if (!envFile) {
  warnings.push(
    'ENV_FILE non renseigne: seules les variables shell sont lues.',
  );
} else if (!existsSync(envFile)) {
  warnings.push(`ENV_FILE introuvable: ${envFile}`);
}

if (
  process.env.NODE_ENV &&
  !['preproduction', 'staging', 'production'].includes(process.env.NODE_ENV)
) {
  warnings.push(
    `NODE_ENV=${process.env.NODE_ENV}: utiliser preproduction/staging/production pour une preprod realiste.`,
  );
}

if ((process.env.JWT_SECRET || '').length < 64) {
  warnings.push('JWT_SECRET devrait contenir au moins 64 caracteres.');
}

if (!process.env.API_TOKEN) {
  const hasSmokeLogin = process.env.SMOKE_EMAIL && process.env.SMOKE_PASSWORD;
  if (!hasSmokeLogin) {
    warnings.push(
      'Aucun API_TOKEN ni SMOKE_EMAIL/SMOKE_PASSWORD: les smoke tests proteges seront ignores ou echoueront.',
    );
  }
}

if (missing.length > 0) {
  console.error('Configuration preprod incomplete.');
  console.error(`Variables manquantes: ${missing.join(', ')}`);
  if (warnings.length) {
    console.error(`Avertissements: ${warnings.join(' | ')}`);
  }
  process.exit(1);
}

console.log('Configuration preprod OK.');
console.log(
  JSON.stringify(
    {
      envFile: envFile || null,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      countryCode: process.env.COUNTRY_CODE,
      frontendUrl: process.env.FRONTEND_URL,
      database: {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
      },
      smoke: Object.fromEntries(
        optionalSmoke.map((key) => [key, Boolean(process.env[key])]),
      ),
      warnings,
    },
    null,
    2,
  ),
);
