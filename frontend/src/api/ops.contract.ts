import type {
  AuditLog,
  AuditLogFilters,
} from './audit.api';
import type {
  OpsActionCenterItemType,
  OpsActionCenterPriority,
  OpsActionCenterStatus,
  OpsDashboardParams,
  OpsMultiTenantSummaryResponse,
  OpsNotificationJournalStatus,
  OpsSloObjectiveId,
  OpsSloStatus,
  OpsTenantOperationalStatus,
} from './ops.api';

export type OpsContractSurface =
  | 'multiTenantSummary'
  | 'slo'
  | 'actionCenter'
  | 'journal'
  | 'audit';

export type OpsContractMethod = 'GET' | 'POST' | 'PATCH';

export interface OpsEndpointContract {
  surface: OpsContractSurface;
  label: string;
  method: OpsContractMethod;
  path: string;
  permissions: readonly string[];
  requestParams: readonly string[];
  responseKeys: readonly string[];
  expectedStates: readonly string[];
  recoverableErrors: ReadonlyArray<400 | 401 | 403 | 404 | 409>;
}

export const REQUIRED_OPS_CONTRACT_SURFACES = [
  'multiTenantSummary',
  'slo',
  'actionCenter',
  'journal',
  'audit',
] as const satisfies readonly OpsContractSurface[];

export const REQUIRED_OPS_TENANT_STATUSES = [
  'OK',
  'WARNING',
  'CRITICAL',
] as const satisfies readonly OpsTenantOperationalStatus[];

export const REQUIRED_OPS_SLO_OBJECTIVES = [
  'alert_resolution_delay',
  'open_alert_age',
  'incident_mttr',
  'backup_freshness',
  'routine_success_rate',
  'notification_delivery',
] as const satisfies readonly OpsSloObjectiveId[];

export const REQUIRED_OPS_SLO_STATUSES = [
  'PASSED',
  'WARNING',
  'FAILED',
] as const satisfies readonly OpsSloStatus[];

export const REQUIRED_OPS_ACTION_CENTER_TYPES = [
  'OPERATIONAL_ALERT',
  'AUTO_INCIDENT',
  'INCIDENT_ESCALATION',
  'MISSING_EVIDENCE',
  'DECISION_REQUIRED',
  'JOURNAL_ACTION',
] as const satisfies readonly OpsActionCenterItemType[];

export const REQUIRED_OPS_ACTION_CENTER_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'ESCALATED',
  'WAITING_EVIDENCE',
  'WAITING_DECISION',
  'RESOLVED',
  'CLOSED',
] as const satisfies readonly OpsActionCenterStatus[];

export const REQUIRED_OPS_ACTION_CENTER_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const satisfies readonly OpsActionCenterPriority[];

export const REQUIRED_OPS_JOURNAL_STATUSES = [
  'PENDING',
  'DRY_RUN',
  'SENT',
  'PARTIAL',
  'FAILED',
  'THROTTLED',
  'ACKNOWLEDGED',
  'UNKNOWN',
] as const satisfies readonly OpsNotificationJournalStatus[];

export const REQUIRED_AUDIT_ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'VALIDATE',
  'REJECT',
  'AUTO_GENERATE',
] as const satisfies readonly AuditLog['action'][];

export const REQUIRED_AUDIT_ENTITY_TYPES = [
  'SHIFT',
  'LEAVE',
  'PLANNING',
  'AGENT',
  'CONTRACT',
  'PAYROLL',
  'DOCUMENT',
  'HOSPITAL_SERVICE',
  'WORK_POLICY',
  'OPERATION_INCIDENT',
  'OPERATION_ALERT',
] as const satisfies readonly AuditLog['entityType'][];

export const REQUIRED_OPS_SUMMARY_RESPONSE_KEYS = [
  'generatedAt',
  'scope',
  'totals',
  'tenants',
] as const satisfies readonly (keyof OpsMultiTenantSummaryResponse)[];

export const REQUIRED_AUDIT_FILTERS = [
  'tenantId',
  'actorId',
  'action',
  'entityType',
  'entityId',
  'detailAction',
  'from',
  'to',
  'limit',
] as const satisfies readonly (keyof AuditLogFilters)[];

export const REQUIRED_OPS_DASHBOARD_PERIOD_PARAMS = [
  'tenantId',
  'from',
  'to',
] as const satisfies readonly (keyof OpsDashboardParams)[];

const ACTION_CENTER_RESPONSE_KEYS = [
  'tenantId',
  'generatedAt',
  'total',
  'filters',
  'items',
] as const;

