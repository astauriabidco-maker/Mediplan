import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Leave } from '../planning/entities/leave.entity';
export declare class SeedController {
    private agentRepo;
    private serviceRepo;
    private leaveRepo;
    constructor(agentRepo: Repository<Agent>, serviceRepo: Repository<HospitalService>, leaveRepo: Repository<Leave>);
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
