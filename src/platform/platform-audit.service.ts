import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
} from '../audit/entities/audit-log.entity';

export type PlatformAuditExportFormat = 'json' | 'csv';

export interface PlatformAuditQuery {
  actor?: string;
  actorId?: string;
  tenantId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  limit?: string;
}

export interface PlatformAuditFilters {
  actor?: string;
  actorId?: number;
  tenantId?: string;
  action?: string;
  entityType?: AuditEntityType;
  from?: Date;
  to?: Date;
  limit: number;
}

export interface PlatformAuditReadableEntry {
  id: number;
  timestamp: string | null;
  tenantId: string;
  actor: {
    id: number;
    email: string | null;
    name: string | null;
  };
  action: string;
  technicalAction: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  summary: string;
  category: 'platform' | 'impersonation';
  details: Record<string, unknown>;
}

export interface PlatformAuditExportPayload {
  exportedAt: string;
  format: PlatformAuditExportFormat;
  filters: PlatformAuditFilters;
  count: number;
  items: PlatformAuditReadableEntry[];
  contentType: string;
  filename: string;
  data: PlatformAuditReadableEntry[] | string;
}

const PLATFORM_TENANT_ID = 'PLATFORM';

const PLATFORM_ENTITY_TYPES = [
  AuditEntityType.PLATFORM_TENANT,
  AuditEntityType.PLATFORM_USER,
  AuditEntityType.TENANT_IMPERSONATION,
];

