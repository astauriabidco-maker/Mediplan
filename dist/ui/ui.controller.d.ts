import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Competency } from '../competencies/entities/competency.entity';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
export declare class UiController {
    private agentRepository;
    private competencyRepository;
    private localeRules;
    constructor(agentRepository: Repository<Agent>, competencyRepository: Repository<Competency>, localeRules: ILocaleRules);
    getStats(): Promise<{
        agentsCount: number;
        competenciesCount: number;
        locale: {
            limit: number;
            mobileMoney: boolean;
            offlineMode: boolean;
        };
    }>;
}
