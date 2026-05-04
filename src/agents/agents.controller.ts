import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) { }

    @Post()
    @Permissions('agents:write')
    create(@Request() req: AuthenticatedRequest, @Body() createAgentDto: CreateAgentDto) {
        // Force tenantId from authenticated user
        const tenantId = req.user.tenantId;
        const actorId = req.user.id;
        return this.agentsService.create({ ...createAgentDto, tenantId }, actorId);
    }

    @Get()
    @Permissions('agents:read')
    findAll(@Request() req: AuthenticatedRequest, @Query('tenantId') queryTenantId?: string) {
        return this.agentsService.findAll(resolveTenantId(req, queryTenantId));
    }

    @Get('my-team')
    @Permissions('agents:read') // Or a specific 'team:read'? Sticking to agents:read for simple hierarchy view
    getMyTeam(@Request() req: AuthenticatedRequest) {
        const tenantId = req.user.tenantId;
        const agentId = req.user.id;
        return this.agentsService.getMyTeam(agentId, tenantId);
    }

    @Get(':id')
    @Permissions('agents:read')
    findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Query('tenantId') queryTenantId?: string) {
        const tenantId = resolveTenantId(req, queryTenantId);
        const actorId = req.user.id;
        return this.agentsService.findOne(+id, tenantId, actorId);
    }

    @Patch(':id')
    @Permissions('agents:write', 'services:manage_staff') // Allow both as updateAgent is used for service assignment
    update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto, @Query('tenantId') queryTenantId?: string) {
        const tenantId = resolveTenantId(req, queryTenantId);
        const actorId = req.user.id;
        return this.agentsService.update(+id, updateAgentDto, tenantId, actorId);
    }

    @Delete(':id')
    @Permissions('agents:write')
    remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        const actorId = req.user.id;
        return this.agentsService.remove(+id, tenantId, actorId);
    }

    // --- HEALTH RECORDS --- //

    @Get(':id/health-records')
    @Permissions('agents:read')
    getHealthRecords(@Request() req: AuthenticatedRequest, @Param('id') agentId: string) {
        const tenantId = req.user.tenantId;
        return this.agentsService.getHealthRecords(+agentId, tenantId);
    }

    @Post(':id/health-records')
    @Permissions('agents:write')
    addHealthRecord(@Request() req: AuthenticatedRequest, @Param('id') agentId: string, @Body() data: any) {
        const tenantId = req.user.tenantId;
        const actorId = req.user.id;
        return this.agentsService.addHealthRecord(+agentId, tenantId, data, actorId);
    }

    @Delete('health-records/:recordId')
    @Permissions('agents:write')
    deleteHealthRecord(@Request() req: AuthenticatedRequest, @Param('recordId') recordId: string) {
        const tenantId = req.user.tenantId;
        const actorId = req.user.id;
        return this.agentsService.deleteHealthRecord(+recordId, tenantId, actorId);
    }
}
