import axios from './axios';

export interface Shift {
    id: string;
    agentName: string;
    start: Date;
    end: Date;
    type: 'WORK' | 'REST';
    status: 'VALIDATED' | 'PENDING' | 'CONFLICT';
}

export const fetchShifts = async (startDate: Date, endDate: Date): Promise<Shift[]> => {
    try {
        console.log(`Fetching shifts from ${startDate} to ${endDate}`);
        const response = await axios.get('/api/planning/shifts', {
            params: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }
        });

        // Transform dates strings to Date objects
        return response.data.map((s: any) => ({
            id: s.id,
            agentName: s.agent?.nom || 'Inconnu',
            start: new Date(s.start),
            end: new Date(s.end),
            type: 'WORK', // Default, backend should provide
            status: s.status,
            agent: s.agent // Keep full agent if needed
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
