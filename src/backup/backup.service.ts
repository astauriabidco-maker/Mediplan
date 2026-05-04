/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Facility } from '../agents/entities/facility.entity';
import { Grade } from '../agents/entities/grade.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuthenticatedUser } from '../auth/authenticated-request';
import { Attendance } from '../planning/entities/attendance.entity';
import { Leave } from '../planning/entities/leave.entity';
import { Shift } from '../planning/entities/shift.entity';
import { WorkPolicy } from '../planning/entities/work-policy.entity';

export const TENANT_BACKUP_SCHEMA_VERSION = 1;

export enum TenantImportMode {
  MERGE = 'MERGE',
  REPLACE_PLANNING_DATA = 'REPLACE_PLANNING_DATA',
}

type BackupRow = Record<string, unknown> & { sourceId?: number };

export interface TenantBackupSnapshot {
  kind: 'tenant-business-backup';
  schemaVersion: number;
  exportedAt: string;
  sourceTenantId: string;
  datasets: {
    facilities: BackupRow[];
    hospitalServices: BackupRow[];
    grades: BackupRow[];
    agents: BackupRow[];
    workPolicies: BackupRow[];
    shifts: BackupRow[];
    leaves: BackupRow[];
    attendance: BackupRow[];
    auditLogs: BackupRow[];
  };
  planningComplianceSnapshot: {
    generatedAt: string;
    period: { from?: string; to?: string };
    totals: {
      shifts: number;
      approvedComplianceExceptions: number;
      pendingComplianceExceptions: number;
      workPolicies: number;
      complianceAuditEvents: number;
    };
    shifts: BackupRow[];
    workPolicies: BackupRow[];
    complianceAuditEvents: BackupRow[];
  };
  integrity: {
    datasetCounts: Record<string, number>;
  };
}

export interface TenantImportResult {
  tenantId: string;
  mode: TenantImportMode;
  imported: Record<string, number>;
}

export interface TenantBackupMetrics {
  tenantId: string;
  generatedAt: string;
  schemaVersion: number;
  datasetCounts: Record<string, number>;
  planningComplianceSnapshot: TenantBackupSnapshot['planningComplianceSnapshot'];
  exportable: boolean;
}

