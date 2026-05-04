import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { WorkPoliciesService } from './work-policies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { CreateWorkPolicyDto, UpdateWorkPolicyDto } from './dto/work-policy.dto';

@Controller('work-policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkPoliciesController {
    constructor(private readonly workPoliciesService: WorkPoliciesService) { }

    @Get()
    @Permissions('planning:read')
    findAll(@Request() req: AuthenticatedRequest) {
        return this.workPoliciesService.findAll(req.user.tenantId);
    }

    @Post()
    @Permissions('planning:manage')
    create(@Request() req: AuthenticatedRequest, @Body() data: CreateWorkPolicyDto) {
        return this.workPoliciesService.create(req.user.tenantId, data, req.user.id);
    }

    @Put(':id')
    @Permissions('planning:manage')
    update(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() data: UpdateWorkPolicyDto) {
        return this.workPoliciesService.update(req.user.tenantId, id, data, req.user.id);
    }

    @Delete(':id')
    @Permissions('planning:manage')
    remove(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.workPoliciesService.remove(req.user.tenantId, id, req.user.id);
    }
}
