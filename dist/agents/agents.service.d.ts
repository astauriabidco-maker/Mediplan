import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { HealthRecord } from './entities/health-record.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AuditService } from '../audit/audit.service';
export declare class AgentsService {
    private readonly agentRepository;
    private readonly healthRecordRepository;
    private readonly auditService;
    constructor(agentRepository: Repository<Agent>, healthRecordRepository: Repository<HealthRecord>, auditService: AuditService);
    create(createAgentDto: CreateAgentDto & {
        tenantId: string;
    }, actorId: number): Promise<Agent>;
    findAll(tenantId: string): Promise<Agent[]>;
    findOne(id: number, tenantId: string, actorId: number): Promise<Agent>;
    update(id: number, updateAgentDto: UpdateAgentDto, tenantId: string, actorId: number): Promise<Agent>;
    remove(id: number, tenantId: string, actorId: number): Promise<Agent>;
    getMyTeam(agentId: number, tenantId: string): Promise<Agent[]>;
    getHealthRecords(agentId: number, tenantId: string): Promise<HealthRecord[]>;
    addHealthRecord(agentId: number, tenantId: string, data: Partial<HealthRecord>, actorId: number): Promise<HealthRecord>;
    deleteHealthRecord(id: number, tenantId: string, actorId: number): Promise<{
        success: boolean;
    }>;
}
