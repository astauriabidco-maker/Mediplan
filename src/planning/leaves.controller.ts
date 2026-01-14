import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaveStatus, LeaveType } from './entities/leave.entity';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) { }

    @Post('request')
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

    @Get('my-leaves')
    async getMyLeaves(@Request() req: any) {
        return this.leavesService.getMyLeaves(req.user.tenant, req.user.sub);
    }

    @Get('team-requests')
    async getTeamRequests(@Request() req: any) {
        // managerId is the current user
        return this.leavesService.getTeamRequests(req.user.tenant, req.user.sub);
    }

    @Patch(':id/validate')
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
