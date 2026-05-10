# Sprint 34 - Production Go-Live Gate

Date: 2026-05-10
Version package observee: `Mediplan@0.0.1`
Statut cible: `PROD_READY_SOUS_RESERVE`

## Objectif

Preparer une porte courte de decision production apres le statut
`PILOT_SESSION_READY` du Sprint 33, sans declencher de deploiement et sans
inventer de signataires.

Ce gate sert a verifier que les preuves techniques, operations, securite et
support sont disponibles pour envisager la production. Il ne vaut pas
autorisation de mise en production client.

## Garde-fous

- Aucun push.
- Aucun tag cree automatiquement.
- Aucune migration lancee.
- Aucun seed, reset DB ou restauration backup.
- Aucun Docker compose up/down.
- Aucun deploiement.
- Aucun `GO_UTILISATEUR_EXTERNE` fictif.
- Aucun nom de signataire invente.
- Toute signature doit provenir d'une personne reelle et etre datee.

## Checklist finale

| Domaine | Controle attendu | Statut Sprint 34 | Preuve attendue |
| --- | --- | --- | --- |
| Version / tag | Version, commit et tag candidat identifies avant fenetre de production. | `A_VERIFIER` | Commit, changelog, tag ou reference release reelle. |
| Environnement | Variables et secrets production verifies hors depot. | `A_VERIFIER` | Checklist exploitation, coffre de secrets, responsable identifie. |
| Migrations | Inventaire des migrations connu sans execution destructive. | `A_VERIFIER` | `npm run migration:show` ou rapport DBA, sans `migration:run`. |
| Smoke | Parcours API/frontend critiques rejouables sur environnement cible. | `A_VERIFIER` | Smoke date, environnement, URL, resultat et logs. |
| Backup / restore | Backup exportable et restauration testee sur environnement controle. | `A_VERIFIER` | Rapport backup/restore avec date, duree, RPO/RTO observes. |
| Incident drill | Procedure incident et escalade rejouees. | `A_VERIFIER` | Rapport drill, contacts, horodatages, actions correctives. |
| Observabilite | Logs, metriques, alertes et traces minimales disponibles. | `A_VERIFIER` | Capture dashboard, alertes testees, runbook lie. |
| Securite dependances | Audit dependances backend/frontend revu. | `A_VERIFIER` | `npm audit` / `frontend:audit`, exceptions documentees. |
| Rollback | Procedure de retour arriere testable et critere d'activation defini. | `A_VERIFIER` | Runbook rollback, owner, fenetre, seuils go/no-go. |
| Support | Support lancement, astreinte et canal incident identifies. | `A_VERIFIER` | Planning support, contacts reels, procedure triage. |
| Decision | Decision formelle datee avec reserves et signataires reels. | `A_VERIFIER` | `SPRINT_34_PROD_READY_DECISION.md` complete et rattachee au ticket release. |

## Script non destructif propose

Le script npm Sprint 34 agrege uniquement des controles existants en mode
lecture ou plan:

```bash
npm run sprint34:prod:gate
```

Il lance:

- `npm run production:readiness -- --format json`
- `npm run production:freeze -- --format json`
- `npm run production:gates -- --format json`
- `npm run production:signoffs -- --format json`
- `git diff --check`

Les codes de sortie `2` de `production:readiness` et `production:freeze` sont
acceptes par l'agregateur, car ils representent un NO-GO fonctionnel attendu
quand les signatures ou preuves finales manquent. Les autres erreurs restent
bloquantes.

## Validations locales Sprint 34

Commandes non destructives pertinentes:

```bash
npm run sprint34:prod:gate
git diff --check
```

Commandes volontairement non lancees dans ce gate:

- `npm run migration:run`
- `npm run migration:revert`
- `npm run seed:demo`
- `npm run demo:reset`
- `npm run preprod:compose:up`
- `npm run preprod:compose:down`
- `npm run preprod:compose:migrate`
- `npm run preprod:compose:seed`
- `npm run preprod:backup:restore`
- toute commande de push, tag ou deploiement

## Decision attendue

Par defaut, en l'absence de preuves externes et de signatures reelles, la
decision recommandee est `PROD_READY_SOUS_RESERVE`.

`PROD_READY` ne doit etre retenu que si toutes les lignes de checklist sont
completees par des preuves reelles, que les signataires existent, et que les
reserves bloquantes sont levees ou acceptees formellement.
