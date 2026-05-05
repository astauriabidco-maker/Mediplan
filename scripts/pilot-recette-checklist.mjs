#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const allowedStatuses = new Set(['TODO', 'PASSED', 'BLOCKED']);
const args = process.argv.slice(2);

const usage = `Usage:
  node scripts/pilot-recette-checklist.mjs [options]

Options:
  --out-dir <path>              Dossier de sortie (defaut: REPORT_DIR ou preprod-reports)
  --run-id <id>                 Identifiant de campagne (defaut: pilot-YYYY-MM-DD)
  --env <name>                  Environnement cible (defaut: PILOT_RECETTE_ENV ou preprod)
  --base-url <url>              URL observee pendant la recette
  --status <scope=STATUS>       Statut global, role ou scenario
  --manager-status <STATUS>     Raccourci pour le parcours manager
  --rh-status <STATUS>          Raccourci pour le parcours RH
  --auditor-status <STATUS>     Raccourci pour le parcours auditeur
  --admin-status <STATUS>       Raccourci pour le parcours admin
  --help                        Affiche cette aide

Scopes --status:
  all=TODO
  manager=PASSED
  manager.publication=BLOCKED

Variables d'environnement:
  REPORT_DIR=/private/tmp
  PILOT_RECETTE_STATUS=TODO
  PILOT_RECETTE_MANAGER_STATUS=PASSED
  PILOT_RECETTE_MANAGER_PUBLICATION_STATUS=BLOCKED
`;

const optionValue = (name) => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1];

  return undefined;
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(usage);
  process.exit(0);
}

const slug = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const assertStatus = (status, source) => {
  const normalized = String(status || '').toUpperCase();
  if (!allowedStatuses.has(normalized)) {
    throw new Error(
      `${source} doit etre TODO, PASSED ou BLOCKED (recu: ${status || '-'})`,
    );
  }
  return normalized;
};

const parseAssignments = () => {
  const assignments = [];
  const push = (scope, status, source, origin) => {
    assignments.push({
      scope: slug(scope),
      status: assertStatus(status, source),
      source,
      origin,
      order: assignments.length,
    });
  };

  const defaultStatus = process.env.PILOT_RECETTE_STATUS;
  if (defaultStatus) {
    push('all', defaultStatus, 'PILOT_RECETTE_STATUS', 'env');
  }

  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(
      /^PILOT_RECETTE_(MANAGER|RH|AUDITOR|ADMIN)(?:_([A-Z0-9_]+))?_STATUS$/,
    );
    if (match) {
      const role = match[1].toLowerCase();
      const scenario = match[2] ? `.${match[2].toLowerCase()}` : '';
      push(`${role}${scenario}`, value, key, 'env');
    }
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--status' || arg.startsWith('--status=')) {
      const raw = arg === '--status' ? args[index + 1] : arg.slice(9);
      if (arg === '--status') index += 1;
      const separator = raw?.indexOf('=');
      if (!raw || separator === -1) {
        throw new Error('--status attend une valeur scope=TODO|PASSED|BLOCKED');
      }
      push(
        raw.slice(0, separator),
        raw.slice(separator + 1),
        '--status',
        'arg',
      );
    }
  }

  for (const role of ['manager', 'rh', 'auditor', 'admin']) {
    const value = optionValue(`--${role}-status`);
    if (value) push(role, value, `--${role}-status`, 'arg');
  }

  return assignments;
};

