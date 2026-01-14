import { CompetenciesService } from './competencies.service';
export declare class CompetenciesController {
    private readonly competenciesService;
    constructor(competenciesService: CompetenciesService);
    getValidByAgent(agentId: number): Promise<import("./entities/agent-competency.entity").AgentCompetency[]>;
    findAllMatrix(req: any): Promise<{
        agents: import("../agents/entities/agent.entity").Agent[];
        competencies: import("./entities/competency.entity").Competency[];
    }>;
    seed(): Promise<{
        message: string;
        agentId: number;
        agentEmail: string;
        info: string;
    }>;
    create(body: {
        name: string;
        category: string;
    }): Promise<import("./entities/competency.entity").Competency>;
    assignToAgent(body: {
        agentId: number;
        competencyId: number;
        level: number;
        expirationDate?: string;
    }): Promise<import("./entities/agent-competency.entity").AgentCompetency>;
}
