import type {
  ComplianceSummaryResponse,
  CorrectionGuidanceResponse,
  DecisionRecommendationsResponse,
  ManagerCockpitResponse,
  ManagerWorklistResponse,
  PlanningComplianceTimelineResponse,
  ProductionObservabilityHealthResponse,
  PublishPlanningPreviewResponse,
  PublishPlanningResponse,
  ServiceComplianceIndicatorsResponse,
  ShiftComplianceResponse,
  ShiftDecisionSuggestionsResponse,
} from '../manager-workflow.api';

const period = {
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-06-07T23:59:59.999Z',
};

export const managerWorkflowMockSummary: ComplianceSummaryResponse = {
  tenantId: 'tenant-a',
  period,
  counters: {
    openAlerts: 3,
    blockedShifts: 1,
    agentsAtRisk: 2,
    refusedPublications: 1,
  },
  openAlertsBySeverity: {
    HIGH: 1,
    MEDIUM: 2,
    LOW: 0,
  },
  blockedShiftPreview: [
    {
      shiftId: 90,
      agentId: 10,
      blockingReasons: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
    },
  ],
};

export const managerWorkflowMockWorklist: ManagerWorklistResponse = {
  tenantId: 'tenant-a',
  period,
  total: 2,
  counters: {
    REST_INSUFFICIENT: 0,
    WEEKLY_OVERLOAD: 1,
    MISSING_COMPETENCY: 1,
    LEAVE_CONFLICT: 0,
  },
  items: [
    {
      id: 'shift:90:WEEKLY_HOURS_LIMIT_EXCEEDED',
      category: 'WEEKLY_OVERLOAD',
      source: 'SHIFT_VALIDATION',
      severity: 'HIGH',
      agentId: 10,
      shiftId: 90,
      title: 'Surcharge hebdomadaire',
      ruleCode: 'WEEKLY_HOURS_LIMIT_EXCEEDED',
      detectedAt: '2026-06-04T08:00:00.000Z',
      metadata: {
        weeklyHours: 56,
        weeklyLimit: 48,
      },
    },
    {
      id: 'alert:44:MISSING_COMPETENCY',
      category: 'MISSING_COMPETENCY',
      source: 'ALERT',
      severity: 'MEDIUM',
      agentId: 11,
      alertId: 44,
      title: 'Competence manquante',
      ruleCode: 'MISSING_COMPETENCY',
      detectedAt: '2026-06-04T09:00:00.000Z',
    },
  ],
};

export const managerWorkflowMockServiceIndicators: ServiceComplianceIndicatorsResponse =
  {
    tenantId: 'tenant-a',
    period,
    services: [
      {
        serviceId: 1,
        serviceName: 'Urgences',
        activeAgents: 12,
        plannedShifts: 42,
        validatedOrPublishedShifts: 35,
        pendingShifts: 7,
        coverageRate: 88,
        weeklyOverloadAgents: 1,
        publishedComplianceRate: 83,
        exceptionsApproved: 0,
        openAlertsBySeverity: {
          HIGH: 1,
          MEDIUM: 1,
          LOW: 0,
        },
      },
      {
        serviceId: 2,
        serviceName: 'Reanimation',
        activeAgents: 8,
        plannedShifts: 30,
        validatedOrPublishedShifts: 30,
        pendingShifts: 0,
        coverageRate: 96,
        weeklyOverloadAgents: 0,
        publishedComplianceRate: 100,
        exceptionsApproved: 1,
        openAlertsBySeverity: {
          HIGH: 0,
          MEDIUM: 1,
          LOW: 0,
        },
      },
    ],
  };

export const managerWorkflowMockObservability: ProductionObservabilityHealthResponse =
  {
    tenantId: 'tenant-a',
    period,
    status: 'DEGRADED',
    reasons: ['HIGH_ALERTS_OPEN', 'FAILED_PUBLICATION_RECENT'],
    counters: {
      pendingShifts: 7,
      validatedShifts: 35,
      publishedShifts: 30,
      failedPublications: 1,
      openAlerts: 3,
      criticalAlerts: 1,
    },
    jobs: {
      complianceScan: {
        status: 'HEALTHY',
        recentRuns: 4,
        lastRunAt: '2026-06-04T10:00:00.000Z',
      },
    },
  };

export const managerWorkflowMockCockpit: ManagerCockpitResponse = {
  tenantId: 'tenant-a',
  period,
  health: 'DEGRADED',
  counters: {
    openAlerts: 3,
    blockedShifts: 1,
    agentsAtRisk: 2,
    refusedPublications: 1,
    pendingCorrections: 2,
    publishedShifts: 30,
  },
  summary: managerWorkflowMockSummary,
  worklist: managerWorkflowMockWorklist,
  serviceIndicators: managerWorkflowMockServiceIndicators,
  observability: managerWorkflowMockObservability,
  recommendedActions: [
    {
      code: 'VIEW_SHIFT_COMPLIANCE',
      label: 'Comprendre le blocage',
      priority: 1,
      path: '/planning/shifts/90/compliance',
      method: 'GET',
      requiredPermissions: ['planning:read'],
    },
    {
      code: 'REASSIGN_SHIFT',
      label: 'Reassigner le shift',
      priority: 2,
      path: '/planning/shifts/90/reassign',
      method: 'POST',
      requiredPermissions: ['planning:write'],
      bodyTemplate: {
        agentId: 12,
      },
    },
  ],
};

export const managerWorkflowMockShiftCompliance: ShiftComplianceResponse = {
  shift: {
    id: 90,
    agentId: 10,
    start: '2026-06-04T08:00:00.000Z',
    end: '2026-06-04T20:00:00.000Z',
    status: 'PENDING',
  },
  validation: {
    isValid: false,
    blockingReasons: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
    warnings: [],
    metadata: {
      weeklyHours: 56,
      weeklyLimit: 48,
    },
  },
};

