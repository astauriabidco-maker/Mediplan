# Sprint 4 - Documentation technique noyau RH

## Objectif

Ce document décrit le comportement réel du noyau `agents + planning + conformité + audit` à la fin du Sprint 4. Il sert de référence pour les développeurs, le PO et la QA lorsqu'ils doivent comprendre pourquoi une garde est acceptée, bloquée, publiée, auditée ou transformée en alerte RH.

Le périmètre documenté couvre:

- validation de conformité unifiée des shifts;
- politiques de travail par service et grade;
- alertes agent liées à la conformité;
- échanges de gardes;
- publication de planning;
- observabilité audit et rapports de conformité;
- diagnostic "pourquoi ce shift est bloqué ?";
- checklist opératoire QA/production.

## Modèle de conformité unifié

La validation d'un shift passe par `ComplianceValidationService.validateShift(tenantId, agentId, start, end, options)`. Le résultat est structuré:

```ts
{
  isValid: boolean;
  blockingReasons: ComplianceRuleCode[];
  warnings: ComplianceRuleCode[];
  metadata: Record<string, unknown>;
}
```

Les raisons bloquantes actuellement exposées sont:

- `INVALID_SHIFT_DATES`
- `INVALID_SHIFT_RANGE`
- `AGENT_NOT_FOUND`
- `AGENT_INACTIVE`
- `MANDATORY_HEALTH_RECORD_EXPIRED`
- `MANDATORY_COMPETENCY_EXPIRED`
- `APPROVED_LEAVE_OVERLAP`
- `WEEKLY_HOURS_LIMIT_EXCEEDED`
- `MAX_GUARD_DURATION_EXCEEDED`
- `REST_TIME_BEFORE_SHIFT_TOO_SHORT`
- `REST_TIME_AFTER_SHIFT_TOO_SHORT`
- `SHIFT_OVERLAP`

La validation vérifie, dans l'ordre fonctionnel:

- dates valides et plage `start < end`;
- agent actif dans le tenant courant;
- certificats ou dossiers de santé obligatoires expirés;
- compétences obligatoires expirées;
- chevauchement avec congé approuvé;
- plafond hebdomadaire;
- durée maximale de garde;
- repos minimum avant et après la garde;
- chevauchement avec un autre shift de l'agent.

Le paramètre `excludeShiftId` est utilisé pour ignorer le shift courant pendant les mutations, swaps et contrôles avant publication. C'est indispensable pour éviter qu'un shift se bloque lui-même lors d'une modification ou d'une validation de publication.

## Politiques service/grade

Les règles hospitalières configurables sont portées par `WorkPolicy` et résolues par `WorkPoliciesService.resolveForAgent`.

Champs de politique utilisés par la conformité:

- `restHoursAfterGuard`
- `maxGuardDuration`
- `maxWeeklyHours`
- `onCallCompensationPercent`
- `hospitalServiceId`
- `gradeId`

Priorité de résolution:

1. politique `service + grade`;
2. politique `grade`;
3. politique `service`;
4. politique défaut tenant;
5. défaut système.

Le défaut système actuel est:

- repos après garde: `24` heures;
- durée max de garde: `24` heures;
- plafond hebdomadaire: `48` heures;
- compensation astreinte: `0`.

Si la source résolue est `system_default`, le plafond hebdomadaire peut aussi venir du setting tenant `planning.weekly_hours_limit`, puis des règles locales, puis du défaut système. Pour les politiques configurées, `maxWeeklyHours` de la politique est la source utilisée.

Endpoints disponibles:

- `GET /work-policies` avec permission `planning:read`;
- `POST /work-policies` avec permission `planning:manage`;
- `PUT /work-policies/:id` avec permission `planning:manage`;
- `DELETE /work-policies/:id` avec permission `planning:manage`.

Chaque création, modification ou suppression avec acteur connu écrit un audit `WORK_POLICY`:

- `CREATE_WORK_POLICY`;
- `UPDATE_WORK_POLICY`;
- `DELETE_WORK_POLICY`.

Les contraintes DB Sprint 4 ajoutent des index uniques partiels pour éviter plusieurs politiques au même niveau de résolution dans un tenant:

- défaut tenant;
- tenant + service;
- tenant + grade;
- tenant + service + grade.

## Cycle de vie des alertes

Les alertes conformité sont synchronisées par `ComplianceAlertService.syncShiftAlerts` pendant la validation d'un shift.

Règles actuellement transformées en alertes:

- `MANDATORY_HEALTH_RECORD_EXPIRED`;
- `MANDATORY_COMPETENCY_EXPIRED`;
- `WEEKLY_HOURS_LIMIT_EXCEEDED`;
- `REST_TIME_BEFORE_SHIFT_TOO_SHORT`;
- `REST_TIME_AFTER_SHIFT_TOO_SHORT`.

Mapping métier:

- certificat ou dossier de santé obligatoire expiré: type `COMPLIANCE`, sévérité `HIGH`;
- compétence obligatoire expirée ou manquante: type `GPEC`, sévérité `HIGH`;
- surcharge hebdomadaire: type `QVT_FATIGUE`, sévérité `HIGH`;
- repos minimum insuffisant avant ou après garde: type `QVT_FATIGUE`, sévérité `HIGH`.

