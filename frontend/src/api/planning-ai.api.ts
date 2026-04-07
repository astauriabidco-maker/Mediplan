import axios from './axios';

export interface PlanningIssue {
    type: 'UNDERSTAFFING' | 'CONFLICT';
    serviceId?: number;
    serviceName?: string;
    agentId?: number;
    shiftId?: number;
    severity: 'HIGH' | 'CRITICAL';
    message: string;
}

export interface ShiftProposal {
    id: number;
    type: 'REPLACEMENT' | 'STAFFING';
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    reason: string;
    score: number;
    shift: any;
    originalAgent?: any;
    suggestedAgent: any;
}

export const fetchPlanningProblems = async (): Promise<PlanningIssue[]> => {
    const response = await axios.get('/api/planning/ai/problems');
    return response.data;
};

export const fetchShiftProposals = async (): Promise<ShiftProposal[]> => {
    const response = await axios.get('/api/planning/ai/proposals');
    return response.data;
};

export const applyShiftProposal = async (id: number): Promise<any> => {
    const response = await axios.post(`/api/planning/ai/proposals/${id}/apply`);
    return response.data;
};

export const rejectShiftProposal = async (id: number): Promise<any> => {
    const response = await axios.post(`/api/planning/ai/proposals/${id}/reject`);
    return response.data;
};
