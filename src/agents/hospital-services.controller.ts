import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Param, ParseIntPipe, Query } from '@nestjs/common';
import { HospitalServicesService } from './hospital-services.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AssignResponsibleDto, CreateHospitalServiceDto, UpdateHospitalServiceDto } from './dto/hospital-service.dto';
import { resolveTenantId } from '../auth/tenant-context';

@Controller('hospital-services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HospitalServicesController {
    constructor(private readonly servicesService: HospitalServicesService) { }

    @Get()
    @Permissions('services:read')
    findAll(@Request() req: AuthenticatedRequest, @Query('tenantId') queryTenantId?: string) {
        return this.servicesService.findAll(resolveTenantId(req, queryTenantId));
    }

    @Get('stats')
    @Permissions('services:read')
    getStats(@Request() req: AuthenticatedRequest, @Query('tenantId') queryTenantId?: string) {
        return this.servicesService.getStats(resolveTenantId(req, queryTenantId));
    }

    @Get('tree')
    @Permissions('services:read')
    getTree(@Request() req: AuthenticatedRequest, @Query('tenantId') queryTenantId?: string) {
        return this.servicesService.getServiceTree(resolveTenantId(req, queryTenantId));
    }

    @Get(':id')
    @Permissions('services:read')
    findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.servicesService.findOne(req.user.tenantId, id);
    }

    @Get(':id/hierarchy')
    @Permissions('services:read')
    getHierarchy(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.servicesService.getServiceHierarchy(req.user.tenantId, id);
    }

    @Post()
    @Permissions('services:write')
    create(@Request() req: AuthenticatedRequest, @Body() data: CreateHospitalServiceDto) {
        return this.servicesService.create(req.user.tenantId, data, req.user.id);
    }

    @Post(':id/sub-service')
    @Permissions('services:write')
    createSubService(
        @Request() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) parentId: number,
        @Body() data: CreateHospitalServiceDto
    ) {
        return this.servicesService.createSubService(req.user.tenantId, parentId, data, req.user.id);
    }

    @Put(':id')
    @Permissions('services:write')
    update(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() data: UpdateHospitalServiceDto) {
        return this.servicesService.update(req.user.tenantId, id, data, req.user.id);
    }

    @Put(':id/assign-responsible')
    @Permissions('services:write')
    assignResponsible(
        @Request() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
        @Body() data: AssignResponsibleDto
    ) {
        return this.servicesService.assignResponsible(req.user.tenantId, id, data.role, data.agentId, req.user.id);
    }

    @Delete(':id')
    @Permissions('services:write')
    async remove(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        await this.servicesService.remove(req.user.tenantId, id, req.user.id);
        return { message: 'Service disabled successfully' };
    }
}
