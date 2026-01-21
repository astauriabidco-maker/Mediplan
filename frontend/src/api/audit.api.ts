import api from './axios';

export interface AuditLog {
    id: number;
    timestamp: string;
    actorId: number;
    actor: {
        nom: string;
        prenom: string;
        jobTitle: string;
    };
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VALIDATE' | 'REJECT' | 'AUTO_GENERATE';
    entityType: 'SHIFT' | 'LEAVE' | 'PLANNING';
    entityId: string;
    details: any;
}

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    const response = await api.get<AuditLog[]>('/api/audit');
    return response.data;
};