@Injectable()
export class BackupService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
    @InjectRepository(HospitalService)
    private readonly hospitalServiceRepository: Repository<HospitalService>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(WorkPolicy)
    private readonly workPolicyRepository: Repository<WorkPolicy>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async exportTenant(
    tenantId: string,
    period: { from?: Date; to?: Date } = {},
  ): Promise<TenantBackupSnapshot> {
    const [
      facilities,
      hospitalServices,
      grades,
      agents,
      workPolicies,
      shifts,
      leaves,
      attendance,
      auditLogs,
    ] = await Promise.all([
      this.facilityRepository.find({ where: { tenantId } }),
      this.hospitalServiceRepository.find({ where: { tenantId } }),
      this.gradeRepository.find({ where: { tenantId } }),
      this.agentRepository.find({
        where: { tenantId },
        relations: ['facility', 'hospitalService', 'grade', 'manager'],
      }),
      this.workPolicyRepository.find({ where: { tenantId } }),
      this.shiftRepository.find({
        where: { tenantId },
        relations: ['agent', 'facility'],
      }),
      this.leaveRepository.find({
        where: { tenantId },
        relations: ['agent', 'approvedBy'],
      }),
      this.attendanceRepository.find({
        where: { tenantId },
        relations: ['agent'],
      }),
      this.auditLogRepository.find({ where: { tenantId } }),
    ]);

    const exportedAt = new Date().toISOString();
    const datasets = {
      facilities: facilities.map((facility) =>
        this.toBackupRow(facility as unknown as Record<string, unknown>),
      ),
      hospitalServices: hospitalServices.map((service) =>
        this.toHospitalServiceRow(service),
      ),
      grades: grades.map((grade) =>
        this.toBackupRow(grade as unknown as Record<string, unknown>),
      ),
      agents: agents.map((agent) => this.toAgentRow(agent)),
      workPolicies: workPolicies.map((policy) => this.toWorkPolicyRow(policy)),
      shifts: shifts.map((shift) => this.toShiftRow(shift)),
      leaves: leaves.map((leave) => this.toLeaveRow(leave)),
      attendance: attendance.map((entry) => this.toAttendanceRow(entry)),
      auditLogs: auditLogs.map((log) =>
        this.toBackupRow(log as unknown as Record<string, unknown>),
      ),
    };
    const complianceAuditEvents = datasets.auditLogs.filter((log) =>
      this.isComplianceAuditEvent(log),
    );
    const planningShifts = datasets.shifts.filter((shift) =>
      this.isWithinPeriod(shift.start, shift.end, period),
    );

    return {
      kind: 'tenant-business-backup',
      schemaVersion: TENANT_BACKUP_SCHEMA_VERSION,
      exportedAt,
      sourceTenantId: tenantId,
      datasets,
      planningComplianceSnapshot: {
        generatedAt: exportedAt,
        period: {
          from: period.from?.toISOString(),
          to: period.to?.toISOString(),
        },
        totals: {
          shifts: planningShifts.length,
          approvedComplianceExceptions: planningShifts.filter(
            (shift) => shift.complianceExceptionApproved === true,
          ).length,
          pendingComplianceExceptions: planningShifts.filter(
            (shift) =>
              shift.complianceExceptionReason &&
              shift.complianceExceptionApproved !== true,
          ).length,
          workPolicies: datasets.workPolicies.length,
          complianceAuditEvents: complianceAuditEvents.length,
        },
        shifts: planningShifts,
        workPolicies: datasets.workPolicies,
        complianceAuditEvents,
      },
      integrity: {
        datasetCounts: Object.fromEntries(
          Object.entries(datasets).map(([name, rows]) => [name, rows.length]),
        ),
      },
    };
  }

  async getBackupMetrics(
    tenantId: string,
    period: { from?: Date; to?: Date } = {},
  ): Promise<TenantBackupMetrics> {
    const snapshot = await this.exportTenant(tenantId, period);

    return {
      tenantId,
      generatedAt: snapshot.exportedAt,
      schemaVersion: snapshot.schemaVersion,
      datasetCounts: snapshot.integrity.datasetCounts,
      planningComplianceSnapshot: snapshot.planningComplianceSnapshot,
      exportable: snapshot.kind === 'tenant-business-backup',
    };
  }

  async importTenant(
    targetTenantId: string,
    snapshot: TenantBackupSnapshot,
    actor: AuthenticatedUser,
    mode: TenantImportMode = TenantImportMode.MERGE,
  ): Promise<TenantImportResult> {
    this.assertSnapshot(snapshot);

    if (
      actor.role !== 'SUPER_ADMIN' &&
      snapshot.sourceTenantId !== targetTenantId
    ) {
      throw new ForbiddenException(
        'Tenant imports must target the authenticated tenant',
      );
    }

    if (mode === TenantImportMode.REPLACE_PLANNING_DATA) {
      await this.clearPlanningData(targetTenantId);
    }

    const imported = {
      facilities: 0,
      hospitalServices: 0,
      grades: 0,
      agents: 0,
      workPolicies: 0,
      shifts: 0,
      leaves: 0,
      attendance: 0,
    };

    const facilityMap = await this.restoreFacilities(
      targetTenantId,
      snapshot.datasets.facilities,
    );
    imported.facilities = facilityMap.size;

    const serviceMap = await this.restoreHospitalServices(
      targetTenantId,
      snapshot.datasets.hospitalServices,
      facilityMap,
    );
    imported.hospitalServices = serviceMap.size;

    const gradeMap = await this.restoreGrades(
      targetTenantId,
      snapshot.datasets.grades,
    );
    imported.grades = gradeMap.size;

    const agentMap = await this.restoreAgents(
      targetTenantId,
      snapshot.datasets.agents,
      facilityMap,
      serviceMap,
      gradeMap,
    );
    imported.agents = agentMap.size;

    await this.restoreAgentManagers(
      targetTenantId,
      snapshot.datasets.agents,
      agentMap,
    );

    imported.workPolicies = (
      await this.restoreWorkPolicies(
        targetTenantId,
        snapshot.datasets.workPolicies,
        serviceMap,
        gradeMap,
      )
    ).size;

    imported.shifts = (
      await this.restoreShifts(
        targetTenantId,
        snapshot.datasets.shifts,
        agentMap,
        facilityMap,
      )
    ).size;
    imported.leaves = (
      await this.restoreLeaves(
        targetTenantId,
        snapshot.datasets.leaves,
        agentMap,
      )
    ).size;
    imported.attendance = (
      await this.restoreAttendance(
        targetTenantId,
        snapshot.datasets.attendance,
        agentMap,
      )
    ).size;

    return { tenantId: targetTenantId, mode, imported };
  }

  private async clearPlanningData(tenantId: string) {
    await this.attendanceRepository.delete({ tenantId } as any);
    await this.leaveRepository.delete({ tenantId } as any);
    await this.shiftRepository.delete({ tenantId } as any);
    await this.workPolicyRepository.delete({ tenantId } as any);
  }

  private assertSnapshot(snapshot: TenantBackupSnapshot) {
    if (
      !snapshot ||
      snapshot.kind !== 'tenant-business-backup' ||
      snapshot.schemaVersion !== TENANT_BACKUP_SCHEMA_VERSION ||
      !snapshot.sourceTenantId ||
      !snapshot.datasets
    ) {
      throw new BadRequestException('Invalid tenant backup snapshot');
    }
  }

  private async restoreFacilities(tenantId: string, rows: BackupRow[]) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const existing = await this.facilityRepository.findOne({
        where: [
          { tenantId, code: row.code as string },
          { tenantId, name: row.name as string },
        ],
      });
      const entity = this.facilityRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
      } as any);
      const saved = (await this.facilityRepository.save(
        entity,
      )) as unknown as Facility;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private async restoreHospitalServices(
    tenantId: string,
    rows: BackupRow[],
    facilityMap: Map<number, number>,
  ) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const existing = await this.hospitalServiceRepository.findOne({
        where: [
          { tenantId, code: row.code as string },
          { tenantId, name: row.name as string },
        ],
      });
      const entity = this.hospitalServiceRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
        facilityId: this.mapOptionalId(row.facilitySourceId, facilityMap),
        parentServiceId: this.mapOptionalId(row.parentServiceSourceId, idMap),
        chiefId: null,
        deputyChiefId: null,
        majorId: null,
        nursingManagerId: null,
      } as any);
      const saved = (await this.hospitalServiceRepository.save(
        entity,
      )) as unknown as HospitalService;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private async restoreGrades(tenantId: string, rows: BackupRow[]) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const existing = await this.gradeRepository.findOne({
        where: [
          { tenantId, code: row.code as string },
          { tenantId, name: row.name as string },
        ],
      });
      const entity = this.gradeRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
      } as any);
      const saved = (await this.gradeRepository.save(
        entity,
      )) as unknown as Grade;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private async restoreAgents(
    tenantId: string,
    rows: BackupRow[],
    facilityMap: Map<number, number>,
    serviceMap: Map<number, number>,
    gradeMap: Map<number, number>,
  ) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const existing = await this.agentRepository.findOne({
        where: [
          { tenantId, email: row.email as string },
          { tenantId, matricule: row.matricule as string },
        ],
      });
      const entity = this.agentRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
        facilityId: this.mapOptionalId(row.facilitySourceId, facilityMap),
        hospitalServiceId: this.mapOptionalId(
          row.hospitalServiceSourceId,
          serviceMap,
        ),
        gradeId: this.mapOptionalId(row.gradeSourceId, gradeMap),
        managerId: null,
      } as any);
      const saved = (await this.agentRepository.save(
        entity,
      )) as unknown as Agent;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private async restoreAgentManagers(
    tenantId: string,
    rows: BackupRow[],
    agentMap: Map<number, number>,
  ) {
    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const managerId = this.mapOptionalId(row.managerSourceId, agentMap);
      if (!managerId) continue;

      await this.agentRepository.update(
        { id: agentMap.get(sourceId), tenantId },
        { managerId },
      );
    }
  }

  private async restoreWorkPolicies(
    tenantId: string,
    rows: BackupRow[],
    serviceMap: Map<number, number>,
    gradeMap: Map<number, number>,
  ) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const hospitalServiceId = this.mapOptionalId(
        row.hospitalServiceSourceId,
        serviceMap,
      );
      const gradeId = this.mapOptionalId(row.gradeSourceId, gradeMap);
      const existing = await this.workPolicyRepository.findOne({
        where: {
          tenantId,
          hospitalServiceId: hospitalServiceId ?? null,
          gradeId: gradeId ?? null,
        } as any,
      });
      const entity = this.workPolicyRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
        hospitalServiceId,
        gradeId,
      } as any);
      const saved = (await this.workPolicyRepository.save(
        entity,
      )) as unknown as WorkPolicy;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private async restoreShifts(
    tenantId: string,
    rows: BackupRow[],
    agentMap: Map<number, number>,
    facilityMap: Map<number, number>,
  ) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const agentId = this.requiredMappedId(row.agentSourceId, agentMap);
      const existing = await this.shiftRepository.findOne({
        where: {
          tenantId,
          agent: { id: agentId },
          start: this.toDate(row.start),
          end: this.toDate(row.end),
          postId: row.postId as string,
        } as any,
      });
      const entity = this.shiftRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
        start: this.toDate(row.start),
        end: this.toDate(row.end),
        facilityId: this.mapOptionalId(row.facilitySourceId, facilityMap),
        agent: { id: agentId } as Agent,
      } as any);
      const saved = (await this.shiftRepository.save(
        entity,
      )) as unknown as Shift;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private async restoreLeaves(
    tenantId: string,
    rows: BackupRow[],
    agentMap: Map<number, number>,
  ) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const agentId = this.requiredMappedId(row.agentSourceId, agentMap);
      const existing = await this.leaveRepository.findOne({
        where: {
          tenantId,
          agent: { id: agentId },
          start: this.toDate(row.start),
          end: this.toDate(row.end),
          type: row.type as Leave['type'],
        } as any,
      });
      const entity = this.leaveRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
        start: this.toDate(row.start),
        end: this.toDate(row.end),
        agent: { id: agentId } as Agent,
        approvedBy: row.approvedBySourceId
          ? ({
              id: this.mapOptionalId(row.approvedBySourceId, agentMap),
            } as Agent)
          : undefined,
      } as any);
      const saved = (await this.leaveRepository.save(
        entity,
      )) as unknown as Leave;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private async restoreAttendance(
    tenantId: string,
    rows: BackupRow[],
    agentMap: Map<number, number>,
  ) {
    const idMap = new Map<number, number>();

    for (const row of rows) {
      const sourceId = this.requiredSourceId(row);
      const agentId = this.requiredMappedId(row.agentSourceId, agentMap);
      const existing = await this.attendanceRepository.findOne({
        where: {
          tenantId,
          agent: { id: agentId },
          timestamp: this.toDate(row.timestamp),
          type: row.type as Attendance['type'],
          source: row.source as string,
        } as any,
      });
      const entity = this.attendanceRepository.create({
        ...this.importRow(row),
        tenantId,
        id: existing?.id,
        timestamp: this.toDate(row.timestamp),
        createdAt: this.toDate(row.createdAt),
        agent: { id: agentId } as Agent,
      } as any);
      const saved = (await this.attendanceRepository.save(
        entity,
      )) as unknown as Attendance;
      idMap.set(sourceId, saved.id);
    }

    return idMap;
  }

  private toBackupRow(entity: Record<string, unknown>): BackupRow {
    const row: BackupRow = { ...entity, sourceId: entity.id as number };
    delete row.id;
    delete row.tenantId;
    return this.serializeDates(row);
  }

  private toHospitalServiceRow(service: HospitalService): BackupRow {
    return {
      ...this.toBackupRow(service as unknown as Record<string, unknown>),
      facilitySourceId: service.facilityId ?? service.facility?.id ?? null,
      parentServiceSourceId: service.parentServiceId ?? null,
      chiefSourceId: service.chiefId ?? null,
      deputyChiefSourceId: service.deputyChiefId ?? null,
      majorSourceId: service.majorId ?? null,
      nursingManagerSourceId: service.nursingManagerId ?? null,
    };
  }

  private toAgentRow(agent: Agent): BackupRow {
    return {
      ...this.toBackupRow(agent as unknown as Record<string, unknown>),
      facilitySourceId: agent.facilityId ?? agent.facility?.id ?? null,
      hospitalServiceSourceId:
        agent.hospitalServiceId ?? agent.hospitalService?.id ?? null,
      gradeSourceId: agent.gradeId ?? agent.grade?.id ?? null,
      managerSourceId: agent.managerId ?? agent.manager?.id ?? null,
    };
  }

  private toWorkPolicyRow(policy: WorkPolicy): BackupRow {
    return {
      ...this.toBackupRow(policy as unknown as Record<string, unknown>),
      hospitalServiceSourceId: policy.hospitalServiceId ?? null,
      gradeSourceId: policy.gradeId ?? null,
    };
  }

  private toShiftRow(shift: Shift): BackupRow {
    return {
      ...this.toBackupRow(shift as unknown as Record<string, unknown>),
      agentSourceId: shift.agent?.id,
      facilitySourceId: shift.facilityId ?? shift.facility?.id ?? null,
    };
  }

  private toLeaveRow(leave: Leave): BackupRow {
    return {
      ...this.toBackupRow(leave as unknown as Record<string, unknown>),
      agentSourceId: leave.agent?.id,
      approvedBySourceId: leave.approvedBy?.id ?? null,
    };
  }

  private toAttendanceRow(attendance: Attendance): BackupRow {
    return {
      ...this.toBackupRow(attendance as unknown as Record<string, unknown>),
      agentSourceId: attendance.agent?.id,
    };
  }

  private importRow(row: BackupRow): BackupRow {
    const copy = { ...row };
    [
      'sourceId',
      'facilitySourceId',
      'hospitalServiceSourceId',
      'gradeSourceId',
      'managerSourceId',
      'agentSourceId',
      'approvedBySourceId',
      'parentServiceSourceId',
      'chiefSourceId',
      'deputyChiefSourceId',
      'majorSourceId',
      'nursingManagerSourceId',
    ].forEach((key) => delete copy[key]);
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.timestamp;
    delete copy.start;
    delete copy.end;
    return copy;
  }

  private serializeDates(row: BackupRow) {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : value,
      ]),
    ) as BackupRow;
  }

  private isComplianceAuditEvent(log: BackupRow) {
    const details = log.details as Record<string, unknown> | undefined;
    const action = details?.action;
    return (
      log.entityType === 'PLANNING' ||
      log.entityType === 'SHIFT' ||
      action === 'COMPLIANCE_SCAN' ||
      action === 'PLANNING_PUBLISH' ||
      action === 'SHIFT_REVALIDATE'
    );
  }

  private isWithinPeriod(
    startValue: unknown,
    endValue: unknown,
    period: { from?: Date; to?: Date },
  ) {
    const start = this.toDate(startValue);
    const end = this.toDate(endValue);
    if (period.from && end < period.from) return false;
    if (period.to && start > period.to) return false;
    return true;
  }

  private requiredSourceId(row: BackupRow) {
    if (typeof row.sourceId !== 'number') {
      throw new BadRequestException('Backup row is missing sourceId');
    }
    return row.sourceId;
  }

  private requiredMappedId(value: unknown, idMap: Map<number, number>): number {
    const mapped = this.mapOptionalId(value, idMap);
    if (!mapped) {
      throw new BadRequestException('Backup relation cannot be restored');
    }
    return mapped;
  }

  private mapOptionalId(value: unknown, idMap: Map<number, number>) {
    if (value === null || value === undefined) return null;
    const key = Number(value);
    return idMap.get(key) ?? null;
  }

  private toDate(value: unknown) {
    if (value instanceof Date) return value;
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid backup date value');
    }
    return date;
  }
}
