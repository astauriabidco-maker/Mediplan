import { Injectable, Logger, Inject } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from './entities/shift.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';

export interface OptimizationResult {
    assigned: { shiftId: string; agentId: number }[];
    unassigned: { shiftId: string; reason: string }[];
}

@Injectable()
export class OptimizationService {
    private readonly logger = new Logger(OptimizationService.name);

    constructor(
        private readonly planningService: PlanningService,
        @Inject(LOCALE_RULES)
        private readonly localeRules: ILocaleRules,
    ) { }

    async compute(
        shiftsToFill: { id: string; start: Date; end: Date; requiredSkill: string }[],
        agentsPool: Agent[],
        tenantId: string, // New param
    ): Promise<OptimizationResult> {
        const result: OptimizationResult = { assigned: [], unassigned: [] };
        const virtualHours = new Map<number, number>();

        for (const shift of shiftsToFill) {
            let assigned = false;

            // 1. Filter agents by skill
            const qualifiedAgents = agentsPool.filter((agent) =>
                agent.agentCompetencies?.some(
                    (ac) => ac.competency.name === shift.requiredSkill && ac.expirationDate > new Date(),
                ),
            );

            if (qualifiedAgents.length === 0) {
                result.unassigned.push({ shiftId: shift.id, reason: 'No qualified agents found' });
                continue;
            }

            // 2. Try to assign based on capacity (weekly limit + virtual hours)
            const shiftDuration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);

            for (const agent of qualifiedAgents) {
                // Pass tenantId here
                // 3. Check for Approved Leaves
                const isAvailable = await this.planningService.checkAvailability(tenantId, agent.id, shift.start);
                if (!isAvailable) {
                    continue; // Skip if on leave
                }

                const dbHours = await this.planningService.getWeeklyHours(tenantId, agent.id, shift.start);
                const currentVirtual = virtualHours.get(agent.id) || 0;
                const totalHours = dbHours + currentVirtual;
                const weeklyLimit = this.localeRules.getWeeklyWorkLimit();

                if (totalHours + shiftDuration <= weeklyLimit) {
                    result.assigned.push({ shiftId: shift.id, agentId: agent.id });
                    virtualHours.set(agent.id, currentVirtual + shiftDuration);
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                result.unassigned.push({ shiftId: shift.id, reason: 'Qualified agents reached work limit' });
            }
        }

        return result;
    }
}
