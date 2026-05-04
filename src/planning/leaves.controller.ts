import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaveStatus, LeaveType } from './entities/leave.entity';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) { }

    @Post('request')
    @Permissions('leaves:request')
    async requestLeave(
        @Request() req: AuthenticatedRequest,
        @Body() body: { start: string; end: string; type: LeaveType; reason: string; agentId?: number }
    ) {
        const tenantId = req.user.tenantId;
        const currentUserId = req.user.id;
        const targetAgentId = body.agentId || currentUserId;

        return this.leavesService.requestLeave(
            tenantId,
            targetAgentId,
            new Date(body.start),
            new Date(body.end),
            body.type,
            body.reason,
            {
                id: currentUserId,
                canManageAll: req.user.role === 'SUPER_ADMIN' ||
                    req.user.role === 'ADMIN' ||
                    req.user.permissions.includes('*') ||
                    req.user.permissions.includes('leaves:manage'),
            }
        );
    }

    @Get('balances')
    @Permissions('leaves:read')
    async getMyBalances(@Request() req: AuthenticatedRequest, @Query('year') year?: string) {
        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.leavesService.getMyBalances(req.user.tenantId, req.user.id, targetYear);
    }

    @Get('my-leaves')
    @Permissions('leaves:read')
    async getMyLeaves(@Request() req: AuthenticatedRequest) {
        return this.leavesService.getMyLeaves(req.user.tenantId, req.user.id);
    }

    @Get('team-requests')
    @Permissions('leaves:validate')
    async getTeamRequests(@Request() req: AuthenticatedRequest) {
        // managerId is the current user
        return this.leavesService.getTeamRequests(req.user.tenantId, req.user.id);
    }

    @Patch(':id/validate')
    @Permissions('leaves:validate')
    async validateLeave(
        @Request() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() body: { status: LeaveStatus.APPROVED | LeaveStatus.REJECTED; rejectionReason?: string }
    ) {
        return this.leavesService.validateLeave(
            req.user.tenantId,
            req.user.id,
            parseInt(id, 10),
            body.status,
            body.rejectionReason,
            req.user.role === 'SUPER_ADMIN' ||
                req.user.role === 'ADMIN' ||
                req.user.permissions.includes('*') ||
                req.user.permissions.includes('leaves:manage')
        );
    }
}
