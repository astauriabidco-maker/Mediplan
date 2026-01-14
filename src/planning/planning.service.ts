import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { Agent } from '../agents/entities/agent.entity';

@Injectable()
export class PlanningService {
    constructor(
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(Leave)
        private leaveRepository: Repository<Leave>,
        @Inject(LOCALE_RULES)
        private localeRules: ILocaleRules,
    ) { }

    async validateShift(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean> {
        // 1. Check Leaves
        const isAvailable = await this.checkLeaveAvailability(tenantId, agentId, start, end);
        if (!isAvailable) {
            return false;
        }

        // 2. Check Weekly Limit
        const weeklyLimit = this.localeRules.getWeeklyWorkLimit();
        const currentWeeklyHours = await this.getWeeklyHours(tenantId, agentId, start);
        const shiftDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (currentWeeklyHours + shiftDuration > weeklyLimit) {
            return false;
        }
        return true;
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

        return this.shiftRepository.save(shift);
    }
}
