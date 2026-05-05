import type {
  ProductionGateKey,
  ProductionGateStatusValue,
  ProductionDecisionStatus,
  ProductionSignoffKey,
  ProductionSignoffStatus,
} from './production-readiness.api';

export type ProductionReadinessSurface =
  | 'signoffs'
  | 'signoffHistory'
  | 'gates'
  | 'decision';

export interface ProductionReadinessEndpointContract {
  surface: ProductionReadinessSurface;
  label: string;
  method: 'GET' | 'PATCH';
  path: string;
  permissions: readonly string[];
  expectedStates: readonly string[];
  recoverableErrors: ReadonlyArray<400 | 401 | 403 | 404 | 409>;
}

export const REQUIRED_PRODUCTION_READINESS_SURFACES = [
  'signoffs',
  'signoffHistory',
  'gates',
  'decision',
] as const satisfies readonly ProductionReadinessSurface[];

export const REQUIRED_PRODUCTION_SIGNOFF_KEYS = [
  'HR',
  'SECURITY',
  'OPERATIONS',
  'TECHNICAL',
  'DIRECTION',
] as const satisfies readonly ProductionSignoffKey[];

export const REQUIRED_PRODUCTION_SIGNOFF_STATUSES = [
  'PENDING',
  'GO',
  'NO_GO',
] as const satisfies readonly ProductionSignoffStatus[];

export const REQUIRED_PRODUCTION_DECISION_STATUSES = [
  'PROD_READY',
  'PROD_NO_GO',
] as const satisfies readonly ProductionDecisionStatus[];

export const REQUIRED_PRODUCTION_GATE_KEYS = [
  'FREEZE',
  'MIGRATION',
  'SEED',
  'SMOKE',
  'COMPLIANCE',
  'AUDIT',
  'BACKUP',
] as const satisfies readonly ProductionGateKey[];

export const REQUIRED_PRODUCTION_GATE_STATUSES = [
  'PASSED',
  'FAILED',
  'UNKNOWN',
] as const satisfies readonly ProductionGateStatusValue[];

export const PRODUCTION_READINESS_API_CONTRACT = [
  {
    surface: 'signoffs',
    label: 'Production signoffs list',
    method: 'GET',
    path: '/api/production-readiness/signoffs',
    permissions: ['release:read', 'audit:read'],
    expectedStates: REQUIRED_PRODUCTION_SIGNOFF_STATUSES,
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'signoffs',
    label: 'Production signoff decision',
    method: 'PATCH',
    path: '/api/production-readiness/signoffs/:key',
    permissions: ['release:write'],
    expectedStates: REQUIRED_PRODUCTION_SIGNOFF_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
  {
    surface: 'decision',
    label: 'Production readiness decision',
    method: 'GET',
    path: '/api/production-readiness/decision',
    permissions: ['release:read', 'audit:read'],
    expectedStates: REQUIRED_PRODUCTION_DECISION_STATUSES,
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'signoffHistory',
    label: 'Production signoff audit history',
    method: 'GET',
    path: '/api/production-readiness/signoffs/history',
    permissions: ['release:read', 'audit:read'],
    expectedStates: [
      ...REQUIRED_PRODUCTION_SIGNOFF_STATUSES,
      ...REQUIRED_PRODUCTION_DECISION_STATUSES,
    ],
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'gates',
    label: 'Production gates snapshot',
    method: 'GET',
    path: '/api/production-readiness/gates',
    permissions: ['release:read', 'audit:read'],
    expectedStates: REQUIRED_PRODUCTION_GATE_STATUSES,
    recoverableErrors: [400, 401, 403],
  },
  {
    surface: 'gates',
    label: 'Production gate decision',
    method: 'PATCH',
    path: '/api/production-readiness/gates/:key',
    permissions: ['release:write'],
    expectedStates: REQUIRED_PRODUCTION_GATE_STATUSES,
    recoverableErrors: [400, 401, 403, 404, 409],
  },
] as const satisfies readonly ProductionReadinessEndpointContract[];

export function getMissingProductionReadinessSurfaces(
  contract: readonly ProductionReadinessEndpointContract[] = PRODUCTION_READINESS_API_CONTRACT,
): ProductionReadinessSurface[] {
  const covered = new Set(contract.map((endpoint) => endpoint.surface));
  return REQUIRED_PRODUCTION_READINESS_SURFACES.filter(
    (surface) => !covered.has(surface),
  );
}
