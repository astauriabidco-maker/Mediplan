import { Controller, Get, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { DashboardService } from './dashboard.service';

@Controller('ui')
export class UiController {
    constructor(
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(Competency)
        private competencyRepository: Repository<Competency>,
        @Inject(LOCALE_RULES)
        private localeRules: ILocaleRules,
        private dashboardService: DashboardService,
    ) { }

    @Get('stats')
    async getStats() {
        const agentsCount = await this.agentRepository.count();
        const competenciesCount = await this.competencyRepository.count();

        return {
            agentsCount,
            competenciesCount,
            locale: {
                limit: this.localeRules.getWeeklyWorkLimit(),
                mobileMoney: this.localeRules.supportsMobileMoney(),
                offlineMode: this.localeRules.requiresOfflineMode(),
            },
        };
    }

    @Get('dashboard-kpis')
    async getDashboardKPIs() {
        return this.dashboardService.getKPIs();
    }
}
