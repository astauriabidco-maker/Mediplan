import axios from './axios';
import {
  failManagerActionTrace,
  finishManagerActionTrace,
  startManagerActionTrace,
} from '../lib/observability';

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type PlanningHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'CRITICAL'
  | 'UNKNOWN';
export type ManagerWorklistCategory =
  | 'REST_INSUFFICIENT'
  | 'WEEKLY_OVERLOAD'
  | 'MISSING_COMPETENCY'
  | 'LEAVE_CONFLICT';
export type ManagerWorklistSource = 'ALERT' | 'SHIFT_VALIDATION';
export type ManagerActionCode =
  | 'VIEW_SHIFT_COMPLIANCE'
  | 'REASSIGN_SHIFT'
  | 'REQUEST_REPLACEMENT'
  | 'APPROVE_EXCEPTION'
  | 'REVALIDATE_SHIFT'
  | 'RESOLVE_ALERT'
  | 'PUBLISH_PLANNING';

export interface ManagerWorkflowPeriodParams {
  from?: string;
  to?: string;
  tenantId?: string;
}

export interface ManagerWorkflowLimitParams extends ManagerWorkflowPeriodParams {
  limit?: number;
}

export interface ManagerWorkflowTimelineParams extends ManagerWorkflowLimitParams {
  agentId?: number;
  shiftId?: number;
}

export interface CompliancePeriod {
  from?: string;
  to?: string;
}

