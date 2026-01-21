import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditEntityType } from './entities/audit-log.entity';

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

    async getLogs(tenantId: string) {
        return this.auditLogRepository.find({
            where: { tenantId },
            relations: ['actor'],
            order: { timestamp: 'DESC' },
            take: 100, // Limit to last 100 for performance
        });
    }
}
