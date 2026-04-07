import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import * as bcrypt from 'bcrypt';

import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

@Injectable()
export class AgentsService {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        private readonly auditService: AuditService,
    ) { }

    async create(createAgentDto: CreateAgentDto & { tenantId: string }, actorId: number) {
        const hashedPassword = await bcrypt.hash(createAgentDto.password || 'password123', 10);
        const agent = this.agentRepository.create({
            ...createAgentDto,
            password: hashedPassword,
        });
        const savedAgent = await this.agentRepository.save(agent);
        
        await this.auditService.log(
            createAgentDto.tenantId,
            actorId,
            AuditAction.CREATE,
            AuditEntityType.AGENT,
            savedAgent.id.toString(),
            { email: savedAgent.email }
        );

        return savedAgent;
    }

    findAll(tenantId: string) {
        return this.agentRepository.find({
            where: { tenantId },
            relations: ['hospitalService', 'manager', 'grade'],
            order: { nom: 'ASC' },
        });
    }

    async findOne(id: number, tenantId: string, actorId: number) {
        const agent = await this.agentRepository.findOne({
            where: { id, tenantId },
            relations: ['contracts', 'agentCompetencies', 'agentCompetencies.competency', 'hospitalService', 'manager'],
        });
        if (!agent) {
            throw new NotFoundException(`Agent #${id} not found`);
        }
        
        // Log sensitive PHI access (FHIR AuditEvent READ)
        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.READ,
            AuditEntityType.AGENT,
            id.toString(),
            { accessedBy: actorId }
        );

        return agent;
    }

    async update(id: number, updateAgentDto: UpdateAgentDto, tenantId: string, actorId: number) {
        // actorId is passed to findOne to log READ action too
        const agent = await this.findOne(id, tenantId, actorId);

        if (updateAgentDto.password) {
            updateAgentDto.password = await bcrypt.hash(updateAgentDto.password, 10);
        }

        Object.assign(agent, updateAgentDto);
        const updatedAgent = await this.agentRepository.save(agent);

        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.UPDATE,
            AuditEntityType.AGENT,
            id.toString(),
            { updatedFields: Object.keys(updateAgentDto) }
        );

        return updatedAgent;
    }

    async remove(id: number, tenantId: string, actorId: number) {
        const agent = await this.findOne(id, tenantId, actorId);
        const result = await this.agentRepository.remove(agent);

        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.DELETE,
            AuditEntityType.AGENT,
            id.toString(),
            { email: agent.email }
        );

        return result;
    }

    /**
     * Returns the current agent + all agents they manage (direct reports)
     */
    async getMyTeam(agentId: number, tenantId: string): Promise<Agent[]> {
        // Get the current agent
        const currentAgent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['hospitalService'],
        });

        if (!currentAgent) {
            throw new NotFoundException(`Agent #${agentId} not found`);
        }

        // Get all agents who have this agent as their manager
        const directReports = await this.agentRepository.find({
            where: { managerId: agentId, tenantId },
            relations: ['hospitalService'],
            order: { nom: 'ASC' },
        });

        // Return current agent first, then their team
        return [currentAgent, ...directReports];
    }
}