export interface AlertSeverityCounters {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface ManagerCockpitResponse {
  tenantId: string;
  period: CompliancePeriod;
  health: PlanningHealthStatus;
  counters: {
    openAlerts: number;
    blockedShifts: number;
    agentsAtRisk: number;
    refusedPublications: number;
    pendingCorrections: number;
    publishedShifts: number;
  };
  summary: ComplianceSummaryResponse;
  worklist: ManagerWorklistResponse;
  serviceIndicators: ServiceComplianceIndicatorsResponse;
  observability: ProductionObservabilityHealthResponse;
  recommendedActions: ManagerRecommendedAction[];
}

export interface ComplianceSummaryResponse {
  tenantId: string;
  period: CompliancePeriod;
  counters: {
    openAlerts: number;
    blockedShifts: number;
    agentsAtRisk: number;
    refusedPublications: number;
  };
  openAlertsBySeverity: AlertSeverityCounters;
  blockedShiftPreview: Array<{
    shiftId: number;
    agentId?: number;
    blockingReasons: string[];
  }>;
}

export interface ManagerWorklistItem {
  id: string;
  category: ManagerWorklistCategory;
  source: ManagerWorklistSource;
  severity: AlertSeverity;
  agentId?: number;
  shiftId?: number;
  alertId?: number;
  title: string;
  ruleCode: string;
  detectedAt?: string;
  dueAt?: string;
  metadata?: unknown;
}

export interface ManagerWorklistResponse {
  tenantId: string;
  period: CompliancePeriod;
  total: number;
  counters: Record<ManagerWorklistCategory, number>;
  items: ManagerWorklistItem[];
}

export interface ServiceComplianceIndicatorsResponse {
  tenantId: string;
  period: CompliancePeriod;
  services: Array<{
    serviceId: number;
    serviceName: string;
    activeAgents: number;
    plannedShifts: number;
    validatedOrPublishedShifts: number;
    pendingShifts: number;
    coverageRate: number;
    weeklyOverloadAgents: number;
    publishedComplianceRate: number;
    exceptionsApproved: number;
    openAlertsBySeverity: AlertSeverityCounters;
  }>;
}

export interface ProductionObservabilityHealthResponse {
  tenantId: string;
  period: CompliancePeriod;
  status: PlanningHealthStatus;
  reasons: string[];
  counters: {
    pendingShifts: number;
    validatedShifts: number;
    publishedShifts: number;
    failedPublications: number;
    openAlerts: number;
    criticalAlerts: number;
  };
  jobs: {
    complianceScan: {
      status: PlanningHealthStatus;
      recentRuns: number;
      lastRunAt?: string;
    };
  };
}

export interface ManagerRecommendedAction {
  code: ManagerActionCode;
  label: string;
  priority: number;
  path: string;
  method: 'GET' | 'POST' | 'PATCH';
  requiredPermissions: string[];
  bodyTemplate?: Record<string, unknown>;
}

export interface CorrectionGuidanceResponse {
  tenantId: string;
  problem: {
    type: ManagerWorklistCategory | 'UNKNOWN';
    title: string;
    severity: AlertSeverity;
    shiftId?: number;
    alertId?: number;
    agentId?: number;
  };
  reasons: string[];
  validation?: ShiftComplianceValidation;
  actions: ManagerRecommendedAction[];
}

export interface ShiftComplianceValidation {
  isValid: boolean;
  blockingReasons: string[];
  warnings: string[];
  metadata?: unknown;
}

export interface ShiftComplianceResponse {
  shift: {
    id: number;
    agentId?: number;
    start: string;
    end: string;
    status: string;
  };
  validation: ShiftComplianceValidation;
}

export interface DecisionRecommendationsResponse {
  tenantId: string;
  period: CompliancePeriod;
  recommendations: Array<{
    id: string;
    priority: number;
    severity: AlertSeverity;
    category: ManagerWorklistCategory;
    title: string;
    reason: string;
    target: {
      shiftId?: number;
      alertId?: number;
      agentId?: number;
    };
    suggestedActions: ManagerRecommendedAction[];
  }>;
}

export interface ShiftDecisionSuggestionsResponse {
  shiftId: number;
  problem: CorrectionGuidanceResponse['problem'];
  validation: ShiftComplianceValidation;
  actions: ManagerRecommendedAction[];
  replacements: Array<{
    agentId: number;
    agentName?: string;
    score: number;
    reasons: string[];
  }>;
}

export interface PublishPlanningPreviewResponse {
  publishable: boolean;
  report: PublishPlanningReport;
}

export interface PublishPlanningResponse {
  affected: number;
  report: PublishPlanningReport;
}

export interface PublishPlanningReport {
  tenantId: string;
  period: CompliancePeriod;
  publishable: boolean;
  validatedShifts: number;
  publishedShifts: number;
  violations: Array<{
    shiftId: number;
    agentId?: number;
    blockingReasons: string[];
  }>;
  warnings: Array<{
    shiftId: number;
    agentId?: number;
    reasons: string[];
    complianceException?: {
      approved: boolean;
      reason: string;
      approvedById: number;
      approvedAt: string;
    };
  }>;
}

export interface PlanningComplianceTimelineResponse {
  tenantId: string;
  period: CompliancePeriod;
  total: number;
  items: Array<{
    id: string | number;
    timestamp: string;
    actorId?: number;
    action: string;
    entity: {
      type: string;
      id?: string;
    };
    label: string;
    status?: string;
    severity?: AlertSeverity;
    details?: unknown;
  }>;
}

const withManagerActionTrace = async <T>(
  context: {
    actionCode: ManagerActionCode;
    endpoint: string;
    method: 'POST' | 'PATCH';
    targetType: 'SHIFT' | 'ALERT' | 'PLANNING';
    targetId?: number;
  },
  run: () => Promise<T>,
): Promise<T> => {
  const traceId = startManagerActionTrace(context);
  try {
    const result = await run();
    finishManagerActionTrace(traceId, context, result);
    return result;
  } catch (error) {
    failManagerActionTrace(traceId, context, error);
    throw error;
  }
};

export const managerWorkflowApi = {
  cockpit: async (
    params?: ManagerWorkflowPeriodParams,
  ): Promise<ManagerCockpitResponse> => {
    const response = await axios.get('/api/planning/manager/cockpit', {
      params,
    });
    return response.data;
  },

  summary: async (
    params?: ManagerWorkflowPeriodParams,
  ): Promise<ComplianceSummaryResponse> => {
    const response = await axios.get('/api/planning/compliance/summary', {
      params,
    });
    return response.data;
  },

  worklist: async (
    params?: ManagerWorkflowPeriodParams,
  ): Promise<ManagerWorklistResponse> => {
    const response = await axios.get('/api/planning/compliance/worklist', {
      params,
    });
    return response.data;
  },

  serviceIndicators: async (
    params?: ManagerWorkflowPeriodParams,
  ): Promise<ServiceComplianceIndicatorsResponse> => {
    const response = await axios.get(
      '/api/planning/compliance/service-indicators',
      { params },
    );
    return response.data;
  },

  recommendations: async (
    params?: ManagerWorkflowPeriodParams,
  ): Promise<DecisionRecommendationsResponse> => {
    const response = await axios.get(
      '/api/planning/compliance/recommendations',
      { params },
    );
    return response.data;
  },

  observability: async (
    params?: ManagerWorkflowPeriodParams,
  ): Promise<ProductionObservabilityHealthResponse> => {
    const response = await axios.get('/api/planning/observability/health', {
      params,
    });
    return response.data;
  },

  reports: async (
    params?: ManagerWorkflowLimitParams,
  ): Promise<PublishPlanningReport[]> => {
    const response = await axios.get('/api/planning/compliance/reports', {
      params,
    });
    return response.data;
  },

  timeline: async (
    params?: ManagerWorkflowTimelineParams,
  ): Promise<PlanningComplianceTimelineResponse> => {
    const response = await axios.get('/api/planning/compliance/timeline', {
      params,
    });
    return response.data;
  },

  shiftCompliance: async (
    shiftId: number,
  ): Promise<ShiftComplianceResponse> => {
    const response = await axios.get(
      `/api/planning/shifts/${shiftId}/compliance`,
    );
    return response.data;
  },

  shiftCorrectionGuidance: async (
    shiftId: number,
  ): Promise<CorrectionGuidanceResponse> => {
    const response = await axios.get(
      `/api/planning/shifts/${shiftId}/correction-guidance`,
    );
    return response.data;
  },

  alertCorrectionGuidance: async (
    alertId: number,
  ): Promise<CorrectionGuidanceResponse> => {
    const response = await axios.get(
      `/api/planning/alerts/${alertId}/correction-guidance`,
    );
    return response.data;
  },

  shiftSuggestions: async (
    shiftId: number,
  ): Promise<ShiftDecisionSuggestionsResponse> => {
    const response = await axios.get(
      `/api/planning/shifts/${shiftId}/suggestions`,
    );
    return response.data;
  },

  previewPublish: async (
    start: string,
    end: string,
  ): Promise<PublishPlanningPreviewResponse> => {
    const response = await axios.post('/api/planning/publish/preview', {
      start,
      end,
    });
    return response.data;
  },

  publish: async (
    start: string,
    end: string,
  ): Promise<PublishPlanningResponse> => {
    return withManagerActionTrace(
      {
        actionCode: 'PUBLISH_PLANNING',
        endpoint: '/api/planning/publish',
        method: 'POST',
        targetType: 'PLANNING',
      },
      async () => {
        const response = await axios.post('/api/planning/publish', {
          start,
          end,
        });
        return response.data;
      },
    );
  },

  reassignShift: async (
    shiftId: number,
    agentId: number,
    reason: string,
    trace?: { recommendationId?: string; alertId?: number },
  ) => {
    return withManagerActionTrace(
      {
        actionCode: 'REASSIGN_SHIFT',
        endpoint: `/api/planning/shifts/${shiftId}/reassign`,
        method: 'POST',
        targetType: 'SHIFT',
        targetId: shiftId,
      },
      async () => {
        const response = await axios.post(
          `/api/planning/shifts/${shiftId}/reassign`,
          { agentId, reason, ...trace },
        );
        return response.data;
      },
    );
  },

  requestReplacement: async (
    shiftId: number,
    reason: string,
    trace?: { recommendationId?: string; alertId?: number },
  ) => {
    return withManagerActionTrace(
      {
        actionCode: 'REQUEST_REPLACEMENT',
        endpoint: `/api/planning/shifts/${shiftId}/request-replacement`,
        method: 'POST',
        targetType: 'SHIFT',
        targetId: shiftId,
      },
      async () => {
        const response = await axios.post(
          `/api/planning/shifts/${shiftId}/request-replacement`,
          {
            reason,
            ...trace,
          },
        );
        return response.data;
      },
    );
  },

  approveException: async (
    shiftId: number,
    reason: string,
    trace?: { recommendationId?: string; alertId?: number },
  ) => {
    return withManagerActionTrace(
      {
        actionCode: 'APPROVE_EXCEPTION',
        endpoint: `/api/planning/shifts/${shiftId}/exception`,
        method: 'POST',
        targetType: 'SHIFT',
        targetId: shiftId,
      },
      async () => {
        const response = await axios.post(
          `/api/planning/shifts/${shiftId}/exception`,
          { reason, ...trace },
        );
        return response.data;
      },
    );
  },

  revalidateShift: async (shiftId: number) => {
    return withManagerActionTrace(
      {
        actionCode: 'REVALIDATE_SHIFT',
        endpoint: `/api/planning/shifts/${shiftId}/revalidate`,
        method: 'POST',
        targetType: 'SHIFT',
        targetId: shiftId,
      },
      async () => {
        const response = await axios.post(
          `/api/planning/shifts/${shiftId}/revalidate`,
        );
        return response.data;
      },
    );
  },

  resolveAlert: async (
    alertId: number,
    reason: string,
    trace?: { recommendationId?: string },
  ) => {
    return withManagerActionTrace(
      {
        actionCode: 'RESOLVE_ALERT',
        endpoint: `/api/planning/alerts/${alertId}/resolve`,
        method: 'PATCH',
        targetType: 'ALERT',
        targetId: alertId,
      },
      async () => {
        const response = await axios.patch(
          `/api/planning/alerts/${alertId}/resolve`,
          { reason, ...trace },
        );
        return response.data;
      },
    );
  },
};
