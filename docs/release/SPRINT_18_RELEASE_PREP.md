# Sprint 18 - Preparation release candidate

## Objectif

Preparer une release candidate Mediplan sans mutation automatique du codebase,
de la base ou de la preproduction. Le script de reference compile la checklist
Markdown et JSON:

```bash
node scripts/release-candidate-check.mjs --dry-run
```

Le script reste non destructif: il ne lance pas build, tests, audit, migration,
Docker, seed, backup, deploiement ou push. Le statut Git est volontairement
optionnel afin de respecter le travail concurrent des autres agents:

```bash
node scripts/release-candidate-check.mjs --dry-run --include-git-status
```

## Criteres RC

| Domaine | Go | No-go |
| --- | --- | --- |
| Version et changelog | Version racine identifiee et note RC documentee | version inconnue ou changement produit non trace |
| Statut Git | Worktree propre ou ecarts attribues avant freeze | conflit, secret suivi, ou modification critique non attribuee |
| Budget frontend | `npm run frontend:budget:check` passe | chunk entry, chunk global ou route critique hors budget |
| Route `/dashboard` | route sous 450 KiB et surveillee des 85% | route au-dessus du budget ou chunk attendu manquant |
| Audits | frontend audit sans vulnerabilite moderate ou plus; API/RBAC verts | vulnerabilite high/critical, DTO permissif, permission excessive |
| Build et tests | `npm run ci:product` passe sur la candidate | une gate requise echoue sans reserve acceptee |
| Preprod | smoke API, backup/restore, env check et notes rollback prets | rollback inconnu, backup absent ou smoke critique rouge |

Decision attendue:

- `GO RC`: tous les criteres requis sont verts et les risques restants sont
  acceptes;
- `GO RC SOUS RESERVE`: ecart mineur documente avec owner, ticket et date de
  resolution;
- `NO-GO RC`: echec bloquant sur securite, audit, budget critique, build/test,
  migration, backup ou rollback.

## Commandes a executer

Ces commandes sont listees par `scripts/release-candidate-check.mjs`; elles ne
sont pas executees par le script.

| Priorite | Commande | But |
| --- | --- | --- |
| Requis | `node --check scripts/release-candidate-check.mjs` | valider la syntaxe du script RC |
| Requis | `node scripts/release-candidate-check.mjs --dry-run` | produire la checklist Markdown + JSON |
| Requis | `npm run ci:product` | gate produit complete frontend + backend |
| Requis | `npm run frontend:budget:check` | surveiller budgets Vite et routes |
| Requis | `npm run frontend:smoke:routes` | verifier routes frontend critiques |
| Requis | `npm run frontend:audit` | detecter vulnerabilites moderate ou plus |
| Requis | `npm run ci:quality` | build backend, lint, tests unitaires/e2e isolation |
| Requis | `ENV_FILE=.env.preprod npm run preprod:env:check` | verifier configuration preprod |
| Requis | `npm run preprod:compose:smoke` | smoke API preprod |
| Requis | `npm run preprod:backup:restore` | preuve backup/restore tenant |
| Optionnel | `npm run preprod:ops:summary` | synthese operationnelle locale |

## Watch budget `/dashboard`

Le budget frontend actuel declare `/dashboard` comme route critique avec les
chunks `DashboardPage` et `DashboardAnalyticsCharts`, plafond 450 KiB. La zone
watch commence a 85%, soit 382.5 KiB.

Risque restant: cette route concentre les indicateurs et graphiques de pilotage.
Tout ajout de dependance charting, widget analytique ou provider global peut
faire depasser rapidement le budget. Avant `GO RC`, conserver la preuve de:

```bash
npm run frontend:build
npm run frontend:budget:check
```

Mitigations attendues si la route approche le seuil:

- garder les imports de graphiques et widgets lourds derriere des frontieres
  lazy;
- eviter de remonter des dependances dashboard dans l'entry app;
- ouvrir un ticket performance si `/dashboard` reste en zone watch malgre une
  gate verte;
- passer en `NO-GO RC` si le budget 450 KiB est depasse sans correction.

## Audits et securite

Preuves attendues:

```bash
npm run frontend:audit
npm test -- api-security.spec.ts --runInBand
npm run test:e2e -- rbac-work-policies-isolation.e2e-spec.ts planning-security-isolation.e2e-spec.ts --runInBand
```

Go si:

- aucune vulnerabilite frontend moderate ou plus;
- erreurs API sans fuite interne;
- DTO stricts et permissions RBAC conformes;
- audit chain verifiable;
- isolation tenant conservee.

No-go si:

- vulnerabilite high ou critical;
- action sensible accessible sans permission dediee;
- endpoint critique accepte un payload permissif;
- audit ou isolation tenant regressent.

## Notes de deploiement

Avant bascule:

- geler la branche candidate apres attribution des changements concurrents;
- verifier `npm run migration:show`;
- obtenir un backup recent;
- executer le smoke API preprod et le backup/restore;
- archiver les rapports Markdown/JSON disponibles;
- communiquer les risques restants et reserves aux owners RH/exploitation.

Apres bascule:

- tester connexion manager;
- ouvrir `/dashboard`;
- ouvrir `/manager/cockpit` et `/manager/worklist`;
- lancer une preview publication sans publication directe de test;
- verifier audit verify/export avec un role autorise;
- surveiller erreurs API frontend, budget bundle et alertes conformite.

Rollback applicatif:

1. suspendre les publications planning;
2. revenir au tag ou commit precedent;
3. redeployer backend et frontend ensemble;
4. verifier `/dashboard`, `/manager/cockpit`, `/manager/worklist` et audit;
5. relancer les smokes critiques.

Rollback donnees:

1. restaurer le backup dans un environnement isole;
2. comparer agents, services, shifts, leaves, work policies et audit;
3. valider avec RH avant remise en production.

## Validation Sprint 18

Commandes executees pour valider cette preparation:

```bash
node --check scripts/release-candidate-check.mjs
node scripts/release-candidate-check.mjs --dry-run
```

Critere d'acceptation:

- `node --check` ne remonte aucune erreur de syntaxe;
- `--dry-run` produit une section Markdown et un bloc JSON;
- le script ne lance aucune commande destructive;
- les risques restants mentionnent explicitement `/dashboard` proche budget;
- aucun push n'est effectue par ce lot.
