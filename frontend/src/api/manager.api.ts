import api from './axios';

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type ObservabilityStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'CRITICAL'
  | 'UNKNOWN';
export type WorklistCategory =
  | 'REST_INSUFFICIENT'
  | 'WEEKLY_OVERLOAD'
  | 'MISSING_COMPETENCY'
  | 'LEAVE_CONFLICT';
export type WorklistSource = 'ALERT' | 'SHIFT_VALIDATION';

export interface CompliancePeriod {
  from?: string;
  to?: string;
}

export interface CompliancePeriodParams {
  from?: string;
  to?: string;
  tenantId?: string;
}

export interface AlertSeverityCounters {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface ComplianceSummaryCounters {
  openAlerts: number;
  blockedShifts: number;
  agentsAtRisk: number;
  refusedPublications: number;
}

export interface ComplianceSummary {
  tenantId: string;
  period: CompliancePeriod;
  counters: ComplianceSummaryCounters;
  openAlertsBySeverity: AlertSeverityCounters;
  blockedShiftPreview: Array<{
    shiftId: number;
    agentId?: number;
    blockingReasons: string[];
  }>;
}

export interface ManagerWorklistItem {
  id: string;
  category: WorklistCategory;
  source: WorklistSource;
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

export interface ManagerWorklist {
  tenantId: string;
  period: CompliancePeriod;
  total: number;
  counters: Record<WorklistCategory, number>;
  items: ManagerWorklistItem[];
}

export interface ServiceComplianceIndicator {
  serviceId: number;
  serviceName: string;
  serviceCode?: string;
  activeAgents: number;
  plannedShifts: number;
  validatedOrPublishedShifts: number;
  pendingShifts: number;
  coverageRate: number;
  weeklyOverloadAgents: number;
  publishedComplianceRate: number;
  exceptionsApproved: number;
  openAlertsBySeverity: AlertSeverityCounters;
}

export interface ServiceComplianceIndicators {
  tenantId: string;
  period: CompliancePeriod;
  services: ServiceComplianceIndicator[];
}

export interface ProductionObservabilityHealth {
  tenantId: string;
  generatedAt: string;
  period: CompliancePeriod;
  status: ObservabilityStatus;
  reasons: string[];
  counters: {
    openAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    pendingShifts: number;
    validatedShifts: number;
    publishedShifts: number;
    publicationAttempts: number;
    refusedPublications: number;
    successfulPublications: number;
  };
  lastPublication?: {
    timestamp: string;
    actorId: number;
    blocked: boolean;
    affected: number;
    totalPending?: number;
    violations: number;
    warnings: number;
  };
  jobs: {
    complianceScan: {
      configured: boolean;
      status: ObservabilityStatus;
      recentRuns: number;
      failedRuns: number;
      lastRunAt?: string;
    };
  };
}

export interface ManagerCockpit {
  tenantId: string;
  generatedAt: string;
  period: CompliancePeriod;
  status: ObservabilityStatus;
  reasons: string[];
  counters: ComplianceSummaryCounters & {
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    weeklyOverloadAgents: number;
    pendingCorrections: number;
    pendingShifts: number;
    validatedShifts: number;
    publishedShifts: number;
    servicesUnderCovered: number;
    servicesWithOpenAlerts: number;
  };
  summary: ComplianceSummary;
  serviceIndicators: ServiceComplianceIndicators;
  worklist: ManagerWorklist;
  observability: ProductionObservabilityHealth;
  priorityActions: ManagerWorklistItem[];
  recommendedActions: Array<{
    type: string;
    label: string;
    shiftId?: number;
    alertId?: number;
    endpoint?: {
      method?: string;
      path?: string;
    };
  }>;
}

export interface CorrectionAction {
  code: string;
  label: string;
  description: string;
  permissions: string[];
  method: 'POST' | 'PATCH';
  endpoint: string;
  body?: Record<string, unknown>;
}

export interface CorrectionGuidance {
  tenantId: string;
  problem: {
    type: 'SHIFT' | 'ALERT';
    id: number;
    title: string;
    severity?: AlertSeverity;
    agentId?: number;
    shiftId?: number;
    alertId?: number;
    status?: string;
    detectedAt?: string;
    metadata?: unknown;
  };
  reasons: string[];
  validation?: ShiftCompliance['validation'];
  availableActions: CorrectionAction[];
}

export interface DecisionRecommendation {
  id: string;
  priority: number;
  category: WorklistCategory;
  severity: AlertSeverity;
  title: string;
  rationale: string;
  ruleCode: string;
  agentId?: number;
  shiftId?: number;
  alertId?: number;
  dueAt?: string;
  recommendedActions: string[];
  metadata?: unknown;
}

export interface DecisionRecommendations {
  tenantId: string;
  period: CompliancePeriod;
  total: number;
  recommendations: DecisionRecommendation[];
}

export interface ShiftCompliance {
  shift: Record<string, unknown>;
  validation: {
    isValid: boolean;
    blockingReasons: string[];
    warnings: string[];
    metadata: Record<string, unknown>;
  };
}

export interface ShiftDecisionSuggestions extends ShiftCompliance {
  recommendedActions: string[];
  replacements: Array<{
    agentId: number;
    displayName: string;
    jobTitle?: string;
    hospitalServiceId?: number;
    score: number;
    reasons: string[];
  }>;
}

export interface PublishPreview {
  publishable: boolean;
  report: Record<string, unknown>;
}

export interface ComplianceTimeline {
  tenantId: string;
  period: CompliancePeriod;
  filters: {
    agentId?: number;
    shiftId?: number;
  };
  total: number;
  items: Array<{
    id: number;
    timestamp: string;
    actorId: number;
    action: string;
    entity: {
      type: string;
      id?: string;
    };
    label: string;
    status?: string;
    severity?: AlertSeverity;
    details: Record<string, unknown>;
  }>;
}

export interface TimelineParams extends CompliancePeriodParams {
  agentId?: number;
  shiftId?: number;
  limit?: number;
}

const asParams = <T extends object>(params?: T) => ({ params });

export const managerApi = {
  getCockpit: async (
    params?: CompliancePeriodParams,
  ): Promise<ManagerCockpit> => {
    const response = await api.get(
      '/api/planning/manager/cockpit',
      asParams(params),
    );
    return response.data;
  },

  getWorklist: async (
    params?: CompliancePeriodParams,
  ): Promise<ManagerWorklist> => {
    const response = await api.get(
      '/api/planning/compliance/worklist',
      asParams(params),
    );
    return response.data;
  },

  getShiftGuidance: async (shiftId: number): Promise<CorrectionGuidance> => {
    const response = await api.get(
      `/api/planning/shifts/${shiftId}/correction-guidance`,
    );
    return response.data;
  },

  getAlertGuidance: async (alertId: number): Promise<CorrectionGuidance> => {
    const response = await api.get(
      `/api/planning/alerts/${alertId}/correction-guidance`,
    );
    return response.data;
  },

  getRecommendations: async (
    params?: CompliancePeriodParams,
  ): Promise<DecisionRecommendations> => {
    const response = await api.get(
      '/api/planning/compliance/recommendations',
      asParams(params),
    );
    return response.data;
  },

  getShiftSuggestions: async (
    shiftId: number,
  ): Promise<ShiftDecisionSuggestions> => {
    const response = await api.get(
      `/api/planning/shifts/${shiftId}/suggestions`,
    );
    return response.data;
  },

  previewPublish: async (
    start: string,
    end: string,
  ): Promise<PublishPreview> => {
    const response = await api.post('/api/planning/publish/preview', {
      start,
      end,
    });
    return response.data;
  },

  getTimeline: async (params?: TimelineParams): Promise<ComplianceTimeline> => {
    const response = await api.get(
      '/api/planning/compliance/timeline',
      asParams(params),
    );
    return response.data;
  },

  getServiceIndicators: async (
    params?: CompliancePeriodParams,
  ): Promise<ServiceComplianceIndicators> => {
    const response = await api.get(
      '/api/planning/compliance/service-indicators',
      asParams(params),
    );
    return response.data;
  },
};
