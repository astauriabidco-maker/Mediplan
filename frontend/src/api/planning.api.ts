import axios from './axios';
import {
    failManagerActionTrace,
    finishManagerActionTrace,
    startManagerActionTrace,
} from '../lib/observability';

export type ShiftType = 'WORK' | 'GARDE' | 'ASTREINTE';
export type ComplianceSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type CorrectionActionCode =
    | 'REASSIGN_SHIFT'
    | 'REQUEST_REPLACEMENT'
    | 'APPROVE_EXCEPTION'
    | 'REVALIDATE_SHIFT'
    | 'RESOLVE_ALERT';

export interface Shift {
    id: string;
    agentName: string;
    start: Date;
    end: Date;
    type: ShiftType;
    status: 'VALIDATED' | 'PENDING' | 'CONFLICT' | 'PLANNED';
    agent?: any;
    isSwapRequested?: boolean;
}

export interface PublishPlanningPeriod {
    start: string;
    end: string;
}

export interface PublishPlanningIssue {
    shiftId: number;
    agentId?: number;
    blockingReasons?: string[];
    warnings?: string[];
    metadata?: Record<string, any>;
}

export interface PublishPlanningReport {
    start: string;
    end: string;
    publishable: boolean;
    totalPending: number;
    validatedShiftIds: number[];
    violations: PublishPlanningIssue[];
    warnings: PublishPlanningIssue[];
    recommendations: string[];
}

export interface PublishPlanningPreview {
    publishable: boolean;
    report: PublishPlanningReport;
}

export interface PublishPlanningResult {
    message: string;
    affected: number;
    report: PublishPlanningReport;
}

export interface PlanningTimelineFilters {
    from?: string;
    to?: string;
    limit?: number;
    agentId?: number;
    shiftId?: number;
}

export interface PlanningTimelineItem {
    id: number;
    timestamp: string;
    actorId: number;
    action: string;
    entity: {
        type: string;
        id?: string;
    };
    label: string;
    status?: string;
    severity?: string;
    details: Record<string, any>;
}

export interface PlanningTimeline {
    tenantId: string;
    period: {
        from?: string;
        to?: string;
    };
    filters: {
        agentId?: number;
        shiftId?: number;
    };
    total: number;
    items: PlanningTimelineItem[];
}

export interface CorrectionAction {
    code: CorrectionActionCode;
    label: string;
    description: string;
    permissions: string[];
    method: 'POST' | 'PATCH';
    endpoint: string;
    body?: Record<string, { type: string; required?: boolean }>;
}

export interface CorrectionGuidance {
    tenantId: string;
    problem: {
        type: 'SHIFT' | 'ALERT';
        id: number;
        title: string;
        severity?: ComplianceSeverity;
        agentId?: number;
        shiftId?: number;
        alertId?: number;
        status?: string;
        metadata?: unknown;
    };
    reasons: string[];
    validation?: {
        isValid: boolean;
        blockingReasons: string[];
        warnings: string[];
        metadata?: Record<string, unknown>;
    };
    availableActions: CorrectionAction[];
}

export interface ManagerActionPayload {
    agentId?: number;
    reason?: string;
}

const normalizePlanningEndpoint = (endpoint: string): string => {
    if (endpoint.startsWith('/api/')) return endpoint;
    if (endpoint.startsWith('/planning/')) return `/api${endpoint}`;
    return endpoint;
};

const extractManagerActionTarget = (endpoint: string) => {
    const shiftMatch = endpoint.match(/\/shifts\/([^/]+)/);
    if (shiftMatch) {
        return { targetType: 'SHIFT' as const, targetId: shiftMatch[1] };
    }
    const alertMatch = endpoint.match(/\/alerts\/([^/]+)/);
    if (alertMatch) {
        return { targetType: 'ALERT' as const, targetId: alertMatch[1] };
    }
    return {};
};

export const fetchShiftCorrectionGuidance = async (shiftId: string | number): Promise<CorrectionGuidance> => {
    const response = await axios.get(`/api/planning/shifts/${shiftId}/correction-guidance`);
    return response.data;
};

export const fetchAlertCorrectionGuidance = async (alertId: string | number): Promise<CorrectionGuidance> => {
    const response = await axios.get(`/api/planning/alerts/${alertId}/correction-guidance`);
    return response.data;
};

export const runManagerCorrectionAction = async (
    action: CorrectionAction,
    payload: ManagerActionPayload = {}
): Promise<any> => {
    const endpoint = normalizePlanningEndpoint(action.endpoint);
    const traceContext = {
        actionCode: action.code,
        endpoint,
        method: action.method,
        ...extractManagerActionTarget(endpoint),
    };
    const traceId = startManagerActionTrace(traceContext);

    try {
        if (action.method === 'PATCH') {
            const response = await axios.patch(endpoint, payload);
            finishManagerActionTrace(traceId, traceContext, response.data);
            return response.data;
        }

        const response = await axios.post(endpoint, payload);
        finishManagerActionTrace(traceId, traceContext, response.data);
        return response.data;
    } catch (error) {
        failManagerActionTrace(traceId, traceContext, error);
        throw error;
    }
};

