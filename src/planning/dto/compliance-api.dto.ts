import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AlertSeverity } from '../../agents/entities/agent-alert.entity';
import { AgentAlert } from '../../agents/entities/agent-alert.entity';
import { ComplianceRuleCode } from '../compliance-validation.types';
import { Shift } from '../entities/shift.entity';
import type {
  CorrectionActionCode,
  CorrectionProblemType,
  ManagerWorklistCategory,
  ManagerWorklistSource,
  ProductionObservabilityStatus,
  PublishPlanningPreviewResult,
  PublishPlanningReport,
} from '../planning.service';

export class CompliancePeriodQueryDto {
  @ApiPropertyOptional({
    description:
      'Tenant cible. Ignoré pour les utilisateurs non super-admin, qui restent bornés à leur tenant JWT.',
    example: 'tenant-a',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Début de période inclus, au format ISO 8601.',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fin de période incluse, au format ISO 8601.',
    example: '2026-01-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ComplianceReportsQueryDto extends CompliancePeriodQueryDto {
  @ApiPropertyOptional({
    description: 'Nombre maximum de rapports de publication retournés.',
    minimum: 1,
    maximum: 1000,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class PlanningComplianceTimelineQueryDto extends ComplianceReportsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtre métier sur un agent impliqué dans la timeline.',
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agentId?: number;

  @ApiPropertyOptional({
    description: 'Filtre métier sur une garde impliquée dans la timeline.',
    example: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shiftId?: number;
}

export class CompliancePeriodResponseDto {
  @ApiPropertyOptional()
  from?: Date;

  @ApiPropertyOptional()
  to?: Date;
}

export class AlertSeverityCountersDto implements Record<AlertSeverity, number> {
  @ApiProperty({ example: 0 })
  HIGH: number;

  @ApiProperty({ example: 0 })
  MEDIUM: number;

  @ApiProperty({ example: 0 })
  LOW: number;
}

export class ComplianceSummaryCountersDto {
  @ApiProperty({ example: 12 })
  openAlerts: number;

  @ApiProperty({ example: 4 })
  blockedShifts: number;

  @ApiProperty({ example: 6 })
  agentsAtRisk: number;

  @ApiProperty({ example: 2 })
  refusedPublications: number;
}

export class ComplianceSummaryBlockedShiftDto {
  @ApiProperty({ example: 42 })
  shiftId: number;

  @ApiPropertyOptional({ example: 7 })
  agentId?: number;

  @ApiProperty({ example: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED] })
  blockingReasons: string[];
}

export class ComplianceSummaryResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ type: ComplianceSummaryCountersDto })
  counters: ComplianceSummaryCountersDto;

  @ApiProperty({ type: AlertSeverityCountersDto })
  openAlertsBySeverity: AlertSeverityCountersDto;

  @ApiProperty({ type: [ComplianceSummaryBlockedShiftDto] })
  blockedShiftPreview: ComplianceSummaryBlockedShiftDto[];
}

export class ManagerWorklistCountersDto implements Record<
  ManagerWorklistCategory,
  number
> {
  @ApiProperty({ example: 0 })
  REST_INSUFFICIENT: number;

  @ApiProperty({ example: 0 })
  WEEKLY_OVERLOAD: number;

  @ApiProperty({ example: 0 })
  MISSING_COMPETENCY: number;

  @ApiProperty({ example: 0 })
  LEAVE_CONFLICT: number;
}

export class ManagerWorklistItemDto {
  @ApiProperty({ example: 'shift:42:WEEKLY_HOURS_LIMIT_EXCEEDED' })
  id: string;

  @ApiProperty({
    enum: [
      'REST_INSUFFICIENT',
      'WEEKLY_OVERLOAD',
      'MISSING_COMPETENCY',
      'LEAVE_CONFLICT',
    ],
  })
  category: ManagerWorklistCategory;

  @ApiProperty({ enum: ['ALERT', 'SHIFT_VALIDATION'] })
  source: ManagerWorklistSource;

  @ApiProperty({ enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiPropertyOptional({ example: 7 })
  agentId?: number;

  @ApiPropertyOptional({ example: 42 })
  shiftId?: number;

  @ApiPropertyOptional({ example: 9 })
  alertId?: number;

  @ApiProperty({ example: 'Surcharge hebdomadaire' })
  title: string;

  @ApiProperty({ enum: ComplianceRuleCode })
  ruleCode: ComplianceRuleCode;

  @ApiPropertyOptional()
  detectedAt?: Date;

  @ApiPropertyOptional()
  dueAt?: Date;

  @ApiPropertyOptional()
  metadata?: unknown;
}

export class ManagerWorklistResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ type: ManagerWorklistCountersDto })
  counters: ManagerWorklistCountersDto;

  @ApiProperty({ type: [ManagerWorklistItemDto] })
  items: ManagerWorklistItemDto[];
}

export class DecisionRecommendationDto {
  @ApiProperty({
    example: 'recommendation:shift:42:WEEKLY_HOURS_LIMIT_EXCEEDED',
  })
  id: string;

