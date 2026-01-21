import api from './axios';

export interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
    isSystem: boolean;
}

export const fetchRoles = async (): Promise<Role[]> => {
    const response = await api.get('/api/roles');
    return response.data;
};

export const createRole = async (data: Partial<Role>): Promise<Role> => {
    const response = await api.post('/api/roles', data);
    return response.data;
};

export const updateRole = async (id: number, data: Partial<Role>): Promise<Role> => {
    const response = await api.patch(`/api/roles/${id}`, data);
    return response.data;
};

export const deleteRole = async (id: number): Promise<void> => {
    await api.delete(`/api/roles/${id}`);
};

export const seedRoles = async (): Promise<void> => {
    await api.post('/api/roles/seed');
};
