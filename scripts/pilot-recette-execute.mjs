#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const allowedStatuses = new Set(['TODO', 'PASSED', 'BLOCKED']);
const decisionValues = {
  go: 'PILOT_GO',
  noGo: 'PILOT_NO_GO',
};
const args = process.argv.slice(2);

const usage = `Mediplan Sprint 16 - execution simulee de recette terrain pilote

Usage:
  node scripts/pilot-recette-execute.mjs [options]

Options:
  --campaign <path>             Campagne JSON a lire; generee si absente
  --out-dir <path>              Dossier de sortie (defaut: REPORT_DIR ou preprod-reports)
  --run-id <id>                 Identifiant de PV (defaut: pilot-recette-YYYY-MM-DD)
  --env <name>                  Environnement cible (defaut: PILOT_RECETTE_ENV ou local)
  --base-url <url>              URL observee pendant la recette
  --status <scope=STATUS>       Statut global, role ou scenario
  --manager-status <STATUS>     Raccourci pour tous les scenarios manager
  --rh-status <STATUS>          Raccourci pour tous les scenarios RH
  --auditor-status <STATUS>     Raccourci pour tous les scenarios auditeur
  --admin-status <STATUS>       Raccourci pour tous les scenarios admin
  --operator <name>             Executant de la simulation
  --help                        Affiche cette aide

Scopes --status:
  all=TODO
  manager=PASSED
  manager.publication=BLOCKED
  admin.pilot_setup=PASSED

Variables d'environnement:
  REPORT_DIR=/private/tmp
  PILOT_RECETTE_STATUS=TODO
  PILOT_RECETTE_MANAGER_STATUS=PASSED
  PILOT_RECETTE_RH_ABSENCES_STATUS=BLOCKED
  PILOT_RECETTE_OPERATOR="Equipe pilote"
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

const knownOptions = new Set([
  '--campaign',
  '--out-dir',
  '--run-id',
  '--env',
  '--base-url',
  '--status',
  '--manager-status',
  '--rh-status',
  '--auditor-status',
  '--admin-status',
  '--operator',
  '--help',
  '-h',
]);

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const optionName = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
  if (optionName.startsWith('--') && !knownOptions.has(optionName)) {
    throw new Error(`Argument inconnu: ${optionName}\n\n${usage}`);
  }
  if (
    knownOptions.has(optionName) &&
    !arg.includes('=') &&
    !['--help', '-h'].includes(optionName)
  ) {
    index += 1;
  }
}

const slug = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const scopeKey = (value) => slug(value).replaceAll('__', '_');

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
      scope: scopeKey(scope),
      status: assertStatus(status, source),
      source,
      origin,
      order: assignments.length,
    });
  };

  if (process.env.PILOT_RECETTE_STATUS) {
    push('all', process.env.PILOT_RECETTE_STATUS, 'PILOT_RECETTE_STATUS', 'env');
  }

  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(
      /^PILOT_RECETTE_(MANAGER|RH|AUDITOR|ADMIN)(?:_([A-Z0-9_]+))?_STATUS$/,
    );
    if (!match) continue;

    const role = match[1].toLowerCase();
    const scenario = match[2] ? `.${match[2].toLowerCase()}` : '';
    push(`${role}${scenario}`, value, key, 'env');
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

const defaultCampaign = () => ({
  version: 1,
  title: 'Sprint 16 - recette terrain pilote',
  roles: ['manager', 'rh', 'auditor', 'admin'],
  correctionBacklog: [
    {
      priority: 'P1',
      topic: 'Bloquants terrain',
      action:
        'Traiter tout scenario BLOCKED avant une ouverture pilote elargie.',
    },
    {
      priority: 'P2',
      topic: 'Irritants UI/UX',
      action:
        'Regrouper les irritants confirmes par role et arbitrer les corrections rapides.',
    },
    {
      priority: 'P2',
      topic: 'Preuves nominatives',
      action:
        'Anonymiser les captures et restreindre les exports RH/audit avant partage.',
    },
  ],
  scenarios: [
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
      irritants: [
        'Libelles d alertes trop techniques pour arbitrage terrain.',
        'Manque de repere visuel entre preview et planning courant.',
      ],
      reserves: [
        'Publication reelle a garder sous accord explicite du responsable pilote.',
      ],
      blockers: [
        'Publication impossible ou impacts non lisibles pour le manager.',
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
        'Le changement est auditable dans l historique.',
      ],
      irritants: [
        'Trop d allers-retours si la disponibilite n est pas visible dans la modale.',
      ],
      reserves: [
        'Verifier la coherence avec les regles locales de remplacement.',
      ],
      blockers: [
        'Remplacement propose malgre une contrainte bloquante non expliquee.',
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
      irritants: [
        'Filtres a reinitialiser manuellement entre deux controles.',
        'Terminologie RH et planning parfois heterogene.',
      ],
      reserves: [
        'Donnees nominatives a flouter dans les pieces jointes partagees.',
      ],
      blockers: [
        'Ecart entre compteur RH et impact planning non explicable.',
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
      irritants: [
        'Colonnes techniques difficiles a lire sans libelles metier.',
        'Recherche texte a confirmer sur les noms et identifiants.',
      ],
      reserves: ['Conserver les exports dans un espace restreint.'],
      blockers: [
        'Action critique introuvable dans la chaine d audit.',
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
      irritants: [
        'Matrice de roles difficile a scanner si tous les droits sont deplies.',
      ],
      reserves: [
        'Desactiver ou reinitialiser les comptes temporaires apres campagne.',
      ],
      blockers: [
        'Droits insuffisants ou trop larges sur un compte pilote.',
      ],
    },
  ],
});

const readOrGenerateCampaign = async (campaignPath) => {
  const campaign = defaultCampaign();
  if (!campaignPath) return { campaign, source: 'generated-default' };

  if (existsSync(campaignPath)) {
    const content = await readFile(campaignPath, 'utf8');
    return { campaign: JSON.parse(content), source: campaignPath };
  }

  await mkdir(dirname(campaignPath), { recursive: true });
  await writeFile(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`, 'utf8');
  return { campaign, source: `${campaignPath} (generated)` };
};

