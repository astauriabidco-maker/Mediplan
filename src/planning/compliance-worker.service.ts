import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Shift } from './entities/shift.entity';
import { AgentAlert, AlertSeverity, AlertType } from '../agents/entities/agent-alert.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';

@Injectable()
export class ComplianceWorkerService {
    private readonly logger = new Logger(ComplianceWorkerService.name);

    constructor(
        @InjectRepository(HospitalService)
        private serviceRepository: Repository<HospitalService>,
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(AgentAlert)
        private alertRepository: Repository<AgentAlert>,
        @InjectRepository(AgentCompetency)
        private agentCompRepository: Repository<AgentCompetency>,
    ) {}

    @Cron(CronExpression.EVERY_10_MINUTES)
    async runDailyComplianceScan() {
        this.logger.log('🚀 Starting global Compliance Scan (Red Flag Engine)...');
        
        const services = await this.serviceRepository.find({
            where: { isActive: true }
        });

        const start = new Date();
        const end = new Date();
        end.setDate(start.getDate() + 7); // Scan next 7 days

        for (const service of services) {
            if (!service.coverageRules || !service.coverageRules.minStaffing) continue;

            this.logger.log(`Checking compliance for service: ${service.name}`);
            await this.validateServiceCoverage(service, start, end);
        }

        this.logger.log('✅ Compliance Scan completed.');
    }

    private async validateServiceCoverage(service: HospitalService, start: Date, end: Date) {
        // Find all shifts for this service in the period
        const shifts = await this.shiftRepository.find({
            where: {
                tenantId: service.tenantId,
                start: Between(start, end),
                agent: { hospitalService: { id: service.id } }
            },
            relations: ['agent', 'agent.agentCompetencies', 'agent.agentCompetencies.competency']
        });

        // Simplified logic: group by Day and Period (Day/Night)
        // In a real app, this would be more granular based on the exact coverage rule timings
        const rules = service.coverageRules.minStaffing;

        for (const rule of rules) {
            // Rule check
            // For example: { jobTitle: 'Infirmière', minCount: 2 }
            const satisfied = this.checkRuleSatisfied(shifts, rule);

            if (!satisfied) {
                const alertMessage = `⚠️ ALERTE CONFORMITÉ LÉGALE : Le service ${service.name} ne respecte pas les règles de couverture minimum (${rule.jobTitle || rule.competencyName || 'Effectifs'}).`;
                
                // Check if alert already exists for today/service
                const existing = await this.alertRepository.findOne({
                    where: {
                        tenantId: service.tenantId,
                        type: AlertType.COMPLIANCE,
                        severity: AlertSeverity.HIGH,
                        message: alertMessage,
                        isAcknowledged: false
                    }
                });

                if (!existing) {
                    await this.alertRepository.save({
                        tenantId: service.tenantId,
                        agentId: service.chiefId || 1, // Notify the Chief or fallback to ID 1
                        type: AlertType.COMPLIANCE,
                        severity: AlertSeverity.HIGH,
                        message: alertMessage,
                        metadata: { serviceId: service.id, rule }
                    });
                    this.logger.error(`[RED FLAG] Compliance violation in ${service.name}: ${rule.jobTitle || rule.competencyName}`);
                }
            }
        }
    }

    private checkRuleSatisfied(shifts: Shift[], rule: any): boolean {
        let matchingShifts = shifts;

        if (rule.jobTitle) {
            matchingShifts = matchingShifts.filter(s => s.agent?.jobTitle === rule.jobTitle);
        }

        if (rule.competencyId) {
            matchingShifts = matchingShifts.filter(s => 
                s.agent?.agentCompetencies?.some(ac => 
                    ac.competency?.id === rule.competencyId && 
                    (!ac.expirationDate || ac.expirationDate > new Date())
                )
            );
        }

        return matchingShifts.length >= (rule.minCount || 0);
    }
}
