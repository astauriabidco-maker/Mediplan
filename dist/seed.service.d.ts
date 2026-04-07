import { Repository } from 'typeorm';
import { Agent } from './agents/entities/agent.entity';
import { Shift } from './planning/entities/shift.entity';
import { Competency } from './competencies/entities/competency.entity';
import { AgentCompetency } from './competencies/entities/agent-competency.entity';
export declare class SeedService {
    private agentRepository;
    private shiftRepository;
    private competencyRepository;
    private agentCompRepository;
    constructor(agentRepository: Repository<Agent>, shiftRepository: Repository<Shift>, competencyRepository: Repository<Competency>, agentCompRepository: Repository<AgentCompetency>);
    seed(): Promise<{
        message: string;
        agents: number;
        shifts: number;
    }>;
}
