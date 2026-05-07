import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { OperationIncidentSeverity } from '../entities/operation-incident.entity';

export enum OpsNotificationChannel {
  DRY_RUN = 'DRY_RUN',
  LOG = 'LOG',
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
}

export enum OpsNotificationEventType {
  ALERT = 'ALERT',
  INCIDENT = 'INCIDENT',
  ESCALATION = 'ESCALATION',
}

export enum OpsNotificationStatus {
  PENDING = 'PENDING',
  DRY_RUN = 'DRY_RUN',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  THROTTLED = 'THROTTLED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export class OpsNotificationPayloadDto {
  @IsString()
  @MaxLength(120)
  tenant: string;

  @IsEnum(OperationIncidentSeverity)
  severity: OperationIncidentSeverity;

  @IsEnum(OpsNotificationEventType)
  eventType: OpsNotificationEventType;

  @IsString()
  @MaxLength(180)
  title: string;

  @IsString()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipientRoles?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reference?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(OpsNotificationChannel, { each: true })
  channels?: OpsNotificationChannel[];

  @IsOptional()
  @IsEnum(OpsNotificationStatus)
  status?: OpsNotificationStatus;
}

export class OpsNotificationAckDto {
  @IsString()
  @MaxLength(120)
  tenant: string;

  @IsInt()
  @Min(1)
  journalEntryId: number;

  @IsInt()
  @Min(1)
  acknowledgedById: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export interface OpsNotificationResult {
  status: OpsNotificationStatus;
  channels: OpsNotificationChannel[];
  attempts: OpsNotificationAttempt[];
  journalEntryId: number | null;
  suppressedUntil?: string;
  reminder: OpsNotificationReminderState;
  proof: OpsNotificationProof;
  policy: OpsNotificationResolvedPolicy;
}

export interface OpsNotificationAttempt {
  channel: OpsNotificationChannel;
  status: OpsNotificationStatus;
  message: string;
}

export interface OpsNotificationResolvedPolicy {
  severity: OperationIncidentSeverity;
  tenant: string;
  channels: OpsNotificationChannel[];
  recipientRoles: string[];
  activeRecipientRoles: string[];
  throttleWindowMs: number;
  dedupeWindowMs: number;
  repeatDelayMs: number;
  reminderDelayMs: number;
  quietHours: OpsNotificationQuietHours | null;
  quietHoursBypassSeverities: OperationIncidentSeverity[];
  escalationLevels: OpsNotificationEscalationLevel[];
  activeEscalationLevel: OpsNotificationEscalationLevel;
}

export interface OpsNotificationQuietHours {
  start: string;
  end: string;
  timezone: 'local';
}

export interface OpsNotificationEscalationLevel {
  level: number;
  delayMs: number;
  recipientRoles: string[];
}

export interface OpsNotificationReminderState {
  isReminder: boolean;
  reminderCount: number;
  nextReminderAt: string | null;
}

export interface OpsNotificationProof {
  proofId: string;
  generatedAt: string;
  reference: string | null;
  channels: OpsNotificationChannel[];
  status: OpsNotificationStatus;
  escalationLevel: number;
}

export interface OpsNotificationAckResult {
  status: OpsNotificationStatus.ACKNOWLEDGED;
  journalEntryId: number;
  acknowledgedAt: string;
  acknowledgedById: number;
  proof: {
    proofId: string;
    acknowledgedAt: string;
  };
}
