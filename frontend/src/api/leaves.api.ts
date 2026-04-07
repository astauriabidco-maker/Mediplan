import api from './axios';

export enum LeaveType {
    CONGE_ANNUEL = 'CONGE_ANNUEL',
    MALADIE = 'MALADIE',
    RECUPERATION = 'RECUPERATION',
    ABSENCE_INJUSTIFIEE = 'ABSENCE_INJUSTIFIEE',
    AUTRE = 'AUTRE'
}

export enum LeaveStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export interface Leave {
    id: number;
    start: string;
    end: string;
    type: LeaveType;
    status: LeaveStatus;
    reason: string;
    rejectionReason?: string;
    aiRecommendation?: string;
    aiScore?: number;
    isAutoRejected?: boolean;
    agent: {
        id: number;
        firstName: string;
        lastName: string;
        hospitalService?: {
            id: string;
            name: string;
        }
    };
    approvedBy?: {
        id: number;
        firstName: string;
        lastName: string;
    }
}

export interface LeaveBalance {
    id: number;
    type: LeaveType;
    year: number;
    allowance: number;
    consumed: number;
    tenantId: string;
}

export const leavesApi = {
    requestLeave: async (data: { start: Date; end: Date; type: LeaveType; reason: string; agentId?: number }) => {
        const payload = {
            ...data,
            start: data.start.toISOString(),
            end: data.end.toISOString()
        };
        const response = await api.post<Leave>('/api/leaves/request', payload);
        return response.data;
    },

    getMyLeaves: async () => {
        const response = await api.get<Leave[]>('/api/leaves/my-leaves');
        return response.data;
    },

    getTeamRequests: async () => {
        const response = await api.get<Leave[]>('/api/leaves/team-requests');
        return response.data;
    },

    validateLeave: async (id: number, status: LeaveStatus.APPROVED | LeaveStatus.REJECTED, rejectionReason?: string) => {
        const response = await api.post<Leave>(`/api/leaves/${id}/validate`, { status, rejectionReason });
        return response.data;
    },

    getMyBalances: async (year?: number) => {
        const url = year ? `/api/leaves/balances?year=${year}` : '/api/leaves/balances';
        const response = await api.get<LeaveBalance[]>(url);
        return response.data;
    }
};
