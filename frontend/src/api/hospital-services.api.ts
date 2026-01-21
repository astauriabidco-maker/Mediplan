import api from './axios';

export interface HospitalService {
    id: number;
    name: string;
    code: string;
    description: string;
    level: number;
    parentServiceId?: number;
    parentService?: HospitalService;
    subServices?: HospitalService[];
    chiefId?: number;
    deputyChiefId?: number;
    majorId?: number;
    nursingManagerId?: number;
    chief?: { id: number; nom: string };
    deputyChief?: { id: number; nom: string };
    major?: { id: number; nom: string };
    nursingManager?: { id: number; nom: string };
    agents?: Array<{ id: number; nom: string }>;
    maxAgents?: number;
    minAgents?: number;
    isActive: boolean;
}

export const fetchHospitalServices = async (): Promise<HospitalService[]> => {
    const { data } = await api.get('/api/hospital-services');
    return data;
};

export const fetchHospitalServicesTree = async (): Promise<HospitalService[]> => {
    const { data } = await api.get('/api/hospital-services/tree');
    return data;
};

export const fetchHospitalServiceHierarchy = async (id: number): Promise<HospitalService> => {
    const { data } = await api.get(`/api/hospital-services/${id}/hierarchy`);
    return data;
};

export const createHospitalService = async (service: Partial<HospitalService>): Promise<HospitalService> => {
    const { data } = await api.post('/api/hospital-services', service);
    return data;
};

export const createSubService = async (parentId: number, service: Partial<HospitalService>): Promise<HospitalService> => {
    const { data } = await api.post(`/api/hospital-services/${parentId}/sub-service`, service);
    return data;
};

export const updateHospitalService = async (id: number, service: Partial<HospitalService>): Promise<HospitalService> => {
    const { data } = await api.put(`/api/hospital-services/${id}`, service);
    return data;
};

export const assignResponsible = async (
    serviceId: number,
    role: 'chief' | 'deputyChief' | 'major' | 'nursingManager',
    agentId: number | null
): Promise<HospitalService> => {
    const { data } = await api.put(`/api/hospital-services/${serviceId}/assign-responsible`, { role, agentId });
    return data;
};

export const deleteHospitalService = async (id: number): Promise<void> => {
    await api.delete(`/api/hospital-services/${id}`);
};

export const fetchHospitalServicesStats = async (): Promise<{
    totalServices: number;
    totalAgents: number;
    services: Array<{ id: number; name: string; code: string; agentCount: number; level: number; hasChief: boolean }>;
}> => {
    const { data } = await api.get('/api/hospital-services/stats');
    return data;
};

export const hospitalServicesApi = {
    getAll: fetchHospitalServices,
    getTree: fetchHospitalServicesTree,
    getHierarchy: fetchHospitalServiceHierarchy,
    create: createHospitalService,
    createSubService: createSubService,
    update: updateHospitalService,
    delete: deleteHospitalService,
    assignResponsible: assignResponsible,
    getStats: fetchHospitalServicesStats
};