Déduplication:

- une alerte ouverte est identifiée par `tenantId + agentId + type + message`;
- seules les alertes non acquittées et non résolues sont considérées ouvertes;
- si la même règle réapparaît, l'alerte est rafraîchie avec `lastDetectedAt` et les nouvelles métadonnées.

Résolution automatique:

- lorsqu'une règle gérée n'est plus active pour l'agent, l'alerte ouverte correspondante passe à `isResolved = true`;
- elle est aussi marquée `isAcknowledged = true`;
- `resolvedAt` est renseigné;
- `resolutionReason` vaut `Compliance rule recovered`;
- `metadata.resolvedRuleCode` conserve la règle résolue.

Les contraintes DB Sprint 4 ajoutent:

- `isResolved`;
- `resolvedAt`;
- `resolutionReason`;
- index unique partiel des alertes ouvertes;
- index de lecture des alertes ouvertes par tenant/agent/type/sévérité;
- index de lecture des alertes résolues par tenant.

## Mutations de shifts

Toute mutation métier de shift doit passer par la validation structurée et l'audit.

Flux actuellement durcis:

- création de shift: `PlanningService.createShift`;
- assignation de remplacement: `PlanningService.assignReplacement`;
- modification horaire: `PlanningService.updateShift`;
- demande d'échange: `PlanningService.requestSwap`;
- reprise d'échange: `PlanningService.applyForSwap`;
- publication de planning: `PlanningService.publishPlanning`.

Les erreurs de conformité renvoyées au client sont des `400 Bad Request` avec un message contenant les `blockingReasons`. Pour le diagnostic complet, l'endpoint d'explication de shift doit être utilisé.

Audits de shift:

- `CREATE_SHIFT`;
- `ASSIGN_REPLACEMENT`;
- `UPDATE_SHIFT`;
- `REQUEST_SWAP`;
- `APPLY_SWAP`.

Les payloads d'audit incluent selon le cas:

- snapshot `before`;
- snapshot `after`;
- résultat `validation`;
- agent sortant et nouvel agent pour les swaps.

## Echanges de gardes

### Demander un échange

`requestSwap(tenantId, shiftId, agentId)` vérifie:

- le shift existe dans le tenant;
- le shift est futur;
- le statut autorise le swap: `VALIDATED` ou `PUBLISHED`;
- l'agent demandeur est bien propriétaire du shift;
- le shift n'est pas déjà disponible en swap.

En cas de succès:

- `isSwapRequested` passe à `true`;
- un audit `SHIFT / UPDATE` avec `action: REQUEST_SWAP` est écrit;
- une mise à jour planning est broadcastée.

### Reprendre un échange

`applyForSwap(tenantId, shiftId, agentId)` vérifie:

- le shift existe dans le tenant;
- le shift est futur;
- le statut autorise le swap;
- `isSwapRequested = true`;
- le shift est assigné;
- le repreneur n'est pas l'agent propriétaire;
- le repreneur existe dans le tenant;
- la validation structurée passe avec `excludeShiftId`.

En cas de succès:

- l'agent du shift devient le repreneur;
- `isSwapRequested` repasse à `false`;
- un audit `SHIFT / UPDATE` avec `action: APPLY_SWAP` est écrit;
- le propriétaire initial peut recevoir une notification WhatsApp;
- une mise à jour planning est broadcastée.

En cas de non-conformité, le swap est refusé avec un `400 Bad Request`.

## Publication planning

`POST /planning/publish` appelle `PlanningService.publishPlanning(tenantId, actorId, start, end)`.

La publication:

1. valide les dates de fenêtre;
2. charge les shifts `PENDING` du tenant dans la fenêtre;
3. produit un rapport structuré;
4. valide chaque shift avec `excludeShiftId`;
5. bloque toute publication s'il existe une violation bloquante;
6. sinon, passe les shifts `PENDING` à `VALIDATED`;
7. écrit un audit `PLANNING / UPDATE` avec `action: PUBLISH_PLANNING`.

Structure du rapport:

```ts
{
  start: Date;
  end: Date;
  totalPending: number;
  validatedShiftIds: number[];
  violations: Array<{
    shiftId: number;
    agentId?: number;
    blockingReasons: string[];
    metadata: Record<string, unknown>;
  }>;
  warnings: Array<{
    shiftId: number;
    agentId?: number;
    warnings: string[];
    metadata: Record<string, unknown>;
  }>;
}
```

Si une violation existe:

- aucun shift n'est validé;
- l'API renvoie `400 Bad Request`;
- le corps contient `message: Planning publication blocked by compliance violations`;
- le rapport est inclus dans la réponse;
- un audit `PUBLISH_PLANNING` est écrit avec `blocked: true`.

Si tout est conforme:

- les shifts `PENDING` deviennent `VALIDATED`;
- la réponse contient `message`, `affected` et `report`;
- un audit `PUBLISH_PLANNING` est écrit avec `blocked: false`, `affected` et `report`.

