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
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { ShiftProposal, ProposalType, ProposalStatus } from './entities/shift-proposal.entity';
import { SettingsService } from '../settings/settings.service';

export interface ShiftNeed {
    start: Date;
    end: Date;
    postId: string; // e.g., 'MEDECIN_GARDE'
    count: number; // Number of agents needed
    requiredSkills?: string[];
    facilityId?: number; // Added reference
    serviceId?: number; // Service hierarchy context
    serviceName?: string;
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
        @InjectRepository(HospitalService)
        private serviceRepository: Repository<HospitalService>,
        @InjectRepository(ShiftProposal)
        private proposalRepository: Repository<ShiftProposal>,
        @Inject(LOCALE_RULES)
        private localeRules: ILocaleRules,
        private planningService: PlanningService, // To reuse getWeeklyHours
        private auditService: AuditService,
        private settingsService: SettingsService,
    ) { }

    async generateSmartSchedule(tenantId: string, startDate: Date, endDate: Date): Promise<Shift[]> {
        const needs: ShiftNeed[] = [];
        
        // 1. Get dynamic ratios from Settings
        const ratioDayStr = await this.settingsService.getSetting(tenantId, null, 'planning.beds_per_nurse_day') || '10';
        const ratioNightStr = await this.settingsService.getSetting(tenantId, null, 'planning.beds_per_nurse_night') || '15';
        const ratioDay = parseInt(ratioDayStr as string, 10) || 10;
        const ratioNight = parseInt(ratioNightStr as string, 10) || 15;

        // 2. Fetch all active services
        const services = await this.serviceRepository.find({
            where: { tenantId: tenantId || 'DEFAULT_TENANT', isActive: true },
            relations: ['facility']
        });

        const current = new Date(startDate);
        while (current <= endDate) {
            // Define Day and Night slots
            const dayStart = new Date(current);
            dayStart.setHours(7, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(19, 0, 0, 0);

            const nightStart = new Date(current);
            nightStart.setHours(19, 0, 0, 0);
            const nightEnd = new Date(current);
            nightEnd.setDate(nightEnd.getDate() + 1); // Next day
            nightEnd.setHours(7, 0, 0, 0);

            for (const service of services) {
                const capacity = service.bedCapacity || 0;
                // Calcul Infirmier Jour
                const countDayNurses = Math.max(1, Math.ceil(capacity / ratioDay));
                needs.push({
                    start: dayStart,
                    end: dayEnd,
                    postId: `[${service.name}] Infirmier Jour`,
                    count: countDayNurses,
                    facilityId: service.facility?.id,
                    serviceId: service.id,
                    serviceName: service.name,
                    requiredSkills: ['Infirmier']
                });

                // Calcul Médecin Jour (1 médecin pour 20 lits minimum 1)
                const countDayDoctors = Math.max(1, Math.ceil(capacity / 20));
                needs.push({
                    start: dayStart,
                    end: dayEnd,
                    postId: `[${service.name}] Médecin Garde`,
                    count: countDayDoctors,
                    facilityId: service.facility?.id,
                    serviceId: service.id,
                    serviceName: service.name,
                    requiredSkills: ['Médecin']
                });

                // Calcul Nuit (seulement si is24x7 = true)
                if (service.is24x7) {
                    const countNightNurses = Math.max(1, Math.ceil(capacity / ratioNight));
                    needs.push({
                        start: nightStart,
                        end: nightEnd,
                        postId: `[${service.name}] Infirmier Nuit`,
                        count: countNightNurses,
                        facilityId: service.facility?.id,
                        serviceId: service.id,
                        serviceName: service.name,
                        requiredSkills: ['Infirmier']
                    });

                    // Optionnel : 1 Médecin / Interne de Garde Nuit par service H24
                    needs.push({
                        start: nightStart,
                        end: nightEnd,
                        postId: `[${service.name}] Médecin Nuit`,
                        count: 1, // On laisse un standard de 1 garde
                        facilityId: service.facility?.id,
                        serviceId: service.id,
                        serviceName: service.name,
                        requiredSkills: ['Médecin'] // Compétence exigée ou par défaut 'Médecin'
                    });
                }
            }

            current.setDate(current.getDate() + 1);
        }

        return this.generateSchedule(tenantId, startDate, endDate, needs);
    }

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
                    const targetSkills = need.requiredSkills.map(s => s.toLowerCase());
                    const agentSkills = agent.agentCompetencies?.map(ac => ac.competency.name.toLowerCase()) || [];
                    const job = (agent.jobTitle || '').toLowerCase();
                    const dept = (agent.department || '').toLowerCase();

                    // Soft Match: If required skill matches job title or explicitly defined skills
                    matchesRole = targetSkills.every(skill => 
                        agentSkills.some(as => as.includes(skill)) || 
                        job.includes(skill) || 
                        dept.includes(skill) ||
                        // Soft mapping Docteur <=> Médecin
                        (skill === 'médecin' && job.includes('docteur')) ||
                        (skill === 'docteur' && job.includes('médecin'))
                    );
                } else if (need.postId) {
                    // Fallback fuzzy
                    const target = need.postId.toLowerCase();
                    const job = (agent.jobTitle || '').toLowerCase();
                    const dept = (agent.department || '').toLowerCase();
                    matchesRole = job.includes(target) || dept.includes(target);
                    if (!matchesRole && target.includes('medecin') && job.includes('docteur')) matchesRole = true;
                    if (!matchesRole && target.includes('infirmier') && job.includes('infirmier')) matchesRole = true;
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

                const facilityId = null; // Assuming macro for now, or from need.facilityId
                const weeklyLimit = await this.settingsService.getSetting(tenantId, facilityId, 'planning.weekly_hours_limit') || 48;

                if (totalHours > weeklyLimit) {
                    continue;
                }


                // E. Scoring Engine (0-100)
                const score = await this.calculateAgentScore(tenantId, agent, need, currentWeeklyHours + pendingHours);

                eligibleAgents.push({ agent, totalHours, score });
            }

            // 2b. Sort candidates by Score (Highest first)
            eligibleAgents.sort((a, b) => b.score - a.score);

            // 2c. Pick Candidates
            for (const candidate of eligibleAgents) {
                if (assignedCount >= need.count) break;

                const newShift = this.shiftRepository.create({
                    start: need.start,
                    end: need.end,
                    postId: need.postId,
                    status: 'PENDING', // Généré en Brouillon
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

    private async calculateAgentScore(tenantId: string, agent: Agent, need: ShiftNeed, currentHours: number): Promise<number> {
        let score = 0;

        // 1. Equity (40%) - Inverse of hours
        const weeklyLimit = await this.settingsService.getSetting(tenantId, null, 'planning.weekly_hours_limit') || 48;
        const hourFactor = Math.max(0, (weeklyLimit - currentHours) / weeklyLimit);
        score += hourFactor * 40;

        // 2. Proximity/Affinity (30%) - Massive boost for exact structural match
        if (need.serviceId && agent.hospitalServiceId === need.serviceId) {
            score += 40;
        } else if (agent.hospitalServiceId && need.postId.includes(agent.hospitalService?.name || '')) {
            score += 30;
        }

        // 3. Expertise (30%)
        // Fuzzy match on title or grade
        if (agent.jobTitle && need.postId.toLowerCase().includes(agent.jobTitle.toLowerCase())) {
            score += 30;
        }

        return Math.min(100, score);
    }

    async scanForProblems(tenantId: string): Promise<any[]> {
        const issues = [];
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // 1. Detect Understaffing
        const services = await this.serviceRepository.find({ where: { tenantId, isActive: true } });
        for (const service of services) {
            if (!service.minAgents) continue;

            const shifts = await this.shiftRepository.createQueryBuilder('shift')
                .leftJoin('shift.agent', 'agent')
                .where('shift.tenantId = :tenantId', { tenantId })
                .andWhere('agent.hospitalServiceId = :serviceId', { serviceId: service.id })
                .andWhere('shift.start >= :now', { now })
                .andWhere('shift.start <= :nextWeek', { nextWeek })
                .getMany();

            // Group by day or slot (Simplified: check if any period has < minAgents)
            // For MVP: if total shifts in a day < minAgents * slots
            // Better: find specific gaps. For now, let's just flag the service.
            if (shifts.length < service.minAgents) {
                issues.push({
                    type: 'UNDERSTAFFING',
                    serviceId: service.id,
                    serviceName: service.name,
                    severity: 'HIGH',
                    message: `Le service ${service.name} est en sous-effectif critique (Min: ${service.minAgents}).`
                });
            }
        }

        // 2. Detect Conflicts
        const conflicts = await this.shiftRepository.query(`
            SELECT s1.id as id1, s2.id as id2, s1.agentId
            FROM shift s1
            JOIN shift s2 ON s1.agentId = s2.agentId AND s1.id < s2.id
            WHERE s1.tenantId = ? AND s1.start < s2.end AND s1.end > s2.start
        `, [tenantId]);

        for (const conflict of conflicts) {
            issues.push({
                type: 'CONFLICT',
                shiftId: conflict.id1,
                agentId: conflict.agentId,
                severity: 'CRITICAL',
                message: `Double garde détectée pour l'agent #${conflict.agentId}.`
            });
            
            // Generate resolution proposal if not already exists
            await this.generateResolutionProposal(tenantId, conflict.id1);
        }

        return issues;
    }

    private async generateResolutionProposal(tenantId: string, shiftId: number) {
        const shift = await this.shiftRepository.findOne({ where: { id: shiftId }, relations: ['agent'] });
        if (!shift) return;

        // Find alternatives
        const candidates = await this.findReplacements(tenantId, shift.start, shift.end, shift.postId);
        if (candidates.length > 0) {
            // Pick the best (scored) candidate
            const best = candidates[0]; // findReplacements already filters and scores roughly
            
            const existing = await this.proposalRepository.findOne({ where: { shiftId, suggestedAgentId: best.id, status: ProposalStatus.PENDING } });
            if (!existing) {
                await this.proposalRepository.save(this.proposalRepository.create({
                    tenantId,
                    shiftId: shift.id,
                    originalAgentId: shift.agent?.id,
                    suggestedAgentId: best.id,
                    type: ProposalType.REPLACEMENT,
                    reason: `Résolution automatique de conflit : Remplacer par ${best.nom} (Score Élevé)`,
                    score: 85 // Mock score
                }));
            }
        }
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
            const weeklyLimit = await this.settingsService.getSetting(tenantId, null, 'planning.weekly_hours_limit') || 48;
            // Rough check: if they have < 45h (or weeklyLimit)
            if (currentWeeklyHours >= weeklyLimit) continue;

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
        const minRestHours = await this.settingsService.getSetting(tenantId, null, 'planning.daily_rest_hours') || 11;
        return restHours >= minRestHours;
    }
}
