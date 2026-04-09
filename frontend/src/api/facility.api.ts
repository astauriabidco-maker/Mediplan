import api from './axios';

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
        const response = await api.get<Facility[]>('/api/facilities');
        return response.data;
    },

    create: async (data: Partial<Facility>) => {
        const response = await api.post<Facility>('/api/facilities', data);
        return response.data;
    },

    update: async (id: number, data: Partial<Facility>) => {
        const response = await api.patch<Facility>(`/api/facilities/${id}`, data);
        return response.data;
    },

    remove: async (id: number) => {
        await api.delete(`/api/facilities/${id}`);
    }
};