  @ApiProperty({ example: 320 })
  priority: number;

  @ApiProperty({
    enum: [
      'REST_INSUFFICIENT',
      'WEEKLY_OVERLOAD',
      'MISSING_COMPETENCY',
      'LEAVE_CONFLICT',
    ],
  })
  category: ManagerWorklistCategory;

  @ApiProperty({ enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty({ example: 'Surcharge hebdomadaire' })
  title: string;

  @ApiProperty()
  rationale: string;

  @ApiProperty({ enum: ComplianceRuleCode })
  ruleCode: ComplianceRuleCode;

  @ApiPropertyOptional({ example: 7 })
  agentId?: number;

  @ApiPropertyOptional({ example: 42 })
  shiftId?: number;

  @ApiPropertyOptional({ example: 9 })
  alertId?: number;

  @ApiPropertyOptional()
  dueAt?: Date;

  @ApiProperty({
    example: ['REASSIGN_SHIFT', 'REQUEST_REPLACEMENT', 'REVALIDATE_SHIFT'],
  })
  recommendedActions: string[];

  @ApiPropertyOptional()
  metadata?: unknown;
}

export class DecisionRecommendationsResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ type: [DecisionRecommendationDto] })
  recommendations: DecisionRecommendationDto[];
}

export class ShiftReplacementSuggestionDto {
  @ApiProperty({ example: 12 })
  agentId: number;

  @ApiProperty({ example: 'Dr Martin' })
  displayName: string;

  @ApiPropertyOptional({ example: 'Infirmier urgentiste' })
  jobTitle?: string;

  @ApiPropertyOptional({ example: 3 })
  hospitalServiceId?: number;

  @ApiProperty({ example: 85 })
  score: number;

  @ApiProperty({ example: ['AVAILABLE_FOR_SHIFT', 'HAS_SERVICE_ASSIGNMENT'] })
  reasons: string[];
}

export class ShiftDecisionSuggestionsResponseDto {
  @ApiProperty()
  shift: Record<string, unknown>;

  @ApiProperty({ type: () => ShiftValidationResponseDto })
  validation: unknown;

  @ApiProperty({
    example: ['REASSIGN_SHIFT', 'REQUEST_REPLACEMENT', 'REVALIDATE_SHIFT'],
  })
  recommendedActions: string[];

  @ApiProperty({ type: [ShiftReplacementSuggestionDto] })
  replacements: ShiftReplacementSuggestionDto[];
}

export class ServiceComplianceIndicatorDto {
  @ApiProperty({ example: 3 })
  serviceId: number;

  @ApiProperty({ example: 'Urgences' })
  serviceName: string;

  @ApiPropertyOptional({ example: 'URG' })
  serviceCode?: string;

  @ApiProperty({ example: 14 })
  activeAgents: number;

  @ApiProperty({ example: 32 })
  plannedShifts: number;

  @ApiProperty({ example: 26 })
  validatedOrPublishedShifts: number;

  @ApiProperty({ example: 6 })
  pendingShifts: number;

  @ApiProperty({ example: 82 })
  coverageRate: number;

  @ApiProperty({ example: 2 })
  weeklyOverloadAgents: number;

  @ApiProperty({ example: 81 })
  publishedComplianceRate: number;

  @ApiProperty({ example: 1 })
  exceptionsApproved: number;

  @ApiProperty({ type: AlertSeverityCountersDto })
  openAlertsBySeverity: AlertSeverityCountersDto;
}

export class ServiceComplianceIndicatorsResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ type: [ServiceComplianceIndicatorDto] })
  services: ServiceComplianceIndicatorDto[];
}

export class ManagerCockpitCountersDto {
  @ApiProperty({ example: 12 })
  openAlerts: number;

  @ApiProperty({ example: 3 })
  highAlerts: number;

  @ApiProperty({ example: 5 })
  mediumAlerts: number;

  @ApiProperty({ example: 4 })
  lowAlerts: number;

  @ApiProperty({ example: 2 })
  blockedShifts: number;

  @ApiProperty({ example: 6 })
  agentsAtRisk: number;