const scenarios = [
  {
    role: 'manager',
    roleLabel: 'Manager',
    id: 'publication',
    title: 'Valider et publier un planning pilote',
    description:
      'Le manager ouvre le planning terrain, verifie les alertes critiques, ajuste un creneau et lance une publication controlee.',
    steps: [
      'Ouvrir le planning du service pilote sur la periode de recette.',
      'Verifier les alertes fatigue, repos et couverture de service.',
      'Ajuster un poste test sans casser les affectations existantes.',
      'Lancer la preview de publication puis confirmer uniquement si la campagne le permet.',
    ],
    expectedEvidence: [
      'Capture du planning avant/apres ajustement.',
      'Export ou capture des alertes visibles.',
      'Trace de preview/publication avec horodatage et identite manager.',
    ],
    acceptanceCriteria: [
      'Les conflits bloquants sont visibles avant publication.',
      'La preview explique les impacts de publication.',
      'Le planning publie correspond aux modifications validees.',
    ],
    uxIrritants: [
      'Libelles d alertes trop techniques pour arbitrage terrain.',
      'Manque de repere visuel entre preview et planning courant.',
    ],
    reserves: [
      'Publication reelle a garder sous accord explicite du responsable pilote.',
    ],
  },
  {
    role: 'manager',
    roleLabel: 'Manager',
    id: 'remplacement',
    title: 'Traiter une absence et proposer un remplacement',
    description:
      'Le manager constate une absence courte, consulte les disponibilites et choisit un remplacement compatible.',
    steps: [
      'Declarer ou selectionner une absence de recette.',
      'Consulter les agents disponibles et les alertes associees.',
      'Selectionner un remplacement puis verifier le planning consolide.',
    ],
    expectedEvidence: [
      'Capture de la fiche absence.',
      'Liste des remplacements proposes avec contraintes.',
      'Capture du planning consolide apres choix.',
    ],
    acceptanceCriteria: [
      'Les agents incompatibles ne sont pas presentes comme choix neutres.',
      'Les alertes restantes sont explicites.',
      'Le changement est auditables dans l historique.',
    ],
    uxIrritants: [
      'Trop d allers-retours si la disponibilite n est pas visible dans la modale.',
    ],
    reserves: [
      'Verifier la coherence avec les regles locales de remplacement.',
    ],
  },
  {
    role: 'rh',
    roleLabel: 'RH',
    id: 'absences',
    title: 'Controler les absences et compteurs RH',
    description:
      'Le profil RH verifie les absences, compteurs, droits et impacts planning pour un echantillon pilote.',
    steps: [
      'Ouvrir le tableau des absences et filtrer le service pilote.',
      'Verifier un dossier agent avec compteur, type d absence et statut.',
      'Controler que les impacts planning sont coherents avec la decision RH.',
    ],
    expectedEvidence: [
      'Export CSV ou capture de la liste filtree.',
      'Capture d un dossier agent anonymise si necessaire.',
      'Note de rapprochement compteur RH / planning.',
    ],
    acceptanceCriteria: [
      'Les compteurs affiches correspondent aux absences validees.',
      'Les filtres service, periode et statut sont fiables.',
      'La decision RH est visible dans le planning sans double saisie.',
    ],
    uxIrritants: [
      'Filtres a reinitialiser manuellement entre deux controles.',
      'Terminologie RH et planning parfois heterogene.',
    ],
    reserves: [
      'Donnees nominatives a flouter dans les pieces jointes partagees.',
    ],
  },
  {
    role: 'auditor',
    roleLabel: 'Auditeur',
    id: 'audit_chain',
    title: 'Verifier la chaine d audit',
    description:
      'L auditeur controle les evenements cles de la campagne et la lisibilite des preuves.',
    steps: [
      'Filtrer les logs sur la periode de recette pilote.',
      'Verifier les evenements creation, modification, publication et exception.',
      'Rapprocher un evenement avec la preuve fonctionnelle collectee.',
    ],
    expectedEvidence: [
      'Export ou capture des logs filtres.',
      'Identifiant d evenement audit pour chaque action majeure.',
      'Lien entre evenement, acteur, horodatage et objet modifie.',
    ],
    acceptanceCriteria: [
      'Chaque action critique possede un acteur et un horodatage.',
      'Les filtres audit permettent de retrouver rapidement un evenement.',
      'Les modifications sensibles sont justifiables a partir des logs.',
    ],
    uxIrritants: [
      'Colonnes techniques difficiles a lire sans libelles metier.',
      'Recherche texte a confirmer sur les noms et identifiants.',
    ],
    reserves: [
      'Conserver les exports dans un espace restreint.',
    ],
  },
  {
    role: 'admin',
    roleLabel: 'Admin',
    id: 'pilot_setup',
    title: 'Verifier le parametrage pilote',
    description:
      'L admin controle tenant, utilisateurs, roles, services et garde-fous avant ouverture terrain.',
    steps: [
      'Verifier le tenant et les services inclus dans le pilote.',
      'Controler les comptes manager, RH, auditeur et admin.',
      'Verifier les droits minimaux et les garde-fous de publication.',
    ],
    expectedEvidence: [
      'Capture de la configuration tenant/service.',
      'Liste des comptes de recette et roles associes.',
      'Trace de verification des droits ou matrice d acces.',
    ],
    acceptanceCriteria: [
      'Chaque role accede uniquement aux vues attendues.',
      'Les services pilotes sont correctement isoles.',
      'Les actions sensibles demandent les droits requis.',
    ],
    uxIrritants: [
      'Matrice de roles difficile a scanner si tous les droits sont depliees.',
    ],
    reserves: [
      'Desactiver ou reinitialiser les comptes temporaires apres campagne.',
    ],
  },
];

const assignments = parseAssignments();
const assignmentStatus = (role, id) => {
  let selected = { status: 'TODO', score: -1 };
  for (const assignment of assignments) {
    const precision =
      assignment.scope === `${role}_${id}`
        ? 2
        : assignment.scope === role
          ? 1
          : assignment.scope === 'all'
            ? 0
            : -1;
    if (precision !== -1) {
      const originScore = assignment.origin === 'arg' ? 100 : 0;
      const score = originScore + precision * 10 + assignment.order;
      if (score >= selected.score) {
        selected = { status: assignment.status, score };
      }
    }
  }
  return selected.status;
};

