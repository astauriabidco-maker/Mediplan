import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ObservabilityEvent } from '../lib/observability';
import { SPRINT36_COMMERCIAL_DEMO_TENANT_ID } from '../lib/sprint36CommercialDemo';

const requestUse = vi.fn();
const responseUse = vi.fn();
const logout = vi.fn();

const apiMock = {
  interceptors: {
    request: { use: requestUse },
    response: { use: responseUse },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => apiMock),
  },
}));

vi.mock('../store/useAuth', () => ({
  useAuth: {
    getState: vi.fn(() => ({
      token: 'jwt-token',
      impersonatedTenantId: 'tenant-b',
      user: { tenantId: 'tenant-a' },
      logout,
    })),
  },
}));

describe('api axios observability interceptors', () => {
  const events: ObservabilityEvent[] = [];

  afterEach(() => {
    events.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('adds auth, tenant and client trace headers on requests', async () => {
    await vi.doMock('../lib/observability', async () => {
      const actual = await vi.importActual<typeof import('../lib/observability')>(
        '../lib/observability',
      );
      return {
        ...actual,
        createTraceId: () => 'trace-request-1',
      };
    });

    await import('./axios');
    const onRequest = requestUse.mock.calls[0][0];
    const config = onRequest({ headers: {}, params: {}, url: '/api/test' });

    expect(config.headers).toMatchObject({
      Authorization: 'Bearer jwt-token',
      'x-client-trace-id': 'trace-request-1',
    });
    expect(config.params).toEqual({ tenantId: 'tenant-b' });
    expect(config.metadata.traceId).toBe('trace-request-1');
  });

  it('blocks sensitive import/export requests for the commercial demo tenant', async () => {
    const { useAuth } = await import('../store/useAuth');
    vi.mocked(useAuth.getState).mockReturnValueOnce({
      token: 'jwt-token',
      impersonatedTenantId: SPRINT36_COMMERCIAL_DEMO_TENANT_ID,
      user: { tenantId: 'tenant-a' },
      logout,
    } as any);

    await import('./axios');
    const onRequest = requestUse.mock.calls[0][0];

    expect(() =>
      onRequest({
        headers: {},
        params: {},
        url: '/api/tenant-backups/export',
      }),
    ).toThrow(/Import\/export sensible bloque/);
  });

  it('logs failed API responses with backend correlation and logs out on 401', async () => {
    await vi.doMock('../lib/observability', async () => {
      const actual = await vi.importActual<typeof import('../lib/observability')>(
        '../lib/observability',
      );
      return {
        ...actual,
        logApiError: vi.fn((error, context) => {
          events.push({
            type: 'api_error',
            level: 'error',
            source: 'frontend',
            timestamp: '2026-05-04T00:00:00.000Z',
            traceId: context.requestTraceId,
            message: 'failed',
            details: context,
          });
          return events[events.length - 1];
        }),
      };
    });

    await import('./axios');
    const onError = responseUse.mock.calls[0][1];
    await expect(
      onError({
        config: {
          method: 'post',
          url: '/api/planning/publish',
          metadata: { traceId: 'trace-response-1', startedAt: performance.now() },
        },
        response: {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'x-audit-id': 'audit-42',
          },
        },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(events[0]).toMatchObject({
      type: 'api_error',
      traceId: 'trace-response-1',
      details: {
        method: 'POST',
        url: '/api/planning/publish',
        status: 401,
        auditCorrelationId: 'audit-42',
      },
    });
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
