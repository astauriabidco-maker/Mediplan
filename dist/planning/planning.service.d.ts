import { Repository } from 'typeorm';
import { Shift, ShiftType } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType } from '../audit/entities/audit-log.entity';
import { ShiftApplication } from './entities/shift-application.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EventsGateway } from '../events/events.gateway';
import { DocumentsService } from '../documents/documents.service';
import { ComplianceValidationService, ShiftValidationOptions, ShiftValidationResult } from './compliance-validation.service';
import { AgentAlert, AlertSeverity } from '../agents/entities/agent-alert.entity';
import { ComplianceRuleCode } from './compliance-validation.types';
export type { ShiftValidationOptions, ShiftValidationResult, } from './compliance-validation.service';
export interface CreateShiftInput {
    agentId: number;
    start: Date;
    end: Date;
    postId: string;
    type?: ShiftType;
    facilityId?: number;
}
export interface PublishPlanningViolation {
    shiftId: number;
    agentId?: number;
    blockingReasons: string[];
    metadata: Record<string, unknown>;
}
export interface PublishPlanningWarning {
    shiftId: number;
    agentId?: number;
    warnings: string[];
    metadata: Record<string, unknown>;
}
export interface PublishPlanningReport {
    start: Date;
    end: Date;
    publishable: boolean;
    totalPending: number;
    validatedShiftIds: number[];
    violations: PublishPlanningViolation[];
    warnings: PublishPlanningWarning[];
    recommendations: string[];
}
export interface PublishPlanningResult {
    message: string;
    affected: number;
    report: PublishPlanningReport;
}
export interface PublishPlanningPreviewResult {
    publishable: boolean;
    report: PublishPlanningReport;
}
export interface ComplianceReportFilters {
    from?: Date;
    to?: Date;
    limit?: number;
}
export interface PlanningComplianceTimelineFilters extends ComplianceReportFilters {
    agentId?: number;
    shiftId?: number;
}
export interface PlanningComplianceTimelineItem {
    id: number | string;
    timestamp: Date;
    actorId?: number;
    action: string;
    entity: {
        type: AuditEntityType | 'ALERT' | 'RECOMMENDATION';
        id?: string;
    };
    label: string;
    status?: string;
    severity?: AlertSeverity;
    details: Record<string, unknown>;
}
export interface PlanningComplianceTimeline {
    tenantId: string;
    period: {
        from?: Date;
        to?: Date;
    };
    filters: {
        agentId?: number;
        shiftId?: number;
    };
    total: number;
    items: PlanningComplianceTimelineItem[];
}
export interface ComplianceSummaryFilters {
    from?: Date;
    to?: Date;
}
export interface ComplianceSummaryBlockedShift {
    shiftId: number;
    agentId?: number;
    blockingReasons: string[];
}
export interface ComplianceSummary {
    tenantId: string;
    period: {
        from?: Date;
        to?: Date;
    };
    counters: {
        openAlerts: number;
        blockedShifts: number;
        agentsAtRisk: number;
        refusedPublications: number;
    };
    openAlertsBySeverity: Record<AlertSeverity, number>;
    blockedShiftPreview: ComplianceSummaryBlockedShift[];
}
export type ManagerWorklistCategory = 'REST_INSUFFICIENT' | 'WEEKLY_OVERLOAD' | 'MISSING_COMPETENCY' | 'LEAVE_CONFLICT';
export type ManagerWorklistSource = 'ALERT' | 'SHIFT_VALIDATION';
export interface ManagerWorklistItem {
    id: string;
    category: ManagerWorklistCategory;
    source: ManagerWorklistSource;
    severity: AlertSeverity;
    agentId?: number;
    shiftId?: number;
    alertId?: number;
    title: string;
    ruleCode: ComplianceRuleCode;
    detectedAt?: Date;
    dueAt?: Date;
    metadata?: unknown;
}
export interface ManagerWorklist {
    tenantId: string;
    period: {
        from?: Date;
        to?: Date;
    };
    total: number;
    counters: Record<ManagerWorklistCategory, number>;
    items: ManagerWorklistItem[];
}
export type DecisionRecommendationAction = 'REASSIGN_SHIFT' | 'REQUEST_REPLACEMENT' | 'APPROVE_EXCEPTION' | 'REVALIDATE_SHIFT' | 'REVIEW_AGENT_FILE';
export interface DecisionRecommendation {
    id: string;
    priority: number;
    category: ManagerWorklistCategory;
    severity: AlertSeverity;
    title: string;
    rationale: string;
    ruleCode: ComplianceRuleCode;
    agentId?: number;
    shiftId?: number;
    alertId?: number;
    dueAt?: Date;
    recommendedActions: DecisionRecommendationAction[];
    metadata?: unknown;
}
export interface DecisionRecommendations {
    tenantId: string;
    period: {
        from?: Date;
        to?: Date;
    };
    total: number;
    recommendations: DecisionRecommendation[];
}
export interface ManagerDecisionTrace {
    reason: string;
    recommendationId?: string;
    alertId?: number;
}
export interface ShiftReplacementSuggestion {
    agentId: number;
    displayName: string;
    jobTitle?: string;
    hospitalServiceId?: number;
    score: number;
    reasons: string[];
}
export interface ShiftDecisionSuggestions {
    shift: Record<string, unknown>;
    validation: ShiftValidationResult;
    recommendedActions: DecisionRecommendationAction[];
    replacements: ShiftReplacementSuggestion[];
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
    openAlertsBySeverity: Record<AlertSeverity, number>;
}
export interface ServiceComplianceIndicators {
    tenantId: string;
    period: {
        from?: Date;
        to?: Date;
    };
    services: ServiceComplianceIndicator[];
}
export type ProductionObservabilityStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
export interface ProductionObservabilityHealth {
    tenantId: string;
    generatedAt: Date;
    period: {
        from?: Date;
        to?: Date;
    };
    status: ProductionObservabilityStatus;
    reasons: string[];
    lastPublication?: {
        timestamp: Date;
        actorId: number;
        blocked: boolean;
        affected: number;
        totalPending?: number;
        violations: number;
        warnings: number;
    };
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
    jobs: {
        complianceScan: {
            configured: boolean;
            status: ProductionObservabilityStatus;
            recentRuns: number;
            failedRuns: number;
            lastRunAt?: Date;
        };
    };
}
export type CorrectionProblemType = 'SHIFT' | 'ALERT';
export type CorrectionActionCode = 'REASSIGN_SHIFT' | 'REQUEST_REPLACEMENT' | 'APPROVE_EXCEPTION' | 'REVALIDATE_SHIFT' | 'RESOLVE_ALERT';
export interface CorrectionAction {
    code: CorrectionActionCode;
    label: string;
    description: string;
    permissions: string[];
    method: 'POST' | 'PATCH';
    endpoint: string;
    body?: Record<string, unknown>;
}
export interface CorrectionGuidanceProblem {
    type: CorrectionProblemType;
    id: number;
    title: string;
    severity?: AlertSeverity;
    agentId?: number;
    shiftId?: number;
    alertId?: number;
    status?: string;
    detectedAt?: Date;
    metadata?: unknown;
}
export interface CorrectionGuidance {
    tenantId: string;
    problem: CorrectionGuidanceProblem;
    reasons: ComplianceRuleCode[] | string[];
    validation?: ShiftValidationResult;
    availableActions: CorrectionAction[];
}
export interface ManagerCockpitAction {
    type: 'OPEN_WORKLIST' | 'REASSIGN_SHIFT' | 'REQUEST_REPLACEMENT' | 'APPROVE_EXCEPTION' | 'REVALIDATE_SHIFT' | 'PUBLISH_PLANNING';
    label: string;
    shiftId?: number;
    alertId?: number;
    endpoint?: Record<string, unknown>;
}
export interface ManagerCockpit {
    tenantId: string;
    generatedAt: Date;
    period: {
        from?: Date;
        to?: Date;
    };
    status: ProductionObservabilityStatus;
    reasons: string[];
    counters: {
        openAlerts: number;
        highAlerts: number;
        mediumAlerts: number;
        lowAlerts: number;
        blockedShifts: number;
        agentsAtRisk: number;
        weeklyOverloadAgents: number;
        pendingCorrections: number;
        refusedPublications: number;
        pendingShifts: number;
        validatedShifts: number;
        publishedShifts: number;
        servicesUnderCovered: number;
        servicesWithOpenAlerts: number;
    };
    summary: ComplianceSummary;
    worklist: ManagerWorklist;
    serviceIndicators: ServiceComplianceIndicators;
    observability: ProductionObservabilityHealth;
    priorityActions: ManagerWorklistItem[];
    recommendedActions: ManagerCockpitAction[];
}
export declare class PlanningService {
    private shiftRepository;
    private leaveRepository;
    private agentRepository;
    private hospitalServiceRepository;
    private alertRepository;
    private shiftApplicationRepository;
    private auditService;
    private whatsappService;
    private eventsGateway;
    private documentsService;
    private complianceValidationService;
    constructor(shiftRepository: Repository<Shift>, leaveRepository: Repository<Leave>, agentRepository: Repository<Agent>, hospitalServiceRepository: Repository<HospitalService>, alertRepository: Repository<AgentAlert>, shiftApplicationRepository: Repository<ShiftApplication>, auditService: AuditService, whatsappService: WhatsappService, eventsGateway: EventsGateway, documentsService: DocumentsService, complianceValidationService: ComplianceValidationService);
    validateShift(tenantId: string, agentId: number, start: Date, end: Date, options?: ShiftValidationOptions): Promise<ShiftValidationResult>;
    checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean>;
    private checkLeaveAvailability;
    getWeeklyHours(tenantId: string, agentId: number, date: Date): Promise<number>;
    getShifts(tenantId: string, start: Date, end: Date, facilityId?: number, serviceId?: number): Promise<Shift[]>;
    createShift(tenantId: string, actorId: number, input: CreateShiftInput): Promise<Shift>;
    assignReplacement(tenantId: string, actorId: number, agentId: number, start: Date, end: Date, postId: string): Promise<Shift>;
    updateShift(tenantId: string, shiftId: string | number, start: Date, end: Date, actorId: number): Promise<Shift>;
    publishPlanning(tenantId: string, actorId: number, start: Date, end: Date): Promise<PublishPlanningResult>;
    previewPublishPlanning(tenantId: string, start: Date, end: Date): Promise<PublishPlanningPreviewResult>;
    getComplianceReports(tenantId: string, filters?: ComplianceReportFilters): Promise<{
        id: number;
        timestamp: Date;
        actorId: number;
        entityId: string;
        blocked: boolean;
        affected: any;
        report: any;
    }[]>;
    getPlanningComplianceTimeline(tenantId: string, filters?: PlanningComplianceTimelineFilters): Promise<PlanningComplianceTimeline>;
    getComplianceSummary(tenantId: string, filters?: ComplianceSummaryFilters): Promise<ComplianceSummary>;
    getManagerWorklist(tenantId: string, filters?: ComplianceSummaryFilters): Promise<ManagerWorklist>;
    getDecisionRecommendations(tenantId: string, filters?: ComplianceSummaryFilters): Promise<DecisionRecommendations>;
    getShiftDecisionSuggestions(tenantId: string, shiftId: string | number, replacementCandidates?: Agent[]): Promise<ShiftDecisionSuggestions>;
    getShiftSuggestionContext(tenantId: string, shiftId: string | number): Promise<Shift>;
    getShiftCorrectionGuidance(tenantId: string, shiftId: string | number): Promise<CorrectionGuidance>;
    getAlertCorrectionGuidance(tenantId: string, alertId: string | number): Promise<CorrectionGuidance>;
    getServiceComplianceIndicators(tenantId: string, filters?: ComplianceSummaryFilters): Promise<ServiceComplianceIndicators>;
    getProductionObservabilityHealth(tenantId: string, filters?: ComplianceSummaryFilters): Promise<ProductionObservabilityHealth>;
    getManagerCockpit(tenantId: string, filters?: ComplianceSummaryFilters): Promise<ManagerCockpit>;
    explainShiftCompliance(tenantId: string, shiftId: string | number): Promise<{
        shift: Record<string, unknown>;
        validation: {
            isValid: boolean;
            blockingReasons: string[];
            warnings: never[];
            metadata: {
                status: string;
            };
        };
    } | {
        shift: Record<string, unknown>;
        validation: ShiftValidationResult;
    }>;
    approveShiftException(tenantId: string, actorId: number, shiftId: string | number, trace: ManagerDecisionTrace | string): Promise<Shift>;
    revalidateShift(tenantId: string, actorId: number, shiftId: string | number): Promise<{
        shift: Record<string, unknown>;
        validation: ShiftValidationResult | {
            isValid: boolean;
            blockingReasons: string[];
            warnings: never[];
            metadata: {
                status: string;
            };
        };
    }>;
    reassignShift(tenantId: string, actorId: number, shiftId: string | number, agentId: number, trace: ManagerDecisionTrace): Promise<Shift>;
    requestReplacement(tenantId: string, actorId: number, shiftId: string | number, trace: ManagerDecisionTrace): Promise<Shift>;
    resolvePlanningAlert(tenantId: string, actorId: number, alertId: string | number, trace: Omit<ManagerDecisionTrace, 'alertId'>): Promise<AgentAlert>;
    getShiftApplications(tenantId: string): Promise<ShiftApplication[]>;
    approveGhtApplication(tenantId: string, applicationId: string | number, actorId: number): Promise<ShiftApplication>;
    rejectGhtApplication(tenantId: string, applicationId: string | number, actorId: number): Promise<ShiftApplication>;
    requestSwap(tenantId: string, shiftId: number, agentId: number): Promise<Shift>;
    getAvailableSwaps(tenantId: string, agentId: number): Promise<Shift[]>;
    applyForSwap(tenantId: string, shiftId: number, agentId: number): Promise<{
        success: boolean;
        message: string;
    }>;
    private getAuditBusinessAction;
    private normalizeDecisionTrace;
    private getActionManagerAuditContext;
    private matchesTimelineFilters;
    private matchesTimelineAlertFilters;
    private auditLogInvolvesAgent;
    private auditLogInvolvesShift;
    private toPlanningTimelineItem;
    private toPlanningAlertTimelineItem;
    private getTimelineLabel;
    private getTimelineStatus;
    private getTimelineSeverity;
    private summarizeTimelineDetails;
    private summarizeValidation;
    private omitUndefined;
    private assertShiftCanEnterSwap;
    private assertValidShiftDates;
    private formatValidationFailure;
    private extractAlertRuleCode;
    private getShiftCorrectionActions;
    private getSeverityRank;
    private getShiftDurationHours;
    private createValidationBatchCache;
    private toManagerCockpitActions;
    private getManagerWorklistCounters;
    private buildPublishPlanningReport;
    private addPublishPlanningRecommendations;
    private getPublishPlanningRecommendation;
    private toDecisionRecommendation;
    private getRecommendationId;
    private getCategoryPriority;
    private getRecommendationRationale;
    private getRecommendedActionsForRules;
    private toShiftReplacementSuggestion;
    private hasApprovedComplianceException;
    private getComplianceExceptionSnapshot;
    private getShiftAuditSnapshot;
}
