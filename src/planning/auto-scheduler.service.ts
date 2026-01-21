import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from './entities/shift.entity';
import { Leave, LeaveStatus } from './entities/leave.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { PlanningService } from './planning.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

export interface ShiftNeed {
    start: Date;
    end: Date;
    postId: string; // e.g., 'MEDECIN_GARDE'
    count: number; // Number of agents needed
    requiredSkills?: string[];
}

@Injectable()
export class AutoSchedulerService {
    constructor(
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(Leave)
        private leaveRepository: Repository<Leave>,
        @Inject(LOCALE_RULES)
        private localeRules: ILocaleRules,
        private planningService: PlanningService, // To reuse getWeeklyHours
        private auditService: AuditService,
    ) { }

    async generateSchedule(tenantId: string, startDate: Date, endDate: Date, needs: ShiftNeed[]): Promise<Shift[]> {
        const generatedShifts: Shift[] = [];

        // 1. Fetch all agents for the tenant
        // In a real scenario, we would filter by active status, etc.
        const agents = await this.agentRepository.find({
            where: { tenantId: tenantId || 'DEFAULT_TENANT' },
            relations: ['agentCompetencies', 'agentCompetencies.competency']
        });

        // 2. Iterate through each need
        for (const need of needs) {
            let assignedCount = 0;

            // 2a. Filter eligible agents
            const eligibleAgents = [];

            for (const agent of agents) {
                // A. Check Competency & Role
                let matchesRole = true;
                if (need.requiredSkills && need.requiredSkills.length > 0) {
                    const agentSkills = agent.agentCompetencies?.map(ac => ac.competency.name) || [];
                    matchesRole = need.requiredSkills.every(skill => agentSkills.includes(skill));
                } else if (need.postId) {
                    // Fallback: Match by Job Title or Department (fuzzy match)
                    const target = need.postId.toLowerCase();
                    const job = (agent.jobTitle || '').toLowerCase();
                    const dept = (agent.department || '').toLowerCase();
                    matchesRole = job.includes(target) || dept.includes(target);
                    // Special case for 'MEDECIN' matching 'Docteur'
                    if (!matchesRole && target.includes('medecin') && job.includes('docteur')) matchesRole = true;
                    if (!matchesRole && target.includes('infirmier') && job.includes('infirmier')) matchesRole = true;
                    if (!matchesRole && target.includes('garde') && job.includes('garde')) matchesRole = true;
                }

                if (!matchesRole) continue;

                // B. Check Availability (Overlap)
                const isAvailable = await this.checkAvailability(tenantId, agent.id, need.start, need.end);
                if (!isAvailable) continue;

                // C. Check Daily Rest
                // Need to find the *previous* shift for this agent and ensure gap >= dailyRestHours
                const respectsDailyRest = await this.checkDailyRest(tenantId, agent.id, need.start);
                if (!respectsDailyRest) continue;

                // D. Check Weekly Hours
                const currentWeeklyHours = await this.planningService.getWeeklyHours(tenantId, agent.id, need.start);
                const pendingHours = this.calculatePendingHours(generatedShifts, agent.id, need.start);
                const shiftDuration = (need.end.getTime() - need.start.getTime()) / (1000 * 60 * 60);
                const totalHours = currentWeeklyHours + pendingHours + shiftDuration;

                if (totalHours > this.localeRules.getWeeklyWorkLimit()) {
                    continue;
                }

                eligibleAgents.push({ agent, totalHours });
            }

            // 2b. Sort candidates by Equity (Least Hours)
            eligibleAgents.sort((a, b) => a.totalHours - b.totalHours);

            // 2c. Pick Candidates
            for (const candidate of eligibleAgents) {
                if (assignedCount >= need.count) break;

                const newShift = this.shiftRepository.create({
                    start: need.start,
                    end: need.end,
                    postId: need.postId,
                    status: 'AUTO_GENERATED',
                    agent: candidate.agent,
                    tenantId: tenantId || 'DEFAULT_TENANT'
                });

                generatedShifts.push(newShift);
                assignedCount++;
            }
        }

        // 3. Save all assigned shifts
        if (generatedShifts.length > 0) {
            await this.shiftRepository.save(generatedShifts);

            await this.auditService.log(
                tenantId,
                0, // System or bulk actor placeholder
                AuditAction.AUTO_GENERATE,
                AuditEntityType.PLANNING,
                'BULK',
                { count: generatedShifts.length, start: startDate, end: endDate }
            );
        }

        return generatedShifts;
    }

