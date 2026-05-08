import { describe, expect, it } from 'vitest';
import {
  PILOT_SESSION_API_CONTRACT,
  REQUIRED_PILOT_CHECKLIST_STATUSES,
  REQUIRED_PILOT_DECISION_STATUSES,
  REQUIRED_PILOT_EVIDENCE_STATUSES,
  REQUIRED_PILOT_RESERVATION_STATUSES,
  REQUIRED_PILOT_SESSION_RESPONSE_KEYS,
  REQUIRED_PILOT_SESSION_ROLES,
  REQUIRED_PILOT_SESSION_STATUSES,
  REQUIRED_PILOT_SESSION_SURFACES,
  getMissingPilotSessionSurfaces,
  type PilotSessionEndpointContract,
} from './pilot-session.contract';

describe('PILOT_SESSION_API_CONTRACT', () => {
  it('covers Sprint 33 controlled pilot session surfaces and states', () => {
    expect(REQUIRED_PILOT_SESSION_SURFACES).toEqual([
      'session',
      'roles',
      'checklist',
      'evidence',
      'reservations',
      'decision',
    ]);
    expect(REQUIRED_PILOT_SESSION_STATUSES).toEqual([
      'DRAFT',
      'CONTROLLED_PREPARATION',
      'IN_PROGRESS',
      'WAITING_DECISION',
      'CLOSED',
    ]);
    expect(REQUIRED_PILOT_SESSION_ROLES).toEqual([
      'PILOT_COORDINATOR',
      'HOSPITAL_REFERENT',
      'HR_VALIDATOR',
      'OPS_GUARDIAN',
      'AUDIT_OBSERVER',
      'DIRECTION_SPONSOR',
    ]);
    expect(REQUIRED_PILOT_CHECKLIST_STATUSES).toEqual([
      'TODO',
      'IN_PROGRESS',
      'BLOCKED',
      'DONE',
      'WAIVED',
    ]);
    expect(REQUIRED_PILOT_EVIDENCE_STATUSES).toEqual([
      'EXPECTED',
      'SUBMITTED',
      'VALIDATED',
      'REJECTED',
    ]);
    expect(REQUIRED_PILOT_RESERVATION_STATUSES).toEqual([
      'OPEN',
      'MITIGATED',
      'ACCEPTED',
      'CLOSED',
    ]);
    expect(REQUIRED_PILOT_DECISION_STATUSES).toEqual([
      'PENDING',
      'GO',
      'GO_WITH_RESERVATIONS',
      'NO_GO',
    ]);
    expect(getMissingPilotSessionSurfaces()).toEqual([]);
  });

  it('defines endpoint essentials for the frontend pilot contract', () => {
    expect(PILOT_SESSION_API_CONTRACT).toHaveLength(6);

    for (const endpoint of PILOT_SESSION_API_CONTRACT) {
      expect(endpoint.label).not.toHaveLength(0);
      expect(endpoint.path).toMatch(/^\/api\/pilot-session/);
      expect(['GET', 'POST', 'PATCH']).toContain(endpoint.method);
      expect(endpoint.permissions.length).toBeGreaterThan(0);
      expect(endpoint.requestParams.length).toBeGreaterThan(0);
      expect(endpoint.responseKeys.length).toBeGreaterThan(0);
      expect(endpoint.expectedStates.length).toBeGreaterThan(0);
      expect(endpoint.recoverableErrors.length).toBeGreaterThan(0);
    }
  });

  it('keeps the session snapshot shaped around controlled pilot evidence', () => {
    const sessionEndpoint = PILOT_SESSION_API_CONTRACT.find(
      (endpoint) => endpoint.surface === 'session',
    );

    expect(sessionEndpoint).toEqual(
      expect.objectContaining({
        method: 'GET',
        path: '/api/pilot-session',
        permissions: ['pilot:read', 'audit:read'],
        requestParams: ['tenantId', 'sessionId'],
        responseKeys: REQUIRED_PILOT_SESSION_RESPONSE_KEYS,
      }),
    );
  });

  it('keeps write surfaces protected and conflict-aware', () => {
    const writeEndpoints = PILOT_SESSION_API_CONTRACT.filter(
      (endpoint) => endpoint.method !== 'GET',
    );

    expect(writeEndpoints.map((endpoint) => endpoint.surface).sort()).toEqual([
      'checklist',
      'decision',
      'evidence',
      'reservations',
      'roles',
    ]);
    expect(
      writeEndpoints.every(
        (endpoint) =>
          endpoint.permissions.includes('pilot:write') ||
          endpoint.permissions.includes('pilot:decide'),
      ),
    ).toBe(true);
    expect(
      writeEndpoints.every((endpoint) =>
        endpoint.recoverableErrors.includes(409),
      ),
    ).toBe(true);
  });

  it('reports missing pilot session surfaces for partial contracts', () => {
    const partialContract: PilotSessionEndpointContract[] = [
      {
        surface: 'session',
        label: 'Only session',
        method: 'GET',
        path: '/api/pilot-session',
        permissions: ['pilot:read'],
        requestParams: ['tenantId'],
        responseKeys: ['status'],
        expectedStates: ['DRAFT'],
        recoverableErrors: [400],
      },
      {
        surface: 'decision',
        label: 'Only decision',
        method: 'PATCH',
        path: '/api/pilot-session/:sessionId/decision',
        permissions: ['pilot:decide'],
        requestParams: ['tenantId', 'status'],
        responseKeys: ['status'],
        expectedStates: ['PENDING'],
        recoverableErrors: [400, 409],
      },
    ];

    expect(getMissingPilotSessionSurfaces(partialContract)).toEqual([
      'roles',
      'checklist',
      'evidence',
      'reservations',
    ]);
  });
});
