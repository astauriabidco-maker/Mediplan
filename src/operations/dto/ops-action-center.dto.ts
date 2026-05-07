import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum OpsActionCenterItemType {
  OPERATIONAL_ALERT = 'OPERATIONAL_ALERT',
  AUTO_INCIDENT = 'AUTO_INCIDENT',
  INCIDENT_ESCALATION = 'INCIDENT_ESCALATION',
  MISSING_EVIDENCE = 'MISSING_EVIDENCE',
  DECISION_REQUIRED = 'DECISION_REQUIRED',
  JOURNAL_ACTION = 'JOURNAL_ACTION',
}

export enum OpsActionCenterStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ESCALATED = 'ESCALATED',
  WAITING_EVIDENCE = 'WAITING_EVIDENCE',
  WAITING_DECISION = 'WAITING_DECISION',
}

export enum OpsActionCenterPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class OpsActionCenterQueryDto {
  @IsOptional()
  @IsEnum(OpsActionCenterStatus)
  status?: OpsActionCenterStatus;

  @IsOptional()
  @IsEnum(OpsActionCenterItemType)
  type?: OpsActionCenterItemType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export interface OpsActionCenterSourceReference {
  entity: 'OperationalAlert' | 'OperationIncident' | 'OperationsJournalEntry';
  id: number;
  tenantId: string;
  reference: string;
}

export interface OpsActionCenterTimestamps {
  createdAt: string | null;
  updatedAt: string | null;
  occurredAt: string;
  lastSeenAt?: string | null;
  escalatedAt?: string | null;
  resolvedAt?: string | null;
}

export interface OpsActionCenterItem {
  id: string;
  type: OpsActionCenterItemType;
  priority: OpsActionCenterPriority;
  status: OpsActionCenterStatus;
  title: string;
  reason: string;
  requiredEvidence: string[];
  suggestedActions: string[];
  sourceReference: OpsActionCenterSourceReference;
  timestamps: OpsActionCenterTimestamps;
}

export interface OpsActionCenterResponse {
  tenantId: string;
  generatedAt: string;
  total: number;
  filters: {
    status: OpsActionCenterStatus | null;
    type: OpsActionCenterItemType | null;
    limit: number;
  };
  items: OpsActionCenterItem[];
}
