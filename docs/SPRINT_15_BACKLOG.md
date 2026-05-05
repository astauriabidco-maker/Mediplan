# Sprint 15 - Backlog recommande

## Objectif

Transformer la preproduction technique et la recette metier Sprint 14 en socle
pre-production exploitable durablement: securite dependances, performance
frontend, robustesse des drills, donnees de demonstration et observabilite
operationnelle.

## Etat integration Sprint 15

Date de consolidation: 2026-05-05.

| Phase | Etat integration | Prochaine decision |
| ----- | ---------------- | ------------------ |
| Phase 1 - Securite dependances runtime | preuves techniques presentes dans le backlog | conserver comme prerequis de Go/No-Go final |
| Phase 2 - Performance frontend | valide localement | conserver budget/build/lint/tests dans CI produit |
| Phase 3 - Robustesse drills preprod | valide en dry-run preprod | garder restore reel reserve a exercice supervise |
| Phase 4 - Donnees demo hospitalieres / alertes HIGH | remediation ciblee appliquee | separer ensuite demo saine/demo incident |
| Phase 5 - Observabilite produit | scripts de synthese ajoutes | raccorder ensuite a l'UI manager/audit |
| Phase 6 - Go/No-Go final pre-recette terrain / CI produit | orchestrateur non destructif ajoute | brancher dans CI apres stabilisation des durees |

## Phase 1 - Securite dependances runtime

Priorite: haute.

| Sujet            | Constat                                                                                                                                           | Action recommandee                                                                                                         | Critere de sortie                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `expr-eval`      | Utilise uniquement dans `src/payroll/payroll.service.ts` pour evaluer conditions/formules de regles paie. `npm audit` ne propose aucun correctif. | Remplace le 2026-05-05 par un evaluateur interne strict avec allowlist variables/fonctions et sans acces membre/prototype. | `npm test -- payroll-expression-evaluator.spec.ts --runInBand` `PASSED`; audit sans alerte `expr-eval`. |
| `nodemailer`     | Utilise via `@nestjs-modules/mailer` dans `src/mail`. `npm audit fix --force` propose un changement cassant.                                      | Migre le 2026-05-05 vers `nodemailer@8.0.7`; chargement mailer et build verifies.                                          | `npm audit --omit=dev --audit-level=moderate` `PASSED`, 0 vulnerabilite.                                |
| `uuid` transitif | Remonte via `typeorm` et `preview-email`; `npm audit fix --force` propose une regression TypeORM 0.2.41.                                          | Corrige le 2026-05-05 par override `uuid@14.0.0`, sans downgrade TypeORM; chargement TypeORM/preview-email verifie.        | Aucun downgrade TypeORM; audit runtime `PASSED`, 0 vulnerabilite.                                       |

Commandes de controle:

```bash
npm audit --omit=dev --audit-level=moderate
npm run build
npm run test:unit:nucleus
```

## Phase 2 - Performance frontend

Priorite: moyenne-haute.

Constat Sprint 14:

- routes deja chargees par `React.lazy`;
- les plus gros morceaux observes pendant build sont `DashboardAnalyticsCharts`,
  `index`, `PlanningCalendar` et le calendrier planning;
- le budget Vite a deja un script dedie: `npm run frontend:budget:check`.

Actions recommandees:

1. Extraire les graphiques dashboard derriere un import dynamique dedie.
2. Verifier que `react-big-calendar` ne charge que la route planning.
3. Passer `date-fns`/locales et `recharts` en imports stricts.
4. Ajouter un rapport bundle au dossier de recette quand le budget echoue.
5. Garder l'objectif: aucun chunk route critique manager/audit/prepublication
   au-dessus de son budget.

Mise a jour Sprint 15 Phase 2, 2026-05-05:

- Etat: valide localement. Les controles `frontend:build`,
  `frontend:budget:check`, `frontend:budget:smoke`, `frontend:lint`,
  `frontend:test`, `frontend:smoke:routes` et l'audit frontend ont ete rejoues
  sur la version candidate.
- `vite.config.ts` conserve le split automatique Rollup/Vite pour ne pas
  degrader le tree-shaking de `recharts`.
