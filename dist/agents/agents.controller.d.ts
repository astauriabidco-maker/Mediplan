import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
export declare class AgentsController {
    private readonly agentsService;
    constructor(agentsService: AgentsService);
    create(req: AuthenticatedRequest, createAgentDto: CreateAgentDto): Promise<import("./entities/agent.entity").Agent>;
    findAll(req: AuthenticatedRequest, queryTenantId?: string): Promise<import("./entities/agent.entity").Agent[]>;
    getMyTeam(req: AuthenticatedRequest): Promise<import("./entities/agent.entity").Agent[]>;
    findOne(req: AuthenticatedRequest, id: string, queryTenantId?: string): Promise<import("./entities/agent.entity").Agent>;
    update(req: AuthenticatedRequest, id: string, updateAgentDto: UpdateAgentDto, queryTenantId?: string): Promise<import("./entities/agent.entity").Agent>;
    remove(req: AuthenticatedRequest, id: string): Promise<import("./entities/agent.entity").Agent>;
    getHealthRecords(req: AuthenticatedRequest, agentId: string): Promise<import("./entities/health-record.entity").HealthRecord[]>;
    addHealthRecord(req: AuthenticatedRequest, agentId: string, data: any): Promise<import("./entities/health-record.entity").HealthRecord>;
    deleteHealthRecord(req: AuthenticatedRequest, recordId: string): Promise<{
        success: boolean;
    }>;
}
