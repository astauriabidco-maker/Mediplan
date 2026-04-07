import { LeavesService } from './leaves.service';
import { LeaveStatus, LeaveType } from './entities/leave.entity';
export declare class LeavesController {
    private readonly leavesService;
    constructor(leavesService: LeavesService);
    requestLeave(req: any, body: {
        start: string;
        end: string;
        type: LeaveType;
        reason: string;
        agentId?: number;
    }): Promise<import("./entities/leave.entity").Leave>;
    getMyBalances(req: any, year?: string): Promise<import("./entities/leave-balance.entity").LeaveBalance[]>;
    getMyLeaves(req: any): Promise<import("./entities/leave.entity").Leave[]>;
    getTeamRequests(req: any): Promise<import("./entities/leave.entity").Leave[]>;
    validateLeave(req: any, id: string, body: {
        status: LeaveStatus.APPROVED | LeaveStatus.REJECTED;
        rejectionReason?: string;
    }): Promise<import("./entities/leave.entity").Leave>;
}
