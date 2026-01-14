import { Agent } from '../../agents/entities/agent.entity';
import { Competency } from './competency.entity';
export declare class AgentCompetency {
    id: number;
    level: number;
    expirationDate: Date;
    agent: Agent;
    competency: Competency;
}
