# Sprint 38 - Decision levee reserves production client

Date: 2026-05-10
Decision cible: `PROD_CLIENT_READY`
Statut provisoire: `PROD_CLIENT_READY_SOUS_RESERVE`

## Objectif

Lever les reserves restantes avant vraie production client:

- `ENV_FILE` cible prod client;
- smoke HTTPS reel;
- backup/restore reel;
- monitoring branche;
- rollback teste;
- audits dependances connectes;
- decision responsable unique signee.

## Principe

Les preuves reelles doivent venir de l'environnement cible et de personnes
reelles. Aucune valeur sensible, aucun secret et aucune signature ne sont
inventes dans ce repository.

## Conditions de levee

| Reserve | Preuve obligatoire |
| --- | --- |
| ENV_FILE cible | Fichier hors repo ou variables cible valides via `sprint37:prod-client:smoke:strict`. |
| Smoke HTTPS | Rapport date sur `BASE_URL` cible, lecture seule, vert. |
| Backup/restore | Export, restore isole, compteurs compares, RPO/RTO observes. |
| Monitoring | Dashboards/liens/captures, alerte testee, destinataires confirmes. |
| Rollback | Test non destructif ou repetition controlee, temps observe, criteres connus. |
| Audits dependances | Audits backend/frontend connectes ou exceptions signees. |
| Responsable unique | Nom reel, date, commit, decision et acceptation du risque. |

## Validation attendue

```bash
ENV_FILE=.env.prod-client npm run sprint37:prod-client:smoke:strict
npm audit --omit=dev --audit-level=high
npm --prefix frontend audit --omit=dev --audit-level=high
git diff --check
```

## Validation executee

| Reserve | Resultat |
| --- | --- |
| ENV_FILE cible | `A_COMPLETER` - aucun fichier cible reel fourni. |
| Smoke HTTPS | `A_COMPLETER` - aucun appel reseau cible lance sans URL/accord. |
| Backup/restore | `A_COMPLETER` - procedure et PV prets, restore reel non lance. |
| Monitoring | `A_COMPLETER` - PV pret, liens/captures dashboard a rattacher. |
| Rollback | `A_COMPLETER` - PV pret, test reel non lance. |
| Audits dependances | `PASSED` - backend et frontend: 0 vulnerabilite high en prod deps. |
| Responsable unique | `A_COMPLETER` - PV pret, nom/date/commit non renseignes. |

## Decision finale

`PROD_CLIENT_READY_SOUS_RESERVE`.

La reserve securite dependances est levee. Les reserves restantes dependent
d'informations ou d'actions reelles hors repository: environnement cible,
smoke HTTPS, backup/restore, monitoring, rollback et signature responsable
unique.