  @ApiProperty({ example: 3 })
  weeklyOverloadAgents: number;

  @ApiProperty({ example: 9 })
  pendingCorrections: number;

  @ApiProperty({ example: 1 })
  refusedPublications: number;

  @ApiProperty({ example: 14 })
  pendingShifts: number;

  @ApiProperty({ example: 28 })
  validatedShifts: number;

  @ApiProperty({ example: 74 })
  publishedShifts: number;

  @ApiProperty({ example: 2 })
  servicesUnderCovered: number;

  @ApiProperty({ example: 4 })
  servicesWithOpenAlerts: number;
}

export class ComplianceReportResponseDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty({ example: 99 })
  actorId: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z_2026-01-31T23:59:59.000Z' })
  entityId: string;

  @ApiProperty({ example: false })
  blocked: boolean;

  @ApiProperty({ example: 12 })
  affected: number;

  @ApiPropertyOptional()
  report?: PublishPlanningReport;
}

export class PlanningTimelineEntityDto {
  @ApiProperty({ example: 'SHIFT' })
  type: string;

  @ApiPropertyOptional({ example: '42' })
  id?: string;
}

export class PlanningTimelineItemDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty({ example: 99 })
  actorId: number;

  @ApiProperty({ example: 'REASSIGN_SHIFT' })
  action: string;

  @ApiProperty({ type: PlanningTimelineEntityDto })
  entity: PlanningTimelineEntityDto;

  @ApiProperty({ example: 'Garde réassignée' })
  label: string;

  @ApiPropertyOptional({ example: 'CORRECTED' })
  status?: string;

  @ApiPropertyOptional({ enum: AlertSeverity })
  severity?: AlertSeverity;

  @ApiProperty()
  details: Record<string, unknown>;
}

export class PlanningTimelineFiltersDto {
  @ApiPropertyOptional({ example: 42 })
  agentId?: number;

  @ApiPropertyOptional({ example: 120 })
  shiftId?: number;
}

export class PlanningComplianceTimelineResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ type: PlanningTimelineFiltersDto })
  filters: PlanningTimelineFiltersDto;

  @ApiProperty({ example: 8 })
  total: number;

  @ApiProperty({ type: [PlanningTimelineItemDto] })
  items: PlanningTimelineItemDto[];
}

export class ShiftValidationResponseDto {
  @ApiProperty({ example: false })
  isValid: boolean;

  @ApiProperty({ example: ['UNASSIGNED_SHIFT'] })
  blockingReasons: string[];

  @ApiProperty({ example: [] })
  warnings: string[];

  @ApiProperty()
  metadata: Record<string, unknown>;
}

export class ShiftComplianceResponseDto {
  @ApiProperty()
  shift: Record<string, unknown>;

  @ApiProperty({ type: ShiftValidationResponseDto })
  validation: ShiftValidationResponseDto;
}

export class RevalidateShiftResponseDto extends ShiftComplianceResponseDto {}

export class PublishPlanningResponseDto {
  @ApiProperty({ example: 'Planning publié avec succès' })
  message: string;

  @ApiProperty({ example: 12 })
  affected: number;

  @ApiProperty()
  report: PublishPlanningReport;
}

export class PublishPlanningPreviewResponseDto implements PublishPlanningPreviewResult {
  @ApiProperty({ example: false })
  publishable: boolean;

  @ApiProperty()
  report: PublishPlanningReport;
}

export class ReassignShiftResponseDto extends Shift {}

export class RequestReplacementResponseDto extends Shift {}

export class ApproveShiftExceptionResponseDto extends Shift {}

export class ResolvePlanningAlertResponseDto extends AgentAlert {}

export class ProductionObservabilityLastPublicationDto {
  @ApiProperty()
  timestamp: Date;

  @ApiProperty({ example: 99 })
  actorId: number;

  @ApiProperty({ example: true })
  blocked: boolean;

  @ApiProperty({ example: 12 })
  affected: number;

  @ApiPropertyOptional({ example: 18 })
  totalPending?: number;

  @ApiProperty({ example: 3 })
  violations: number;

  @ApiProperty({ example: 1 })
  warnings: number;
}

export class ProductionObservabilityCountersDto {
  @ApiProperty({ example: 7 })
  openAlerts: number;

  @ApiProperty({ example: 2 })
  highAlerts: number;

  @ApiProperty({ example: 3 })
  mediumAlerts: number;

  @ApiProperty({ example: 2 })
  lowAlerts: number;

  @ApiProperty({ example: 8 })
  pendingShifts: number;

  @ApiProperty({ example: 24 })
  validatedShifts: number;

