import { AgentCompetency } from './agent-competency.entity';
export declare enum CompetencyType {
    SKILL = "SKILL",
    LEGAL_CERTIFICATION = "LEGAL_CERTIFICATION",
    CACES = "CACES",
    OTHER = "OTHER"
}
export declare class Competency {
    id: number;
    name: string;
    category: string;
    type: CompetencyType;
    isMandatoryToWork: boolean;
    agentCompetencies: AgentCompetency[];
}
