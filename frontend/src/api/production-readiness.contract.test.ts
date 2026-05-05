import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_READINESS_API_CONTRACT,
  REQUIRED_PRODUCTION_DECISION_STATUSES,
  REQUIRED_PRODUCTION_GATE_KEYS,
  REQUIRED_PRODUCTION_GATE_STATUSES,
  REQUIRED_PRODUCTION_READINESS_SURFACES,
  REQUIRED_PRODUCTION_SIGNOFF_KEYS,
  REQUIRED_PRODUCTION_SIGNOFF_STATUSES,
  getMissingProductionReadinessSurfaces,
  type ProductionReadinessEndpointContract,
} from './production-readiness.contract';

describe('PRODUCTION_READINESS_API_CONTRACT', () => {
  it('covers production readiness surfaces and domain states', () => {
    expect(REQUIRED_PRODUCTION_READINESS_SURFACES).toEqual([
      'signoffs',
      'signoffHistory',
      'gates',
      'decision',
    ]);
    expect(REQUIRED_PRODUCTION_SIGNOFF_KEYS).toEqual([
      'HR',
      'SECURITY',
      'OPERATIONS',
      'TECHNICAL',
      'DIRECTION',
    ]);
    expect(REQUIRED_PRODUCTION_SIGNOFF_STATUSES).toEqual([
      'PENDING',
      'GO',
      'NO_GO',
    ]);
    expect(REQUIRED_PRODUCTION_DECISION_STATUSES).toEqual([
      'PROD_READY',
      'PROD_NO_GO',
    ]);
    expect(REQUIRED_PRODUCTION_GATE_KEYS).toEqual([
      'FREEZE',
      'MIGRATION',
      'SEED',
      'SMOKE',
      'COMPLIANCE',
      'AUDIT',
      'BACKUP',
    ]);
    expect(REQUIRED_PRODUCTION_GATE_STATUSES).toEqual([
      'PASSED',
      'FAILED',
      'UNKNOWN',
    ]);
    expect(getMissingProductionReadinessSurfaces()).toEqual([]);
  });

  it('defines endpoint essentials for signoffs and decision', () => {
    expect(PRODUCTION_READINESS_API_CONTRACT).toHaveLength(6);

    for (const endpoint of PRODUCTION_READINESS_API_CONTRACT) {
      expect(endpoint.label).not.toHaveLength(0);
      expect(endpoint.path).toMatch(/^\/api\/production-readiness/);
      expect(['GET', 'PATCH']).toContain(endpoint.method);
      expect(endpoint.permissions.length).toBeGreaterThan(0);
      expect(endpoint.expectedStates.length).toBeGreaterThan(0);
      expect(endpoint.recoverableErrors.length).toBeGreaterThan(0);
    }
  });

  it('reports missing readiness surfaces for partial contracts', () => {
    const partialContract: ProductionReadinessEndpointContract[] = [
      {
        surface: 'signoffs',
        label: 'Only signoffs',
        method: 'GET',
        path: '/api/production-readiness/signoffs',
        permissions: ['release:read'],
        expectedStates: ['PENDING'],
        recoverableErrors: [400],
      },
    ];

    expect(getMissingProductionReadinessSurfaces(partialContract)).toEqual([
      'signoffHistory',
      'gates',
      'decision',
    ]);
  });
});
