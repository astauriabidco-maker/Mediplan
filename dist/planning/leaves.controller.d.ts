import { LeavesService } from './leaves.service';
import { LeaveStatus, LeaveType } from './entities/leave.entity';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
export declare class LeavesController {
    private readonly leavesService;
    constructor(leavesService: LeavesService);
    requestLeave(req: AuthenticatedRequest, body: {
        start: string;
        end: string;
        type: LeaveType;
        reason: string;
        agentId?: number;
    }): Promise<import("./entities/leave.entity").Leave>;
    getMyBalances(req: AuthenticatedRequest, year?: string): Promise<import("./entities/leave-balance.entity").LeaveBalance[]>;
    getMyLeaves(req: AuthenticatedRequest): Promise<import("./entities/leave.entity").Leave[]>;
    getTeamRequests(req: AuthenticatedRequest): Promise<import("./entities/leave.entity").Leave[]>;
    validateLeave(req: AuthenticatedRequest, id: string, body: {
        status: LeaveStatus.APPROVED | LeaveStatus.REJECTED;
        rejectionReason?: string;
    }): Promise<import("./entities/leave.entity").Leave>;
}
