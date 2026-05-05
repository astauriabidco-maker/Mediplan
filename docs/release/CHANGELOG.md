# Changelog

## Sprint 18 release candidate - Initial RC

Date: 2026-05-05
Version package: 0.0.1
Statut: release candidate initiale

### Ajoute

- Preparation release candidate Sprint 18 avec checklist non destructive.
- Decision RC formalisee autour des criteres version/changelog, budget frontend,
  audits, build/tests, preproduction et rollback.
- Surveillance explicite de la route critique `/dashboard`, budget 450 KiB,
  zone watch a 85%.
- Script final de consolidation RC en lecture seule:
  `node scripts/release-candidate-finalize.mjs --dry-run`.

### Controle RC

- Le script de preparation `scripts/release-candidate-check.mjs` compile la
  checklist Markdown/JSON et liste les commandes a executer manuellement.
- Le script de finalisation `scripts/release-candidate-finalize.mjs` agrege la
  checklist RC, la version package, le changelog et, sur option, le statut Git.
- Aucun script RC ne tagge, ne modifie la version, ne pousse de branche et ne
  lance de migration, Docker, seed, backup ou deploiement.

### Risques restants

- `/dashboard` reste sous surveillance budget: tout ajout de charting, widget
  analytique ou provider global doit rester lazy ou etre compense.
- Les validations preprod dependent encore de `.env.preprod`, Docker et des
  services locaux: smoke API, backup/restore et synthese operationnelle doivent
  etre conserves comme preuves avant bascule.
- Le travail concurrent des agents doit etre attribue avant freeze RC; utiliser
  `--include-git-status` au moment de figer la candidate.

### Validation locale attendue

```bash
node --check scripts/release-candidate-finalize.mjs
node scripts/release-candidate-finalize.mjs --dry-run
```
