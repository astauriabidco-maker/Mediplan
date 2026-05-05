# Sprint 18 - Decision release candidate

Date: 2026-05-05
Decision courante: `RC_READY`

## Synthese

La release candidate Sprint 18 peut avancer en candidate initiale si la
checklist non destructive reste verte et si les preuves preprod sont rattachees
avant freeze. La decision courante couvre la preparation RC, pas un tag ni une
bascule production.

Le statut `RC_READY` signifie:

- version package racine identifiee;
- changelog RC present dans `docs/release/CHANGELOG.md`;
- checklist `release-candidate-check --dry-run` executable;
- aucun tag, push, changement de version, migration ou deploiement automatique;
- risques restants documentes et acceptables pour poursuivre la validation.

Le statut passe en `RC_NO_GO` si:

- la checklist RC dry-run echoue;
- la version package est absente;
- le changelog RC est absent;
- `--include-git-status` revele des changements non attribues au moment du
  freeze;
- `/dashboard` depasse son budget sans correction;
- une validation preprod bloquante echoue sans reserve acceptee.

## Preuves a joindre avant freeze

| Domaine | Commande ou preuve | Attendu |
| --- | --- | --- |
| Syntaxe finalizer | `node --check scripts/release-candidate-finalize.mjs` | aucune erreur |
| Decision RC | `node scripts/release-candidate-finalize.mjs --dry-run` | sortie Markdown/JSON avec `RC_READY` ou `RC_NO_GO` |
| Statut Git | `node scripts/release-candidate-finalize.mjs --dry-run --include-git-status` | ecarts attribues ou worktree propre |
| Gate produit | `npm run ci:product` | vert sur branche candidate |
| Budget frontend | `npm run frontend:budget:check` | `/dashboard` sous 450 KiB |
| Preprod env | `ENV_FILE=.env.preprod npm run preprod:env:check` | configuration valide |
| Smoke preprod | `npm run preprod:compose:smoke` | endpoints critiques verts |
| Backup/restore | `npm run preprod:backup:restore` | restauration prouvee |

## Risques restants

### `/dashboard` budget watch

La route `/dashboard` concentre les indicateurs et graphiques de pilotage.
Le budget declare est 450 KiB, avec une zone watch a 85%. Avant `RC_READY`
final, conserver la preuve que `npm run frontend:budget:check` reste vert.

Mitigation:

- conserver les imports de graphiques et widgets lourds derriere des frontieres
  lazy;
- eviter de remonter des providers dashboard dans l'entry app;
- ouvrir une reserve performance si la route reste en zone watch;
- passer en `RC_NO_GO` si le budget est depasse.

### Validations preprod dependantes

Les validations preprod dependent de `.env.preprod`, Docker et des services
locaux. Elles ne sont pas relancees par les scripts RC pour garder le processus
non destructif.

Mitigation:

- rattacher les rapports smoke API, backup/restore et ops summary;
- noter tout ecart environnemental avec owner et date de resolution;
- bloquer la RC si backup recent, rollback ou smoke critique sont absents.

## Garde-fous

Le finalizer RC ne doit jamais:

- creer ou pousser un tag;
- modifier `package.json` ou `frontend/package.json`;
- modifier le changelog;
- lancer migration, Docker, seed, backup, restore ou deploiement;
- pousser une branche.

Il peut uniquement lire les fichiers, lancer `release-candidate-check --dry-run`
et, sur option, lire `git status --short`.
