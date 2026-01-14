import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) { }

    @Post()
    create(@Request() req: any, @Body() createAgentDto: CreateAgentDto) {
        // Force tenantId from authenticated user
        const tenantId = req.user.tenantId;
        return this.agentsService.create({ ...createAgentDto, tenantId });
    }

    @Get()
    findAll(@Request() req: any) {
        const tenantId = req.user.tenantId;
        return this.agentsService.findAll(tenantId);
    }

    @Get('my-team')
    getMyTeam(@Request() req: any) {
        const tenantId = req.user.tenantId;
        const agentId = req.user.userId; // The agent's ID from JWT (mapped as userId in strategy)
        return this.agentsService.getMyTeam(agentId, tenantId);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        return this.agentsService.findOne(+id, tenantId);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
        const tenantId = req.user.tenantId;
        return this.agentsService.update(+id, updateAgentDto, tenantId);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        return this.agentsService.remove(+id, tenantId);
    }
}
