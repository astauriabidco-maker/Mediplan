import api from './axios';

export interface AgentLeaveBalance {
    agentId: number;
    agentName: string;
    consumed: number;
    remaining: number;
}

export interface DashboardKPIs {
    occupancyRate: number;
    totalOvertimeHours: number;
    leaveBalances: AgentLeaveBalance[];
    period: {
        start: string;
        end: string;
    };
}

export const fetchDashboardKPIs = async (): Promise<DashboardKPIs> => {
    const response = await api.get('/api/ui/dashboard-kpis');
    return response.data;
};
