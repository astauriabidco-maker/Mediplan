import api from './axios';

export interface AuditLog {
    id: number;
    timestamp: string;
    actorId: number;
    actor: {
        nom: string;
        prenom: string;
        jobTitle: string;
    } | null;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'VALIDATE' | 'REJECT' | 'AUTO_GENERATE';
    entityType:
        | 'SHIFT'
        | 'LEAVE'
        | 'PLANNING'
        | 'AGENT'
        | 'CONTRACT'
        | 'PAYROLL'
        | 'DOCUMENT'
        | 'HOSPITAL_SERVICE'
        | 'WORK_POLICY'
        | 'OPERATION_INCIDENT'
        | 'OPERATION_ALERT';
    entityId: string;
    details: unknown;
    tenantId?: string;
    chainSequence?: number | null;
    eventHash?: string | null;
}

export interface AuditLogFilters {
    tenantId?: string;
    actorId?: number;
    action?: AuditLog['action'];
    entityType?: AuditLog['entityType'];
    entityId?: string;
    detailAction?: string;
    from?: string;
    to?: string;
    limit?: number;
}

export const fetchAuditLogs = async (
    filters: AuditLogFilters = {},
): Promise<AuditLog[]> => {
    const response = await api.get<AuditLog[]>('/api/audit', {
        params: filters,
    });
    return response.data;
};
