import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Leave } from '../planning/entities/leave.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
export declare class SeedController {
    private agentRepo;
    private serviceRepo;
    private leaveRepo;
    private compRepo;
    private agentCompRepo;
    constructor(agentRepo: Repository<Agent>, serviceRepo: Repository<HospitalService>, leaveRepo: Repository<Leave>, compRepo: Repository<Competency>, agentCompRepo: Repository<AgentCompetency>);
    seedHGD(): Promise<{
        success: boolean;
        message: string;
        data: {
            tenant: string;
            services: number;
            agents: number;
            leaves: number;
            credentials: {
                password: string;
                examples: string[];
            };
        };
    }>;
}
