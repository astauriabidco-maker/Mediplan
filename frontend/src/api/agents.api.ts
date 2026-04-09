import api from './axios';

export interface Agent {
    id: number;
    nom: string;
    email: string;
    matricule: string;
    telephone: string;
    tenantId: string;
    // Extended fields
    firstName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    address?: string;
    department?: string;
    jobTitle?: string;
    hiringDate?: string;
    contractType?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    // Hierarchy & Services
    managerId?: number;
    hospitalServiceId?: number;
    manager?: Agent;
    hospitalService?: { id: number, name: string };
    role?: string;
    roleId?: number;
    dbRole?: { id: number, name: string, permissions: string[] };
    // Identification RH Complète
    birthName?: string;
    nir?: string;
    maritalStatus?: string;
    childrenCount?: number;
    // Coordonnées Détaillées
    street?: string;
    zipCode?: string;
    city?: string;
    personalEmail?: string;
    // Détails Contractuels
    workTimePercentage?: number;
    grade?: string;
    step?: string;
    index?: string;
    contractEndDate?: string;
    // Informations Bancaires (select: false in backend, but can be part of interface)
    iban?: string;
    bic?: string;
    // Formation
    mainDiploma?: string;
    diplomaYear?: string;
    status?: 'INVITED' | 'ACTIVE' | 'DISABLED';
    // Localisation Africa
    niu?: string;
    cnpsNumber?: string;
    idType?: 'CNI' | 'PASSPORT' | 'ATTESTATION' | 'RESIDENCE_PERMIT';
    idNumber?: string;
    idExpiryDate?: string;
    mobileMoneyProvider?: 'ORANGE_MONEY' | 'MTN_MOMO' | 'WAVE' | 'MOOV_MONEY' | 'AIRTEL_MONEY' | 'TELMA_MONEY';
    mobileMoneyNumber?: string;
    isWhatsAppCompatible?: boolean;
}

export const fetchAgents = async (): Promise<Agent[]> => {
    const response = await api.get('/api/agents');
    return response.data;
};

export const createAgent = async (data: Partial<Agent>): Promise<Agent> => {
    const response = await api.post('/api/agents', data);
    return response.data;
};

export const deleteAgent = async (id: number): Promise<void> => {
    await api.delete(`/api/agents/${id}`);
};

/**
 * Fetches the current agent + their direct reports (for manager leave requests)
 */
export const fetchMyTeam = async (): Promise<Agent[]> => {
    const response = await api.get('/api/agents/my-team');
    return response.data;
};

export const updateAgent = async (id: number, data: Partial<Agent>): Promise<Agent> => {
    const response = await api.patch(`/api/agents/${id}`, data);
    return response.data;
};

// --- HEALTH RECORDS ---

export interface HealthRecord {
    id: number;
    agentId: number;
    type: string;
    title: string;
    datePerformed: string;
    expirationDate?: string | null;
    isMandatory: boolean;
    status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
    documentUrl?: string;
    notes?: string;
}

export const getHealthRecords = async (agentId: number): Promise<HealthRecord[]> => {
    const response = await api.get(`/api/agents/${agentId}/health-records`);
    return response.data;
};

export const addHealthRecord = async (agentId: number, data: Partial<HealthRecord>): Promise<HealthRecord> => {
    const response = await api.post(`/api/agents/${agentId}/health-records`, data);
    return response.data;
};

export const deleteHealthRecord = async (recordId: number): Promise<any> => {
    const response = await api.delete(`/api/agents/health-records/${recordId}`);
    return response.data;
};

export const inviteUser = async (data: { email: string, roleId: number, tenantId?: string }): Promise<Agent> => {
    const response = await api.post('/auth/invite', data);
    return response.data;
};
