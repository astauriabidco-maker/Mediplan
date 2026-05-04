import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Between, FindOptionsWhere, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditEntityType } from './entities/audit-log.entity';

export interface AuditLogFilters {
    actorId?: number;
    action?: AuditAction;
    entityType?: AuditEntityType;
    entityId?: string;
    detailAction?: string;
    from?: Date;
    to?: Date;
    limit?: number;
}

export interface AuditChainIssue {
    type: 'MISSING_HASH' | 'HASH_MISMATCH' | 'BROKEN_LINK' | 'SEQUENCE_GAP';
    auditLogId?: number;
    chainSequence?: number;
    expected?: string | number | null;
    actual?: string | number | null;
}

export interface AuditChainVerification {
    tenantId: string;
    checkedAt: string;
    total: number;
    valid: boolean;
    issues: AuditChainIssue[];
}

export interface AuditExport {
    tenantId: string;
    exportedAt: string;
    filters: AuditLogFilters;
    chainVerification: AuditChainVerification;
    logs: AuditLog[];
}

const REDACTED = '[redacted]';

const SENSITIVE_DETAIL_KEYS = new Set([
    'authorization',
    'password',
    'token',
    'accesstoken',
    'refreshtoken',
    'secret',
    'email',
    'personalemail',
    'telephone',
    'phone',
    'emergencycontactname',
    'emergencycontactphone',
    'mobilemoneynumber',
    'matricule',
    'nom',
    'firstname',
    'lastname',
    'fullname',
    'agentname',
    'birthname',
    'dateofbirth',
    'placeofbirth',
    'nationality',
    'nir',
    'niu',
    'cnpsnumber',
    'idnumber',
    'idexpirydate',
    'iban',
    'bic',
    'address',
    'street',
    'zipcode',
    'city',
    'maritalstatus',
    'childrencount',
]);

const normalizeDetailKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    async log(
        tenantId: string,
        actorId: number,
        action: AuditAction,
        entityType: AuditEntityType,
        entityId: string | number,
        details: any,
    ): Promise<AuditLog> {
        const previousLog = await this.auditLogRepository.findOne({
            where: { tenantId, chainSequence: Not(IsNull()) },
            order: { chainSequence: 'DESC', timestamp: 'DESC', id: 'DESC' },
        });
        const chainSequence = (previousLog?.chainSequence || 0) + 1;
        const auditLog = this.auditLogRepository.create({
            tenantId,
            timestamp: new Date(),
            actorId,
            action,
            entityType,
            entityId: entityId?.toString(),
            details: this.redactDetails(details),
            chainSequence,
            previousHash: previousLog?.eventHash || undefined,
        }) as AuditLog;
        auditLog.eventHash = this.computeEventHash(auditLog);

        return this.auditLogRepository.save(auditLog);
    }

    async getLogs(tenantId: string, filters: AuditLogFilters = {}) {
        if (filters.detailAction) {
            const query = this.auditLogRepository.createQueryBuilder('audit')
                .leftJoinAndSelect('audit.actor', 'actor')
                .where('audit.tenantId = :tenantId', { tenantId })
                .andWhere(`audit.details ->> 'action' = :detailAction`, { detailAction: filters.detailAction })
                .orderBy('audit.timestamp', 'DESC')
                .take(Math.min(filters.limit || 100, 500));

            if (filters.actorId) query.andWhere('audit.actorId = :actorId', { actorId: filters.actorId });
            if (filters.action) query.andWhere('audit.action = :action', { action: filters.action });
            if (filters.entityType) query.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
            if (filters.entityId) query.andWhere('audit.entityId = :entityId', { entityId: filters.entityId });
            if (filters.from) query.andWhere('audit.timestamp >= :from', { from: filters.from });
            if (filters.to) query.andWhere('audit.timestamp <= :to', { to: filters.to });

            return query.getMany();
        }

        const where: FindOptionsWhere<AuditLog> = {
            tenantId,
        };

        if (filters.actorId) where.actorId = filters.actorId;
        if (filters.action) where.action = filters.action;
        if (filters.entityType) where.entityType = filters.entityType;
        if (filters.entityId) where.entityId = filters.entityId;

        if (filters.from && filters.to) {
            where.timestamp = Between(filters.from, filters.to);
        } else if (filters.from) {
            where.timestamp = MoreThanOrEqual(filters.from);
        } else if (filters.to) {
            where.timestamp = LessThanOrEqual(filters.to);
        }

        return this.auditLogRepository.find({
            where,
            relations: ['actor'],
            order: { timestamp: 'DESC' },
            take: Math.min(filters.limit || 100, 500),
        });
    }

    async verifyChain(tenantId: string): Promise<AuditChainVerification> {
        const logs = await this.auditLogRepository.find({
            where: { tenantId },
            order: { chainSequence: 'ASC', timestamp: 'ASC', id: 'ASC' },
        });
        const issues: AuditChainIssue[] = [];
        let previousHash: string | null = null;
        let previousSequence = 0;

        for (const log of logs) {
            if (!log.chainSequence || !log.eventHash) {
                issues.push({
                    type: 'MISSING_HASH',
                    auditLogId: log.id,
                    chainSequence: log.chainSequence,
                });
                previousHash = log.eventHash || null;
                previousSequence = log.chainSequence || previousSequence;
                continue;
            }

            if (log.chainSequence !== previousSequence + 1) {
                issues.push({
                    type: 'SEQUENCE_GAP',
                    auditLogId: log.id,
                    chainSequence: log.chainSequence,
                    expected: previousSequence + 1,
                    actual: log.chainSequence,
                });
            }

            if ((log.previousHash || null) !== previousHash) {
                issues.push({
                    type: 'BROKEN_LINK',
                    auditLogId: log.id,
                    chainSequence: log.chainSequence,
                    expected: previousHash,
                    actual: log.previousHash || null,
                });
            }

            const expectedHash = this.computeEventHash(log);
            if (log.eventHash !== expectedHash) {
                issues.push({
                    type: 'HASH_MISMATCH',
                    auditLogId: log.id,
                    chainSequence: log.chainSequence,
                    expected: expectedHash,
                    actual: log.eventHash,
                });
            }

            previousHash = log.eventHash;
            previousSequence = log.chainSequence;
        }

        return {
            tenantId,
            checkedAt: new Date().toISOString(),
            total: logs.length,
            valid: issues.length === 0,
            issues,
        };
    }

    async exportLogs(tenantId: string, filters: AuditLogFilters = {}): Promise<AuditExport> {
        const logs = await this.getLogs(tenantId, filters);
        const chainVerification = await this.verifyChain(tenantId);

        return {
            tenantId,
            exportedAt: new Date().toISOString(),
            filters,
            chainVerification,
            logs,
        };
    }

    private computeEventHash(log: Partial<AuditLog>): string {
        return createHash('sha256')
            .update(this.stableStringify({
                tenantId: log.tenantId,
                chainSequence: log.chainSequence,
                previousHash: log.previousHash || null,
                timestamp: this.serializeDate(log.timestamp),
                actorId: log.actorId,
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId || null,
                details: log.details || null,
            }))
            .digest('hex');
    }

    private redactDetails(value: unknown, seen = new WeakSet<object>()): unknown {
        if (Array.isArray(value)) {
            return value.map((entry) => this.redactDetails(entry, seen));
        }

        if (!value || typeof value !== 'object') {
            return value;
        }

        if (seen.has(value)) {
            return '[circular]';
        }
        seen.add(value);

        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
                key,
                SENSITIVE_DETAIL_KEYS.has(normalizeDetailKey(key))
                    ? REDACTED
                    : this.redactDetails(entry, seen),
            ]),
        );
    }

    private serializeDate(value: Date | string | undefined): string | null {
        if (!value) return null;
        return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    }

    private stableStringify(value: any): string {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }

        if (value instanceof Date) {
            return JSON.stringify(value.toISOString());
        }

        if (Array.isArray(value)) {
            return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
        }

        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`)
            .join(',')}}`;
    }
}
