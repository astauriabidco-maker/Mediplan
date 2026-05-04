import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { AuditService } from './audit.service';
import { AuditAction, AuditEntityType } from './entities/audit-log.entity';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @Permissions('audit:read')
    async getLogs(
        @Request() req: AuthenticatedRequest,
        @Query('tenantId') queryTenantId?: string,
        @Query('actorId') actorId?: string,
        @Query('action') action?: AuditAction,
        @Query('entityType') entityType?: AuditEntityType,
        @Query('entityId') entityId?: string,
        @Query('detailAction') detailAction?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditService.getLogs(resolveTenantId(req, queryTenantId), {
            actorId: actorId ? parseInt(actorId, 10) : undefined,
            action,
            entityType,
            entityId,
            detailAction,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
}
