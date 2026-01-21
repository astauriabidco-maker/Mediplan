import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { Agent } from '../agents/entities/agent.entity';
import { WorkPolicy } from './entities/work-policy.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

@Injectable()
export class PlanningService {
    constructor(
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(Leave)
        private leaveRepository: Repository<Leave>,
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(WorkPolicy)
        private workPolicyRepository: Repository<WorkPolicy>,
        @Inject(LOCALE_RULES)
        private localeRules: ILocaleRules,
        private auditService: AuditService,
    ) { }

    async validateShift(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean> {
        // 0. Get Dynamic Constraints
        const constraints = await this.getConstraintsForAgent(tenantId, agentId);

        // 1. Check Leaves
        const isAvailable = await this.checkLeaveAvailability(tenantId, agentId, start, end);
        if (!isAvailable) {
            return false;
        }

        // 2. Check Weekly Limit (Global Rule for now, could be dynamic later)
        const weeklyLimit = this.localeRules.getWeeklyWorkLimit();
        const currentWeeklyHours = await this.getWeeklyHours(tenantId, agentId, start);
        const shiftDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (currentWeeklyHours + shiftDuration > weeklyLimit) {
            return false;
        }

        // 3. Dynamic Rules Check: Max Guard Duration
        if (shiftDuration > constraints.maxGuardDuration) {
            return false; // Exceeds specific max duration for this agent's grade/service
        }

        // 4. Dynamic Rules Check: Rest Hours After Guard
        // Check previous shift
        const previousShift = await this.shiftRepository.createQueryBuilder('shift')
            .where('shift.agentId = :agentId', { agentId })
            .andWhere('shift.end <= :start', { start })
            .orderBy('shift.end', 'DESC')
            .getOne();

        if (previousShift) {
            const restTime = (start.getTime() - previousShift.end.getTime()) / (1000 * 60 * 60);
            if (restTime < constraints.restHoursAfterGuard) {
                return false; // Not enough rest after previous shift
            }
        }

        return true;
    }

    private async getConstraintsForAgent(tenantId: string, agentId: number) {
        // Default values from LocaleRules or Hardcoded defaults
        const defaults = {
            restHoursAfterGuard: 24, // Standard default
            maxGuardDuration: 24,
            onCallCompensationPercent: 0,
        };

        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['hospitalService', 'grade']
        });

        if (!agent) return defaults;

        // Funnel Logic:
        // 1. Service + Grade
        // 2. Grade only
        // 3. Service only

        let policy: WorkPolicy | null = null;

        if (agent.hospitalServiceId && agent.gradeId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    hospitalServiceId: agent.hospitalServiceId,
                    gradeId: agent.gradeId
                }
            });
        }

        if (!policy && agent.gradeId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    gradeId: agent.gradeId,
                    hospitalServiceId: IsNull() // Explicitly null to avoid mixing with service rules
                }
            });
        }

        if (!policy && agent.hospitalServiceId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    hospitalServiceId: agent.hospitalServiceId,
                    gradeId: IsNull()
                }
            });
        }

        if (policy) {
            return {
                restHoursAfterGuard: policy.restHoursAfterGuard,
                maxGuardDuration: policy.maxGuardDuration,
                onCallCompensationPercent: policy.onCallCompensationPercent,
            };
        }

        return defaults;
    }

    // Helper to check overlapping APPROVED leaves (Public for Optimization)
    public async checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean> {
        return this.checkLeaveAvailability(tenantId, agentId, date, date);
    }

    // New helper to check overlapping APPROVED leaves
    private async checkLeaveAvailability(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean> {
        const count = await this.leaveRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status = :status', { status: 'APPROVED' }) // Hardcoded enum string to avoid import coupling issues if any
            .andWhere('leave.start < :end', { end })
            .andWhere('leave.end > :start', { start })
            .getCount();

        return count === 0;
    }

    public async getWeeklyHours(tenantId: string, agentId: number, date: Date): Promise<number> {
        // Basic calculation for the current week starting Monday
        const startOfWeek = new Date(date);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const shifts = await this.shiftRepository.find({
            where: {
                agent: { id: agentId },
                tenantId: tenantId, // Filter by tenant
                start: Between(startOfWeek, endOfWeek),
            },
        });

        return shifts.reduce((total, shift) => {
            const duration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
            return total + duration;
        }, 0);
    }

    async getShifts(tenantId: string, start: Date, end: Date): Promise<Shift[]> {
        // Using query builder for date filtering
        return this.shiftRepository.createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .where('shift.tenantId = :tenantId', { tenantId: tenantId || 'DEFAULT_TENANT' })
            .andWhere('shift.start >= :start', { start })
            .andWhere('shift.end <= :end', { end })
            .getMany();
    }

    async assignReplacement(tenantId: string, agentId: number, start: Date, end: Date, postId: string): Promise<Shift> {
        const isValid = await this.validateShift(tenantId, agentId, start, end);
        if (!isValid) {
            throw new Error('Agent cannot take this replacement (weekly hours limit).');
        }

        const shift = this.shiftRepository.create({
            tenantId,
            agent: { id: agentId } as any,
            start,
            end,
            postId,
            status: 'VALIDATED'
        });

        const savedShift = await this.shiftRepository.save(shift);

        await this.auditService.log(
            tenantId,
            agentId, // Actor is the agent for now, or should be requester? In context of Replacement, usually a manager. 
            // Controller pass req.user.id but assignReplacement doesn't take actorId.
            // I will update signature or assume requesterId is needed.
            AuditAction.CREATE,
            AuditEntityType.SHIFT,
            savedShift.id,
            { postId, start, end }
        );

        return savedShift;
    }
}
