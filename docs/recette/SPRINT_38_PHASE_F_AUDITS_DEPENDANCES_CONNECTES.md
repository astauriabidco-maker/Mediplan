# Sprint 38 - Phase F - Audits dependances connectes

Date d'execution: 2026-05-10 21:42:29 CEST

## Objectif

Tenter les audits de dependances production backend et frontend demandes pour la
levee des reserves prod client, en lecture seule, sans mutation de lockfile,
sans correction automatique et sans push.

## Contexte d'execution

| Champ | Valeur |
| ----- | ------ |
| Branche | `main` |
| Commit audite | `ae980fac4bc70a99a0810e9e0d86430fe74cb200` |
| Node.js | `v20.20.2` |
| npm | `10.8.2` |
| Worktree | Sprint 37 non committe present avant execution; aucune action de revert. |

## Commandes lancees

Audits demandes:

```bash
npm audit --omit=dev --audit-level=high
npm --prefix frontend audit --omit=dev --audit-level=high
```

Verification de diff:

```bash
git diff --check
```

## Resultats

| Surface | Commande | Code retour | Resultat | High | Critical | Decision |
| ------- | -------- | ----------- | -------- | ---- | -------- | -------- |
| Backend production | `npm audit --omit=dev --audit-level=high` | `1` | `BLOCKED_NETWORK` | Non determinable | Non determinable | Audit non concluant; relance requise en environnement connecte autorise. |
| Frontend production | `npm --prefix frontend audit --omit=dev --audit-level=high` | `1` | `BLOCKED_NETWORK` | Non determinable | Non determinable | Audit non concluant; relance requise en environnement connecte autorise. |
| Diff courant | `git diff --check` | `0` | `PASSED` | N/A | N/A | Aucun probleme whitespace detecte par Git. |

## Sorties d'audit

### Backend production

Commande:

```bash
npm audit --omit=dev --audit-level=high
```

Sortie:

```text
npm warn audit request to https://registry.npmjs.org/-/npm/v1/security/audits/quick failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
undefined
npm error audit endpoint returned an error
npm error Log files were not written due to an error writing to the directory: /Users/user/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
```

### Frontend production

Commande:

```bash
npm --prefix frontend audit --omit=dev --audit-level=high
```

Sortie:

```text
npm warn audit request to https://registry.npmjs.org/-/npm/v1/security/audits/quick failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
undefined
npm error audit endpoint returned an error
npm error Log files were not written due to an error writing to the directory: /Users/user/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
```

## Interpretation

Les deux audits npm ont ete tentes avec les commandes demandees, en lecture seule.
Ils n'ont pas produit de rapport exploitable car l'environnement local ne resout
pas `registry.npmjs.org`:

```text
getaddrinfo ENOTFOUND registry.npmjs.org
```

Conformement a la contrainte Sprint 38, aucune escalade reseau n'a ete demandee
et aucun contournement n'a ete tente. Le resultat de securite reste donc
`BLOCKED_NETWORK` pour les surfaces backend et frontend.

## Relance connectee consolidee

Une relance a ensuite ete executee avec acces reseau npm explicitement autorise,
toujours en lecture seule et sans `audit fix`.

| Surface | Commande | Code retour | Resultat | Decision |
| --- | --- | ---: | --- | --- |
| Backend production | `npm audit --omit=dev --audit-level=high` | `0` | `found 0 vulnerabilities` | `PASSED` |
| Frontend production | `npm --prefix frontend audit --omit=dev --audit-level=high` | `0` | `found 0 vulnerabilities` | `PASSED` |

La reserve `BLOCKED_NETWORK` est donc levee pour Sprint 38. Les rapports complets
doivent encore etre rattaches au ticket de decision si un client ou auditeur les
demande.

## Garde-fous respectes

- aucune commande `npm audit fix`;
- aucune installation de dependance;
- aucune mutation volontaire de `package-lock.json` ou `frontend/package-lock.json`;
- aucun revert des changements Sprint 37 non committes;
- aucun push;
- seul ce document Sprint 38 Phase F est cree dans le cadre de cette phase.

## Suite requise

Rattacher les sorties connectees au ticket de decision production client si la
preuve formelle est requise. Toute nouvelle mise a jour de dependances doit
relancer les deux audits.
