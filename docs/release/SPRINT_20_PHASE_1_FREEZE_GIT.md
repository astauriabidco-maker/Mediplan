# Sprint 20 Phase 1 - Freeze Git

Date: 2026-05-05
Statut cible: `FREEZE_READY`
Statut par defaut sans alignement Git complet: `FREEZE_NO_GO`

## Objectif

Produire une preuve de freeze Git non destructive avant production. Le controle
aggrege l'etat Git local, le dernier commit, la branche courante, la divergence
avec l'upstream local si elle est disponible, et la decision RC via
`release:candidate:finalize` en dry-run avec statut Git inclus.

Ce controle ne publie rien et ne synchronise pas le depot. Il lit uniquement les
refs locales deja presentes.

## Commande

```bash
node scripts/production-freeze-check.mjs --dry-run
```

Sortie JSON seule:

```bash
node scripts/production-freeze-check.mjs --dry-run --format json
```

## Preuves agregees

- `git status --short`
- `git log -1 --format=...`
- `git branch --show-current`
- `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`
- `git rev-list --left-right --count HEAD...@{upstream}` si l'upstream existe
- `npm --silent run release:candidate:finalize -- --include-git-status --format json`

## Decision

`FREEZE_READY` si:

- `git status --short` est vide;
- la branche courante n'est pas en detached HEAD;
- l'upstream est disponible depuis les refs locales;
- la branche est alignee avec son upstream local (`ahead=0`, `behind=0`);
- `release:candidate:finalize` retourne `RC_READY`.

`FREEZE_NO_GO` si un seul de ces elements manque ou echoue.

## Divergence origin

La divergence est calculee sans `git fetch`, sans `git pull` et sans acces
reseau obligatoire. Si l'upstream local n'est pas configure ou si les refs
locales ne permettent pas de comparer `HEAD...@{upstream}`, le statut reste
`FREEZE_NO_GO` avec une raison explicite.

## Sortie attendue

Le script imprime Markdown et JSON par defaut. La decision est toujours l'une
des deux valeurs suivantes:

- `FREEZE_READY`
- `FREEZE_NO_GO`

Le bloc JSON contient les fichiers modifies detectes par `git status --short`,
le dernier commit, la branche, la divergence et la sortie parse du finalizer RC.

## Garde-fous

- Aucun push.
- Aucun pull ou fetch.
- Aucun tag.
- Aucun commit.
- Aucune ecriture de fichier.
- Aucune modification de version.
- Aucune migration.
- Aucun Docker, seed, backup, restore ou deploiement.
