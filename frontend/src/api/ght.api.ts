import api from './axios';

export interface Ght {
    id: string;
    name: string;
    region: string;
    contactEmail: string;
    isActive: boolean;
    createdAt: string;
}

export const fetchGhts = async (): Promise<Ght[]> => {
    const response = await api.get('/api/ght');
    return response.data;
};

export const createGht = async (data: { name: string; region: string; contactEmail: string }): Promise<Ght> => {
    const response = await api.post('/api/ght', data);
    return response.data;
};

export const toggleGhtStatus = async (id: string): Promise<Ght> => {
    const response = await api.put(`/api/ght/${id}/toggle`);
    return response.data;
};
