import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
export declare class AgentsController {
    private readonly agentsService;
    constructor(agentsService: AgentsService);
    create(req: any, createAgentDto: CreateAgentDto): Promise<import("./entities/agent.entity").Agent>;
    findAll(req: any, queryTenantId?: string): Promise<import("./entities/agent.entity").Agent[]>;
    getMyTeam(req: any): Promise<import("./entities/agent.entity").Agent[]>;
    findOne(req: any, id: string, queryTenantId?: string): Promise<import("./entities/agent.entity").Agent>;
    update(req: any, id: string, updateAgentDto: UpdateAgentDto, queryTenantId?: string): Promise<import("./entities/agent.entity").Agent>;
    remove(req: any, id: string): Promise<import("./entities/agent.entity").Agent>;
}
