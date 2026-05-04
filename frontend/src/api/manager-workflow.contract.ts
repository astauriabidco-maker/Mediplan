import type { ManagerActionCode } from './manager-workflow.api';

export type ManagerWorkflowStep =
  | 'detect'
  | 'understand'
  | 'fix'
  | 'publish'
  | 'trace';

export interface ManagerWorkflowEndpointContract {
  step: ManagerWorkflowStep;
  label: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  permission: string;
  actionCode?: ManagerActionCode;
  expectedStates: string[];
  recoverableErrors: Array<400 | 401 | 403 | 404 | 409>;
}

export const MANAGER_WORKFLOW_API_CONTRACT = [
  {
    step: 'detect',
    label: 'Cockpit manager',
    method: 'GET',
    path: '/api/planning/manager/cockpit',
    permission: 'planning:read',
    expectedStates: ['HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN'],
    recoverableErrors: [400, 401, 403],
  },
  {
    step: 'detect',
    label: 'File de correction',
    method: 'GET',
    path: '/api/planning/compliance/worklist',
    permission: 'planning:read',
    expectedStates: [
      'REST_INSUFFICIENT',
      'WEEKLY_OVERLOAD',
      'MISSING_COMPETENCY',
      'LEAVE_CONFLICT',
    ],
    recoverableErrors: [400, 401, 403],
  },
  {
    step: 'understand',
    label: 'Pourquoi ce shift est bloque',
    method: 'GET',
    path: '/api/planning/shifts/:id/compliance',
    permission: 'planning:read',
    actionCode: 'VIEW_SHIFT_COMPLIANCE',
    expectedStates: ['valid', 'blockingReasons', 'warnings'],
    recoverableErrors: [401, 403, 404],
  },
  {
    step: 'understand',
    label: 'Guidage correction shift',
    method: 'GET',
    path: '/api/planning/shifts/:id/correction-guidance',
    permission: 'planning:read',
    expectedStates: ['actions', 'requiredPermissions', 'bodyTemplate'],
    recoverableErrors: [401, 403, 404],
  },
  {
    step: 'understand',
    label: 'Suggestions de remplacants',
    method: 'GET',
    path: '/api/planning/shifts/:id/suggestions',
    permission: 'planning:read',
    expectedStates: ['replacements', 'actions', 'validation'],
    recoverableErrors: [401, 403, 404],
  },
  {
    step: 'fix',
    label: 'Reassigner un shift',
    method: 'POST',
    path: '/api/planning/shifts/:id/reassign',
    permission: 'planning:write',
    actionCode: 'REASSIGN_SHIFT',
    expectedStates: ['success', 'validationError'],
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    step: 'fix',
    label: 'Demander un remplacement',
    method: 'POST',
    path: '/api/planning/shifts/:id/request-replacement',
    permission: 'planning:write',
    actionCode: 'REQUEST_REPLACEMENT',
    expectedStates: ['success'],
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    step: 'fix',
    label: 'Autoriser une exception',
    method: 'POST',
    path: '/api/planning/shifts/:id/exception',
    permission: 'planning:exception',
    actionCode: 'APPROVE_EXCEPTION',
    expectedStates: ['justificationRequired', 'success'],
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    step: 'fix',
    label: 'Relancer validation',
    method: 'POST',
    path: '/api/planning/shifts/:id/revalidate',
    permission: 'planning:write',
    actionCode: 'REVALIDATE_SHIFT',
    expectedStates: ['valid', 'stillBlocked'],
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    step: 'publish',
    label: 'Previsualiser publication',
    method: 'POST',
    path: '/api/planning/publish/preview',
    permission: 'planning:read',
    expectedStates: ['publishable', 'violations', 'warnings'],
    recoverableErrors: [400, 401, 403, 409],
  },
  {
    step: 'publish',
    label: 'Publier planning',
    method: 'POST',
    path: '/api/planning/publish',
    permission: 'planning:manage',
    actionCode: 'PUBLISH_PLANNING',
    expectedStates: ['published', 'blocked'],
    recoverableErrors: [400, 401, 403, 409],
  },
  {
    step: 'trace',
    label: 'Timeline metier',
    method: 'GET',
    path: '/api/planning/compliance/timeline',
    permission: 'audit:read',
    expectedStates: [
      'correction',
      'publication',
      'exception',
      'alertResolution',
    ],
    recoverableErrors: [400, 401, 403],
  },
] as const satisfies readonly ManagerWorkflowEndpointContract[];

export const REQUIRED_MANAGER_WORKFLOW_STEPS: readonly ManagerWorkflowStep[] = [
  'detect',
  'understand',
  'fix',
  'publish',
  'trace',
] as const;

export function getMissingManagerWorkflowSteps(
  contract: readonly ManagerWorkflowEndpointContract[] = MANAGER_WORKFLOW_API_CONTRACT,
): ManagerWorkflowStep[] {
  const covered = new Set(contract.map((endpoint) => endpoint.step));
  return REQUIRED_MANAGER_WORKFLOW_STEPS.filter((step) => !covered.has(step));
}
