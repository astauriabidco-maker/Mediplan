import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
export declare class AgentsService {
    private readonly agentRepository;
    constructor(agentRepository: Repository<Agent>);
    create(createAgentDto: CreateAgentDto & {
        tenantId: string;
    }): Promise<Agent>;
    findAll(tenantId: string): Promise<Agent[]>;
    findOne(id: number, tenantId: string): Promise<Agent>;
    update(id: number, updateAgentDto: UpdateAgentDto, tenantId: string): Promise<Agent>;
    remove(id: number, tenantId: string): Promise<Agent>;
    getMyTeam(agentId: number, tenantId: string): Promise<Agent[]>;
}
