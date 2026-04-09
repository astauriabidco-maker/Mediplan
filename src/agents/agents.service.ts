import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { HealthRecord, HealthRecordStatus } from './entities/health-record.entity';
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
        @InjectRepository(HealthRecord)
        private readonly healthRecordRepository: Repository<HealthRecord>,
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

    // --- HEALTH RECORDS --- //

    async getHealthRecords(agentId: number, tenantId: string) {
        const records = await this.healthRecordRepository.find({
            where: { agentId, tenantId },
            order: { expirationDate: 'ASC' }
        });

        // Dynamic status check
        const now = new Date();
        now.setHours(0,0,0,0);
        let hasUpdates = false;

        for (const record of records) {
            if (record.expirationDate) {
                const expDate = new Date(record.expirationDate);
                expDate.setHours(0,0,0,0);
                const diffTime = expDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let newStatus = record.status;
                if (diffDays < 0) {
                    newStatus = HealthRecordStatus.EXPIRED;
                } else if (diffDays <= 30) {
                    newStatus = HealthRecordStatus.EXPIRING_SOON;
                } else {
                    newStatus = HealthRecordStatus.VALID;
                }

                if (newStatus !== record.status) {
                    record.status = newStatus;
                    hasUpdates = true;
                }
            }
        }

        if (hasUpdates) {
            await this.healthRecordRepository.save(records);
        }

        return records;
    }

    async addHealthRecord(agentId: number, tenantId: string, data: Partial<HealthRecord>, actorId: number) {
        const newRecord = this.healthRecordRepository.create({
            ...data,
            agentId,
            tenantId,
        });
        const saved = await this.healthRecordRepository.save(newRecord);

        await this.auditService.log(tenantId, actorId, AuditAction.CREATE, AuditEntityType.AGENT, agentId.toString(), {
            action: 'ADD_HEALTH_RECORD',
            recordTitle: saved.title
        });

        return saved;
    }

    async deleteHealthRecord(id: number, tenantId: string, actorId: number) {
        const record = await this.healthRecordRepository.findOne({ where: { id, tenantId } });
        if (!record) throw new NotFoundException('Health record not found');

        await this.healthRecordRepository.remove(record);

        await this.auditService.log(tenantId, actorId, AuditAction.DELETE, AuditEntityType.AGENT, record.agentId.toString(), {
            action: 'DELETE_HEALTH_RECORD',
            recordTitle: record.title
        });

        return { success: true };
    }
}
