import { Controller, Post, Get, Param, Query, Body, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { PayrollService } from './payroll.service';
import { PayrollPdfService } from './payroll-pdf.service';
import { PayrollExportService } from './payroll-export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
    constructor(
        private readonly payrollService: PayrollService,
        private readonly payrollPdfService: PayrollPdfService,
        private readonly payrollExportService: PayrollExportService
    ) { }

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

    @Get('payslips/:id/pdf')
    @Permissions('payroll:read')
    async downloadPayslipPdf(
        @Request() req: any,
        @Param('id') id: string,
        @Res() res: Response
    ) {
        const tenantId = req.user.tenantId;
        // Verify Payslip existence & ownership
        const payslips = await this.payrollService.getPayslips(tenantId, new Date().getMonth()+1, new Date().getFullYear()); // Wait, better fetch proper one.
        // Let's create a getById in payrollService or just fetch all and find
        const target = await this.payrollService.getPayslipById(+id, tenantId);
        if (!target) throw new NotFoundException('Payslip not found');

        const buffer = await this.payrollPdfService.generatePdf(target);
        const fileName = `Fiche_de_Paie_${target.agent.nom}_${target.month}_${target.year}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    }

    @Get('export/sage')
    @Permissions('payroll:read')
    async exportToSage(
        @Request() req: any,
        @Query('month') month: string,
        @Query('year') year: string,
        @Res() res: Response
    ) {
        const tenantId = req.user.tenantId;
        const csvContent = await this.payrollExportService.generateSageExport(+month, +year, tenantId);

        const fileName = `OD_Paie_${tenantId}_${month}_${year}.csv`;

        res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });

        res.send(csvContent);
    }

    @Get('export/dipe')
    @Permissions('payroll:read')
    async exportToDipe(
        @Request() req: any,
        @Query('month') month: string,
        @Query('year') year: string,
        @Res() res: Response
    ) {
        const tenantId = req.user.tenantId;
        const csvContent = await this.payrollExportService.generateDipeExport(+month, +year, tenantId);

        const fileName = `DIPE_CNPS_${tenantId}_${month}_${year}.csv`;

        res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });

        res.send(csvContent);
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

    @Get('bonus-templates')
    @Permissions('payroll:read')
    async getBonusTemplates(@Request() req: any) {
        return this.payrollService.getBonusTemplates(req.user.tenantId);
    }

    @Post('bonus-templates')
    @Permissions('settings:write')
    async createBonusTemplate(
        @Request() req: any,
        @Body() body: any
    ) {
        return this.payrollService.createBonusTemplate(req.user.tenantId, body);
    }

    // --- Dynamic Payroll Rules ---
    @Get('rules')
    @Permissions('settings:read')
    async getPayrollRules(@Request() req: any) {
        return this.payrollService.getPayrollRules(req.user.tenantId);
    }

    @Post('rules')
    @Permissions('settings:write')
    async createPayrollRule(@Request() req: any, @Body() body: any) {
        return this.payrollService.createPayrollRule(req.user.tenantId, body);
    }

    @Post('rules/:id/delete')
    @Permissions('settings:write')
    async deletePayrollRule(@Request() req: any, @Param('id') id: string) {
        await this.payrollService.deletePayrollRule(req.user.tenantId, +id);
        return { success: true };
    }
}
