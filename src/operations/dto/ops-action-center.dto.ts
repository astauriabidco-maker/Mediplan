import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum OpsActionCenterPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum OpsActionCenterWorkflowAction {
  ASSIGN = 'ASSIGN',
  COMMENT = 'COMMENT',
  PRIORITY = 'PRIORITY',
  STATUS = 'STATUS',
  RESOLVE = 'RESOLVE',
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

export interface OpsActionCenterWorkflowComment {
  id: number;
  comment: string;
  actorId: number;
  createdAt: string;
}

export interface OpsActionCenterWorkflowState {
  assignedToId: number | null;
  priorityOverride: OpsActionCenterPriority | null;
  statusOverride: OpsActionCenterStatus | null;
  commentsCount: number;
  lastComment: OpsActionCenterWorkflowComment | null;
  updatedAt: string | null;
  updatedById: number | null;
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
  workflow: OpsActionCenterWorkflowState;
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

export class OpsActionCenterItemParamDto {
  @IsString()
  @MaxLength(240)
  itemId: string;
}

export class AssignOpsActionCenterItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedToId: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class CommentOpsActionCenterItemDto {
  @IsString()
  @MaxLength(2000)
  comment: string;
}

export class PrioritizeOpsActionCenterItemDto {
  @IsEnum(OpsActionCenterPriority)
  priority: OpsActionCenterPriority;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class TransitionOpsActionCenterItemDto {
  @IsEnum(OpsActionCenterStatus)
  status: OpsActionCenterStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ResolveOpsActionCenterItemDto {
  @IsOptional()
  @IsEnum(OpsActionCenterStatus)
  status?: OpsActionCenterStatus.RESOLVED | OpsActionCenterStatus.CLOSED;

  @IsString()
  @MaxLength(2000)
  summary: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  evidenceLabel?: string;
}
