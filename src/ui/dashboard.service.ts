import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from '../planning/entities/shift.entity';
import { Leave, LeaveStatus } from '../planning/entities/leave.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { startOfWeek, endOfWeek, differenceInHours, differenceInDays } from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(Leave)
        private leaveRepository: Repository<Leave>,
        @Inject(LOCALE_RULES)
        private localeRules: ILocaleRules,
    ) { }

    async getKPIs() {
        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });

        // 1. Occupancy Rate (Staff Utilization)
        // Rate = (Hours Planned this week) / (Total Contractual Hours for all agents)
        const weeklyLimit = this.localeRules.getWeeklyWorkLimit();
        const agents = await this.agentRepository.find();
        const totalCapacity = agents.length * weeklyLimit;

        const shifts = await this.shiftRepository.find({
            where: {
                start: Between(start, end),
            }
        });

        let totalPlannedHours = 0;
        shifts.forEach(shift => {
            totalPlannedHours += differenceInHours(new Date(shift.end), new Date(shift.start));
        });

        const occupancyRate = totalCapacity > 0 ? (totalPlannedHours / totalCapacity) * 100 : 0;

        // 2. Overtime (Simplified: shifts count vs weekly limit per agent)
        const agentHours: Record<number, number> = {};
        shifts.forEach(shift => {
            if (shift.agent) {
                const hours = differenceInHours(new Date(shift.end), new Date(shift.start));
                agentHours[shift.agent.id] = (agentHours[shift.agent.id] || 0) + hours;
            }
        });

        let totalOvertimeHours = 0;
        Object.values(agentHours).forEach(hours => {
            if (hours > weeklyLimit) {
                totalOvertimeHours += (hours - weeklyLimit);
            }
        });

        // 3. Leave Balances
        // Assuming a default of 30 days per year if not specified
        const DEFAULT_QUOTA = 30;
        const leaveStats = await Promise.all(agents.map(async (agent) => {
            const approvedLeaves = await this.leaveRepository.find({
                where: {
                    agent: { id: agent.id },
                    status: LeaveStatus.APPROVED
                }
            });

            let consumedDays = 0;
            approvedLeaves.forEach(leave => {
                consumedDays += differenceInDays(new Date(leave.end), new Date(leave.start)) + 1;
            });

            return {
                agentId: agent.id,
                agentName: agent.nom,
                consumed: consumedDays,
                remaining: DEFAULT_QUOTA - consumedDays
            };
        }));

        return {
            occupancyRate: Math.round(occupancyRate),
            totalOvertimeHours,
            leaveBalances: leaveStats,
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        };
    }
}
