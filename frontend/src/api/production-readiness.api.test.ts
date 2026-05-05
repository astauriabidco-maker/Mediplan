import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = {
  get: vi.fn(),
  patch: vi.fn(),
};

vi.mock('./axios', () => ({
  default: axiosMock,
}));

const { productionReadinessApi } = await import('./production-readiness.api');

describe('productionReadinessApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosMock.get.mockResolvedValue({ data: { ok: true } });
    axiosMock.patch.mockResolvedValue({ data: { ok: true } });
  });

  it('calls signoffs and decision endpoints with tenant params', async () => {
    const params = { tenantId: 'tenant-a' };

    await productionReadinessApi.signoffs(params);
    await productionReadinessApi.decision(params);
    await productionReadinessApi.signoffHistory(params);
    await productionReadinessApi.gates(params);

    expect(axiosMock.get).toHaveBeenNthCalledWith(
      1,
      '/api/production-readiness/signoffs',
      { params },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      2,
      '/api/production-readiness/decision',
      { params },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      3,
      '/api/production-readiness/signoffs/history',
      { params },
    );
    expect(axiosMock.get).toHaveBeenNthCalledWith(
      4,
      '/api/production-readiness/gates',
      { params },
    );
  });

  it('updates a signoff with the expected key and payload', async () => {
    const payload = {
      status: 'GO' as const,
      signerName: 'Alice Martin',
      signerRole: 'RSSI',
      proofUrl: 'https://intranet/releases/security-go',
      proofLabel: 'Security validation',
      comment: 'Validated for production.',
    };
    const params = { tenantId: 'tenant-a' };

    await productionReadinessApi.updateSignoff('SECURITY', payload, params);

    expect(axiosMock.patch).toHaveBeenCalledWith(
      '/api/production-readiness/signoffs/SECURITY',
      payload,
      { params },
    );
  });

  it('updates a gate with the expected key and payload', async () => {
    const payload = {
      status: 'PASSED' as const,
      source: 'smoke-tests',
      evidenceUrl: 'https://ci.example.test/releases/123',
      comment: 'Smoke suite passed.',
    };
    const params = { tenantId: 'tenant-a' };

    await productionReadinessApi.updateGate('SMOKE', payload, params);

    expect(axiosMock.patch).toHaveBeenCalledWith(
      '/api/production-readiness/gates/SMOKE',
      payload,
      { params },
    );
  });
});
