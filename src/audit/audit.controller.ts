import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @Permissions('planning:read') // Reusing planning read permission for history
    async getLogs(@Request() req: any, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.auditService.getLogs(tenantId);
    }
}
