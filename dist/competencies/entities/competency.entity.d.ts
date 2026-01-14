import { AgentCompetency } from './agent-competency.entity';
export declare class Competency {
    id: number;
    name: string;
    category: string;
    agentCompetencies: AgentCompetency[];
}
