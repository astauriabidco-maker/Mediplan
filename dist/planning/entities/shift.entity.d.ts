import { Agent } from '../../agents/entities/agent.entity';
export declare class Shift {
    id: number;
    start: Date;
    end: Date;
    postId: string;
    status: string;
    tenantId: string;
    agent: Agent;
}
