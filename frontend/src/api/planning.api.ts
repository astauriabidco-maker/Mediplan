import axios from './axios';

export type ShiftType = 'WORK' | 'GARDE' | 'ASTREINTE';

export interface Shift {
    id: string;
    agentName: string;
    start: Date;
    end: Date;
    type: ShiftType;
    status: 'VALIDATED' | 'PENDING' | 'CONFLICT' | 'PLANNED';
    agent?: any;
    isSwapRequested?: boolean;
}

export const fetchShifts = async (startDate: Date, endDate: Date, facilityId?: number, serviceId?: number): Promise<Shift[]> => {
    try {
        console.log(`Fetching shifts from ${startDate} to ${endDate} for facility ${facilityId || 'GHT'}`);
        const response = await axios.get('/api/planning/shifts', {
            params: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                facilityId: facilityId || undefined,
                serviceId: serviceId || undefined
            }
        });

        // Transform dates strings to Date objects
        return response.data.map((s: any) => ({
            id: s.id,
            agentName: s.agent?.nom || 'Inconnu',
            start: new Date(s.start),
            end: new Date(s.end),
            type: s.type || 'WORK', // Use explicit type from backend
            status: s.status,
            agent: s.agent,
            isSwapRequested: s.isSwapRequested
        }));

    } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
    }
};

export const generatePlanning = async (startDate: Date, endDate: Date): Promise<any> => {
    try {
        const response = await axios.post('/api/planning/generate', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });
        return response.data;
    } catch (error) {
        console.error('Error generating planning:', error);
        throw error;
    }
};

export const publishPlanning = async (startDate: Date, endDate: Date): Promise<any> => {
    try {
        const response = await axios.post('/api/planning/publish', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });
        return response.data;
    } catch (error) {
        console.error('Error publishing planning:', error);
        throw error;
    }
};
export const fetchLeaves = async (): Promise<any[]> => {
    const response = await axios.get('/api/planning/leaves');
    return response.data;
};

export const createLeave = async (data: { agentId: number, start: string, end: string, type: string, reason?: string }): Promise<any> => {
    const response = await axios.post('/api/planning/leaves', data);
    return response.data;
};

export const fetchReplacements = async (start: string, end: string, competency?: string): Promise<any[]> => {
    const response = await axios.get('/api/planning/replacements', {
        params: { start, end, competency }
    });
    return response.data;
};

export const assignReplacement = async (data: { agentId: number, start: string, end: string, postId: string }): Promise<any> => {
    const response = await axios.post('/api/planning/assign-replacement', data);
    return response.data;
};

export const updateShift = async (id: string, data: { start: string, end: string }): Promise<Shift> => {
    const response = await axios.patch(`/api/planning/shifts/${id}`, data);
    return response.data;
};

export const fetchShiftApplications = async (): Promise<any[]> => {
    const response = await axios.get('/api/planning/shift-applications');
    return response.data;
};

export const approveGhtApplication = async (id: string | number): Promise<any> => {
    const response = await axios.post(`/api/planning/shift-applications/${id}/approve`);
    return response.data;
};

export const rejectGhtApplication = async (id: string | number): Promise<any> => {
    const response = await axios.post(`/api/planning/shift-applications/${id}/reject`);
    return response.data;
};

// --- BOURSE D'ÉCHANGE DE GARDES ---

export const getAvailableSwaps = async (): Promise<Shift[]> => {
    const response = await axios.get('/api/planning/swaps/available');
    return response.data;
};

export const requestSwap = async (shiftId: number): Promise<any> => {
    const response = await axios.post(`/api/planning/shifts/${shiftId}/request-swap`);
    return response.data;
};

export const applyForSwap = async (shiftId: number): Promise<any> => {
    const response = await axios.post(`/api/planning/shifts/${shiftId}/apply-swap`);
    return response.data;
};
