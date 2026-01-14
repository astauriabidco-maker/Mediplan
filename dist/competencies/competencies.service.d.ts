import { Repository } from 'typeorm';
import { AgentCompetency } from './entities/agent-competency.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Competency } from './entities/competency.entity';
import { Shift } from '../planning/entities/shift.entity';
export declare class CompetenciesService {
    private agentCompetencyRepository;
    private agentRepository;
    private competencyRepository;
    private shiftRepository;
    constructor(agentCompetencyRepository: Repository<AgentCompetency>, agentRepository: Repository<Agent>, competencyRepository: Repository<Competency>, shiftRepository: Repository<Shift>);
    findAllMatrix(tenantId: string): Promise<{
        agents: Agent[];
        competencies: Competency[];
    }>;
    findValidByAgent(agentId: number): Promise<AgentCompetency[]>;
    create(name: string, category: string): Promise<Competency>;
    assignToAgent(agentId: number, competencyId: number, level: number, expirationDate?: Date): Promise<AgentCompetency>;
    seedTestData(): Promise<{
        message: string;
        agentId: number;
        agentEmail: string;
        info: string;
    }>;
}
