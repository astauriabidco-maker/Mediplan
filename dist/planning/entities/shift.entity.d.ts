import { Agent } from '../../agents/entities/agent.entity';
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
    tenantId: string;
    agent: Agent;
}
