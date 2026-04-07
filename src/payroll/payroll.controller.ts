import { Controller, Post, Get, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) { }

    @Get('payslips')
    @Permissions('payroll:read')
    async getPayslips(
        @Request() req: any,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.payrollService.getPayslips(tenantId, +month, +year);
    }

    @Post('generate-all')
    @Permissions('payroll:write')
    async generateAllPayslips(
        @Request() req: any,
        @Body() body: { month: number; year: number },
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.payrollService.generateAllPayslips(tenantId, body.month, body.year);
    }

    @Post('generate/:agentId')
    @Permissions('agents:write', 'payroll:write') // Needs appropriate permission
    async generatePayslip(
        @Request() req: any, 
        @Param('agentId') agentId: string, 
        @Body() body: { month: number; year: number }
    ) {
        return this.payrollService.generatePayslip(req.user.tenantId, +agentId, body.month, body.year);
    }
}