const assignmentStatus = (assignments, role, id) => {
  let selected = { status: 'TODO', score: -1 };
  const roleKey = scopeKey(role);
  const scenarioKey = scopeKey(`${role}.${id}`);
  const scenarioUnderscoreKey = scopeKey(`${role}_${id}`);

  for (const assignment of assignments) {
    const precision =
      assignment.scope === scenarioKey || assignment.scope === scenarioUnderscoreKey
        ? 2
        : assignment.scope === roleKey
          ? 1
          : assignment.scope === 'all'
            ? 0
            : -1;

    if (precision === -1) continue;

    const originScore = assignment.origin === 'arg' ? 100 : 0;
    const score = originScore + precision * 10 + assignment.order;
    if (score >= selected.score) {
      selected = { status: assignment.status, score };
    }
  }

  return selected.status;
};

const countStatuses = (scenarios) =>
  scenarios.reduce(
    (counts, scenario) => ({
      ...counts,
      [scenario.status]: counts[scenario.status] + 1,
    }),
    { TODO: 0, PASSED: 0, BLOCKED: 0 },
  );

const flattenScenarioList = (scenarios, property, targetProperty) =>
  scenarios.flatMap((scenario) =>
    (scenario[property] || []).map((value) => ({
      role: scenario.role,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      status: scenario.status,
      [targetProperty]: value,
    })),
  );

const decide = (statusCounts, blockers) => {
  const reasons = [];
  if (statusCounts.BLOCKED > 0) {
    reasons.push(`${statusCounts.BLOCKED} scenario(s) BLOCKED`);
  }
  if (statusCounts.TODO > 0) {
    reasons.push(`${statusCounts.TODO} scenario(s) TODO`);
  }
  if (blockers.length > 0) {
    reasons.push(`${blockers.length} bloquant(s) a lever ou confirmer`);
  }

  return {
    value: reasons.length === 0 ? decisionValues.go : decisionValues.noGo,
    reasons:
      reasons.length === 0
        ? ['Tous les scenarios sont PASSED et aucun bloquant actif n est remonte.']
        : reasons,
  };
};

const escapeMarkdownCell = (value) =>
  String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');

const list = (items) =>
  items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- Aucun';

const renderMarkdown = (report) => `# PV recette terrain pilote - Sprint 16

## Campagne

| Champ | Valeur |
| --- | --- |
| Run | ${escapeMarkdownCell(report.runId)} |
| Genere le | ${escapeMarkdownCell(report.generatedAt)} |
| Executant | ${escapeMarkdownCell(report.operator)} |
| Environnement | ${escapeMarkdownCell(report.runtimeEnv)} |
| Base URL | ${escapeMarkdownCell(report.baseUrl)} |
| Source campagne | ${escapeMarkdownCell(report.campaignSource)} |
| Mode | Local simulable, sans appel API |
| Statuts | TODO: ${report.statusCounts.TODO}, PASSED: ${report.statusCounts.PASSED}, BLOCKED: ${report.statusCounts.BLOCKED} |
| Decision | ${report.decision.value} |

## Decision

**${report.decision.value}**

${list(report.decision.reasons)}

## Synthese des parcours

| Role | Scenario | Statut | Preuves attendues |
| --- | --- | --- | --- |
${report.scenarios
  .map(
    (scenario) =>
      `| ${escapeMarkdownCell(scenario.roleLabel)} | ${escapeMarkdownCell(
        scenario.title,
      )} | ${scenario.status} | ${escapeMarkdownCell(
        scenario.expectedEvidence.join('; '),
      )} |`,
  )
  .join('\n')}

## Bloquants actifs

${list(report.blockers.map((item) => `${item.role} / ${item.scenarioTitle}: ${item.blocker}`))}

## Reserves

${list(report.reserves.map((item) => `${item.role} / ${item.scenarioTitle}: ${item.reserve}`))}

## Irritants terrain

${list(report.irritants.map((item) => `${item.role} / ${item.scenarioTitle}: ${item.irritant}`))}

## Scenarios detailles

${report.scenarios
  .map(
    (scenario) => `### ${scenario.roleLabel} - ${scenario.title}

