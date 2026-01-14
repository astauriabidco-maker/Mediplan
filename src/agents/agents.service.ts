import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgentsService {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
    ) { }

    async create(createAgentDto: CreateAgentDto & { tenantId: string }) {
        const hashedPassword = await bcrypt.hash(createAgentDto.password || 'password123', 10);
        const agent = this.agentRepository.create({
            ...createAgentDto,
            password: hashedPassword,
        });
        return this.agentRepository.save(agent);
    }

    findAll(tenantId: string) {
        return this.agentRepository.find({
            where: { tenantId },
            relations: ['hospitalService', 'manager'],
            order: { nom: 'ASC' },
        });
    }

    async findOne(id: number, tenantId: string) {
        const agent = await this.agentRepository.findOne({
            where: { id, tenantId },
            relations: ['contracts', 'agentCompetencies', 'agentCompetencies.competency', 'hospitalService', 'manager'],
        });
        if (!agent) {
            throw new NotFoundException(`Agent #${id} not found`);
        }
        return agent;
    }

    async update(id: number, updateAgentDto: UpdateAgentDto, tenantId: string) {
        const agent = await this.findOne(id, tenantId);

        if (updateAgentDto.password) {
            updateAgentDto.password = await bcrypt.hash(updateAgentDto.password, 10);
        }

        Object.assign(agent, updateAgentDto);
        return this.agentRepository.save(agent);
    }

    async remove(id: number, tenantId: string) {
        const agent = await this.findOne(id, tenantId);
        return this.agentRepository.remove(agent);
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
