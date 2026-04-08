import { Controller, Post, Get, Body, Query, Request, UseGuards } from '@nestjs/common';
import { QvtService, ShiftInput } from './qvt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('qvt')
@UseGuards(JwtAuthGuard)
export class QvtController {
    constructor(private readonly qvtService: QvtService) { }

    @Post('analyze')
    analyze(@Body('shifts') shifts: ShiftInput[]) {
        return this.qvtService.calculateFatigueScore(shifts);
    }

    @Get('dashboard')
    @Permissions('qvt:read', 'agents:read')
    async getDashboard(
        @Request() req: any,
        @Query('facilityId') facilityId?: string
    ) {
        // If basic agent, they can only see their own QVT
        let targetAgentId = undefined;
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
            targetAgentId = req.user.id;
        }

        return this.qvtService.getDashboard(
            req.user.tenantId, 
            facilityId ? parseInt(facilityId, 10) : undefined,
            targetAgentId
        );
    }
}