  @ApiProperty({ example: 120 })
  publishedShifts: number;

  @ApiProperty({ example: 6 })
  publicationAttempts: number;

  @ApiProperty({ example: 1 })
  refusedPublications: number;

  @ApiProperty({ example: 5 })
  successfulPublications: number;
}

export class ProductionObservabilityComplianceScanJobDto {
  @ApiProperty({ example: true })
  configured: boolean;

  @ApiProperty({ enum: ['HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN'] })
  status: ProductionObservabilityStatus;

  @ApiProperty({ example: 12 })
  recentRuns: number;

  @ApiProperty({ example: 0 })
  failedRuns: number;

  @ApiPropertyOptional()
  lastRunAt?: Date;
}

export class ProductionObservabilityJobsDto {
  @ApiProperty({ type: ProductionObservabilityComplianceScanJobDto })
  complianceScan: ProductionObservabilityComplianceScanJobDto;
}

export class ProductionObservabilityHealthResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ enum: ['HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN'] })
  status: ProductionObservabilityStatus;

  @ApiProperty({ example: ['HIGH_ALERTS_OPEN'] })
  reasons: string[];

  @ApiPropertyOptional({ type: ProductionObservabilityLastPublicationDto })
  lastPublication?: ProductionObservabilityLastPublicationDto;

  @ApiProperty({ type: ProductionObservabilityCountersDto })
  counters: ProductionObservabilityCountersDto;

  @ApiProperty({ type: ProductionObservabilityJobsDto })
  jobs: ProductionObservabilityJobsDto;
}

export class ManagerCockpitActionDto {
  @ApiProperty({
    enum: [
      'OPEN_WORKLIST',
      'REASSIGN_SHIFT',
      'REQUEST_REPLACEMENT',
      'APPROVE_EXCEPTION',
      'REVALIDATE_SHIFT',
      'PUBLISH_PLANNING',
    ],
  })
  type: string;

  @ApiProperty({ example: 'Réassigner le shift' })
  label: string;

  @ApiPropertyOptional({ example: 42 })
  shiftId?: number;

  @ApiPropertyOptional({ example: 15 })
  alertId?: number;

  @ApiPropertyOptional({
    example: {
      method: 'POST',
      path: '/planning/shifts/42/reassign',
    },
  })
  endpoint?: Record<string, unknown>;
}

export class ManagerCockpitResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ enum: ['HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN'] })
  status: ProductionObservabilityStatus;

  @ApiProperty({ example: ['HIGH_ALERTS_OPEN'] })
  reasons: string[];

  @ApiProperty({ type: ManagerCockpitCountersDto })
  counters: ManagerCockpitCountersDto;

  @ApiProperty({ type: ComplianceSummaryResponseDto })
  summary: ComplianceSummaryResponseDto;

  @ApiProperty({ type: ServiceComplianceIndicatorsResponseDto })
  serviceIndicators: ServiceComplianceIndicatorsResponseDto;

  @ApiProperty({ type: ManagerWorklistResponseDto })
  worklist: ManagerWorklistResponseDto;

  @ApiProperty({ type: ProductionObservabilityHealthResponseDto })
  observability: ProductionObservabilityHealthResponseDto;

  @ApiProperty({ type: [ManagerWorklistItemDto] })
  priorityActions: ManagerWorklistItemDto[];

  @ApiProperty({ type: [ManagerCockpitActionDto] })
  recommendedActions: ManagerCockpitActionDto[];
}

export class ManagerCorrectionSuggestionDto {
  @ApiProperty({
    enum: [
      'REASSIGN_SHIFT',
      'REQUEST_REPLACEMENT',
      'APPROVE_EXCEPTION',
      'RESOLVE_ALERT',
      'REVALIDATE_SHIFT',
    ],
  })
  action: string;

  @ApiProperty({ example: 'Agent compatible disponible sur le même service' })
  reason: string;

  @ApiPropertyOptional({ example: 17 })
  suggestedAgentId?: number;

  @ApiPropertyOptional({ example: 42 })
  shiftId?: number;

  @ApiProperty({ example: 90 })
  confidence: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}

export class ManagerCorrectionSuggestionsResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ example: 'shift:42:WEEKLY_HOURS_LIMIT_EXCEEDED' })
  workItemId: string;

  @ApiProperty({ type: [ManagerCorrectionSuggestionDto] })
  suggestions: ManagerCorrectionSuggestionDto[];
}

