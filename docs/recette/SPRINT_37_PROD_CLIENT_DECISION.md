# Sprint 37 - Decision production client reelle

Date: 2026-05-10
Decision recommandee: `PROD_CLIENT_READY_SOUS_RESERVE`

## Objectif

Consolider les derniers prealables a une vraie production client: environnement
cible, backup/restore, smoke cible, monitoring, rollback, securite dependances
et signoff responsable unique.

Cette decision ne declenche aucun deploiement. Elle indique ce qui est pret,
ce qui reste a prouver sur la cible reelle, et quelles reserves bloquent encore
un `PROD_READY` strict.

## Validation executee

| Phase | Controle | Resultat |
| --- | --- | --- |
| 1 | Environnement cible reel | `READY_TO_VERIFY` - checklist et preuves attendues documentees. |
| 2 | Backup/restore reel | `READY_TO_VERIFY` - procedure documentee, restore reel non lance. |
| 3 | Smoke cible | `READY_WITH_RESERVES` - smoke plan local non destructif disponible, `ENV_FILE` cible non fourni. |
| 4 | Monitoring branche | `READY_TO_VERIFY` - checklist dashboards/seuils/preuves disponible. |
| 5 | Rollback teste | `READY_TO_VERIFY` - runbook disponible, rollback reel non lance. |
| 6 | Securite dependances finale | `BLOCKED_NETWORK` - audits locaux bloques DNS vers registry npm. |
| 7 | Signoff responsable unique | `A_SIGNER` - modele pret, aucun signataire invente. |

## Commandes non destructives

```bash
npm run sprint37:prod-client:smoke
git diff --check
```

Commande stricte a lancer dans le shell de la cible client, avec variables ou
fichier env reel:

```bash
ENV_FILE=.env.prod-client npm run sprint37:prod-client:smoke:strict
```

## Reserves bloquantes avant PROD_READY

| Reserve | Pourquoi elle bloque | Condition de levee |
| --- | --- | --- |
| Environnement cible non renseigne | Pas d'URL, secrets, DB et stockage valides dans ce dossier. | `ENV_FILE` cible ou preuves exploitation rattachees. |
| Backup/restore non prouve | Une production client doit etre restaurable avant ouverture. | Rapport restore isole avec compteurs et RPO/RTO. |
| Smoke cible non execute | Le smoke local ne remplace pas un smoke HTTPS sur l'environnement client. | Rapport smoke cible date, vert. |
| Monitoring non branche | Les seuils existent mais les dashboards/preuves restent a rattacher. | Captures/liens dashboards et alertes testees. |
| Rollback non teste | Le runbook existe mais le retour arriere n'a pas ete joue. | Test rollback non destructif ou acceptation formelle datee. |
| Audit dependances bloque | Les audits high/critical n'ont pas pu joindre le registre npm. | Audits backend/frontend connectes ou exception signee. |
| Signoff responsable unique non signe | Aucune vraie personne n'a encore accepte le risque prod. | Document Phase 7 complete avec nom, date, commit et decision. |

## Decision Sprint 37

Decision recommandee: `PROD_CLIENT_READY_SOUS_RESERVE`.

Le projet est structure pour passer en vraie production client, mais le feu
vert strict depend maintenant de preuves externes a ce repository: cible
deployee, backup restaure, smoke cible, monitoring branche, audit dependances
connecte et signature responsable unique.

Ne pas declarer `PROD_READY` tant que ces reserves ne sont pas levees.
