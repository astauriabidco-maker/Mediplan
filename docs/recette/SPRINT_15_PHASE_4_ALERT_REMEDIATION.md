# Sprint 15 Phase 4 - Remediation alertes HIGH HGD-DOUALA

Date: 2026-05-05

## Objectif

Corriger ou documenter les 4 alertes `HIGH` ouvertes en preprod sur le tenant
`HGD-DOUALA`, sans action destructive:

- pas de suppression massive;
- pas de reset DB;
- pas de migration destructive;
- pas de publication planning;
- pas de restauration backup.

## Etat initial

Le dry-run incident preprod du 2026-05-05 a retourne `NO-GO`: les mutations
etaient bien bloquees, mais l'observability restait `CRITICAL` avec raison
`HIGH_ALERTS_OPEN`.

Alertes ouvertes observees:

| ID | Agent | Type | Message |
| ---: | --- | --- | --- |
| 14 | Pauline NGONO EBOGO | QVT_FATIGUE | Depassement du temps de travail: 60.0h effectuees (limite 48h) |
| 13 | Leon ZAMBO ANGUISSA | QVT_FATIGUE | Depassement du temps de travail: 60.0h effectuees (limite 48h) |
| 12 | Jeanne MEKA BILONG | QVT_FATIGUE | Risque de burn-out eleve (Score: 100/100) |
| 11 | Jeanne MEKA BILONG | QVT_FATIGUE | Depassement du temps de travail: 96.0h effectuees (limite 48h) |

Ces alertes proviennent du worker QVT historique. Elles ne disposent pas d'une
remediation automatique equivalente aux alertes de compliance planning gerees
par `ComplianceAlertService`. La remediation preprod retenue est donc une
resolution ciblee, auditee par l'API `PATCH /api/agent-alerts/:id/resolve`,
avec une raison explicite.

## Script

Script dedie:

```bash
scripts/preprod-alert-remediation.mjs
```

Mode inventaire non mutating:

```bash
ENV_FILE=.env.preprod node scripts/preprod-alert-remediation.mjs
```

Mode remediation ciblee:

```bash
ENV_FILE=.env.preprod \
PREPROD_ALERT_REMEDIATION_APPLY=true \
node scripts/preprod-alert-remediation.mjs --apply
```

Gardes:

- `TENANT_ID=HGD-DOUALA` par defaut;
- `PREPROD_ALERT_REMEDIATION_EXPECTED_COUNT=4` par defaut;
- en mode `apply`, le script refuse d'agir si le nombre d'alertes ouvertes ne
  correspond pas au nombre attendu;
- la resolution est faite une alerte a la fois via l'API applicative;
- les rapports sont ecrits dans `preprod-reports/`.

## Preuves attendues

Le script produit:

- `preprod-reports/preprod-alert-remediation-YYYY-MM-DD.md`;
- `preprod-reports/preprod-alert-remediation-YYYY-MM-DD.json`.

Les preuves doivent contenir:

- le nombre d'alertes `HIGH` avant/apres;
- la liste des alertes traitees;
- la raison de resolution;
- le rappel des gardes de securite;
- le statut final.

## Validation post-remediation

Relancer le dry-run incident non destructif:

```bash
ENV_FILE=.env.preprod npm run preprod:incident:dry-run
```

Critere de sortie:

- `Alertes HIGH apres: 0` dans le rapport de remediation;
- `openHighAlerts=0` dans le rapport incident;
- observability finale non `CRITICAL`;
- decision `GO` si audit chain valide et backup exportable.

## Resultat applique

Execution du 2026-05-05:

- remediation ciblee: `PASSED`;
- mode: `apply`;
- alertes `HIGH` avant: 4;
- alertes `HIGH` apres: 0;
- resolution: 4 appels `PATCH /api/agent-alerts/:id/resolve` retournes `200`;
- dry-run incident relance: `PASSED`;
- decision Go/No-Go: `GO`;
- observability finale: `HEALTHY`;
- audit chain: `valid=true`;
- backup: exportable.
