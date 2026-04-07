import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Facility {
    id: number;
    tenantId: string;
    name: string;
    code?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    isActive: boolean;
}

export const facilityApi = {
    getAll: async () => {
        const token = localStorage.getItem('token');
        const response = await axios.get<Facility[]>(`${API_URL}/facilities`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    create: async (data: Partial<Facility>) => {
        const token = localStorage.getItem('token');
        const response = await axios.post<Facility>(`${API_URL}/facilities`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    update: async (id: number, data: Partial<Facility>) => {
        const token = localStorage.getItem('token');
        const response = await axios.patch<Facility>(`${API_URL}/facilities/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    remove: async (id: number) => {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/facilities/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};