export const fetchShifts = async (startDate: Date, endDate: Date, facilityId?: number, serviceId?: number): Promise<Shift[]> => {
    try {
        console.log(`Fetching shifts from ${startDate} to ${endDate} for facility ${facilityId || 'GHT'}`);
        const response = await axios.get('/api/planning/shifts', {
            params: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                facilityId: facilityId || undefined,
                serviceId: serviceId || undefined
            }
        });

        // Transform dates strings to Date objects
        return response.data.map((s: any) => ({
            id: s.id,
            agentName: s.agent?.nom || 'Inconnu',
            start: new Date(s.start),
            end: new Date(s.end),
            type: s.type || 'WORK', // Use explicit type from backend
            status: s.status,
            agent: s.agent,
            isSwapRequested: s.isSwapRequested
        }));

    } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
    }
};

export const generatePlanning = async (startDate: Date, endDate: Date): Promise<any> => {
    try {
        const response = await axios.post('/api/planning/generate', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });
        return response.data;
    } catch (error) {
        console.error('Error generating planning:', error);
        throw error;
    }
};

export const publishPlanning = async (startDate: Date, endDate: Date): Promise<any> => {
    try {
        const response = await axios.post('/api/planning/publish', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });
        return response.data;
    } catch (error) {
        console.error('Error publishing planning:', error);
        throw error;
    }
};

export const previewPlanningPublication = async (period: PublishPlanningPeriod): Promise<PublishPlanningPreview> => {
    const response = await axios.post('/api/planning/publish/preview', period);
    return response.data;
};

export const publishPlanningPeriod = async (period: PublishPlanningPeriod): Promise<PublishPlanningResult> => {
    const traceContext = {
        actionCode: 'PUBLISH_PLANNING',
        endpoint: '/api/planning/publish',
        method: 'POST',
        targetType: 'PLANNING' as const,
    };
    const traceId = startManagerActionTrace(traceContext);
    try {
        const response = await axios.post('/api/planning/publish', period);
        finishManagerActionTrace(traceId, traceContext, response.data);
        return response.data;
    } catch (error) {
        failManagerActionTrace(traceId, traceContext, error);
        throw error;
    }
};

export const fetchPlanningTimeline = async (filters: PlanningTimelineFilters): Promise<PlanningTimeline> => {
    const response = await axios.get('/api/planning/compliance/timeline', {
        params: filters
    });
    return response.data;
};
export const fetchLeaves = async (): Promise<any[]> => {
    const response = await axios.get('/api/planning/leaves');
    return response.data;
};

export const createLeave = async (data: { agentId: number, start: string, end: string, type: string, reason?: string }): Promise<any> => {
    const response = await axios.post('/api/planning/leaves', data);
    return response.data;
};

export const fetchReplacements = async (start: string, end: string, competency?: string): Promise<any[]> => {
    const response = await axios.get('/api/planning/replacements', {
        params: { start, end, competency }
    });
    return response.data;
};

export const assignReplacement = async (data: { agentId: number, start: string, end: string, postId: string }): Promise<any> => {
    const response = await axios.post('/api/planning/assign-replacement', data);
    return response.data;
};

export const updateShift = async (id: string, data: { start: string, end: string }): Promise<Shift> => {
    const response = await axios.patch(`/api/planning/shifts/${id}`, data);
    return response.data;
};

export const fetchShiftApplications = async (): Promise<any[]> => {
    const response = await axios.get('/api/planning/shift-applications');
    return response.data;
};

export const approveGhtApplication = async (id: string | number): Promise<any> => {
    const response = await axios.post(`/api/planning/shift-applications/${id}/approve`);
    return response.data;
};

export const rejectGhtApplication = async (id: string | number): Promise<any> => {
    const response = await axios.post(`/api/planning/shift-applications/${id}/reject`);
    return response.data;
};

// --- BOURSE D'ÉCHANGE DE GARDES ---

export const getAvailableSwaps = async (): Promise<Shift[]> => {
    const response = await axios.get('/api/planning/swaps/available');
    return response.data;
};

export const requestSwap = async (shiftId: number): Promise<any> => {
    const response = await axios.post(`/api/planning/shifts/${shiftId}/request-swap`);
    return response.data;
};

export const applyForSwap = async (shiftId: number): Promise<any> => {
    const response = await axios.post(`/api/planning/shifts/${shiftId}/apply-swap`);
    return response.data;
};