export const managerWorkflowMockGuidance: CorrectionGuidanceResponse = {
  tenantId: 'tenant-a',
  problem: {
    type: 'WEEKLY_OVERLOAD',
    title: 'Surcharge hebdomadaire',
    severity: 'HIGH',
    shiftId: 90,
    agentId: 10,
  },
  reasons: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
  validation: managerWorkflowMockShiftCompliance.validation,
  actions: managerWorkflowMockCockpit.recommendedActions,
};

export const managerWorkflowMockRecommendations: DecisionRecommendationsResponse =
  {
    tenantId: 'tenant-a',
    period,
    recommendations: [
      {
        id: 'recommendation:shift:90',
        priority: 1,
        severity: 'HIGH',
        category: 'WEEKLY_OVERLOAD',
        title: 'Corriger la surcharge avant publication',
        reason: 'Agent a 56h planifiees pour une limite a 48h.',
        target: {
          shiftId: 90,
          agentId: 10,
        },
        suggestedActions: managerWorkflowMockCockpit.recommendedActions,
      },
    ],
  };

export const managerWorkflowMockShiftSuggestions: ShiftDecisionSuggestionsResponse =
  {
    shiftId: 90,
    problem: managerWorkflowMockGuidance.problem,
    validation: managerWorkflowMockShiftCompliance.validation,
    actions: managerWorkflowMockGuidance.actions,
    replacements: [
      {
        agentId: 12,
        agentName: 'Nadia Martin',
        score: 92,
        reasons: ['Disponible', 'Meme service', 'Competence requise valide'],
      },
      {
        agentId: 15,
        agentName: 'Paul Bernard',
        score: 76,
        reasons: ['Disponible', 'Competence requise valide'],
      },
    ],
  };

export const managerWorkflowMockPreviewBlocked: PublishPlanningPreviewResponse =
  {
    publishable: false,
    report: {
      tenantId: 'tenant-a',
      period,
      publishable: false,
      validatedShifts: 35,
      publishedShifts: 0,
      violations: [
        {
          shiftId: 90,
          agentId: 10,
          blockingReasons: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
        },
      ],
      warnings: [],
    },
  };

export const managerWorkflowMockPublishSuccess: PublishPlanningResponse = {
  affected: 35,
  report: {
    ...managerWorkflowMockPreviewBlocked.report,
    publishable: true,
    publishedShifts: 35,
    violations: [],
    warnings: [
      {
        shiftId: 91,
        agentId: 14,
        reasons: ['CONTROLLED_EXCEPTION_APPROVED'],
        complianceException: {
          approved: true,
          reason: 'Continuite de service critique',
          approvedById: 99,
          approvedAt: '2026-06-04T11:00:00.000Z',
        },
      },
    ],
  },
};

export const managerWorkflowMockTimeline: PlanningComplianceTimelineResponse = {
  tenantId: 'tenant-a',
  period,
  items: [
    {
      id: 'audit:1',
      timestamp: '2026-06-04T08:00:00.000Z',
      actorId: 99,
      action: 'COMPLIANCE_SCAN',
      entity: 'SHIFT',
      entityId: 90,
      label: 'Shift bloque par surcharge hebdomadaire',
      status: 'BLOCKED',
      severity: 'HIGH',
    },
    {
      id: 'audit:2',
      timestamp: '2026-06-04T10:30:00.000Z',
      actorId: 99,
      action: 'REASSIGN_SHIFT',
      entity: 'SHIFT',
      entityId: 90,
      label: 'Shift reattribue a Nadia Martin',
      status: 'RESOLVED',
    },
    {
      id: 'audit:3',
      timestamp: '2026-06-04T11:15:00.000Z',
      actorId: 99,
      action: 'PUBLISH_PLANNING',
      entity: 'PLANNING',
      label: 'Planning publie avec 35 shifts',
      status: 'PUBLISHED',
    },
  ],
};

export const managerWorkflowMockReports = [
  managerWorkflowMockPreviewBlocked.report,
  managerWorkflowMockPublishSuccess.report,
];

export const managerWorkflowMockApi = {
  cockpit: async () => managerWorkflowMockCockpit,
  summary: async () => managerWorkflowMockSummary,
  worklist: async () => managerWorkflowMockWorklist,
  serviceIndicators: async () => managerWorkflowMockServiceIndicators,
  recommendations: async () => managerWorkflowMockRecommendations,
  observability: async () => managerWorkflowMockObservability,
  reports: async () => managerWorkflowMockReports,
  timeline: async () => managerWorkflowMockTimeline,
  shiftCompliance: async () => managerWorkflowMockShiftCompliance,
  shiftCorrectionGuidance: async () => managerWorkflowMockGuidance,
  alertCorrectionGuidance: async () => managerWorkflowMockGuidance,
  shiftSuggestions: async () => managerWorkflowMockShiftSuggestions,
  previewPublish: async () => managerWorkflowMockPreviewBlocked,
  publish: async () => managerWorkflowMockPublishSuccess,
  reassignShift: async () => ({
    id: 90,
    agentId: 12,
    status: 'PENDING',
  }),
  requestReplacement: async () => ({
    shiftId: 90,
    requested: true,
    status: 'REPLACEMENT_REQUESTED',
  }),
  approveException: async () => ({
    shiftId: 90,
    complianceExceptionApproved: true,
    complianceExceptionReason: 'Continuite de service critique',
  }),
  revalidateShift: async () => ({
    shiftId: 90,
    validation: {
      isValid: true,
      blockingReasons: [],
      warnings: [],
    },
  }),
  resolveAlert: async () => ({
    alertId: 44,
    status: 'RESOLVED',
  }),
};