export const OPS_API_CONTRACT = [
  {
    surface: 'multiTenantSummary',
    label: 'Cockpit multi-tenant ops',
    method: 'GET',
    path: '/api/ops/multi-tenant-summary',
    permissions: ['operations:read'],
    requestParams: ['tenantId'],
    responseKeys: REQUIRED_OPS_SUMMARY_RESPONSE_KEYS,
    expectedStates: REQUIRED_OPS_TENANT_STATUSES,
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'slo',
    label: 'Objectifs SLO ops',
    method: 'GET',
    path: '/api/ops/slo',
    permissions: ['operations:read', 'audit:read'],
    requestParams: REQUIRED_OPS_DASHBOARD_PERIOD_PARAMS,
    responseKeys: ['tenantId', 'generatedAt', 'period', 'status', 'objectives'],
    expectedStates: [
      ...REQUIRED_OPS_SLO_STATUSES,
      ...REQUIRED_OPS_SLO_OBJECTIVES,
    ],
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'actionCenter',
    label: 'Action-center ops',
    method: 'GET',
    path: '/api/ops/action-center',
    permissions: ['operations:read'],
    requestParams: ['tenantId', 'limit', 'status', 'type'],
    responseKeys: ACTION_CENTER_RESPONSE_KEYS,
    expectedStates: [
      ...REQUIRED_OPS_ACTION_CENTER_TYPES,
      ...REQUIRED_OPS_ACTION_CENTER_STATUSES,
      ...REQUIRED_OPS_ACTION_CENTER_PRIORITIES,
    ],
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'actionCenter',
    label: 'Assigner une action ops',
    method: 'PATCH',
    path: '/api/ops/action-center/:itemId/assign',
    permissions: ['operations:write'],
    requestParams: ['tenantId', 'assignedToId', 'comment'],
    responseKeys: ['id', 'status', 'workflow'],
    expectedStates: REQUIRED_OPS_ACTION_CENTER_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'actionCenter',
    label: 'Commenter une action ops',
    method: 'POST',
    path: '/api/ops/action-center/:itemId/comments',
    permissions: ['operations:write'],
    requestParams: ['tenantId', 'comment'],
    responseKeys: ['id', 'workflow'],
    expectedStates: REQUIRED_OPS_ACTION_CENTER_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'actionCenter',
    label: 'Prioriser une action ops',
    method: 'PATCH',
    path: '/api/ops/action-center/:itemId/priority',
    permissions: ['operations:write'],
    requestParams: ['tenantId', 'priority', 'comment'],
    responseKeys: ['id', 'priority', 'workflow'],
    expectedStates: REQUIRED_OPS_ACTION_CENTER_PRIORITIES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'actionCenter',
    label: 'Transitionner une action ops',
    method: 'PATCH',
    path: '/api/ops/action-center/:itemId/status',
    permissions: ['operations:write'],
    requestParams: ['tenantId', 'status', 'comment'],
    responseKeys: ['id', 'status', 'workflow'],
    expectedStates: REQUIRED_OPS_ACTION_CENTER_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'actionCenter',
    label: 'Résoudre une action ops',
    method: 'PATCH',
    path: '/api/ops/action-center/:itemId/resolve',
    permissions: ['operations:write', 'audit:read'],
    requestParams: ['tenantId', 'status', 'summary', 'evidenceUrl', 'evidenceLabel'],
    responseKeys: ['id', 'status', 'timestamps', 'workflow'],
    expectedStates: ['RESOLVED', 'CLOSED'],
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'journal',
    label: 'Journal ops',
    method: 'GET',
    path: '/api/ops/journal',
    permissions: ['operations:read', 'audit:read'],
    requestParams: ['tenantId', 'type', 'from', 'to', 'limit'],
    responseKeys: [
      'id',
      'tenantId',
      'type',
      'status',
      'severity',
      'title',
      'occurredAt',
      'metadata',
    ],
    expectedStates: REQUIRED_OPS_JOURNAL_STATUSES,
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'audit',
    label: 'Journal audit transverse',
    method: 'GET',
    path: '/api/audit',
    permissions: ['audit:read'],
    requestParams: REQUIRED_AUDIT_FILTERS,
    responseKeys: [
      'id',
      'timestamp',
      'actorId',
      'actor',
      'action',
      'entityType',
      'entityId',
      'details',
    ],
    expectedStates: [
      ...REQUIRED_AUDIT_ACTIONS,
      ...REQUIRED_AUDIT_ENTITY_TYPES,
    ],
    recoverableErrors: [400, 401, 403],
  },
] as const satisfies readonly OpsEndpointContract[];

export function getMissingOpsContractSurfaces(
  contract: readonly OpsEndpointContract[] = OPS_API_CONTRACT,
): OpsContractSurface[] {
  const covered = new Set(contract.map((endpoint) => endpoint.surface));
  return REQUIRED_OPS_CONTRACT_SURFACES.filter(
    (surface) => !covered.has(surface),
  );
}
