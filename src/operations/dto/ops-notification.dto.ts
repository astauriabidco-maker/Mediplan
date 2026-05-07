import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
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
  @IsEnum(OpsNotificationChannel, { each: true })
  channels?: OpsNotificationChannel[];

  @IsOptional()
  @IsEnum(OpsNotificationStatus)
  status?: OpsNotificationStatus;
}

export interface OpsNotificationResult {
  status: OpsNotificationStatus;
  channels: OpsNotificationChannel[];
  attempts: OpsNotificationAttempt[];
  journalEntryId: number | null;
}

export interface OpsNotificationAttempt {
  channel: OpsNotificationChannel;
  status: OpsNotificationStatus;
  message: string;
}
