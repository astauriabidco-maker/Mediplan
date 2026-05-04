import type { Agent } from '../agents/entities/agent.entity';
import type { HealthRecord } from '../agents/entities/health-record.entity';
import type { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import type { ResolvedWorkPolicyRules } from './work-policies.service';

export enum ComplianceRuleCode {
  INVALID_SHIFT_DATES = 'INVALID_SHIFT_DATES',
  INVALID_SHIFT_RANGE = 'INVALID_SHIFT_RANGE',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_INACTIVE = 'AGENT_INACTIVE',
  MANDATORY_HEALTH_RECORD_EXPIRED = 'MANDATORY_HEALTH_RECORD_EXPIRED',
  MANDATORY_COMPETENCY_EXPIRED = 'MANDATORY_COMPETENCY_EXPIRED',
  APPROVED_LEAVE_OVERLAP = 'APPROVED_LEAVE_OVERLAP',
  WEEKLY_HOURS_LIMIT_EXCEEDED = 'WEEKLY_HOURS_LIMIT_EXCEEDED',
  MAX_GUARD_DURATION_EXCEEDED = 'MAX_GUARD_DURATION_EXCEEDED',
  REST_TIME_BEFORE_SHIFT_TOO_SHORT = 'REST_TIME_BEFORE_SHIFT_TOO_SHORT',
  REST_TIME_AFTER_SHIFT_TOO_SHORT = 'REST_TIME_AFTER_SHIFT_TOO_SHORT',
  SHIFT_OVERLAP = 'SHIFT_OVERLAP',
}

export interface ShiftValidationBatchCache {
  agents: Map<string, Promise<Agent | null>>;
  constraints: Map<string, Promise<ResolvedWorkPolicyRules>>;
  mandatoryHealthRecords: Map<string, Promise<HealthRecord[]>>;
  mandatoryCompetencies: Map<string, Promise<AgentCompetency[]>>;
  weeklyHours: Map<string, Promise<number>>;
  tenantWeeklyLimits: Map<string, Promise<number | null | undefined>>;
}

export interface ShiftValidationOptions {
  excludeShiftId?: number;
  skipAlertSync?: boolean;
  batchCache?: ShiftValidationBatchCache;
}

export interface ShiftValidationResult {
  isValid: boolean;
  blockingReasons: ComplianceRuleCode[];
  warnings: ComplianceRuleCode[];
  metadata: Record<string, unknown>;
}
