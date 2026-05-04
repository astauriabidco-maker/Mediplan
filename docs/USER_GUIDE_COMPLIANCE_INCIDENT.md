# Guide utilisateur - Incident conformité planning

## Objectif

Ce guide décrit la conduite à tenir lorsqu'un planning ne peut pas être publié, lorsqu'un cockpit manager devient dégradé, ou lorsqu'une alerte conformité critique doit être traitée.

Il s'appuie sur les routes et endpoints réellement présents:

```text
/manager/cockpit
/manager/worklist
/planning/prepublication
/settings?tab=history
GET /api/planning/manager/cockpit
GET /api/planning/compliance/worklist
GET /api/planning/shifts/:id/compliance
GET /api/planning/shifts/:id/correction-guidance
GET /api/planning/alerts/:id/correction-guidance
GET /api/planning/shifts/:id/suggestions
POST /api/planning/shifts/:id/reassign
POST /api/planning/shifts/:id/request-replacement
POST /api/planning/shifts/:id/exception
POST /api/planning/shifts/:id/revalidate
PATCH /api/planning/alerts/:id/resolve
POST /api/planning/publish/preview
POST /api/planning/publish
GET /api/planning/compliance/timeline
GET /api/planning/compliance/reports
GET /api/audit
GET /api/audit/verify
```

## Déclencheurs

Ouvrir un incident conformité si l'un des cas suivants survient:

| Déclencheur | Source |
| --- | --- |
| `blockedShifts > 0` avant publication | cockpit manager |
| alertes `HIGH` ouvertes | cockpit ou worklist |
| statut observabilité `DEGRADED` ou `CRITICAL` | cockpit manager |
| preview avec `publishable=false` | pré-publication |
| publication refusée | pré-publication ou audit |
| exception sans justification claire | timeline ou audit |
| chaîne d'audit invalide | `GET /api/audit/verify` |

## Rôles impliqués

| Rôle | Responsabilité |
| --- | --- |
| Manager planning | diagnostiquer et corriger les shifts |
| Responsable RH | corriger agents, congés, compétences, politiques |
| Approbateur exception | approuver une exception motivée |
| Auditeur | contrôler audit, timeline et rapports |
| Super admin | traiter les incidents tenant ou accès |

## Étape 1 - Qualifier l'incident

Ouvrir `/manager/cockpit` sur la période concernée.

Relever:

- période exacte;
- `openAlerts`;
- `blockedShifts`;
- `agentsAtRisk`;
- `refusedPublications`;
- `pendingCorrections`;
- statut observabilité.

Endpoint de référence:

```text
GET /api/planning/manager/cockpit?from=...&to=...
```

Si le cockpit ne charge pas, noter le code HTTP. Un `401` indique une session expirée; un `403` indique une permission insuffisante.

## Étape 2 - Prioriser la file

Ouvrir `/manager/worklist`.

Prioriser:

1. criticité `HIGH`;
2. échéance la plus proche;
3. catégories bloquantes avant publication: repos insuffisant, surcharge hebdo, compétence manquante, congé conflictuel.

Endpoint:

```text
GET /api/planning/compliance/worklist?from=...&to=...
```

Pour chaque item, relever `shiftId`, `alertId`, agent, catégorie, règle et criticité.

## Étape 3 - Comprendre

Pour un shift:

```text
GET /api/planning/shifts/:id/compliance
GET /api/planning/shifts/:id/correction-guidance
GET /api/planning/shifts/:id/suggestions
```

Pour une alerte:

```text
GET /api/planning/alerts/:id/correction-guidance
```

Identifier la cause:

| Cause | Correction habituelle |
| --- | --- |
| Repos insuffisant | ajuster horaires ou réassigner |
| Surcharge hebdomadaire | réassigner ou demander remplacement |
| Compétence manquante | sélectionner un agent compatible |
| Congé conflictuel | déplacer le shift ou remplacer |
| Certificat ou dossier santé expiré | correction RH avant validation |
| Shift non assigné | assigner un agent |

## Étape 4 - Corriger

Actions disponibles:

```text
POST /api/planning/shifts/:id/reassign
POST /api/planning/shifts/:id/request-replacement
POST /api/planning/shifts/:id/revalidate
PATCH /api/planning/alerts/:id/resolve
```

Payloads usuels:

```json
{
  "agentId": 42,
  "reason": "Réassignation après surcharge hebdomadaire",
  "recommendationId": "optional",
  "alertId": 12
}
```

```json
{
  "reason": "Alerte traitée après revalidation",
  "recommendationId": "optional"
}
```

Après chaque correction, recharger la worklist et revalider le shift.

## Étape 5 - Gérer une exception

Une exception ne doit être utilisée que si le planning reste opérationnellement nécessaire et que le risque est accepté.

Endpoint:

```text
POST /api/planning/shifts/:id/exception
```

Permission:

```text
planning:exceptions:approve
```

Payload minimal:

```json
{
  "reason": "Justification métier précise et contrôlable",
  "recommendationId": "optional",
  "alertId": 12
}
```

Contrôles obligatoires:

- justification lisible;
- approbateur identifié;
- shift et période clairement identifiés;
- exception visible en pré-publication;
- événement présent dans la timeline et l'audit.

## Étape 6 - Prévisualiser puis publier

Ouvrir `/planning/prepublication`.

Lancer:

```text
POST /api/planning/publish/preview
```

Ne pas publier si la preview indique des violations bloquantes. Corriger puis relancer la preview.

Publier seulement si le rapport est publiable:

```text
POST /api/planning/publish
```

Permission:

```text
planning:publish
```

## Étape 7 - Contrôler la trace

Reconstituer l'incident avec:

```text
GET /api/planning/compliance/timeline?from=...&to=...&limit=...
GET /api/planning/compliance/reports?from=...&to=...&limit=...
GET /api/audit?from=...&to=...&limit=...
GET /api/audit/verify
```

Vérifier que l'on retrouve:

- détection initiale;
- correction ou exception;
- revalidation;
- preview;
- publication ou refus;
- acteur et justification pour les actions critiques;
- chaîne d'audit valide.

## Clôture de l'incident

Un incident conformité peut être clôturé lorsque:

- la preview est publiable ou la non-publication est assumée;
- les alertes critiques sont résolues ou documentées;
- les exceptions sont justifiées;
- le rapport conformité est archivé;
- les logs audit sont cohérents avec la timeline;
- la vérification de chaîne ne signale pas d'altération.

Informations à conserver dans le ticket:

- période;
- tenant;
- shifts et alertes concernés;
- décisions prises;
- identifiants des rapports;
- extraits audit;
- résultat de `GET /api/audit/verify`.

