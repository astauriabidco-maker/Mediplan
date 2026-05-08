import { describe, expect, it } from 'vitest';
import {
  OPS_API_CONTRACT,
  REQUIRED_AUDIT_ACTIONS,
  REQUIRED_AUDIT_ENTITY_TYPES,
  REQUIRED_AUDIT_FILTERS,
  REQUIRED_OPS_ACTION_CENTER_PRIORITIES,
  REQUIRED_OPS_ACTION_CENTER_STATUSES,
  REQUIRED_OPS_ACTION_CENTER_TYPES,
  REQUIRED_OPS_CONTRACT_SURFACES,
  REQUIRED_OPS_DASHBOARD_PERIOD_PARAMS,
  REQUIRED_OPS_JOURNAL_STATUSES,
  REQUIRED_OPS_SLO_OBJECTIVES,
  REQUIRED_OPS_SLO_STATUSES,
  REQUIRED_OPS_SUMMARY_RESPONSE_KEYS,
  REQUIRED_OPS_TENANT_STATUSES,
  getMissingOpsContractSurfaces,
  type OpsEndpointContract,
} from './ops.contract';

describe('OPS_API_CONTRACT', () => {
  it('covers Sprint 29 Phase 6 ops/audit surfaces and domain states', () => {
    expect(REQUIRED_OPS_CONTRACT_SURFACES).toEqual([
      'multiTenantSummary',
      'slo',
      'actionCenter',
      'journal',
      'audit',
    ]);
    expect(REQUIRED_OPS_TENANT_STATUSES).toEqual([
      'OK',
      'WARNING',
      'CRITICAL',
    ]);
    expect(REQUIRED_OPS_SLO_OBJECTIVES).toEqual([
      'alert_resolution_delay',
      'open_alert_age',
      'incident_mttr',
      'backup_freshness',
      'routine_success_rate',
      'notification_delivery',
    ]);
    expect(REQUIRED_OPS_SLO_STATUSES).toEqual([
      'PASSED',
      'WARNING',
      'FAILED',
    ]);
    expect(REQUIRED_OPS_ACTION_CENTER_TYPES).toEqual([
      'OPERATIONAL_ALERT',
      'AUTO_INCIDENT',
      'INCIDENT_ESCALATION',
      'MISSING_EVIDENCE',
      'DECISION_REQUIRED',
      'JOURNAL_ACTION',
    ]);
    expect(REQUIRED_OPS_ACTION_CENTER_STATUSES).toEqual([
      'OPEN',
      'IN_PROGRESS',
      'ESCALATED',
      'WAITING_EVIDENCE',
      'WAITING_DECISION',
      'RESOLVED',
      'CLOSED',
    ]);
    expect(REQUIRED_OPS_ACTION_CENTER_PRIORITIES).toEqual([
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL',
    ]);
    expect(REQUIRED_OPS_JOURNAL_STATUSES).toEqual([
      'PENDING',
      'DRY_RUN',
      'SENT',
      'PARTIAL',
      'FAILED',
      'THROTTLED',
      'ACKNOWLEDGED',
      'UNKNOWN',
    ]);
    expect(REQUIRED_AUDIT_ACTIONS).toEqual([
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'VALIDATE',
      'REJECT',
      'AUTO_GENERATE',
    ]);
    expect(REQUIRED_AUDIT_ENTITY_TYPES).toEqual([
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
    ]);
    expect(getMissingOpsContractSurfaces()).toEqual([]);
  });

  it('defines endpoint essentials for UI/API ops contracts', () => {
    expect(OPS_API_CONTRACT).toHaveLength(10);

    for (const endpoint of OPS_API_CONTRACT) {
      expect(endpoint.label).not.toHaveLength(0);
      expect(endpoint.path).toMatch(/^\/api\/(ops\/|audit$)/);
      expect(['GET', 'POST', 'PATCH']).toContain(endpoint.method);
      expect(endpoint.permissions.length).toBeGreaterThan(0);
      expect(endpoint.requestParams.length).toBeGreaterThan(0);
      expect(endpoint.responseKeys.length).toBeGreaterThan(0);
      expect(endpoint.expectedStates.length).toBeGreaterThan(0);
      expect(endpoint.recoverableErrors.length).toBeGreaterThan(0);
    }
  });

  it('keeps read surfaces tied to query params and response envelopes used by the UI', () => {
    const endpointBySurface = new Map(
      OPS_API_CONTRACT.map((endpoint) => [endpoint.surface, endpoint]),
    );

    expect(endpointBySurface.get('multiTenantSummary')).toEqual(
      expect.objectContaining({
        method: 'GET',
        path: '/api/ops/multi-tenant-summary',
        permissions: ['operations:read'],
        requestParams: ['tenantId'],
        responseKeys: REQUIRED_OPS_SUMMARY_RESPONSE_KEYS,
      }),
    );
    expect(endpointBySurface.get('slo')).toEqual(
      expect.objectContaining({
        method: 'GET',
        path: '/api/ops/slo',
        requestParams: REQUIRED_OPS_DASHBOARD_PERIOD_PARAMS,
      }),
    );
    expect(endpointBySurface.get('journal')).toEqual(
      expect.objectContaining({
        method: 'GET',
        path: '/api/ops/journal',
        permissions: ['operations:read', 'audit:read'],
      }),
    );
    expect(endpointBySurface.get('audit')).toEqual(
      expect.objectContaining({
        method: 'GET',
        path: '/api/audit',
        permissions: ['audit:read'],
        requestParams: REQUIRED_AUDIT_FILTERS,
      }),
    );
  });

  it('keeps action-center mutations explicit and write-protected', () => {
    const mutationEndpoints = OPS_API_CONTRACT.filter(
      (endpoint) =>
        endpoint.surface === 'actionCenter' && endpoint.method !== 'GET',
    );

    expect(mutationEndpoints.map((endpoint) => endpoint.path).sort()).toEqual([
      '/api/ops/action-center/:itemId/assign',
      '/api/ops/action-center/:itemId/comments',
      '/api/ops/action-center/:itemId/priority',
      '/api/ops/action-center/:itemId/resolve',
      '/api/ops/action-center/:itemId/status',
    ]);
    expect(
      mutationEndpoints.every((endpoint) =>
        endpoint.permissions.includes('operations:write'),
      ),
    ).toBe(true);
    expect(
      mutationEndpoints.every((endpoint) =>
        endpoint.recoverableErrors.includes(409),
      ),
    ).toBe(true);
  });

  it('reports missing ops surfaces for partial contracts', () => {
    const partialContract: OpsEndpointContract[] = [
      {
        surface: 'slo',
        label: 'Only SLO',
        method: 'GET',
        path: '/api/ops/slo',
        permissions: ['operations:read'],
        requestParams: ['tenantId'],
        responseKeys: ['status', 'objectives'],
        expectedStates: ['PASSED'],
        recoverableErrors: [400],
      },
      {
        surface: 'audit',
        label: 'Only audit',
        method: 'GET',
        path: '/api/audit',
        permissions: ['audit:read'],
        requestParams: ['tenantId'],
        responseKeys: ['details'],
        expectedStates: ['READ'],
        recoverableErrors: [400],
      },
    ];

    expect(getMissingOpsContractSurfaces(partialContract)).toEqual([
      'multiTenantSummary',
      'actionCenter',
      'journal',
    ]);
  });
});
