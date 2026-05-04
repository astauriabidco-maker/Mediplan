import { describe, expect, it } from 'vitest';
import { managerWorkflowMockApi } from './manager-workflow.mock';

const isNonEmptyObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.keys(value).length > 0;

describe('managerWorkflowMockApi', () => {
  it('returns compatible non-empty payloads for every manager workflow method', async () => {
    const methodCalls = {
      cockpit: managerWorkflowMockApi.cockpit(),
      summary: managerWorkflowMockApi.summary(),
      worklist: managerWorkflowMockApi.worklist(),
      serviceIndicators: managerWorkflowMockApi.serviceIndicators(),
      recommendations: managerWorkflowMockApi.recommendations(),
      observability: managerWorkflowMockApi.observability(),
      reports: managerWorkflowMockApi.reports(),
      timeline: managerWorkflowMockApi.timeline(),
      shiftCompliance: managerWorkflowMockApi.shiftCompliance(),
      shiftCorrectionGuidance: managerWorkflowMockApi.shiftCorrectionGuidance(),
      alertCorrectionGuidance: managerWorkflowMockApi.alertCorrectionGuidance(),
      shiftSuggestions: managerWorkflowMockApi.shiftSuggestions(),
      previewPublish: managerWorkflowMockApi.previewPublish(),
      publish: managerWorkflowMockApi.publish(),
      reassignShift: managerWorkflowMockApi.reassignShift(),
      requestReplacement: managerWorkflowMockApi.requestReplacement(),
      approveException: managerWorkflowMockApi.approveException(),
      revalidateShift: managerWorkflowMockApi.revalidateShift(),
      resolveAlert: managerWorkflowMockApi.resolveAlert(),
    };

    for (const [method, result] of Object.entries(methodCalls)) {
      const payload = await result;

      if (Array.isArray(payload)) {
        expect(payload.length, `${method} returns a non-empty array`).toBeGreaterThan(0);
        expect(isNonEmptyObject(payload[0])).toBe(true);
      } else {
        expect(isNonEmptyObject(payload), `${method} returns an object`).toBe(true);
      }
    }
  });

  it('models the complete detect-understand-fix-publish-trace flow', async () => {
    await expect(managerWorkflowMockApi.cockpit()).resolves.toMatchObject({
      health: 'DEGRADED',
      counters: {
        blockedShifts: 1,
      },
    });
    await expect(managerWorkflowMockApi.shiftCorrectionGuidance()).resolves.toMatchObject({
      problem: {
        shiftId: 90,
        severity: 'HIGH',
      },
      actions: expect.arrayContaining([
        expect.objectContaining({ code: 'REASSIGN_SHIFT' }),
      ]),
    });
    await expect(managerWorkflowMockApi.reassignShift()).resolves.toMatchObject({
      id: 90,
      agentId: 12,
    });
    await expect(managerWorkflowMockApi.publish()).resolves.toMatchObject({
      affected: 35,
      report: {
        publishable: true,
      },
    });
    await expect(managerWorkflowMockApi.timeline()).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ action: 'PUBLISH_PLANNING' }),
      ]),
    });
  });
});