## Observabilité audit

Endpoint général:

- `GET /audit` avec permission `audit:read`.

Filtres supportés:

- `tenantId`;
- `actorId`;
- `action`;
- `entityType`;
- `entityId`;
- `detailAction`;
- `from`;
- `to`;
- `limit`.

Le filtre `detailAction` lit `details.action` dans le JSON d'audit. Il permet notamment d'isoler:

- `PUBLISH_PLANNING`;
- `CREATE_WORK_POLICY`;
- `UPDATE_WORK_POLICY`;
- `DELETE_WORK_POLICY`;
- `CREATE_SHIFT`;
- `ASSIGN_REPLACEMENT`;
- `UPDATE_SHIFT`;
- `REQUEST_SWAP`;
- `APPLY_SWAP`.

La limite de lecture est plafonnée à `500`, avec `100` par défaut.

## Rapports conformité

Endpoint spécialisé:

- `GET /planning/compliance/reports` avec permission `audit:read`.

Query params:

- `tenantId` si le contexte tenant l'autorise;
- `from`;
- `to`;
- `limit`.

L'endpoint lit les audits:

- `action = UPDATE`;
- `entityType = PLANNING`;
- `details.action = PUBLISH_PLANNING`.

Réponse exposée:

```ts
{
  id: number;
  timestamp: Date;
  actorId: number;
  entityId: string;
  blocked: boolean;
  affected: number;
  report: PublishPlanningReport;
}
```

Utilisation recommandée:

- afficher l'historique des publications bloquées ou réussies;
- retrouver les shifts impactés;
- vérifier les règles bloquantes et leurs métadonnées;
- alimenter une vue PO/RH de conformité planning.

## Pourquoi ce shift est bloque ?

Endpoint de diagnostic:

- `GET /planning/shifts/:id/compliance` avec permission `planning:read`.

Comportement:

- charge le shift par `id` et `tenantId`;
- renvoie `404` si le shift n'existe pas dans le tenant;
- si le shift n'a pas d'agent, renvoie une validation invalide avec `UNASSIGNED_SHIFT`;
- sinon, relance la validation structurée avec `excludeShiftId = shift.id`.

Réponse:

```ts
{
  shift: {
    id: number;
    tenantId: string;
    agentId?: number;
    start: Date;
    end: Date;
    postId: string;
    type: string;
    status: string;
    facilityId?: number;
  };
  validation: ShiftValidationResult;
}
```

Cet endpoint est la surface principale pour expliquer à un manager ou à la QA pourquoi une garde est bloquée sans modifier son état.

## Checklist QA

Avant livraison:

- lancer les tests unitaires conformité, politiques, planning, audit et alertes;
- lancer les e2e isolation tenant et conformité planning;
- vérifier qu'un shift invalide renvoie un `400` avec le code de règle attendu;
- vérifier qu'un shift valide peut être créé, modifié puis publié;
- vérifier qu'une publication bloquée écrit bien un audit `PUBLISH_PLANNING` avec `blocked: true`;
- vérifier qu'une publication réussie écrit bien `blocked: false` et `affected`;
- vérifier que `GET /planning/compliance/reports` ne remonte que les rapports du tenant courant;
- vérifier que `GET /planning/shifts/:id/compliance` ne révèle pas un shift cross-tenant;
- vérifier la priorité des politiques avec les quatre niveaux `service+grade`, `grade`, `service`, `tenant default`;
- vérifier la déduplication des alertes ouvertes;
- vérifier la résolution automatique des alertes lorsque la situation redevient conforme;
- vérifier qu'un swap passé, non validé, non publié, déjà traité ou cross-tenant est refusé;
- vérifier que `detailAction` filtre correctement les audits attendus.

## Checklist production

Avant activation en production:

- appliquer la migration Sprint 4 sur un environnement de staging avec données réalistes;
- rechercher les doublons existants de politiques avant de créer les index uniques;
- rechercher les doublons d'alertes ouvertes avant de créer l'index unique partiel;
- confirmer que les valeurs de politiques par défaut correspondent aux conventions RH de l'établissement;
- vérifier les permissions `planning:read`, `planning:manage`, `leaves:request` et `audit:read` sur les rôles réels;
- valider la stratégie de rétention des audits de publication;
- préparer une vue RH lisible pour les `blockingReasons` et leurs métadonnées;
- surveiller les volumes d'alertes ouvertes après activation de la validation stricte;
- documenter auprès des managers que la publication peut être bloquée et qu'un rapport structuré explique les raisons.

## Tests de référence

Tests utiles pour valider ce périmètre:

- `src/planning/compliance-validation.service.spec.ts`;
- `src/planning/compliance-alert.service.spec.ts`;
- `src/planning/work-policies.service.spec.ts`;
- `src/planning/planning.service.spec.ts`;
- `src/planning/planning.controller.spec.ts`;
- `src/audit/audit.service.spec.ts`;
- `src/audit/audit.controller.spec.ts`;
- `test/planning-compliance.e2e-spec.ts`.
