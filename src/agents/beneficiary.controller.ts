import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { BeneficiaryService } from './beneficiary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto } from './dto/beneficiary.dto';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BeneficiaryController {
    constructor(private readonly beneficiaryService: BeneficiaryService) { }

    @Get('agent/:agentId')
    @Permissions('agents:read')
    findAllByAgent(
        @Request() req: any,
        @Param('agentId', ParseIntPipe) agentId: number,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.beneficiaryService.findAll(tenantId, agentId);
    }

    @Post()
    @Permissions('agents:write')
    create(
        @Request() req: any,
        @Body() data: CreateBeneficiaryDto,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.beneficiaryService.create(tenantId, data);
    }

    @Patch(':id')
    @Permissions('agents:write')
    update(
        @Request() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() data: UpdateBeneficiaryDto,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.beneficiaryService.update(tenantId, id, data);
    }

    @Delete(':id')
    @Permissions('agents:write')
    remove(
        @Request() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.beneficiaryService.remove(tenantId, id);
    }
}
