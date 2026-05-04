import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
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
        const auditLog = this.auditLogRepository.create({
            tenantId,
            actorId,
            action,
            entityType,
            entityId: entityId?.toString(),
            details,
        });
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
}
