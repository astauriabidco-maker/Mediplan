import { Repository } from 'typeorm';
import { Agent } from './agents/entities/agent.entity';
import { Shift } from './planning/entities/shift.entity';
export declare class SeedService {
    private agentRepository;
    private shiftRepository;
    constructor(agentRepository: Repository<Agent>, shiftRepository: Repository<Shift>);
    seed(): Promise<{
        message: string;
        agents: number;
        shifts: number;
    }>;
}
