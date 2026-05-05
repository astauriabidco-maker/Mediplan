import type { QueryClient } from '@tanstack/react-query';
import type {
  PlanningTimelineFilters,
  PublishPlanningPeriod,
} from './planning.api';
import type { CompliancePeriodParams } from './manager.api';
import type { ProductionReadinessTenantParams } from './production-readiness.api';

const MINUTE = 60 * 1000;

const periodParams = (params?: CompliancePeriodParams) => ({
  from: params?.from,
  to: params?.to,
  tenantId: params?.tenantId,
});

const publicationPeriod = (period: PublishPlanningPeriod) => ({
  start: period.start,
  end: period.end,
});

const timelineFilters = (filters: PlanningTimelineFilters) => ({
  from: filters.from,
  to: filters.to,
  limit: filters.limit,
  agentId: filters.agentId,
  shiftId: filters.shiftId,
});

const tenantParams = (params?: ProductionReadinessTenantParams) => ({
  tenantId: params?.tenantId,
});

export const queryCacheProfiles = {
  live: {
    staleTime: 15 * 1000,
    gcTime: 2 * MINUTE,
  },
  operational: {
    staleTime: 30 * 1000,
    gcTime: 5 * MINUTE,
  },
  auditTrail: {
    staleTime: 45 * 1000,
    gcTime: 10 * MINUTE,
  },
  reference: {
    staleTime: 5 * MINUTE,
    gcTime: 30 * MINUTE,
  },
} as const;

export const agentsQueryKeys = {
  all: ['agents'] as const,
  list: (scope = 'default') => [...agentsQueryKeys.all, 'list', scope] as const,
};

export const managerQueryKeys = {
  all: ['manager'] as const,
  cockpit: {
    all: () => [...managerQueryKeys.all, 'cockpit'] as const,
    period: (params?: CompliancePeriodParams) =>
      [...managerQueryKeys.cockpit.all(), periodParams(params)] as const,
  },
  worklist: {
    all: () => [...managerQueryKeys.all, 'worklist'] as const,
    period: (params?: CompliancePeriodParams) =>
      [...managerQueryKeys.worklist.all(), periodParams(params)] as const,
  },
  correctionGuidance: {
    all: () => [...managerQueryKeys.all, 'correction-guidance'] as const,
    target: (type?: 'SHIFT' | 'ALERT', id?: string | number | null) =>
      [
        ...managerQueryKeys.correctionGuidance.all(),
        type ?? 'none',
        id ?? null,
      ] as const,
    shift: (shiftId?: string | number | null) =>
      managerQueryKeys.correctionGuidance.target('SHIFT', shiftId),
    alert: (alertId?: string | number | null) =>
      managerQueryKeys.correctionGuidance.target('ALERT', alertId),
  },
};

export const planningQueryKeys = {
  all: ['planning'] as const,
  shifts: {
    all: () => [...planningQueryKeys.all, 'shifts'] as const,
  },
  publication: {
    all: () => [...planningQueryKeys.all, 'publication'] as const,
    preview: (period: PublishPlanningPeriod) =>
      [
        ...planningQueryKeys.publication.all(),
        'preview',
        publicationPeriod(period),
      ] as const,
  },
  compliance: {
    all: () => [...planningQueryKeys.all, 'compliance'] as const,
    timeline: (filters: PlanningTimelineFilters) =>
      [
        ...planningQueryKeys.compliance.all(),
        'timeline',
        timelineFilters(filters),
      ] as const,
  },
};

export const productionReadinessQueryKeys = {
  all: ['production-readiness'] as const,
  signoffs: {
    all: () => [...productionReadinessQueryKeys.all, 'signoffs'] as const,
    list: (params?: ProductionReadinessTenantParams) =>
      [
        ...productionReadinessQueryKeys.signoffs.all(),
        tenantParams(params),
      ] as const,
  },
  decision: {
    all: () => [...productionReadinessQueryKeys.all, 'decision'] as const,
    detail: (params?: ProductionReadinessTenantParams) =>
      [
        ...productionReadinessQueryKeys.decision.all(),
        tenantParams(params),
      ] as const,
  },
};

export const invalidatePlanningResolutionQueries = (
  queryClient: QueryClient,
) => {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: managerQueryKeys.cockpit.all(),
    }),
    queryClient.invalidateQueries({
      queryKey: managerQueryKeys.worklist.all(),
    }),
    queryClient.invalidateQueries({
      queryKey: managerQueryKeys.correctionGuidance.all(),
    }),
    queryClient.invalidateQueries({
      queryKey: planningQueryKeys.publication.all(),
    }),
    queryClient.invalidateQueries({
      queryKey: planningQueryKeys.compliance.all(),
    }),
    queryClient.invalidateQueries({
      queryKey: planningQueryKeys.all,
    }),
  ]);
};