- les gros chunks lazy dashboard/calendrier ne sont plus ajoutes aux
  `modulepreload` HTML initiaux (`DashboardAnalyticsCharts`,
  `PlanningCalendar`, `react-big-calendar`, `dragAndDrop`, `width`);
- tentative `manualChunks` explicite non retenue: `recharts` forcait un vendor
  plus lourd que le chunk lazy existant, et le calendrier risquait de capturer
  des dependances communes.

Commandes de controle:

```bash
npm run frontend:build
npm run frontend:budget:check
npm run frontend:test
```

## Phase 3 - Robustesse drills preprod

Priorite: haute.

Etat Sprint 15 Phase 3, 2026-05-05: valide en dry-run preprod.

- le drill incident reste non destructif par defaut: publication en preview et
  restauration desactivee tant que `INCIDENT_ALLOW_PUBLISH=true` ou
  `INCIDENT_ALLOW_RESTORE=true` ne sont pas fournis explicitement;
- `--dry-run` et `INCIDENT_DRY_RUN=true` forcent la simulation des mutations,
  meme si les flags d'autorisation sont fournis;
- `INCIDENT_ALLOW_RESTORE=false` reste la posture nominale; le mode restore est
  reserve a un exercice supervise et documente dans
  `docs/recette/SPRINT_14_INCIDENTS_RECETTE.md`;
- les rapports `preprod-incident-drill-YYYY-MM-DD.md/json` incluent les alertes
  hautes ouvertes avec agent, type, regle et message quand elles subsistent;
- les corrections metier appliquees pendant la recette sont tracees dans les
  rapports de recette Sprint 14 et reprises comme preuves de consolidation.
- le premier dry-run preprod du 2026-05-05 a correctement bloque les mutations,
  mais a produit un `NO-GO` metier car l'observability finale restait
  `CRITICAL` avec 4 alertes `HIGH` ouvertes sur `HGD-DOUALA`;
- apres remediation ciblee des alertes, le dry-run rejoue le 2026-05-05 a
  retourne `PASSED`, decision `GO`, observability finale `HEALTHY`,
  `openHighAlerts=0`, audit chain `valid=true` et backup exportable.

Commandes de validation:

