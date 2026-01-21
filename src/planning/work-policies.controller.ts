import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkPoliciesService } from './work-policies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('work-policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkPoliciesController {
    constructor(private readonly workPoliciesService: WorkPoliciesService) { }

    @Get()
    @Permissions('planning:read')
    findAll(@Request() req: any) {
        return this.workPoliciesService.findAll(req.user.tenantId);
    }

    @Post()
    @Permissions('planning:manage')
    create(@Request() req: any, @Body() data: any) {
        return this.workPoliciesService.create(req.user.tenantId, data);
    }

    @Put(':id')
    @Permissions('planning:manage')
    update(@Request() req: any, @Param('id') id: number, @Body() data: any) {
        return this.workPoliciesService.update(req.user.tenantId, id, data);
    }

    @Delete(':id')
    @Permissions('planning:manage')
    remove(@Request() req: any, @Param('id') id: number) {
        return this.workPoliciesService.remove(req.user.tenantId, id);
    }
}
