import api from './axios';

export interface Agent {
    id: number;
    nom: string;
    email: string;
    matricule: string;
    telephone: string;
    tenantId: string;
    // Extended fields
    firstName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    address?: string;
    department?: string;
    jobTitle?: string;
    hiringDate?: string;
    contractType?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    // Hierarchy & Services
    managerId?: number;
    hospitalServiceId?: number;
    manager?: Agent;
    hospitalService?: { id: number, name: string };
}

export const fetchAgents = async (): Promise<Agent[]> => {
    const response = await api.get('/api/agents');
    return response.data;
};

export const createAgent = async (data: Partial<Agent>): Promise<Agent> => {
    const response = await api.post('/api/agents', data);
    return response.data;
};

export const deleteAgent = async (id: number): Promise<void> => {
    await api.delete(`/api/agents/${id}`);
};

/**
 * Fetches the current agent + their direct reports (for manager leave requests)
 */
export const fetchMyTeam = async (): Promise<Agent[]> => {
    const response = await api.get('/api/agents/my-team');
    return response.data;
};
