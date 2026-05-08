export type PilotSessionSurface =
  | 'session'
  | 'roles'
  | 'checklist'
  | 'evidence'
  | 'reservations'
  | 'decision';

export type PilotSessionMethod = 'GET' | 'POST' | 'PATCH';

export type PilotSessionStatus =
  | 'DRAFT'
  | 'CONTROLLED_PREPARATION'
  | 'IN_PROGRESS'
  | 'WAITING_DECISION'
  | 'CLOSED';

export type PilotSessionRole =
  | 'PILOT_COORDINATOR'
  | 'HOSPITAL_REFERENT'
  | 'HR_VALIDATOR'
  | 'OPS_GUARDIAN'
  | 'AUDIT_OBSERVER'
  | 'DIRECTION_SPONSOR';

export type PilotSessionChecklistStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'DONE'
  | 'WAIVED';

export type PilotSessionEvidenceStatus =
  | 'EXPECTED'
  | 'SUBMITTED'
  | 'VALIDATED'
  | 'REJECTED';

export type PilotSessionReservationStatus =
  | 'OPEN'
  | 'MITIGATED'
  | 'ACCEPTED'
  | 'CLOSED';

export type PilotSessionDecisionStatus =
  | 'PENDING'
  | 'GO'
  | 'GO_WITH_RESERVATIONS'
  | 'NO_GO';

export interface PilotSessionEndpointContract {
  surface: PilotSessionSurface;
  label: string;
  method: PilotSessionMethod;
  path: string;
  permissions: readonly string[];
  requestParams: readonly string[];
  responseKeys: readonly string[];
  expectedStates: readonly string[];
  recoverableErrors: ReadonlyArray<400 | 401 | 403 | 404 | 409>;
}

export const REQUIRED_PILOT_SESSION_SURFACES = [
  'session',
  'roles',
  'checklist',
  'evidence',
  'reservations',
  'decision',
] as const satisfies readonly PilotSessionSurface[];

export const REQUIRED_PILOT_SESSION_STATUSES = [
  'DRAFT',
  'CONTROLLED_PREPARATION',
  'IN_PROGRESS',
  'WAITING_DECISION',
  'CLOSED',
] as const satisfies readonly PilotSessionStatus[];

export const REQUIRED_PILOT_SESSION_ROLES = [
  'PILOT_COORDINATOR',
  'HOSPITAL_REFERENT',
  'HR_VALIDATOR',
  'OPS_GUARDIAN',
  'AUDIT_OBSERVER',
  'DIRECTION_SPONSOR',
] as const satisfies readonly PilotSessionRole[];

export const REQUIRED_PILOT_CHECKLIST_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'WAIVED',
] as const satisfies readonly PilotSessionChecklistStatus[];

export const REQUIRED_PILOT_EVIDENCE_STATUSES = [
  'EXPECTED',
  'SUBMITTED',
  'VALIDATED',
  'REJECTED',
] as const satisfies readonly PilotSessionEvidenceStatus[];

export const REQUIRED_PILOT_RESERVATION_STATUSES = [
  'OPEN',
  'MITIGATED',
  'ACCEPTED',
  'CLOSED',
] as const satisfies readonly PilotSessionReservationStatus[];

export const REQUIRED_PILOT_DECISION_STATUSES = [
  'PENDING',
  'GO',
  'GO_WITH_RESERVATIONS',
  'NO_GO',
] as const satisfies readonly PilotSessionDecisionStatus[];

export const REQUIRED_PILOT_SESSION_RESPONSE_KEYS = [
  'id',
  'tenantId',
  'status',
  'scope',
  'roles',
  'checklist',
  'evidence',
  'reservations',
  'decision',
  'generatedAt',
] as const;

export const PILOT_SESSION_API_CONTRACT = [
  {
    surface: 'session',
    label: 'Pilot session snapshot',
    method: 'GET',
    path: '/api/pilot-session',
    permissions: ['pilot:read', 'audit:read'],
    requestParams: ['tenantId', 'sessionId'],
    responseKeys: REQUIRED_PILOT_SESSION_RESPONSE_KEYS,
    expectedStates: REQUIRED_PILOT_SESSION_STATUSES,
    recoverableErrors: [400, 401, 403, 404],
  },
  {
    surface: 'roles',
    label: 'Pilot session role assignment',
    method: 'PATCH',
    path: '/api/pilot-session/:sessionId/roles/:role',
    permissions: ['pilot:write'],
    requestParams: ['tenantId', 'agentId', 'comment'],
    responseKeys: ['role', 'assignedToId', 'assignedAt', 'assignedById'],
    expectedStates: REQUIRED_PILOT_SESSION_ROLES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'checklist',
    label: 'Pilot session checklist',
    method: 'PATCH',
    path: '/api/pilot-session/:sessionId/checklist/:itemId',
    permissions: ['pilot:write'],
    requestParams: ['tenantId', 'status', 'comment'],
    responseKeys: ['id', 'status', 'ownerRole', 'updatedAt'],
    expectedStates: REQUIRED_PILOT_CHECKLIST_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'evidence',
    label: 'Pilot session evidence',
    method: 'POST',
    path: '/api/pilot-session/:sessionId/evidence',
    permissions: ['pilot:write', 'audit:read'],
    requestParams: ['tenantId', 'kind', 'label', 'url', 'comment'],
    responseKeys: ['id', 'kind', 'status', 'label', 'url', 'submittedAt'],
    expectedStates: REQUIRED_PILOT_EVIDENCE_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'reservations',
    label: 'Pilot session reservations',
    method: 'PATCH',
    path: '/api/pilot-session/:sessionId/reservations/:reservationId',
    permissions: ['pilot:write', 'audit:read'],
    requestParams: ['tenantId', 'status', 'mitigation', 'comment'],
    responseKeys: ['id', 'status', 'severity', 'mitigation', 'updatedAt'],
    expectedStates: REQUIRED_PILOT_RESERVATION_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'decision',
    label: 'Pilot session decision',
    method: 'PATCH',
    path: '/api/pilot-session/:sessionId/decision',
    permissions: ['pilot:decide', 'audit:read'],
    requestParams: ['tenantId', 'status', 'comment', 'evidenceIds'],
    responseKeys: ['status', 'decidedAt', 'decidedById', 'reservations'],
    expectedStates: REQUIRED_PILOT_DECISION_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
] as const satisfies readonly PilotSessionEndpointContract[];

export function getMissingPilotSessionSurfaces(
  contract: readonly PilotSessionEndpointContract[] = PILOT_SESSION_API_CONTRACT,
): PilotSessionSurface[] {
  const covered = new Set(contract.map((endpoint) => endpoint.surface));
  return REQUIRED_PILOT_SESSION_SURFACES.filter(
    (surface) => !covered.has(surface),
  );
}
