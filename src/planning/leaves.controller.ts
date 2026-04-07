import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaveStatus, LeaveType } from './entities/leave.entity';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) { }

    @Post('request')
    @Permissions('leaves:request')
    async requestLeave(
        @Request() req: any,
        @Body() body: { start: string; end: string; type: LeaveType; reason: string; agentId?: number }
    ) {
        const tenantId = req.user.tenant;
        const currentUserId = req.user.sub;
        const targetAgentId = body.agentId || currentUserId;

        return this.leavesService.requestLeave(
            tenantId,
            targetAgentId,
            new Date(body.start),
            new Date(body.end),
            body.type,
            body.reason,
            targetAgentId !== currentUserId ? currentUserId : undefined
        );
    }

    @Get('balances')
    @Permissions('leaves:read')
    async getMyBalances(@Request() req: any, @Query('year') year?: string) {
        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.leavesService.getMyBalances(req.user.tenant, req.user.sub, targetYear);
    }

    @Get('my-leaves')
    @Permissions('leaves:read')
    async getMyLeaves(@Request() req: any) {
        return this.leavesService.getMyLeaves(req.user.tenant, req.user.sub);
    }

    @Get('team-requests')
    @Permissions('leaves:validate')
    async getTeamRequests(@Request() req: any) {
        // managerId is the current user
        return this.leavesService.getTeamRequests(req.user.tenant, req.user.sub);
    }

    @Patch(':id/validate')
    @Permissions('leaves:validate')
    async validateLeave(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { status: LeaveStatus.APPROVED | LeaveStatus.REJECTED; rejectionReason?: string }
    ) {
        return this.leavesService.validateLeave(
            req.user.tenant,
            req.user.sub,
            parseInt(id, 10),
            body.status,
            body.rejectionReason
        );
    }
}
