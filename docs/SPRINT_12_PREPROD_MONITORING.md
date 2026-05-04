# Sprint 12 Phase 4 - Monitoring preprod

Ce document decrit les controles preprod disponibles sans service externe:
healthchecks API, observabilite conformite/audit, metriques backup et rapport
quotidien genere localement.

## Healthchecks API

Endpoints publics:

| Endpoint | Usage | Attendu |
| --- | --- | --- |
| `GET /api/health/live` | Liveness process | `200`, `status: UP` |
| `GET /api/health/ready` | Readiness API + base | `200`, `database: UP`; `503` si la base est indisponible |

Ces endpoints ne lisent pas de donnees metier et ne necessitent pas de JWT.

## Observabilite conformite et audit

Endpoint protege par `planning:read`:

```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "$BASE_URL/api/planning/observability/health?tenantId=$TENANT_ID&from=2026-05-03T00:00:00.000Z&to=2026-05-04T23:59:59.999Z"
```

Le payload expose:

- `status` et `reasons` pour le cockpit preprod;
- compteurs alertes, shifts pending/validated/published, tentatives de publication;
- dernier audit `PUBLISH_PLANNING`;
- job `COMPLIANCE_SCAN`;
- verification de chaine audit (`audit.chain.valid`, `audit.chain.issues`).

Raisons critiques suivies:

- `HIGH_ALERTS_OPEN`;
- `LAST_PUBLICATION_BLOCKED`;
- `COMPLIANCE_SCAN_FAILURES`;
- `AUDIT_CHAIN_INVALID`.

## Metriques backup

Endpoint protege par `backup:read`:

```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "$BASE_URL/api/tenant-backups/metrics?tenantId=$TENANT_ID&from=2026-05-03T00:00:00.000Z&to=2026-05-04T23:59:59.999Z"
```

Le payload resume l'export tenant sans ecrire de fichier:

- version schema backup;
- `datasetCounts` par domaine;
- snapshot conformite planning avec shifts, exceptions et audits de conformite;
- drapeau `exportable`.

## Smoke API et rapport quotidien

Commande locale:

```bash
BASE_URL=http://localhost:3005 \
API_TOKEN=... \
TENANT_ID=tenant-a \
npm run smoke:api:preprod
```

Variables utiles:

| Variable | Defaut | Description |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3005` | URL API sans `/api` final |
| `API_TOKEN` | vide | JWT pour les endpoints proteges |
| `TENANT_ID` | vide | Tenant cible, respecte les regles super-admin existantes |
| `FROM` / `TO` | dernieres 24h | Periode ISO du rapport |
| `REPORT_DIR` | `preprod-reports` | Dossier local ignore par git |
| `SMOKE_REQUIRE_AUTH` | `false` | Passe le smoke en echec si `API_TOKEN` manque |

Le script verifie:

1. `GET /api/health/live`;
2. `GET /api/health/ready`;
3. `GET /api/planning/observability/health`;
4. `GET /api/audit/verify`;
5. `GET /api/tenant-backups/metrics`.

Il genere deux artefacts locaux:

- `preprod-reports/preprod-smoke-YYYY-MM-DD.md`;
- `preprod-reports/preprod-smoke-YYYY-MM-DD.json`.

## Routine quotidienne preprod

1. Lancer le deploiement preprod.
2. Executer `npm run smoke:api:preprod` avec un JWT de lecture planning, audit
   et backup.
3. Lire le statut global dans le rapport Markdown.
4. Si `status` vaut `FAILED`, traiter d'abord les checks HTTP en erreur.
5. Si l'API repond mais `Planning observability` est `CRITICAL`, traiter les
   raisons dans cet ordre: audit chain, scan conformite, publication bloquee,
   alertes hautes.
6. Conserver le Markdown dans le ticket de suivi preprod du jour.