Statut: **${scenario.status}**

${scenario.description}

#### Etapes executees ou a simuler
${list(scenario.steps)}

#### Criteres de validation
${list(scenario.acceptanceCriteria)}

#### Preuves attendues
${list(scenario.expectedEvidence)}

#### Irritants
${list(scenario.irritants)}

#### Reserves
${list(scenario.reserves)}

#### Bloquants si scenario BLOCKED
${list(scenario.blockers)}
`,
  )
  .join('\n')}

## Prochaines corrections

${list(report.correctionBacklog.map((item) => `${item.priority} - ${item.topic}: ${item.action}`))}

## Commandes utiles

\`\`\`bash
node --check scripts/pilot-recette-execute.mjs
node scripts/pilot-recette-execute.mjs --out-dir /private/tmp --run-id sprint-16-pilot-recette --status all=PASSED
node scripts/pilot-recette-execute.mjs --campaign /private/tmp/pilot-campaign.json --out-dir /private/tmp --status manager=PASSED --status rh.absences=BLOCKED
PILOT_RECETTE_ADMIN_PILOT_SETUP_STATUS=BLOCKED node scripts/pilot-recette-execute.mjs
\`\`\`
`;

const now = new Date();
const runId =
  optionValue('--run-id') ||
  process.env.PILOT_RECETTE_RUN_ID ||
  `pilot-recette-${now.toISOString().slice(0, 10)}`;
const runtimeEnv =
  optionValue('--env') ||
  process.env.PILOT_RECETTE_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'local';
const baseUrl =
  optionValue('--base-url') ||
  process.env.PILOT_RECETTE_BASE_URL ||
  process.env.BASE_URL ||
  'non renseigne';
const operator =
  optionValue('--operator') ||
  process.env.PILOT_RECETTE_OPERATOR ||
  process.env.USER ||
  'recette locale';
const reportDir =
  optionValue('--out-dir') || process.env.REPORT_DIR || 'preprod-reports';
const campaignPath = optionValue('--campaign') || process.env.PILOT_RECETTE_CAMPAIGN;
const generatedAt = now.toISOString();

const { campaign, source: campaignSource } = await readOrGenerateCampaign(
  campaignPath,
);
if (!Array.isArray(campaign.scenarios) || campaign.scenarios.length === 0) {
  throw new Error('La campagne doit contenir une liste non vide scenarios[]');
}

const assignments = parseAssignments();
const scenarios = campaign.scenarios.map((scenario) => ({
  ...scenario,
  role: scenario.role,
  roleLabel: scenario.roleLabel || scenario.role,
  id: scenario.id,
  steps: scenario.steps || [],
  expectedEvidence: scenario.expectedEvidence || [],
  acceptanceCriteria: scenario.acceptanceCriteria || [],
  irritants: scenario.irritants || scenario.uxIrritants || [],
  reserves: scenario.reserves || [],
  blockers: scenario.blockers || [],
  status: assignmentStatus(assignments, scenario.role, scenario.id),
}));
const statusCounts = countStatuses(scenarios);
const blockers = flattenScenarioList(
  scenarios.filter((scenario) => scenario.status === 'BLOCKED'),
  'blockers',
  'blocker',
);
const reserves = flattenScenarioList(scenarios, 'reserves', 'reserve');
const irritants = flattenScenarioList(scenarios, 'irritants', 'irritant');
const decision = decide(statusCounts, blockers);

const report = {
  kind: 'pilot-recette-execution',
  runId,
  generatedAt,
  operator,
  runtimeEnv,
  baseUrl,
  campaignTitle: campaign.title || 'Sprint 16 - recette terrain pilote',
  campaignSource,
  localMode: true,
  destructive: false,
  allowedStatuses: [...allowedStatuses],
  statusCounts,
  statusAssignments: assignments,
  decision,
  scenarios,
  blockers,
  reserves,
  irritants,
  correctionBacklog: campaign.correctionBacklog || [],
};

await mkdir(reportDir, { recursive: true });

const safeRunId = slug(runId) || 'pilot_recette';
const markdownPath = join(reportDir, `${safeRunId}-pv-recette-pilote.md`);
const jsonPath = join(reportDir, `${safeRunId}-pv-recette-pilote.json`);

await writeFile(markdownPath, renderMarkdown(report), 'utf8');
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`PV Markdown: ${markdownPath}`);
console.log(`PV JSON: ${jsonPath}`);
console.log(
  `Decision: ${decision.value} (TODO=${statusCounts.TODO} PASSED=${statusCounts.PASSED} BLOCKED=${statusCounts.BLOCKED})`,
);
