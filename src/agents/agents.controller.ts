import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) { }

    @Post()
    @Permissions('agents:write')
    create(@Request() req: any, @Body() createAgentDto: CreateAgentDto) {
        // Force tenantId from authenticated user
        const tenantId = req.user.tenantId;
        const actorId = req.user.userId;
        return this.agentsService.create({ ...createAgentDto, tenantId }, actorId);
    }

    @Get()
    @Permissions('agents:read')
    findAll(@Request() req: any, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.agentsService.findAll(tenantId);
    }

    @Get('my-team')
    @Permissions('agents:read') // Or a specific 'team:read'? Sticking to agents:read for simple hierarchy view
    getMyTeam(@Request() req: any) {
        const tenantId = req.user.tenantId;
        const agentId = req.user.userId; // The agent's ID from JWT (mapped as userId in strategy)
        return this.agentsService.getMyTeam(agentId, tenantId);
    }

    @Get(':id')
    @Permissions('agents:read')
    findOne(@Request() req: any, @Param('id') id: string, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        const actorId = req.user.userId;
        return this.agentsService.findOne(+id, tenantId, actorId);
    }

    @Patch(':id')
    @Permissions('agents:write', 'services:manage_staff') // Allow both as updateAgent is used for service assignment
    update(@Request() req: any, @Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        const actorId = req.user.userId;
        return this.agentsService.update(+id, updateAgentDto, tenantId, actorId);
    }

    @Delete(':id')
    @Permissions('agents:write')
    remove(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        const actorId = req.user.userId;
        return this.agentsService.remove(+id, tenantId, actorId);
    }
}
