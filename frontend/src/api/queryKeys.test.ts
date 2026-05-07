import { describe, expect, it, vi } from 'vitest';
import {
  agentsQueryKeys,
  invalidatePlanningResolutionQueries,
  managerQueryKeys,
  opsQueryKeys,
  planningQueryKeys,
  productionReadinessQueryKeys,
  queryCacheProfiles,
} from './queryKeys';

describe('queryKeys', () => {
  it('groups manager cockpit, worklist and correction guidance by domain', () => {
    const period = {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-07T23:59:59.999Z',
      tenantId: 'tenant-a',
    };

    expect(managerQueryKeys.cockpit.period(period)).toEqual([
      'manager',
      'cockpit',
      period,
    ]);
    expect(managerQueryKeys.worklist.period(period)).toEqual([
      'manager',
      'worklist',
      period,
    ]);
    expect(managerQueryKeys.correctionGuidance.shift(90)).toEqual([
      'manager',
      'correction-guidance',
      'SHIFT',
      90,
    ]);
    expect(managerQueryKeys.correctionGuidance.alert(44)).toEqual([
      'manager',
      'correction-guidance',
      'ALERT',
      44,
    ]);
  });

  it('keeps publication and compliance timeline keys under planning', () => {
    expect(
      planningQueryKeys.publication.preview({
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-07T23:59:59.999Z',
      }),
    ).toEqual([
      'planning',
      'publication',
      'preview',
      {
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-07T23:59:59.999Z',
      },
    ]);

    expect(
      planningQueryKeys.compliance.timeline({
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-07T23:59:59.999Z',
        limit: 80,
        agentId: 12,
        shiftId: 90,
      }),
    ).toEqual([
      'planning',
      'compliance',
      'timeline',
      {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-07T23:59:59.999Z',
        limit: 80,
        agentId: 12,
        shiftId: 90,
      },
    ]);
  });

  it('uses longer cache settings for reference data than live guidance', () => {
    expect(agentsQueryKeys.list('manager-actions')).toEqual([
      'agents',
      'list',
      'manager-actions',
    ]);
    expect(queryCacheProfiles.reference.staleTime).toBeGreaterThan(
      queryCacheProfiles.live.staleTime,
    );
    expect(queryCacheProfiles.reference.gcTime).toBeGreaterThan(
      queryCacheProfiles.live.gcTime,
    );
  });

  it('groups production readiness signoffs and decision by tenant', () => {
    const params = { tenantId: 'tenant-a' };

    expect(productionReadinessQueryKeys.signoffs.list(params)).toEqual([
      'production-readiness',
      'signoffs',
      params,
    ]);
    expect(productionReadinessQueryKeys.decision.detail(params)).toEqual([
      'production-readiness',
      'decision',
      params,
    ]);
  });

  it('groups ops dashboard summary by period and tenant', () => {
    const params = {
      tenantId: 'tenant-a',
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-07T00:00:00.000Z',
    };

    expect(opsQueryKeys.dashboard.summary(params)).toEqual([
      'ops',
      'dashboard',
      params,
    ]);
  });

  it('invalidates resolution-sensitive manager and planning domains', async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidatePlanningResolutionQueries(queryClient as never);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: managerQueryKeys.cockpit.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: managerQueryKeys.worklist.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: managerQueryKeys.correctionGuidance.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: planningQueryKeys.publication.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: planningQueryKeys.compliance.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: planningQueryKeys.all,
    });
  });
});
