import axios from 'axios';
import { Agent } from './agents.api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    const token = localStorage.getItem('token');
    
    // Default mock data to avoid breaking the UI for the moment if the backend route is still building
    const defaultData: QvtDashboardData = {
        globalScore: 0,
        metrics: { totalNights: 0, totalLongShifts: 0 },
        agents: []
    };

    if (!token) return defaultData;

    try {
        const response = await axios.get(`${API_URL}/api/qvt/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { facilityId }
        });
        return response.data;
    } catch (error) {
        console.error('Erreur analytique QVT', error);
        return defaultData;
    }
};
