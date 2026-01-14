import { Repository } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
export declare class PlanningService {
    private shiftRepository;
    private leaveRepository;
    private localeRules;
    constructor(shiftRepository: Repository<Shift>, leaveRepository: Repository<Leave>, localeRules: ILocaleRules);
    validateShift(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean>;
    checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean>;
    private checkLeaveAvailability;
    getWeeklyHours(tenantId: string, agentId: number, date: Date): Promise<number>;
    getShifts(tenantId: string, start: Date, end: Date): Promise<Shift[]>;
    assignReplacement(tenantId: string, agentId: number, start: Date, end: Date, postId: string): Promise<Shift>;
}
