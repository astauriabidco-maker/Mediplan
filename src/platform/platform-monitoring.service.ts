import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
} from '../audit/entities/audit-log.entity';
import {
  OperationalAlert,
  OperationalAlertSeverity,
  OperationalAlertStatus,
} from '../operations/entities/operational-alert.entity';
import {
  OperationRoutineRun,
  OperationRoutineRunStatus,
} from '../operations/entities/operation-routine-run.entity';
import {
  ProductionGate,
  ProductionGateKey,
  ProductionGateStatus,
} from '../production-readiness/entities/production-gate.entity';
import { PlatformService } from './platform.service';
import {
  PlatformTenantAuditSummary,
  PlatformTenantHealthStatus,
  PlatformTenantMonitoringResponse,
  PlatformTenantMonitoringRow,
  PlatformTenantPublicationSummary,
  PlatformTenantSignalStatus,
} from './platform-monitoring.dto';

const DEFAULT_BACKUP_FRESHNESS_HOURS = 24;

@Injectable()
export class PlatformMonitoringService {
  constructor(
    private readonly platformService: PlatformService,
    private readonly auditService: AuditService,
    @InjectRepository(OperationalAlert)
    private readonly alertRepository: Repository<OperationalAlert>,
    @InjectRepository(OperationRoutineRun)
    private readonly routineRunRepository: Repository<OperationRoutineRun>,
    @InjectRepository(ProductionGate)
    private readonly productionGateRepository: Repository<ProductionGate>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async getTenantMonitoring(
    options: {
      tenantId?: string;
      backupFreshnessHours?: number;
    } = {},
  ): Promise<PlatformTenantMonitoringResponse> {
    const backupFreshnessHours = this.normalizeFreshnessHours(
      options.backupFreshnessHours,
    );
    const tenants = (await this.platformService.getTenantSummaries()).filter(
      (tenant) => !options.tenantId || tenant.id === options.tenantId,
    );

    const rows = await Promise.all(
      tenants.map((tenant) =>
        this.buildTenantMonitoringRow(tenant, backupFreshnessHours),
      ),
    );
    rows.sort((left, right) => {
      const statusDelta =
        this.statusRank(right.status) - this.statusRank(left.status);
      if (statusDelta !== 0) return statusDelta;
      return left.tenant.name.localeCompare(right.tenant.name);
    });

    return {
      generatedAt: new Date().toISOString(),
      backupFreshnessHours,
      totals: {
        tenants: rows.length,
        healthy: rows.filter((row) => row.status === 'HEALTHY').length,
        degraded: rows.filter((row) => row.status === 'DEGRADED').length,
        critical: rows.filter((row) => row.status === 'CRITICAL').length,
        openAlerts: rows.reduce((total, row) => total + row.alerts.open, 0),
        criticalAlerts: rows.reduce(
          (total, row) => total + row.alerts.critical,
          0,
        ),
      },
      tenants: rows,
    };
  }

  private async buildTenantMonitoringRow(
    tenant: Awaited<ReturnType<PlatformService['getTenantSummaries']>>[number],
    backupFreshnessHours: number,
  ): Promise<PlatformTenantMonitoringRow> {
    const [alerts, routineRuns, gates, publicationLogs, latestAudit, chain] =
      await Promise.all([
        this.alertRepository.find({
          where: { tenantId: tenant.id, status: OperationalAlertStatus.OPEN },
          order: { openedAt: 'DESC', id: 'DESC' },
          take: 100,
        }),
        this.routineRunRepository.find({
          where: { tenantId: tenant.id },
          order: { startedAt: 'DESC', id: 'DESC' },
          take: 100,
        }),
        this.productionGateRepository.find({ where: { tenantId: tenant.id } }),
        this.auditService.getLogs(tenant.id, {
          action: AuditAction.UPDATE,
          entityType: AuditEntityType.PLANNING,
          detailAction: 'PUBLISH_PLANNING',
          limit: 20,
        }),
        this.auditLogRepository.findOne({
          where: { tenantId: tenant.id },
          order: { timestamp: 'DESC', id: 'DESC' },
        }),
        this.auditService.verifyChain(tenant.id),
      ]);

    const gateByKey = new Map(gates.map((gate) => [gate.key, gate]));
    const alertsBySeverity = this.countAlertsBySeverity(alerts);
    const backend = this.resolveBackendHealth(
      tenant.isActive,
      alertsBySeverity,
      routineRuns,
      gateByKey,
    );
    const backup = this.resolveBackupHealth(
      routineRuns,
      gateByKey,
      backupFreshnessHours,
    );
    const compliance = this.resolveComplianceHealth(
      publicationLogs,
      gateByKey,
      chain.valid,
    );
    const publications = this.resolvePublicationSummary(publicationLogs);
    const reasons = [
      ...backend.reasons,
      ...(backup.status === 'CRITICAL' ? ['BACKUP_STALE'] : []),
      ...(compliance.status === 'CRITICAL'
        ? ['COMPLIANCE_SIGNAL_CRITICAL']
        : []),
      ...(!chain.valid ? ['AUDIT_CHAIN_INVALID'] : []),
    ];
    const status = this.resolveTenantStatus([
      backend.status,
      backup.status,
      compliance.status,
      chain.valid ? 'HEALTHY' : 'CRITICAL',
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        region: tenant.region,
        contactEmail: tenant.contactEmail,
        isActive: tenant.isActive,
        userCount: tenant.userCount,
        createdAt: this.toIsoString(tenant.createdAt),
      },
      status,
      reasons,
      backend,
      alerts: {
        open: alerts.length,
        critical: alertsBySeverity.CRITICAL,
        high: alertsBySeverity.HIGH,
        bySeverity: alertsBySeverity,
        latest: alerts[0]
          ? {
              id: alerts[0].id,
              type: alerts[0].type,
              severity: alerts[0].severity,
              message: alerts[0].message,
              openedAt: this.toIsoString(alerts[0].openedAt),
              lastSeenAt: this.toIsoString(alerts[0].lastSeenAt),
            }
          : null,
      },
      publications,
      audits: {
        latest: latestAudit ? this.toAuditSummary(latestAudit) : null,
        chain: {
          checkedAt: chain.checkedAt,
          valid: chain.valid,
          total: chain.total,
          issues: chain.issues,
        },
      },
      backup,
      compliance,
    };
  }

  private resolveBackendHealth(
    isActive: boolean,
    alertsBySeverity: Record<OperationalAlertSeverity, number>,
    routineRuns: OperationRoutineRun[],
    gates: Map<ProductionGateKey, ProductionGate>,
  ) {
    const smokeGate = gates.get(ProductionGateKey.SMOKE);
    const lastFailedRoutine = routineRuns.find(
      (run) => run.status === OperationRoutineRunStatus.FAILED,
    );
    const reasons: string[] = [];

    if (!isActive) reasons.push('TENANT_INACTIVE');
    if (alertsBySeverity.CRITICAL > 0) reasons.push('CRITICAL_ALERTS_OPEN');
    if (alertsBySeverity.HIGH > 0) reasons.push('HIGH_ALERTS_OPEN');
    if (smokeGate?.status === ProductionGateStatus.FAILED) {
      reasons.push('SMOKE_GATE_FAILED');
    }
    if (lastFailedRoutine) reasons.push('FAILED_OPERATION_ROUTINE');

    const status = this.resolveTenantStatus([
      !isActive ? 'CRITICAL' : 'HEALTHY',
      alertsBySeverity.CRITICAL > 0 ? 'CRITICAL' : 'HEALTHY',
      alertsBySeverity.HIGH > 0 ? 'DEGRADED' : 'HEALTHY',
      smokeGate?.status === ProductionGateStatus.FAILED
        ? 'CRITICAL'
        : smokeGate
          ? 'HEALTHY'
          : 'DEGRADED',
      lastFailedRoutine ? 'DEGRADED' : 'HEALTHY',
    ]);

    return {
      healthy: status === 'HEALTHY',
      status,
      reasons,
      lastSmokeAt: this.toIsoString(smokeGate?.checkedAt),
      source: smokeGate ? 'production-gate:SMOKE' : 'tenant-and-ops-signals',
    };
  }

  private resolveBackupHealth(
    routineRuns: OperationRoutineRun[],
    gates: Map<ProductionGateKey, ProductionGate>,
    backupFreshnessHours: number,
  ) {
    const routineBackup = routineRuns.find((run) => this.isBackupRoutine(run));
    const gateBackup = this.findBackupFromGate(
      gates.get(ProductionGateKey.BACKUP),
    );
    const lastBackupAt =
      this.toDate(routineBackup?.finishedAt) ||
      this.toDate(routineBackup?.startedAt) ||
      gateBackup?.lastBackupAt ||
      null;
    const source = routineBackup
      ? `operation-routine:${routineBackup.routine}`
      : (gateBackup?.source ?? null);
    const artifact = routineBackup?.artifacts?.find(
      (candidate) => candidate.url || candidate.path,
    );

    if (!lastBackupAt) {
      return {
        available: false,
        recent: null,
        status: 'UNKNOWN' as const,
        lastBackupAt: null,
        ageHours: null,
        source,
        routineStatus: routineBackup?.status ?? null,
        artifactUrl: artifact?.url ?? artifact?.path ?? null,
      };
    }

    const ageHours = Math.max(
      0,
      (Date.now() - lastBackupAt.getTime()) / (60 * 60 * 1000),
    );
    const routineFailed =
      routineBackup?.status === OperationRoutineRunStatus.FAILED;
    const recent = ageHours <= backupFreshnessHours && !routineFailed;
    const status: PlatformTenantSignalStatus = routineFailed
      ? 'CRITICAL'
      : recent
        ? 'HEALTHY'
        : 'CRITICAL';

    return {
      available: true,
      recent,
      status,
      lastBackupAt: lastBackupAt.toISOString(),
      ageHours: this.round(ageHours),
      source,
      routineStatus: routineBackup?.status ?? null,
      artifactUrl:
        artifact?.url ?? artifact?.path ?? gateBackup?.artifactUrl ?? null,
    };
  }

  private resolveComplianceHealth(
    publicationLogs: AuditLog[],
    gates: Map<ProductionGateKey, ProductionGate>,
    auditChainValid: boolean,
  ) {
    const latestPublication = publicationLogs[0];
    if (latestPublication) {
      const details = this.toRecord(latestPublication.details);
      const report = this.toRecord(details.report);
      const totalPending = this.toNumber(report.totalPending);
      const violations = this.countItems(report.violations);
      const blocked = Boolean(details.blocked);
      const score =
        totalPending && totalPending > 0
          ? Math.max(0, ((totalPending - violations) / totalPending) * 100)
          : blocked
            ? 0
            : 100;
      const status = this.resolveComplianceStatus(
        score,
        blocked,
        auditChainValid,
      );

      return {
        status,
        score: this.round(score),
        source: 'audit:PUBLISH_PLANNING',
        lastCheckedAt: this.toIsoString(latestPublication.timestamp),
        details: {
          auditLogId: latestPublication.id,
          blocked,
          totalPending,
          violations,
          warnings: this.countItems(report.warnings),
        },
      };
    }

    const complianceGate = gates.get(ProductionGateKey.COMPLIANCE);
    const snapshot = this.toRecord(complianceGate?.snapshot);
    const score =
      this.toNumber(snapshot.planningCompliancePercent) ??
      this.toNumber(snapshot.compliancePercent);

    if (score !== null) {
      return {
        status: this.resolveComplianceStatus(
          score,
          complianceGate?.status === ProductionGateStatus.FAILED,
          auditChainValid,
        ),
        score: this.round(score),
        source: 'production-gate:COMPLIANCE',
        lastCheckedAt: this.toIsoString(complianceGate?.checkedAt),
        details: {
          gateStatus: complianceGate?.status,
        },
      };
    }

    return {
      status: auditChainValid ? ('UNKNOWN' as const) : ('CRITICAL' as const),
      score: null,
      source: complianceGate ? 'production-gate:COMPLIANCE' : null,
      lastCheckedAt: this.toIsoString(complianceGate?.checkedAt),
      details: {
        gateStatus: complianceGate?.status,
        auditChainValid,
      },
    };
  }

  private resolvePublicationSummary(publicationLogs: AuditLog[]) {
    const latest = publicationLogs[0]
      ? this.toPublicationSummary(publicationLogs[0])
      : null;

    return {
      latest,
      attempts: publicationLogs.length,
      refused: publicationLogs.filter((log) => Boolean(log.details?.blocked))
        .length,
    };
  }

  private toPublicationSummary(
    log: AuditLog,
  ): PlatformTenantPublicationSummary {
    const details = this.toRecord(log.details);
    const report = this.toRecord(details.report);

    return {
      auditLogId: log.id,
      timestamp: this.toIsoString(log.timestamp) ?? '',
      actorId: log.actorId,
      blocked: Boolean(details.blocked),
      affected: this.toNumber(details.affected) ?? 0,
      totalPending: this.toNumber(report.totalPending),
      violations: this.countItems(report.violations),
      warnings: this.countItems(report.warnings),
    };
  }

  private toAuditSummary(log: AuditLog): PlatformTenantAuditSummary {
    const details = this.toRecord(log.details);

    return {
      id: log.id,
      timestamp: this.toIsoString(log.timestamp) ?? '',
      actorId: log.actorId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? null,
      detailAction: typeof details.action === 'string' ? details.action : null,
    };
  }

  private countAlertsBySeverity(alerts: OperationalAlert[]) {
    const counters: Record<OperationalAlertSeverity, number> = {
      [OperationalAlertSeverity.LOW]: 0,
      [OperationalAlertSeverity.MEDIUM]: 0,
      [OperationalAlertSeverity.HIGH]: 0,
      [OperationalAlertSeverity.CRITICAL]: 0,
    };

    for (const alert of alerts) {
      counters[alert.severity] += 1;
    }

    return counters;
  }

  private resolveTenantStatus(
    statuses: PlatformTenantSignalStatus[],
  ): PlatformTenantHealthStatus {
    if (statuses.includes('CRITICAL')) return 'CRITICAL';
    if (statuses.includes('DEGRADED') || statuses.includes('UNKNOWN')) {
      return 'DEGRADED';
    }
    return 'HEALTHY';
  }

  private resolveComplianceStatus(
    score: number,
    blocked: boolean,
    auditChainValid: boolean,
  ): PlatformTenantSignalStatus {
    if (blocked || !auditChainValid || score < 95) return 'CRITICAL';
    if (score < 100) return 'DEGRADED';
    return 'HEALTHY';
  }

  private findBackupFromGate(gate?: ProductionGate) {
    const snapshot = this.toRecord(gate?.snapshot);
    const fields = [
      'lastBackupAt',
      'lastSuccessfulBackupAt',
      'backupCompletedAt',
      'backupExportedAt',
      'exportedAt',
      'generatedAt',
    ];

    for (const field of fields) {
      const lastBackupAt = this.toDate(snapshot[field]);
      if (!lastBackupAt) continue;

      return {
        lastBackupAt,
        source: `production-gate:BACKUP.snapshot.${field}`,
        artifactUrl:
          typeof gate?.evidenceUrl === 'string' ? gate.evidenceUrl : null,
      };
    }

    if (gate?.checkedAt) {
      return {
        lastBackupAt: gate.checkedAt,
        source: 'production-gate:BACKUP.checkedAt',
        artifactUrl: gate.evidenceUrl,
      };
    }

    return null;
  }

  private isBackupRoutine(run: OperationRoutineRun) {
    const haystack = [
      run.routine,
      JSON.stringify(run.metadata ?? {}),
      JSON.stringify(run.artifacts ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes('backup') || haystack.includes('sauvegarde');
  }

  private normalizeFreshnessHours(value?: number) {
    if (!Number.isFinite(value)) return DEFAULT_BACKUP_FRESHNESS_HOURS;
    return Math.min(Math.max(Math.round(value as number), 1), 168);
  }

  private statusRank(status: PlatformTenantHealthStatus) {
    if (status === 'CRITICAL') return 3;
    if (status === 'DEGRADED') return 2;
    return 1;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value !== 'string' || !value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toIsoString(value: Date | string | null | undefined) {
    const date = this.toDate(value);
    return date ? date.toISOString() : null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private countItems(value: unknown) {
    if (Array.isArray(value)) return value.length;
    const numeric = this.toNumber(value);
    return numeric ?? 0;
  }

  private round(value: number) {
    return Math.round(value * 10) / 10;
  }
}
