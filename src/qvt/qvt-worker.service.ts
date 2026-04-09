import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Shift } from '../planning/entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentAlert, AlertSeverity, AlertType } from '../agents/entities/agent-alert.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class QvtWorkerService {
    private readonly logger = new Logger(QvtWorkerService.name);

    constructor(
        @InjectRepository(Shift) private shiftRepository: Repository<Shift>,
        @InjectRepository(Agent) private agentRepository: Repository<Agent>,
        @InjectRepository(AgentAlert) private alertRepository: Repository<AgentAlert>,
        private settingsService: SettingsService
    ) {}

    // Runs every night at 1:00 AM
    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async evaluateAllAgentsQvt() {
        this.logger.log('Starting daily QVT and compliance evaluation for all tenants...');
        
        // In a true multi-tenant setup, you might iterate over distinct tenants, 
        // but here we just get all active agents.
        const agents = await this.agentRepository.find({ where: { status: 'ACTIVE' } as any });
        
        for (const agent of agents) {
            await this.evaluateAgentFatigue(agent);
        }
        
        this.logger.log(`QVT evaluation completed for ${agents.length} agents.`);
    }

    async evaluateAgentFatigue(agent: Agent) {
        // Fetch dynamic thresholds from settings (or defaults)
        const weeklyHoursLimit = await this.settingsService.getSetting(agent.tenantId, agent.facilityId, 'planning.weekly_hours_limit');
        const minRestHours = await this.settingsService.getSetting(agent.tenantId, agent.facilityId, 'planning.daily_rest_hours');
        const maxNightShifts = await this.settingsService.getSetting(agent.tenantId, agent.facilityId, 'planning.max_night_shifts_month');
        
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const shifts7Days = await this.shiftRepository.find({
            where: { agent: { id: agent.id }, start: MoreThanOrEqual(sevenDaysAgo) }
        });

        const shifts30Days = await this.shiftRepository.find({
            where: { agent: { id: agent.id }, start: MoreThanOrEqual(thirtyDaysAgo) },
            order: { start: 'ASC' }
        });

        // 1. Check Weekly Hours Rule
        let totalHoursWeek = 0;
        shifts7Days.forEach(s => {
            totalHoursWeek += (s.end.getTime() - s.start.getTime()) / (1000 * 60 * 60);
        });

        if (totalHoursWeek > weeklyHoursLimit) {
            await this.createOrUpdateAlert(
                agent.id,
                agent.tenantId,
                AlertType.QVT_FATIGUE,
                totalHoursWeek > (weeklyHoursLimit + 10) ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
                `Dépassement du temps de travail: ${totalHoursWeek.toFixed(1)}h effectuées (limite ${weeklyHoursLimit}h)`
            );
        }

        // 2. Check Rest Hours Rule (Compare successive shifts in last 30 days)
        let restViolationDetected = false;
        let nightShiftsCount = 0;

        for (let i = 0; i < shifts30Days.length; i++) {
            const shift = shifts30Days[i];
            
            // Night shift count
            if (this.isNightShift(shift.start, shift.end)) {
                nightShiftsCount++;
            }

            // Rest between shifts
            if (i > 0) {
                const prevShift = shifts30Days[i - 1];
                const restDuration = (shift.start.getTime() - prevShift.end.getTime()) / (1000 * 60 * 60);
                if (restDuration > 0 && restDuration < minRestHours) {
                    restViolationDetected = true;
                    await this.createOrUpdateAlert(
                        agent.id,
                        agent.tenantId,
                        AlertType.COMPLIANCE,
                        AlertSeverity.HIGH,
                        `Violation du repos légal entre deux vacations le ${prevShift.end.toLocaleDateString()} (${restDuration.toFixed(1)}h de repos, minimum ${minRestHours}h)`
                    );
                }
            }
        }

        // 3. Check Max Night Shifts per month
        if (maxNightShifts && nightShiftsCount > maxNightShifts) {
            await this.createOrUpdateAlert(
                agent.id,
                agent.tenantId,
                AlertType.QVT_FATIGUE,
                AlertSeverity.HIGH,
                `Surmenage: ${nightShiftsCount} gardes de nuit effectuées ce mois-ci (limite ${maxNightShifts})`
            );
        }
    }

    private async createOrUpdateAlert(agentId: number, tenantId: string, type: AlertType, severity: AlertSeverity, message: string) {
        // Prevent duplicate spam: Check if an identical unacknowledged alert already exists
        const existingAlert = await this.alertRepository.findOne({
            where: { agentId, type, message, isAcknowledged: false }
        });

        if (!existingAlert) {
            const alert = this.alertRepository.create({
                agentId,
                tenantId,
                type,
                severity,
                message
            });
            await this.alertRepository.save(alert);
            this.logger.warn(`New QVT Alert created for Agent ID ${agentId} - [${severity}] ${message}`);
        }
    }

    private isNightShift(start: Date, end: Date): boolean {
        const nightStart = 22;
        const nightEnd = 6;
        let overlapMinutes = 0;
        let current = new Date(start.getTime());

        while (current < end) {
            const h = current.getHours();
            if (h >= nightStart || h < nightEnd) overlapMinutes++;
            current.setMinutes(current.getMinutes() + 1);
        }
        return (overlapMinutes / 60) >= 3;
    }
}
