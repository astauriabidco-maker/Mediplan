import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
import { FacilityService } from './facility.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Facility } from './entities/facility.entity';

@Controller('facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilityController {
    constructor(private readonly facilityService: FacilityService) { }

    @Get()
    @Permissions('services:read')
    findAll(@Request() req: any, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.facilityService.findAll(tenantId);
    }

    @Post()
    @Permissions('services:write')
    create(@Request() req: any, @Body() data: Partial<Facility>, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.facilityService.create(tenantId, data);
    }

    @Patch(':id')
    @Permissions('services:write')
    update(
        @Request() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() data: Partial<Facility>,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.facilityService.update(tenantId, id, data);
    }

    @Delete(':id')
    @Permissions('services:write')
    remove(
        @Request() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.facilityService.remove(tenantId, id);
    }
}
