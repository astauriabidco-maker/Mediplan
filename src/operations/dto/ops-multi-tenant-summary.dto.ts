import { IsOptional } from 'class-validator';
import type {
  OpsActionCenterItem,
  OpsActionCenterPriority,
} from './ops-action-center.dto';
import type { OperationRoutineRunStatus } from '../entities/operation-routine-run.entity';
import type { OpsSeverityMetrics } from './ops-observability.dto';

export class OpsMultiTenantSummaryQueryDto {
  @IsOptional()
  tenantId?: string;
}

export type OpsTenantOperationalStatus = 'OK' | 'WARNING' | 'CRITICAL';

export interface OpsTenantLastBackupSummary {
  routine: string;
  status: OperationRoutineRunStatus;
  startedAt: string;
  finishedAt: string | null;
  artifactUrl: string | null;
  error: string | null;
}

export interface OpsTenantSummary {
  tenantId: string;
  status: OpsTenantOperationalStatus;
  alerts: {
    open: number;
    critical: number;
    bySeverity: OpsSeverityMetrics;
  };
  incidents: {
    active: number;
    critical: number;
    escalated: number;
  };
  routines: {
    failed: number;
    lastFailedAt: string | null;
  };
  lastBackup: OpsTenantLastBackupSummary | null;
  actionCenter: {
    total: number;
    critical: number;
    topItems: OpsActionCenterItem[];
  };
}

export interface OpsMultiTenantSummaryResponse {
  generatedAt: string;
  scope: {
    tenantId: string | null;
    allTenants: boolean;
  };
  totals: {
    tenants: number;
    criticalTenants: number;
    warningTenants: number;
    openAlerts: number;
    activeIncidents: number;
    failedRoutines: number;
    actionCenterItems: number;
  };
  tenants: OpsTenantSummary[];
}

export type OpsMultiTenantSummaryPriority = OpsActionCenterPriority;
