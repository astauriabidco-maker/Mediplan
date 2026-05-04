import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
};

vi.mock('./axios', () => ({
  default: axiosMock,
}));

const { managerWorkflowApi } = await import('./manager-workflow.api');

describe('managerWorkflowApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosMock.get.mockResolvedValue({ data: { ok: true } });
    axiosMock.post.mockResolvedValue({ data: { ok: true } });
    axiosMock.patch.mockResolvedValue({ data: { ok: true } });
  });

  it('calls detection and observability endpoints with period params', async () => {
    const params = {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-07T23:59:59.999Z',
      tenantId: 'tenant-a',
    };

    await managerWorkflowApi.cockpit(params);
    await managerWorkflowApi.worklist(params);
    await managerWorkflowApi.serviceIndicators(params);
    await managerWorkflowApi.observability(params);

    expect(axiosMock.get).toHaveBeenNthCalledWith(
      1,
      '/api/planning/manager/cockpit',
      { params },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      2,
      '/api/planning/compliance/worklist',
      { params },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      3,
      '/api/planning/compliance/service-indicators',
      { params },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      4,
      '/api/planning/observability/health',
      { params },
    );
  });

  it('calls understand and recommendation endpoints with essential ids', async () => {
    await managerWorkflowApi.shiftCompliance(90);
    await managerWorkflowApi.shiftCorrectionGuidance(90);
    await managerWorkflowApi.alertCorrectionGuidance(44);
    await managerWorkflowApi.shiftSuggestions(90);

    expect(axiosMock.get).toHaveBeenNthCalledWith(
      1,
      '/api/planning/shifts/90/compliance',
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      2,
      '/api/planning/shifts/90/correction-guidance',
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      3,
      '/api/planning/alerts/44/correction-guidance',
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      4,
      '/api/planning/shifts/90/suggestions',
    );
  });

  it('calls correction mutation endpoints with required payloads', async () => {
    await managerWorkflowApi.reassignShift(90, 12, 'Reequilibrage');
    await managerWorkflowApi.requestReplacement(90, 'Absence imprevue', {
      recommendationId: 'recommendation:shift:90',
      alertId: 44,
    });
    await managerWorkflowApi.approveException(90, 'Continuite de service');
    await managerWorkflowApi.revalidateShift(90);
    await managerWorkflowApi.resolveAlert(44, 'Alerte corrigee');

    expect(axiosMock.post).toHaveBeenNthCalledWith(
      1,
      '/api/planning/shifts/90/reassign',
      { agentId: 12, reason: 'Reequilibrage' },
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      2,
      '/api/planning/shifts/90/request-replacement',
      {
        reason: 'Absence imprevue',
        recommendationId: 'recommendation:shift:90',
        alertId: 44,
      },
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      3,
      '/api/planning/shifts/90/exception',
      { reason: 'Continuite de service' },
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      4,
      '/api/planning/shifts/90/revalidate',
    );
    expect(axiosMock.patch).toHaveBeenCalledWith(
      '/api/planning/alerts/44/resolve',
      { reason: 'Alerte corrigee' },
    );
  });

  it('calls publication and timeline endpoints with expected params', async () => {
    const start = '2026-06-01T00:00:00.000Z';
    const end = '2026-06-07T23:59:59.999Z';
    const timelineParams = {
      from: start,
      to: end,
      limit: 50,
      agentId: 10,
      shiftId: 90,
    };

    await managerWorkflowApi.previewPublish(start, end);
    await managerWorkflowApi.publish(start, end);
    await managerWorkflowApi.timeline(timelineParams);
    await managerWorkflowApi.reports({ from: start, to: end, limit: 5 });

    expect(axiosMock.post).toHaveBeenNthCalledWith(
      1,
      '/api/planning/publish/preview',
      { start, end },
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      2,
      '/api/planning/publish',
      { start, end },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      1,
      '/api/planning/compliance/timeline',
      { params: timelineParams },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      2,
      '/api/planning/compliance/reports',
      { params: { from: start, to: end, limit: 5 } },
    );
  });
});
