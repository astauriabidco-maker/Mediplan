import { IsISO8601, IsOptional } from 'class-validator';

export class OpsObservabilityQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export interface OpsSeverityMetrics {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

export interface OpsObservabilityMetricsResponse {
  tenantId: string;
  generatedAt: string;
  period: {
    from: string | null;
    to: string | null;
  };
  alerts: {
    openBySeverity: OpsSeverityMetrics;
    totalOpen: number;
  };
  incidents: {
    automaticOpened: number;
    automaticClosed: number;
    mttrApproxMinutes: number | null;
    resolvedOrClosed: number;
  };
  routines: {
    failed: number;
  };
  notifications: {
    sent: number;
    failed: number;
    throttled: number;
    dryRun: number;
    partial: number;
  };
  actionCenter: {
    total: number;
  };
}
