import { Agent } from '../../agents/entities/agent.entity';
export declare enum LeaveType {
    CONGE_ANNUEL = "CONGE_ANNUEL",
    MALADIE = "MALADIE",
    RECUPERATION = "RECUPERATION",
    ABSENCE_INJUSTIFIEE = "ABSENCE_INJUSTIFIEE",
    AUTRE = "AUTRE"
}
export declare enum LeaveStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class Leave {
    id: number;
    start: Date;
    end: Date;
    type: LeaveType;
    status: LeaveStatus;
    reason: string;
    tenantId: string;
    agent: Agent;
    approvedBy: Agent;
    rejectionReason: string;
}
