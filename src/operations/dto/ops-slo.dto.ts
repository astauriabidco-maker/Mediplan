import { IsISO8601, IsOptional } from 'class-validator';

export class OpsSloQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export enum OpsSloStatus {
  PASSED = 'PASSED',
  WARNING = 'WARNING',
  FAILED = 'FAILED',
}

export type OpsSloObjectiveId =
  | 'alert_resolution_delay'
  | 'open_alert_age'
  | 'incident_mttr'
  | 'backup_freshness'
  | 'routine_success_rate'
  | 'notification_delivery';

export interface OpsSloObjectiveThresholds {
  pass: number;
  warning: number;
  unit: 'minutes' | 'hours' | 'percent';
  direction: 'lte' | 'gte';
}

export interface OpsSloObjectiveActual {
  value: number | null;
  unit: OpsSloObjectiveThresholds['unit'];
  sampleSize: number;
}

export interface OpsSloObjectiveDto {
  id: OpsSloObjectiveId;
  label: string;
  status: OpsSloStatus;
  actual: OpsSloObjectiveActual;
  thresholds: OpsSloObjectiveThresholds;
  reason: string;
  details?: Record<string, unknown>;
}

export interface OpsSloResponseDto {
  tenantId: string;
  generatedAt: string;
  period: {
    from: string | null;
    to: string | null;
  };
  status: OpsSloStatus;
  objectives: Record<OpsSloObjectiveId, OpsSloObjectiveDto>;
}