```bash
node --check scripts/preprod-incident-drill.mjs
node --check scripts/preprod-incident-drill.smoke.mjs
npm run preprod:incident:smoke
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

Commande reservee a un exercice supervise:

```bash
ENV_FILE=.env.preprod INCIDENT_ALLOW_RESTORE=true node scripts/preprod-incident-drill.mjs
```

Criteres de sortie:

- script syntaxiquement valide;
- smoke local non reseau `PASSED`;
- drill non destructif `PASSED`;
- observability finale `HEALTHY`;
- audit chain `valid=true`;
- backup `exportable=true`;
- alertes hautes ouvertes `0` ou reserve metier explicite rattachee au rapport.

Reserves:

- l'execution live depend de la disponibilite de la stack preprod, de
  `.env.preprod` et d'un compte/token avec `planning:read`,
  `planning:publish`, `backup:read` et `backup:write`;
- toute future mutation supplementaire du script doit etre couverte par
  `--dry-run` / `INCIDENT_DRY_RUN=true` et apparaitre dans le journal
  `mutations`.

## Phase 4 - Donnees demo hospitalieres et remediation alertes HIGH

Priorite: moyenne.

Etat: remediation ciblee appliquee. Les 4 alertes `HIGH` `HGD-DOUALA` sont
resolues via l'API applicative et documentees dans
`docs/recette/SPRINT_15_PHASE_4_ALERT_REMEDIATION.md`. La validation
post-remediation a prouve `openHighAlerts=0` et observability finale
`HEALTHY`.

Objectif: eviter que le seed cree volontairement des anomalies qui ressemblent
a des incidents de preprod non maitrises.

Actions recommandees:

- separer fixtures `demo saine` et fixtures `demo incident`;
- documenter les exceptions controlees deja presentes;
- garantir que `HGD-DOUALA` revient a `HEALTHY` apres seed + smoke standard;
- fournir un script de reset de recette incident sans reset DB global.

Critere de demarrage:

- etat Phase 3 connu et rapport drill attache;
- alertes `HIGH` restantes inventorisees et traitees par resolution ciblee ou
  reserve metier explicite;
- anomalies demo existantes classees en `saine`, `incident controle` ou
  `a corriger`;
- proprietaire technique et proprietaire metier identifies.

Critere de sortie:

- rapport remediation Markdown/JSON attache si des alertes `HIGH` etaient
  presentes;
- dry-run incident rejoue apres remediation;
- `openHighAlerts=0` ou reserve metier explicite acceptee;
- seed demo sain rejouable sans alerte haute ouverte non justifiee;
- fixtures incident executables uniquement via une commande explicite;
- reset recette incident documente et non destructif hors perimetre incident.

## Phase 5 - Observabilite produit

Priorite: moyenne.

Etat: scripts de synthese ajoutes apres consolidation Phase 3/4.

Artefact ajoute:

- `scripts/preprod-operational-summary.mjs`, avec rapport Markdown/JSON Go/No-Go
  non destructif et mode mock pour smoke local.

Actions recommandees:

- exposer dans l'UI audit les rapports de drill ou au moins leur statut;
- afficher le nombre d'alertes hautes ouvertes dans le cockpit manager;
- ajouter un lien direct de l'observability vers les alertes concernees;
- conserver les exports audit/drill dans le ticket de decision.

Critere de sortie:

- cockpit manager ou audit affiche le statut drill recent, la date, le tenant
  et le nombre d'alertes hautes ouvertes;
- lien direct vers les alertes ou rapports sources;
- exports audit/drill rattaches a la decision Go/No-Go.

## Phase 6 - Go/No-Go final pre-recette terrain et CI produit

Priorite: haute avant ouverture a des utilisateurs pilotes.

Etat: orchestrateur CI produit non destructif ajoute et documente dans
`docs/recette/SPRINT_15_PHASE_6_CI_PRODUCT.md`. Les Phases 2, 3 et 4 sont
validees cote technique; le branchement CI permanent reste a faire dans une
fenetre dediee.

Critere recommande:

- Sprint 14 e2e manager/RH/auditeur: `PASSED`;
- frontend build/lint/tests: `PASSED`;
- drill incident: `PASSED`;
- preprod observability: `HEALTHY`;
- alertes hautes ouvertes: `0`;
- audit chain: `valid=true`;
- backup exportable: `true`;
- securite dependances: reserve signee ou levee.
- CI produit: `node scripts/ci-product-verify.mjs --list` et
  `node scripts/ci-product-verify.mjs --dry-run` valides avant raccordement npm.

Decision attendue:

- `GO` si tous les criteres sont verts et les rapports sont attaches;
- `GO METIER SOUS RESERVE` si une reserve explicitement acceptee reste ouverte;
- `NO-GO` si observability `CRITICAL`, alertes hautes non justifiees, audit
  invalide, backup non exportable ou budget frontend bloquant;
- `RECOVERY_CRITICAL` si la reprise apres incident reste critique.

## Checklist commit/push apres validation

A executer uniquement apres validation des phases concernees et verification du
perimetre de fichiers.

1. Verifier le perimetre:

```bash
git status --short
git diff -- docs/SPRINT_15_BACKLOG.md docs/recette/SPRINT_15_FINAL_INTEGRATION.md
```

2. Verifier que les controles applicables sont attaches a la recette:

```bash
npm run frontend:budget:smoke
npm run frontend:budget:check
npm run preprod:incident:smoke
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
git diff --check -- docs/SPRINT_15_BACKLOG.md docs/recette/SPRINT_15_FINAL_INTEGRATION.md
```

3. Stager uniquement la documentation d'integration Sprint 15:

```bash
git add docs/SPRINT_15_BACKLOG.md docs/recette/SPRINT_15_FINAL_INTEGRATION.md
```

4. Commiter apres accord validation:

```bash
git commit -m "docs: update sprint 15 integration follow-up"
```

5. Pousser la branche de travail apres revue locale:

```bash
git push
```
