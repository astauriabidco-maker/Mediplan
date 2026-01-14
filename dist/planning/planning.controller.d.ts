import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { Agent } from '../agents/entities/agent.entity';
import { Repository } from 'typeorm';
import { AutoSchedulerService, ShiftNeed } from './auto-scheduler.service';
import { Leave, LeaveType } from './entities/leave.entity';
export declare class PlanningController {
    private readonly planningService;
    private readonly optimizationService;
    private readonly autoSchedulerService;
    private readonly agentRepository;
    private readonly leaveRepository;
    constructor(planningService: PlanningService, optimizationService: OptimizationService, autoSchedulerService: AutoSchedulerService, agentRepository: Repository<Agent>, leaveRepository: Repository<Leave>);
    createLeave(req: any, body: {
        agentId: number;
        start: string;
        end: string;
        type: LeaveType;
        reason?: string;
    }): Promise<Leave>;
    getReplacements(req: any, start: string, end: string, competency: string): Promise<Agent[]>;
    getLeaves(req: any): Promise<Leave[]>;
    getShifts(req: any, start: string, end: string): Promise<import("./entities/shift.entity").Shift[]>;
    validate(req: any, agentId: number, start: string, end: string): Promise<{
        isValid: boolean;
    }>;
    optimize(req: any, shifts: {
        id: string;
        start: string;
        end: string;
        requiredSkill: string;
    }[]): Promise<import("./optimization.service").OptimizationResult>;
    autoSchedule(req: any, body: {
        start: string;
        end: string;
        needs: ShiftNeed[];
    }): Promise<import("./entities/shift.entity").Shift[]>;
    generate(req: any, body: {
        start: string;
        end: string;
    }): Promise<import("./entities/shift.entity").Shift[]>;
    assignReplacement(body: {
        agentId: number;
        start: string;
        end: string;
        postId: string;
    }, req: any): Promise<import("./entities/shift.entity").Shift>;
}
