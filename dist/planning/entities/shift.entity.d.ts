import { Agent } from '../../agents/entities/agent.entity';
import { Facility } from '../../agents/entities/facility.entity';
export declare enum ShiftType {
    WORK = "WORK",
    GARDE = "GARDE",
    ASTREINTE = "ASTREINTE"
}
export declare class Shift {
    id: number;
    start: Date;
    end: Date;
    postId: string;
    type: ShiftType;
    status: string;
    isSwapRequested: boolean;
    tenantId: string;
    facilityId: number;
    facility: Facility;
    agent: Agent;
}
