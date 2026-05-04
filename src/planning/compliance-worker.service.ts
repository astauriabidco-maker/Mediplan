import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Shift } from './entities/shift.entity';
import {
  AgentAlert,
  AlertSeverity,
  AlertType,
} from '../agents/entities/agent-alert.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';

interface CoverageRule {
  jobTitle?: string;
  competencyId?: number;
  competencyName?: string;
  minCount?: number;
}

interface CoverageRules {
  minStaffing?: CoverageRule[];
}

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
      where: { isActive: true },
    });

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 7); // Scan next 7 days

    for (const service of services) {
      const rules = this.getMinStaffingRules(service);
      if (rules.length === 0) continue;

      this.logger.log(`Checking compliance for service: ${service.name}`);
      try {
        await this.validateServiceCoverage(service, rules, start, end);
      } catch (error) {
        this.logger.error(
          `Compliance scan failed for service ${service.id} (${service.name}) tenant ${service.tenantId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log('✅ Compliance Scan completed.');
  }

  private async validateServiceCoverage(
    service: HospitalService,
    rules: CoverageRule[],
    start: Date,
    end: Date,
  ): Promise<void> {
    // Find all shifts for this service in the period
    const shifts = await this.shiftRepository.find({
      where: {
        tenantId: service.tenantId,
        start: Between(start, end),
        agent: { hospitalService: { id: service.id } },
      },
      relations: [
        'agent',
        'agent.agentCompetencies',
        'agent.agentCompetencies.competency',
      ],
    });

    // Simplified logic: group by Day and Period (Day/Night)
    // In a real app, this would be more granular based on the exact coverage rule timings
    for (const rule of rules) {
      try {
        // Rule check
        // For example: { jobTitle: 'Infirmière', minCount: 2 }
        const satisfied = this.checkRuleSatisfied(shifts, rule);

        if (!satisfied) {
          const ruleLabel = rule.jobTitle || rule.competencyName || 'Effectifs';
          const alertMessage = `⚠️ ALERTE CONFORMITÉ LÉGALE : Le service ${service.name} ne respecte pas les règles de couverture minimum (${ruleLabel}).`;

          // Check if alert already exists for today/service
          const existing = await this.alertRepository.findOne({
            where: {
              tenantId: service.tenantId,
              type: AlertType.COMPLIANCE,
              severity: AlertSeverity.HIGH,
              message: alertMessage,
              isAcknowledged: false,
              isResolved: false,
            },
          });

          if (!existing) {
            await this.alertRepository.save({
              tenantId: service.tenantId,
              agentId: service.chiefId || 1, // Notify the Chief or fallback to ID 1
              type: AlertType.COMPLIANCE,
              severity: AlertSeverity.HIGH,
              message: alertMessage,
              metadata: {
                serviceId: service.id,
                rule,
                lastDetectedAt: new Date(),
              },
              isAcknowledged: false,
              isResolved: false,
            });
            this.logger.error(
              `[RED FLAG] Compliance violation in ${service.name}: ${ruleLabel}`,
            );
          } else {
            const existingMetadata = this.getAlertMetadata(existing);
            existing.metadata = {
              ...existingMetadata,
              serviceId: service.id,
              rule,
              lastDetectedAt: new Date(),
            };
            await this.alertRepository.save(existing);
          }
        }
      } catch (error) {
        this.logger.error(
          `Compliance rule scan failed for service ${service.id} (${service.name}) tenant ${service.tenantId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private checkRuleSatisfied(shifts: Shift[], rule: CoverageRule): boolean {
    let matchingShifts = shifts;

    if (rule.jobTitle) {
      matchingShifts = matchingShifts.filter(
        (s) => s.agent?.jobTitle === rule.jobTitle,
      );
    }

    if (rule.competencyId) {
      matchingShifts = matchingShifts.filter((s) =>
        s.agent?.agentCompetencies?.some(
          (ac) =>
            ac.competency?.id === rule.competencyId &&
            (!ac.expirationDate || ac.expirationDate > new Date()),
        ),
      );
    }

    if (rule.competencyName) {
      matchingShifts = matchingShifts.filter((s) =>
        s.agent?.agentCompetencies?.some(
          (ac) =>
            ac.competency?.name === rule.competencyName &&
            (!ac.expirationDate || ac.expirationDate > new Date()),
        ),
      );
    }

    return matchingShifts.length >= (rule.minCount || 0);
  }

  private getMinStaffingRules(service: HospitalService): CoverageRule[] {
    const coverageRules = service.coverageRules as unknown;
    if (!coverageRules || typeof coverageRules !== 'object') {
      return [];
    }

    const minStaffing = (coverageRules as CoverageRules).minStaffing;
    return Array.isArray(minStaffing) ? minStaffing : [];
  }

  private getAlertMetadata(alert: AgentAlert): Record<string, unknown> {
    const metadata = alert.metadata as unknown;
    return metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)
      : {};
  }
}
