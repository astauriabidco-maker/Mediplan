# Sprint 15 - Backlog recommande

## Objectif

Transformer la preproduction technique et la recette metier Sprint 14 en socle
pre-production exploitable durablement: securite dependances, performance
frontend, robustesse des drills, donnees de demonstration et observabilite
operationnelle.

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

Commandes de controle:

```bash
npm run frontend:build
npm run frontend:budget:check
npm run frontend:test
```

## Phase 3 - Robustesse drills preprod

Priorite: haute.

Actions recommandees:

- conserver le drill incident non destructif par defaut;
- garder `INCIDENT_ALLOW_RESTORE=false` sauf exercice supervise;
- enrichir les rapports avec les alertes hautes ouvertes;
- ajouter un mode `--dry-run` explicite si le script evolue vers plus de
  mutations;
- documenter toute correction metier preprod appliquee pendant la recette.

Critere de sortie:

```bash
ENV_FILE=.env.preprod node scripts/preprod-incident-drill.mjs
```

doit retourner `PASSED`, observability `HEALTHY`, audit chain valide et backup
exportable.

## Phase 4 - Donnees demo hospitalieres

Priorite: moyenne.

Objectif: eviter que le seed cree volontairement des anomalies qui ressemblent
a des incidents de preprod non maitrises.

Actions recommandees:

- separer fixtures `demo saine` et fixtures `demo incident`;
- documenter les exceptions controlees deja presentes;
- garantir que `HGD-DOUALA` revient a `HEALTHY` apres seed + smoke standard;
- fournir un script de reset de recette incident sans reset DB global.

## Phase 5 - Observabilite produit

Priorite: moyenne.

Actions recommandees:

- exposer dans l'UI audit les rapports de drill ou au moins leur statut;
- afficher le nombre d'alertes hautes ouvertes dans le cockpit manager;
- ajouter un lien direct de l'observability vers les alertes concernees;
- conserver les exports audit/drill dans le ticket de decision.

## Phase 6 - Go/No-Go final pre-recette terrain

Priorite: haute avant ouverture a des utilisateurs pilotes.

Critere recommande:

- Sprint 14 e2e manager/RH/auditeur: `PASSED`;
- frontend build/lint/tests: `PASSED`;
- drill incident: `PASSED`;
- preprod observability: `HEALTHY`;
- alertes hautes ouvertes: `0`;
- audit chain: `valid=true`;
- backup exportable: `true`;
- securite dependances: reserve signee ou levee.

Decision attendue si Phase 1 reste ouverte: `GO METIER SOUS RESERVE`.
