import { IsNumberString, IsOptional, IsString } from 'class-validator';
import type { OperationalAlertSeverity } from '../operations/entities/operational-alert.entity';
import type { OperationRoutineRunStatus } from '../operations/entities/operation-routine-run.entity';

export class PlatformMonitoringQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsNumberString()
  backupFreshnessHours?: string;
}

export type PlatformTenantHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
export type PlatformTenantSignalStatus = PlatformTenantHealthStatus | 'UNKNOWN';

export interface PlatformTenantMonitoringResponse {
  generatedAt: string;
  backupFreshnessHours: number;
  totals: {
    tenants: number;
    healthy: number;
    degraded: number;
    critical: number;
    openAlerts: number;
    criticalAlerts: number;
  };
  tenants: PlatformTenantMonitoringRow[];
}

export interface PlatformTenantMonitoringRow {
  tenant: {
    id: string;
    name: string;
    region: string | null;
    contactEmail: string | null;
    isActive: boolean;
    userCount: number;
    createdAt: string | null;
  };
  status: PlatformTenantHealthStatus;
  reasons: string[];
  backend: {
    healthy: boolean;
    status: PlatformTenantHealthStatus;
    reasons: string[];
    lastSmokeAt: string | null;
    source: string;
  };
  alerts: {
    open: number;
    critical: number;
    high: number;
    bySeverity: Record<OperationalAlertSeverity, number>;
    latest: PlatformTenantAlertSummary | null;
  };
  publications: {
    latest: PlatformTenantPublicationSummary | null;
    attempts: number;
    refused: number;
  };
  audits: {
    latest: PlatformTenantAuditSummary | null;
    chain: {
      checkedAt: string;
      valid: boolean;
      total: number;
      issues: unknown[];
    };
  };
  backup: {
    available: boolean;
    recent: boolean | null;
    status: PlatformTenantSignalStatus;
    lastBackupAt: string | null;
    ageHours: number | null;
    source: string | null;
    routineStatus: OperationRoutineRunStatus | null;
    artifactUrl: string | null;
  };
  compliance: {
    status: PlatformTenantSignalStatus;
    score: number | null;
    source: string | null;
    lastCheckedAt: string | null;
    details: Record<string, unknown>;
  };
}

export interface PlatformTenantAlertSummary {
  id: number;
  type: string;
  severity: OperationalAlertSeverity;
  message: string;
  openedAt: string | null;
  lastSeenAt: string | null;
}

export interface PlatformTenantPublicationSummary {
  auditLogId: number;
  timestamp: string;
  actorId: number;
  blocked: boolean;
  affected: number;
  totalPending: number | null;
  violations: number;
  warnings: number;
}

export interface PlatformTenantAuditSummary {
  id: number;
  timestamp: string;
  actorId: number;
  action: string;
  entityType: string;
  entityId: string | null;
  detailAction: string | null;
}