export class CorrectionActionDto {
  @ApiProperty({
    enum: [
      'REASSIGN_SHIFT',
      'REQUEST_REPLACEMENT',
      'APPROVE_EXCEPTION',
      'REVALIDATE_SHIFT',
      'RESOLVE_ALERT',
    ],
  })
  code: CorrectionActionCode;

  @ApiProperty({ example: 'Réassigner le shift' })
  label: string;

  @ApiProperty({
    example:
      'Teste un nouvel agent avec la validation conformité stricte avant mutation.',
  })
  description: string;

  @ApiProperty({ example: ['planning:write'] })
  permissions: string[];

  @ApiProperty({ enum: ['POST', 'PATCH'] })
  method: 'POST' | 'PATCH';

  @ApiProperty({ example: '/planning/shifts/42/reassign' })
  endpoint: string;

  @ApiPropertyOptional({
    example: {
      agentId: {
        type: 'number',
        required: true,
      },
    },
  })
  body?: Record<string, unknown>;
}

export class CorrectionGuidanceProblemDto {
  @ApiProperty({ enum: ['SHIFT', 'ALERT'] })
  type: CorrectionProblemType;

  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: 'Shift bloqué par la conformité' })
  title: string;

  @ApiPropertyOptional({ enum: AlertSeverity })
  severity?: AlertSeverity;

  @ApiPropertyOptional({ example: 17 })
  agentId?: number;

  @ApiPropertyOptional({ example: 42 })
  shiftId?: number;

  @ApiPropertyOptional({ example: 8 })
  alertId?: number;

  @ApiPropertyOptional({ example: 'PENDING' })
  status?: string;

  @ApiPropertyOptional()
  detectedAt?: Date;

  @ApiPropertyOptional()
  metadata?: unknown;
}

export class CorrectionGuidanceResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CorrectionGuidanceProblemDto })
  problem: CorrectionGuidanceProblemDto;

  @ApiProperty({
    example: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
  })
  reasons: string[];

  @ApiPropertyOptional({ type: ShiftValidationResponseDto })
  validation?: ShiftValidationResponseDto;

  @ApiProperty({ type: [CorrectionActionDto] })
  availableActions: CorrectionActionDto[];
}

export class PrepublicationBlockingItemDto {
  @ApiProperty({ example: 42 })
  shiftId: number;

  @ApiPropertyOptional({ example: 17 })
  agentId?: number;

  @ApiProperty({ enum: ComplianceRuleCode })
  ruleCode: ComplianceRuleCode;

  @ApiProperty({ example: 'Surcharge hebdomadaire' })
  message: string;

  @ApiProperty({ example: true })
  blocking: boolean;

  @ApiProperty({ example: false })
  exceptionAllowed: boolean;
}

export class PrepublicationReadinessResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ example: false })
  canPublish: boolean;

  @ApiProperty({ example: 18 })
  checkedShifts: number;

  @ApiProperty({ example: 3 })
  blockingCount: number;

  @ApiProperty({ example: 1 })
  warningCount: number;

  @ApiProperty({ type: [PrepublicationBlockingItemDto] })
  blockingItems: PrepublicationBlockingItemDto[];

  @ApiProperty({ type: [PrepublicationBlockingItemDto] })
  warnings: PrepublicationBlockingItemDto[];
}

export class ManagerTimelineEventDto {
  @ApiProperty({ example: 'audit:135' })
  id: string;

  @ApiProperty()
  occurredAt: Date;

  @ApiProperty({
    enum: [
      'ALERT_CREATED',
      'SHIFT_REASSIGNED',
      'REPLACEMENT_REQUESTED',
      'ALERT_RESOLVED',
      'SHIFT_REVALIDATED',
      'EXCEPTION_APPROVED',
      'PLANNING_PUBLICATION',
    ],
  })
  type: string;

  @ApiProperty({ example: 99 })
  actorId: number;

  @ApiPropertyOptional({ example: 42 })
  shiftId?: number;

  @ApiPropertyOptional({ example: 15 })
  alertId?: number;

  @ApiPropertyOptional({ example: 17 })
  agentId?: number;

  @ApiProperty({ example: 'Shift réassigné après surcharge hebdomadaire' })
  label: string;

  @ApiPropertyOptional()
  before?: Record<string, unknown>;

  @ApiPropertyOptional()
  after?: Record<string, unknown>;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}

export class ManagerTimelineResponseDto {
  @ApiProperty({ example: 'tenant-a' })
  tenantId: string;

  @ApiProperty({ type: CompliancePeriodResponseDto })
  period: CompliancePeriodResponseDto;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ type: [ManagerTimelineEventDto] })
  events: ManagerTimelineEventDto[];
}
