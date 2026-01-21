import api from './axios';
import { Grade } from './grades.api';
import { HospitalService } from './hospital-services.api';

export interface WorkPolicy {
    id: number;
    hospitalServiceId: number | null;
    gradeId: number | null;
    restHoursAfterGuard: number;
    maxGuardDuration: number;
    onCallCompensationPercent: number;
    grade?: Grade;
    hospitalService?: HospitalService;
}

export const workPoliciesApi = {
    getAll: async (): Promise<WorkPolicy[]> => {
        const response = await api.get('/api/work-policies');
        return response.data;
    },

    create: async (data: Partial<WorkPolicy>): Promise<WorkPolicy> => {
        const response = await api.post('/api/work-policies', data);
        return response.data;
    },

    update: async (id: number, data: Partial<WorkPolicy>): Promise<WorkPolicy> => {
        const response = await api.put(`/api/work-policies/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/api/work-policies/${id}`);
    }
};
