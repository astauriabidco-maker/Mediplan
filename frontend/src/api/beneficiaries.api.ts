import api from './axios';

export interface Beneficiary {
    id: number;
    agentId: number;
    firstName: string;
    lastName: string;
    relationship: 'CONJOINT' | 'ENFANT' | 'PARENT' | 'TUTEUR' | 'AUTRE';
    dateOfBirth?: string;
    gender?: string;
    idCardNumber?: string;
    photoUrl?: string;
    proofDocumentUrl?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    tenantId: string;
    createdAt: string;
}

export const fetchBeneficiaries = async (agentId: number): Promise<Beneficiary[]> => {
    const response = await api.get(`/api/beneficiaries/agent/${agentId}`);
    return response.data;
};

export const createBeneficiary = async (data: Partial<Beneficiary>): Promise<Beneficiary> => {
    const response = await api.post('/api/beneficiaries', data);
    return response.data;
};

export const updateBeneficiary = async (id: number, data: Partial<Beneficiary>): Promise<Beneficiary> => {
    const response = await api.patch(`/api/beneficiaries/${id}`, data);
    return response.data;
};

export const deleteBeneficiary = async (id: number): Promise<void> => {
    await api.delete(`/api/beneficiaries/${id}`);
};
