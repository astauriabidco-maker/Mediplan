import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Competency } from '../competencies/entities/competency.entity';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { DashboardService } from './dashboard.service';
export declare class UiController {
    private agentRepository;
    private competencyRepository;
    private localeRules;
    private dashboardService;
    constructor(agentRepository: Repository<Agent>, competencyRepository: Repository<Competency>, localeRules: ILocaleRules, dashboardService: DashboardService);
    getStats(): Promise<{
        agentsCount: number;
        competenciesCount: number;
        locale: {
            limit: number;
            mobileMoney: boolean;
            offlineMode: boolean;
        };
    }>;
    getDashboardKPIs(): Promise<{
        occupancyRate: number;
        totalOvertimeHours: number;
        leaveBalances: {
            agentId: number;
            agentName: string;
            consumed: number;
            remaining: number;
        }[];
        period: {
            start: string;
            end: string;
        };
    }>;
}
