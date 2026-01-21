import api from './axios';

export interface Grade {
    id: number;
    name: string;
    code: string;
    level: number;
    tenantId: string;
}

export const gradesApi = {
    getAll: async (): Promise<Grade[]> => {
        const response = await api.get('/api/grades');
        return response.data;
    },

    create: async (data: Partial<Grade>): Promise<Grade> => {
        const response = await api.post('/api/grades', data);
        return response.data;
    },

    update: async (id: number, data: Partial<Grade>): Promise<Grade> => {
        const response = await api.put(`/api/grades/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/api/grades/${id}`);
    }
};