@Injectable()
export class PlatformAuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async list(
    query: PlatformAuditQuery = {},
  ): Promise<PlatformAuditReadableEntry[]> {
    const filters = this.normalizeFilters(query);
    const logs = await this.queryLogs(filters);
    return logs.map((log) => this.toReadableEntry(log));
  }

  async export(
    query: PlatformAuditQuery = {},
    format: PlatformAuditExportFormat = 'json',
  ): Promise<PlatformAuditExportPayload> {
    const normalizedFormat = this.normalizeFormat(format);
    const filters = this.normalizeFilters(query);
    const logs = await this.queryLogs(filters);
    const items = logs.map((log) => this.toReadableEntry(log));
    const exportedAt = new Date().toISOString();

    return {
      exportedAt,
      format: normalizedFormat,
      filters,
      count: items.length,
      items,
      contentType:
        normalizedFormat === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/json',
      filename: `platform-audit-${exportedAt.slice(0, 10)}.${normalizedFormat}`,
      data: normalizedFormat === 'csv' ? this.toCsv(items) : items,
    };
  }

  normalizeFilters(query: PlatformAuditQuery = {}): PlatformAuditFilters {
    const actor = this.normalizeText(query.actor);
    const actorId = this.normalizeOptionalInteger(query.actorId, 'actorId');
    const tenantId = this.normalizeText(query.tenantId);
    const action = this.normalizeText(query.action);
    const entityType = this.normalizeEntityType(query.entityType);
    const from = this.normalizeOptionalDate(query.from, 'from');
    const to = this.normalizeOptionalDate(query.to, 'to');

    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be before to');
    }

    return {
      actor,
      actorId,
      tenantId,
      action,
      entityType,
      from,
      to,
      limit: this.normalizeLimit(query.limit),
    };
  }

  private async queryLogs(filters: PlatformAuditFilters): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .where(
        `(${[
          'audit.tenantId = :platformTenant',
          'audit.entityType IN (:...platformEntityTypes)',
        ].join(' OR ')})`,
        {
          platformTenant: PLATFORM_TENANT_ID,
          platformEntityTypes: PLATFORM_ENTITY_TYPES,
        },
      )
      .orderBy('audit.timestamp', 'DESC')
      .take(filters.limit);

    if (filters.actorId !== undefined) {
      query.andWhere('audit.actorId = :actorId', { actorId: filters.actorId });
    }

    if (filters.actor) {
      const numericActor = Number(filters.actor);
      if (Number.isInteger(numericActor)) {
        query.andWhere(
          '(audit.actorId = :actorLookupId OR LOWER(actor.email) LIKE :actorLookup)',
          {
            actorLookupId: numericActor,
            actorLookup: `%${filters.actor.toLowerCase()}%`,
          },
        );
      } else {
        query.andWhere('LOWER(actor.email) LIKE :actorLookup', {
          actorLookup: `%${filters.actor.toLowerCase()}%`,
        });
      }
    }

    if (filters.tenantId) {
      query.andWhere(
        `(${[
          'audit.tenantId = :tenantId',
          "audit.details ->> 'tenantId' = :tenantId",
          "audit.details ->> 'targetTenantId' = :tenantId",
          "audit.details ->> 'sourceTenantId' = :tenantId",
        ].join(' OR ')})`,
        { tenantId: filters.tenantId },
      );
    }

    if (filters.action) {
      const auditAction = this.asAuditAction(filters.action);
      if (auditAction) {
        query.andWhere(
          "(audit.action = :auditAction OR audit.details ->> 'action' = :detailAction)",
          { auditAction, detailAction: filters.action },
        );
      } else {
        query.andWhere("audit.details ->> 'action' = :detailAction", {
          detailAction: filters.action,
        });
      }
    }

    if (filters.entityType) {
      query.andWhere('audit.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters.from) {
      query.andWhere('audit.timestamp >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('audit.timestamp <= :to', { to: filters.to });
    }

    return query.getMany();
  }

  private toReadableEntry(log: AuditLog): PlatformAuditReadableEntry {
    const details = this.asDetails(log.details);
    const detailAction = this.valueAsString(details.action);
    const action = detailAction || log.action;
    const category =
      log.entityType === AuditEntityType.TENANT_IMPERSONATION
        ? 'impersonation'
        : 'platform';

    return {
      id: log.id,
      timestamp: this.serializeDate(log.timestamp),
      tenantId: log.tenantId,
      actor: {
        id: log.actorId,
        email: this.valueAsString(log.actor?.email) || null,
        name: this.valueAsString(log.actor?.nom) || null,
      },
      action,
      technicalAction: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? null,
      summary: this.buildSummary(log, details, action),
      category,
      details,
    };
  }

  private buildSummary(
    log: AuditLog,
    details: Record<string, unknown>,
    action: string,
  ): string {
    if (log.entityType === AuditEntityType.TENANT_IMPERSONATION) {
      const targetTenant =
        this.valueAsString(details.targetTenantId) ||
        log.entityId ||
        log.tenantId;
      const sourceTenant =
        this.valueAsString(details.sourceTenantId) || 'PLATFORM';
      const reason = this.valueAsString(details.reason);
      const verb =
        log.action === AuditAction.IMPERSONATION_STOP
          ? 'fin impersonation'
          : 'debut impersonation';
      return reason
        ? `${verb} ${sourceTenant} -> ${targetTenant} (${reason})`
        : `${verb} ${sourceTenant} -> ${targetTenant}`;
    }

    if (log.entityType === AuditEntityType.PLATFORM_TENANT) {
      const tenantId =
        this.valueAsString(details.tenantId) || log.entityId || log.tenantId;
      const name = this.valueAsString(details.name);
      const fields = Array.isArray(details.fields)
        ? details.fields.map(String).join(', ')
        : '';

      if (action === 'CREATE_PLATFORM_TENANT') {
        return name
          ? `creation tenant ${tenantId} (${name})`
          : `creation tenant ${tenantId}`;
      }

      if (action === 'UPDATE_PLATFORM_TENANT') {
        return fields
          ? `mise a jour tenant ${tenantId}: ${fields}`
          : `mise a jour tenant ${tenantId}`;
      }

      return `${action} tenant ${tenantId}`;
    }

    if (log.entityType === AuditEntityType.PLATFORM_USER) {
      const tenantId = this.valueAsString(details.tenantId) || log.tenantId;
      const userId = this.valueAsString(details.userId) || log.entityId;
      const role = this.valueAsString(details.role);
      return role
        ? `${action} utilisateur ${userId} sur ${tenantId} (${role})`
        : `${action} utilisateur ${userId} sur ${tenantId}`;
    }

    return `${action} ${log.entityType}${log.entityId ? ` ${log.entityId}` : ''}`;
  }

  private toCsv(items: PlatformAuditReadableEntry[]): string {
    const headers = [
      'id',
      'timestamp',
      'tenantId',
      'actorId',
      'actorEmail',
      'action',
      'technicalAction',
      'entityType',
      'entityId',
      'category',
      'summary',
    ];
    const rows = items.map((item) => [
      item.id,
      item.timestamp,
      item.tenantId,
      item.actor.id,
      item.actor.email,
      item.action,
      item.technicalAction,
      item.entityType,
      item.entityId,
      item.category,
      item.summary,
    ]);

    return [headers, ...rows]
      .map((row) => row.map((value) => this.csvCell(value)).join(','))
      .join('\n');
  }

  private csvCell(value: unknown): string {
    const raw = value === null || value === undefined ? '' : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  }

  private normalizeFormat(format: string): PlatformAuditExportFormat {
    if (format === 'json' || format === 'csv') return format;
    throw new BadRequestException('format must be json or csv');
  }

  private normalizeLimit(value: string | undefined): number {
    const parsed = value === undefined ? 100 : Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('limit must be a number');
    }
    return Math.min(Math.max(Math.trunc(parsed), 1), 500);
  }

  private normalizeOptionalInteger(
    value: string | undefined,
    field: string,
  ): number | undefined {
    if (value === undefined || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(`${field} must be an integer`);
    }
    return parsed;
  }

  private normalizeOptionalDate(
    value: string | undefined,
    field: string,
  ): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return parsed;
  }

  private normalizeEntityType(
    value: string | undefined,
  ): AuditEntityType | undefined {
    if (!value) return undefined;
    if (!Object.values(AuditEntityType).includes(value as AuditEntityType)) {
      throw new BadRequestException('entityType is not supported');
    }
    return value as AuditEntityType;
  }

  private normalizeText(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private asAuditAction(value: string): AuditAction | undefined {
    return Object.values(AuditAction).includes(value as AuditAction)
      ? (value as AuditAction)
      : undefined;
  }

  private asDetails(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private serializeDate(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString();
    return this.valueAsString(value) || null;
  }

  private valueAsString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
  }
}
