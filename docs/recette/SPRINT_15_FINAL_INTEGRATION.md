# Sprint 15 - Integration finale

Date de consolidation: 2026-05-05.

## Objectif

Centraliser l'etat de suite Sprint 15 sans cloturer artificiellement les phases
apres execution parallele des lots agents, remediation preprod ciblee et
validation technique locale.

## Perimetre documentaire

Fichiers de suivi:

- `docs/SPRINT_15_BACKLOG.md`;
- `docs/recette/SPRINT_15_FINAL_INTEGRATION.md`;
- rapports Phase 2/3 rattaches au ticket de recette quand ils sont produits.

Hors perimetre de cette integration documentaire:

- modifications `scripts/frontend`;
- corrections frontend ou backend;
- execution de mutations preprod hors fenetre supervisee.

## Etat des phases

| Phase | Etat au 2026-05-05 | Decision attendue |
| ----- | ------------------ | ----------------- |
| Phase 2 - Performance frontend | valide localement | conserver budget/build/lint/tests dans CI produit |
| Phase 3 - Robustesse drills preprod | valide en dry-run preprod | garder restore reel reserve a exercice supervise |
| Phase 4 - Donnees demo hospitalieres / alertes HIGH | remediation ciblee appliquee | separer ensuite demo saine/demo incident |
| Phase 5 - Observabilite produit | scripts de synthese ajoutes | raccorder ensuite a l'UI manager/audit |
| Phase 6 - Go/No-Go final / CI produit | orchestrateur non destructif ajoute | brancher dans CI apres stabilisation des durees |

## Phase 2 - Performance frontend

Etat: valide localement.

Elements consolides:

- le controle budget bundle dispose d'un rapport exploitable par route, asset,
  budget applique et recommandation;
- les gros chunks lazy dashboard/calendrier sont identifies comme points de
  surveillance;
- les commandes de controle applicables ont ete rejouees sur la version
  candidate.

Criteres de validation:

- `npm run frontend:budget:smoke` passe;
- `npm run frontend:budget:check` passe ou produit un rapport joint avec
  decision de reserve;
- `npm run frontend:build` passe si la validation frontend complete est
  demandee;
- `npm run frontend:test` passe ou toute reserve est documentee.

## Phase 3 - Robustesse drills preprod

Etat: valide en dry-run preprod.

Elements consolides:

- le drill reste non destructif par defaut;
- `INCIDENT_DRY_RUN=true` ou `--dry-run` force la simulation des mutations;
- `INCIDENT_ALLOW_RESTORE=true` reste reserve a un exercice supervise;
- les rapports Markdown/JSON doivent conserver les alertes hautes ouvertes.

Resultats observes:

- premier dry-run du 2026-05-05: mutations bloquees, decision `NO-GO`,
  observability `CRITICAL`, 4 alertes `HIGH` ouvertes;
- remediation ciblee appliquee via `PATCH /api/agent-alerts/:id/resolve`;
- dry-run rejoue le 2026-05-05: `PASSED`, decision `GO`, observability finale
  `HEALTHY`, `openHighAlerts=0`, audit chain `valid=true`, backup exportable.

Criteres de validation:

- `npm run preprod:incident:smoke` passe;
- `ENV_FILE=.env.preprod npm run preprod:incident:dry-run` passe avec aucune
  mutation executee;
- observability finale `HEALTHY` ou reserve metier explicite;
- audit chain `valid=true`;
- backup `exportable=true`;
- alertes hautes ouvertes `0` ou justification attachee au rapport.

## Phases suivantes

Phase 4 - Donnees demo hospitalieres:

- lot remediation alertes `HIGH` documente dans
  `docs/recette/SPRINT_15_PHASE_4_ALERT_REMEDIATION.md`;
- `openHighAlerts=0` valide apres remediation;
- dry-run incident non destructif relance apres remediation;
- separer fixtures `demo saine` et `demo incident`;
- garantir un retour `HEALTHY` apres seed + smoke standard;
- documenter un reset incident sans reset DB global.

Phase 5 - Observabilite produit:

- exposer le statut drill recent dans l'UI audit ou manager;
- afficher les alertes hautes ouvertes avec lien vers les details;
- rattacher exports audit/drill au ticket de decision.

Phase 6 - Go/No-Go final:

- lot CI produit documente dans
  `docs/recette/SPRINT_15_PHASE_6_CI_PRODUCT.md`;
- valider `node scripts/ci-product-verify.mjs --list` et
  `node scripts/ci-product-verify.mjs --dry-run` avant raccordement npm;
- compiler les preuves Phase 1, Phase 2 et Phase 3;
- verifier que les reserves restantes ont un proprietaire et une decision;
- declarer `GO`, `GO METIER SOUS RESERVE`, `NO-GO` ou `RECOVERY_CRITICAL`
  selon les criteres du backlog.

## Checklist validation

Avant toute decision:

```bash
git status --short
npm audit --omit=dev --audit-level=moderate
npm run frontend:budget:smoke
npm run frontend:budget:check
npm run preprod:incident:smoke
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
node scripts/ci-product-verify.mjs --list
node scripts/ci-product-verify.mjs --dry-run
git diff --check -- docs/SPRINT_15_BACKLOG.md docs/recette/SPRINT_15_FINAL_INTEGRATION.md
```

Preuves a attacher:

- rapport budget frontend si le controle produit une alerte ou une reserve;
- rapport drill Markdown;
- rapport drill JSON;
- synthese observability finale;
- statut audit chain;
- statut backup exportable;
- rapport remediation alertes si Phase 4 a ete executee;
- sortie `--list` / `--dry-run` CI produit si Phase 6 est raccordee;
- justification metier des alertes hautes restantes, le cas echeant.

## Checklist commit/push apres validation

1. Confirmer que seuls les fichiers documentaires attendus sont stages:

```bash
git status --short
git diff --cached --name-only
```

2. Stager uniquement le suivi Sprint 15:

```bash
git add docs scripts frontend package.json package-lock.json
```

3. Commiter apres validation technique:

```bash
git commit -m "chore(preprod): harden sprint 15 validation"
```

4. Pousser la branche de travail:

```bash
git push
```
