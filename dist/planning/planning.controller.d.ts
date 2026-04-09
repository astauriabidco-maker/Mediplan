import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { Agent } from '../agents/entities/agent.entity';
import { Repository } from 'typeorm';
import { AutoSchedulerService, ShiftNeed } from './auto-scheduler.service';
import { DocumentsService } from '../documents/documents.service';
import { Shift } from './entities/shift.entity';
import { Leave, LeaveType } from './entities/leave.entity';
export declare class PlanningController {
    private readonly planningService;
    private readonly optimizationService;
    private readonly autoSchedulerService;
    private readonly agentRepository;
    private readonly leaveRepository;
    private readonly shiftRepository;
    private readonly documentsService;
    constructor(planningService: PlanningService, optimizationService: OptimizationService, autoSchedulerService: AutoSchedulerService, agentRepository: Repository<Agent>, leaveRepository: Repository<Leave>, shiftRepository: Repository<Shift>, documentsService: DocumentsService);
    createLeave(req: any, body: {
        agentId: number;
        start: string;
        end: string;
        type: LeaveType;
        reason?: string;
    }): Promise<Leave>;
    getReplacements(req: any, start: string, end: string, competency: string): Promise<Agent[]>;
    getLeaves(req: any, queryTenantId?: string): Promise<Leave[]>;
    getShifts(req: any, start: string, end: string, facilityId?: string, serviceId?: string, queryTenantId?: string): Promise<Shift[]>;
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
    }): Promise<Shift[]>;
    generate(req: any, body: {
        start: string;
        end: string;
    }): Promise<Shift[]>;
    publish(req: any, body: {
        start: string;
        end: string;
    }): Promise<{
        message: string;
    }>;
    getShiftApplications(req: any): Promise<import("./entities/shift-application.entity").ShiftApplication[]>;
    approveGhtApplication(req: any, id: string): Promise<import("./entities/shift-application.entity").ShiftApplication>;
    rejectGhtApplication(req: any, id: string): Promise<import("./entities/shift-application.entity").ShiftApplication>;
    assignReplacement(req: any, data: {
        agentId: number;
        start: string;
        end: string;
        postId: string;
    }): Promise<Shift>;
    updateShift(req: any, id: string, data: {
        start: string;
        end: string;
    }): Promise<Shift>;
    generateContract(req: any, id: string): Promise<import("../documents/entities/document.entity").Document>;
}
