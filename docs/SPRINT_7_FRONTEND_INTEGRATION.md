# Sprint 7 - Contrats frontend planning manager

Cette note stabilise les contrats API utiles au cockpit manager, au parcours de correction, a la prepublication et a la timeline metier.

Tous les endpoints ci-dessous sont scopes par tenant via le JWT. Le parametre `tenantId` est accepte sur les endpoints de lecture pour les `SUPER_ADMIN`; il est ignore pour les autres roles.

## Permissions

| Usage                                                           | Permission requise                 |
| --------------------------------------------------------------- | ---------------------------------- |
| Cockpit, synthese, worklist, indicateurs service, observabilite | `planning:read`                    |
| Rapports de publication et timeline basee audit                 | `audit:read`                       |
| Reassigner, demander remplacement, resoudre alerte, revalider   | `planning:write`                   |
| Resoudre une alerte planning                                    | `planning:write` + `alerts:manage` |
| Publier le planning                                             | `planning:manage`                  |
| Autoriser une exception controlee                               | `planning:exception`               |

## Endpoints disponibles

### Synthese conformite

`GET /planning/compliance/summary?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.000Z`

Retourne les compteurs du cockpit: alertes ouvertes, shifts bloques, agents a risque, publications refusees, criticite des alertes, apercu des shifts bloques.

Etat UI attendu:

- `counters.blockedShifts > 0`: afficher un etat "A corriger avant publication".
- `counters.refusedPublications > 0`: afficher le dernier refus dans la zone prepublication.
- `blockedShiftPreview`: ouvrir directement le detail "pourquoi ce shift est bloque ?".

### File de travail manager

`GET /planning/compliance/worklist?from=...&to=...`

Categories stables:

- `REST_INSUFFICIENT`
- `WEEKLY_OVERLOAD`
- `MISSING_COMPETENCY`
- `LEAVE_CONFLICT`

Sources stables:

- `ALERT`
- `SHIFT_VALIDATION`

Chaque item porte `agentId`, `shiftId` ou `alertId` si l'action correspondante est possible.

### Indicateurs par service

`GET /planning/compliance/service-indicators?from=...&to=...`

Metriques par service:

- `coverageRate`: couverture planning calculee en pourcentage.
- `weeklyOverloadAgents`: nombre d'agents au-dessus du plafond hebdomadaire.
- `publishedComplianceRate`: part des shifts valides ou publies.
- `openAlertsBySeverity`: compteurs `HIGH`, `MEDIUM`, `LOW`.
- `exceptionsApproved`: exceptions controlees deja autorisees.

Etat UI attendu:

- `coverageRate < 80`: service en sous-couverture.
- `weeklyOverloadAgents > 0`: priorite correction.
- `publishedComplianceRate < 100`: service non pret pour publication propre.

### Pourquoi un shift est bloque

`GET /planning/shifts/:id/compliance`

Exemple de retour utile:

```json
{
  "shift": {
    "id": 42,
    "agentId": 17,
    "start": "2026-01-12T08:00:00.000Z",
    "end": "2026-01-12T20:00:00.000Z",
    "status": "PENDING"
  },
  "validation": {
    "isValid": false,
    "blockingReasons": ["WEEKLY_HOURS_LIMIT_EXCEEDED"],
    "warnings": [],
    "metadata": {
      "weeklyHours": 52,
      "weeklyLimit": 48
    }
  }
}
```

Etat UI attendu:

- `validation.isValid === false`: afficher les `blockingReasons` et proposer une action de correction.
- `warnings.length > 0`: publication possible seulement si les warnings sont compris par le manager.

### Actions de resolution

Reassigner:

`POST /planning/shifts/:id/reassign`

```json
{
  "agentId": 18
}
```

Demander remplacement:

`POST /planning/shifts/:id/request-replacement`

```json
{
  "reason": "Agent en surcharge hebdomadaire"
}
```

Resoudre alerte:

`PATCH /planning/alerts/:id/resolve`

```json
{
  "reason": "Shift reattribue et validation relancee"
}
```

Relancer validation:

`POST /planning/shifts/:id/revalidate`

Autoriser exception:

`POST /planning/shifts/:id/exception`

```json
{
  "reason": "Continuite de service critique, aucun remplacant disponible"
}
```

La justification d'exception est obligatoire et doit etre affichee dans la timeline et les rapports de publication.

### Prepublication et publication

Prepublication compatible Sprint 7:

`GET /planning/compliance/prepublication?from=...&to=...`

Ce contrat est prepare cote DTO avec `PrepublicationReadinessResponseDto`. Tant que l'endpoint dedie n'est pas raccorde, le frontend peut composer cette vue avec:

- `GET /planning/compliance/worklist`
- `GET /planning/compliance/summary`
- `GET /planning/compliance/reports`

Publication:

`POST /planning/publish`

```json
{
  "start": "2026-01-01T00:00:00.000Z",
  "end": "2026-01-31T23:59:59.000Z"
}
```

Etat UI attendu:

- Succes: afficher `affected` et `report.publishedShifts`.
- Refus: afficher `report.violations`, proposer les actions depuis la worklist.
- Exception approuvee: afficher le warning avec raison, approbateur et date.

### Rapports et observabilite

Rapports:

`GET /planning/compliance/reports?from=...&to=...&limit=50`

Observabilite production:

`GET /planning/observability/health?from=...&to=...`

Etats stables:

- `HEALTHY`
- `DEGRADED`
- `CRITICAL`
- `UNKNOWN`

Le cockpit doit afficher les `reasons` sans les traduire cote API. La traduction UI peut mapper, par exemple, `HIGH_ALERTS_OPEN` vers "Alertes critiques ouvertes".

### Timeline metier

Endpoint compatible Sprint 7 propose:

`GET /planning/manager/timeline?from=...&to=...&shiftId=42&agentId=17`

DTO prepare: `ManagerTimelineResponseDto`.

Evenements attendus:

- `ALERT_CREATED`
- `SHIFT_REASSIGNED`
- `REPLACEMENT_REQUESTED`
- `ALERT_RESOLVED`
- `SHIFT_REVALIDATED`
- `EXCEPTION_APPROVED`
- `PLANNING_PUBLICATION`

Tant que l'endpoint dedie n'est pas raccorde, la timeline peut etre reconstruite depuis les audits filtres `PUBLISH_PLANNING`, `SHIFT`, `WORK_POLICY` et les actions manager.

## Erreurs exploitables

| HTTP  | Cas UI                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------- |
| `400` | Date invalide, limite hors borne, validation shift refusee, exception sans justification           |
| `401` | Session expiree                                                                                    |
| `403` | Permission manquante ou tentative cross-tenant                                                     |
| `404` | Shift, agent ou alerte introuvable dans le tenant                                                  |
| `409` | Etat metier concurrent possible, par exemple shift deja traite, si ajoute par les phases suivantes |

Les messages de validation metier renvoyes par les mutations doivent etre affiches pres de l'action, pas comme une erreur globale generique.

## DTOs frontend stabilises

DTOs existants ou prepares dans `src/planning/dto/compliance-api.dto.ts`:

- `ComplianceSummaryResponseDto`
- `ManagerWorklistResponseDto`
- `ServiceComplianceIndicatorsResponseDto`
- `ShiftComplianceResponseDto`
- `PublishPlanningResponseDto`
- `ProductionObservabilityHealthResponseDto`
- `ManagerCockpitResponseDto`
- `ManagerCorrectionSuggestionsResponseDto`
- `PrepublicationReadinessResponseDto`
- `ManagerTimelineResponseDto`
