import api from './axios';
import { Agent } from './agents.api';

export interface QvtAgentAnalysis {
    agent: Agent;
    score: number;
    metrics: {
        nbNights: number;
        nbLongShifts: number;
        hoursRest: number;
    };
    alert: boolean;
}

export interface QvtDashboardData {
    globalScore: number;
    metrics: {
        totalNights: number;
        totalLongShifts: number;
    };
    agents: QvtAgentAnalysis[];
}

export const fetchQvtDashboard = async (facilityId?: number): Promise<QvtDashboardData> => {
    try {
        const response = await api.get('/api/qvt/dashboard', {
            params: { facilityId }
        });
        return response.data;
    } catch (error) {
        console.error('Erreur analytique QVT', error);
        return {
            globalScore: 0,
            metrics: { totalNights: 0, totalLongShifts: 0 },
            agents: []
        };
    }
};
