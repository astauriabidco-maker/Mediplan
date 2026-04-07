import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AuditService } from '../audit/audit.service';
export declare class AgentsService {
    private readonly agentRepository;
    private readonly auditService;
    constructor(agentRepository: Repository<Agent>, auditService: AuditService);
    create(createAgentDto: CreateAgentDto & {
        tenantId: string;
    }, actorId: number): Promise<Agent>;
    findAll(tenantId: string): Promise<Agent[]>;
    findOne(id: number, tenantId: string, actorId: number): Promise<Agent>;
    update(id: number, updateAgentDto: UpdateAgentDto, tenantId: string, actorId: number): Promise<Agent>;
    remove(id: number, tenantId: string, actorId: number): Promise<Agent>;
    getMyTeam(agentId: number, tenantId: string): Promise<Agent[]>;
}