    private async checkAvailability(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean> {
        // 1. Check for overlapping Shifts
        // (StartA <= EndB) and (EndA >= StartB)
        const shiftCount = await this.shiftRepository.count({
            where: {
                tenantId: tenantId || 'DEFAULT_TENANT',
                agent: { id: agentId },
                start: LessThanOrEqual(end),
                end: MoreThanOrEqual(start)
            }
        });
        if (shiftCount > 0) return false;

        // 2. Check for overlapping Leaves
        const leaveCount = await this.leaveRepository.count({
            where: {
                tenantId: tenantId || 'DEFAULT_TENANT',
                agent: { id: agentId },
                status: LeaveStatus.APPROVED, // Only consider approved leaves
                start: LessThanOrEqual(end),
                end: MoreThanOrEqual(start)
            }
        });
        if (leaveCount > 0) return false;

        return true;
    }

    private calculatePendingHours(generatedShifts: Shift[], agentId: number, date: Date): number {
        // Calculate hours for shifts in "generatedShifts" that fall in the same week as "date"
        // Reuse logic roughly from PlanningService but in memory
        const startOfWeek = new Date(date);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        return generatedShifts
            .filter(s => s.agent.id === agentId && s.start >= startOfWeek && s.start < endOfWeek)
            .reduce((total, s) => {
                return total + (s.end.getTime() - s.start.getTime()) / (1000 * 60 * 60);
            }, 0);
    }

    async findReplacements(tenantId: string, start: Date, end: Date, competency?: string): Promise<Agent[]> {
        // 1. Fetch potential agents
        const agents = await this.agentRepository.find({
            where: { tenantId: tenantId || 'DEFAULT_TENANT' },
            relations: ['agentCompetencies', 'agentCompetencies.competency']
        });

        const availableAgents: Agent[] = [];

        for (const agent of agents) {
            // 2. Check Competency Logic
            if (competency) {
                const target = competency.toLowerCase();
                const skills = agent.agentCompetencies?.map(ac => ac.competency.name.toLowerCase()) || [];
                const hasSkill = skills.some(s => s.includes(target));
                const job = (agent.jobTitle || '').toLowerCase();
                const matchesJob = job.includes(target);

                if (!hasSkill && !matchesJob) continue;
            }

            // 3. Availability Check (Reuse private logic)
            const isAvailable = await this.checkAvailability(tenantId, agent.id, start, end);
            if (!isAvailable) continue;

            // 4. Daily Rest Check
            const respectsDailyRest = await this.checkDailyRest(tenantId, agent.id, start);
            if (!respectsDailyRest) continue;

            // 5. Weekly Hours Check
            const currentWeeklyHours = await this.planningService.getWeeklyHours(tenantId, agent.id, start);
            // Rough check: if they have < 45h
            if (currentWeeklyHours >= this.localeRules.getWeeklyWorkLimit()) continue;

            availableAgents.push(agent);
        }

        return availableAgents;
    }

    private async checkDailyRest(tenantId: string, agentId: number, start: Date): Promise<boolean> {
        // Find the latest shift ending before 'start'
        const lastShift = await this.shiftRepository.findOne({
            where: {
                tenantId: tenantId || 'DEFAULT_TENANT',
                agent: { id: agentId },
                end: LessThanOrEqual(start)
            },
            order: { end: 'DESC' }
        });

        if (!lastShift) return true; // No previous shift

        const restHours = (start.getTime() - lastShift.end.getTime()) / (1000 * 60 * 60);
        return restHours >= this.localeRules.getDailyRestHours();
    }
}
