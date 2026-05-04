import { describe, expect, it } from 'vitest';
import {
  MANAGER_WORKFLOW_API_CONTRACT,
  REQUIRED_MANAGER_WORKFLOW_STEPS,
  getMissingManagerWorkflowSteps,
  type ManagerWorkflowEndpointContract,
} from './manager-workflow.contract';

describe('MANAGER_WORKFLOW_API_CONTRACT', () => {
  it('covers the full manager workflow in order', () => {
    expect(REQUIRED_MANAGER_WORKFLOW_STEPS).toEqual([
      'detect',
      'understand',
      'fix',
      'publish',
      'trace',
    ]);
    expect(getMissingManagerWorkflowSteps()).toEqual([]);

    for (const step of REQUIRED_MANAGER_WORKFLOW_STEPS) {
      expect(
        MANAGER_WORKFLOW_API_CONTRACT.some(
          (endpoint) => endpoint.step === step,
        ),
      ).toBe(true);
    }
  });

  it('defines endpoint essentials for each workflow surface', () => {
    expect(MANAGER_WORKFLOW_API_CONTRACT.length).toBeGreaterThanOrEqual(10);

    for (const endpoint of MANAGER_WORKFLOW_API_CONTRACT) {
      expect(endpoint.label).not.toHaveLength(0);
      expect(endpoint.path).toMatch(/^\/api\/planning\//);
      expect(['GET', 'POST', 'PATCH']).toContain(endpoint.method);
      expect(endpoint.permission).toMatch(/^[a-z]+:[a-z]+$/);
      expect(endpoint.expectedStates.length).toBeGreaterThan(0);
      expect(endpoint.recoverableErrors.length).toBeGreaterThan(0);
    }
  });

  it('keeps correction mutations tied to action codes and write permissions', () => {
    const fixEndpoints = MANAGER_WORKFLOW_API_CONTRACT.filter(
      (endpoint) => endpoint.step === 'fix',
    );

    expect(fixEndpoints).toHaveLength(4);
    expect(fixEndpoints.every((endpoint) => endpoint.actionCode)).toBe(true);
    expect(
      fixEndpoints.map((endpoint) => endpoint.permission).sort(),
    ).toEqual([
      'planning:exception',
      'planning:write',
      'planning:write',
      'planning:write',
    ]);
  });

  it('reports missing workflow steps for partial contracts', () => {
    const partialContract: ManagerWorkflowEndpointContract[] = [
      {
        step: 'detect',
        label: 'Only detect',
        method: 'GET',
        path: '/api/planning/manager/cockpit',
        permission: 'planning:read',
        expectedStates: ['DEGRADED'],
        recoverableErrors: [400],
      },
      {
        step: 'trace',
        label: 'Only trace',
        method: 'GET',
        path: '/api/planning/compliance/timeline',
        permission: 'audit:read',
        expectedStates: ['publication'],
        recoverableErrors: [400],
      },
    ];

    expect(getMissingManagerWorkflowSteps(partialContract)).toEqual([
      'understand',
      'fix',
      'publish',
    ]);
  });
});
