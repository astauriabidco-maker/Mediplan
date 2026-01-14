import api from './axios';
import { Agent } from './agents.api';

export interface Competency {
    id: number;
    name: string;
    category: string;
}

export interface AgentCompetency {
    id: number;
    level: number;
    expirationDate: string;
    competency: Competency;
}

export interface MatrixData {
    agents: (Agent & { agentCompetencies: AgentCompetency[] })[];
    competencies: Competency[];
}

export const fetchCompetenciesMatrix = async (): Promise<MatrixData> => {
    const response = await api.get('/api/competencies/matrix');
    return response.data;
};

export const createCompetency = async (name: string, category: string): Promise<Competency> => {
    const response = await api.post('/api/competencies', { name, category });
    return response.data;
};

export const updateAgentCompetency = async (agentId: number, competencyId: number, level: number, expirationDate?: string): Promise<any> => {
    const response = await api.post('/api/competencies/agent', { agentId, competencyId, level, expirationDate });
    return response.data;
};
