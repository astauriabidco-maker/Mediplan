import api from './axios';

export const fetchDocuments = async (agentId?: number): Promise<any[]> => {
    const response = await api.get('/api/documents', {
        params: agentId ? { agentId } : {}
    });
    return response.data;
};

export const requestSignature = async (docId: number, agentId: number): Promise<void> => {
    await api.post(`/api/documents/${docId}/request-signature`, { agentId });
};

export const signDocument = async (docId: number, agentId: number, otp: string): Promise<any> => {
    const response = await api.post(`/api/documents/${docId}/sign`, { agentId, otp });
    return response.data;
};

export const uploadDocument = async (file: File, title: string, type: string, agentId: number): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('type', type);
    formData.append('agentId', agentId.toString());

    const response = await api.post('/api/documents/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const generateEmploymentContract = async (agentId: number): Promise<any> => {
    const response = await api.post('/api/documents/generate-contract', { agentId });
    return response.data;
};
