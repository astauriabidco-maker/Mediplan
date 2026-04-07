import axios from './axios';

export interface Setting {
    id?: number;
    key: string;
    value: string;
    type: 'number' | 'string' | 'boolean' | 'json';
    description?: string;
    facilityId?: number | null;
    tenantId?: string;
    isDefault?: boolean;
}

export const fetchSettings = async (facilityId?: number): Promise<Setting[]> => {
    const params = facilityId ? { facilityId } : {};
    const response = await axios.get('/api/settings', { params });
    return response.data;
};

export const updateSetting = async (setting: { key: string, value: string, type: string, description?: string, facilityId?: number }): Promise<Setting> => {
    const response = await axios.post('/api/settings', setting);
    return response.data;
};