const now = new Date();
const runId =
  optionValue('--run-id') ||
  process.env.PILOT_RECETTE_RUN_ID ||
  `pilot-${now.toISOString().slice(0, 10)}`;
const runtimeEnv =
  optionValue('--env') ||
  process.env.PILOT_RECETTE_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'preprod';
const baseUrl =
  optionValue('--base-url') ||
  process.env.PILOT_RECETTE_BASE_URL ||
  process.env.BASE_URL ||
  'non renseigne';
const reportDir =
  optionValue('--out-dir') || process.env.REPORT_DIR || 'preprod-reports';
const generatedAt = now.toISOString();

const enrichedScenarios = scenarios.map((scenario) => ({
  ...scenario,
  status: assignmentStatus(scenario.role, scenario.id),
}));

const statusCounts = enrichedScenarios.reduce(
  (counts, scenario) => ({
    ...counts,
    [scenario.status]: counts[scenario.status] + 1,
  }),
  { TODO: 0, PASSED: 0, BLOCKED: 0 },
);

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const list = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = () => `# PV recette terrain pilote - Sprint 16

## Campagne

| Champ | Valeur |
| --- | --- |
| Run | ${escapeMarkdownCell(runId)} |
| Genere le | ${escapeMarkdownCell(generatedAt)} |
| Environnement | ${escapeMarkdownCell(runtimeEnv)} |
| Base URL | ${escapeMarkdownCell(baseUrl)} |
| Statuts | TODO: ${statusCounts.TODO}, PASSED: ${statusCounts.PASSED}, BLOCKED: ${statusCounts.BLOCKED} |

## Synthese des parcours

| Role | Scenario | Statut | Preuves attendues |
| --- | --- | --- | --- |
${enrichedScenarios
  .map(
    (scenario) =>
      `| ${escapeMarkdownCell(scenario.roleLabel)} | ${escapeMarkdownCell(
        scenario.title,
      )} | ${scenario.status} | ${escapeMarkdownCell(
        scenario.expectedEvidence.join('; '),
      )} |`,
  )
  .join('\n')}

## Scenarios detailles

${enrichedScenarios
  .map(
    (scenario) => `### ${scenario.roleLabel} - ${scenario.title}

Statut: **${scenario.status}**

${scenario.description}

#### Etapes
${list(scenario.steps)}

#### Criteres d'acceptation
${list(scenario.acceptanceCriteria)}

#### Preuves attendues
${list(scenario.expectedEvidence)}

#### Irritants UI/UX a surveiller
${list(scenario.uxIrritants)}

#### Reserves
${list(scenario.reserves)}
`,
  )
  .join('\n')}

## Pilotage des statuts

Les statuts acceptes sont TODO, PASSED et BLOCKED. Ils peuvent etre fixes par
arguments ou variables d'environnement:

\`\`\`bash
node scripts/pilot-recette-checklist.mjs --status manager=PASSED --status rh.absences=BLOCKED
PILOT_RECETTE_AUDITOR_AUDIT_CHAIN_STATUS=PASSED node scripts/pilot-recette-checklist.mjs
\`\`\`
`;

const report = {
  kind: 'pilot-recette-checklist',
  runId,
  generatedAt,
  runtimeEnv,
  baseUrl,
  statusCounts,
  statusAssignments: assignments,
  allowedStatuses: [...allowedStatuses],
  scenarios: enrichedScenarios,
  acceptanceSummary: enrichedScenarios.flatMap((scenario) =>
    scenario.acceptanceCriteria.map((criterion) => ({
      role: scenario.role,
      scenarioId: scenario.id,
      status: scenario.status,
      criterion,
    })),
  ),
  uxIrritants: enrichedScenarios.flatMap((scenario) =>
    scenario.uxIrritants.map((irritant) => ({
      role: scenario.role,
      scenarioId: scenario.id,
      irritant,
    })),
  ),
  reserves: enrichedScenarios.flatMap((scenario) =>
    scenario.reserves.map((reserve) => ({
      role: scenario.role,
      scenarioId: scenario.id,
      reserve,
    })),
  ),
};

await mkdir(reportDir, { recursive: true });

const safeRunId = slug(runId) || 'pilot';
const markdownPath = join(reportDir, `${safeRunId}-recette-terrain-pilote.md`);
const jsonPath = join(reportDir, `${safeRunId}-recette-terrain-pilote.json`);

await writeFile(markdownPath, renderMarkdown(), 'utf8');
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Checklist Markdown: ${markdownPath}`);
console.log(`Checklist JSON: ${jsonPath}`);
console.log(
  `Statuts: TODO=${statusCounts.TODO} PASSED=${statusCounts.PASSED} BLOCKED=${statusCounts.BLOCKED}`,
);
