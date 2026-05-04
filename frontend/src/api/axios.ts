import axios from 'axios';
import { useAuth } from '../store/useAuth';
import {
    createTraceId,
    logApiError,
} from '../lib/observability';

interface ObservedRequestConfig {
    metadata?: {
        traceId: string;
        startedAt: number;
    };
}

const setHeader = (
    config: { headers?: unknown },
    key: string,
    value: string,
): void => {
    const headers = config.headers;
    if (headers && typeof headers === 'object' && 'set' in headers) {
        (headers as { set: (name: string, value: string) => void }).set(key, value);
        return;
    }
    config.headers = {
        ...(headers as Record<string, string> | undefined),
        [key]: value,
    } as unknown;
};

const getHeader = (headers: unknown, key: string): string | undefined => {
    if (!headers || typeof headers !== 'object') return undefined;
    if ('get' in headers) {
        const value = (headers as { get: (name: string) => unknown }).get(key);
        return typeof value === 'string' ? value : undefined;
    }
    const match = Object.entries(headers as Record<string, unknown>).find(
        ([headerKey]) => headerKey.toLowerCase() === key.toLowerCase(),
    );
    return typeof match?.[1] === 'string' ? match[1] : undefined;
};

// Configure base URL if needed, but here we seem to use relative paths or /api proxy
const api = axios.create();

api.interceptors.request.use(
    (config) => {
        const { token, impersonatedTenantId } = useAuth.getState();
        const traceId = createTraceId();
        (config as ObservedRequestConfig).metadata = {
            traceId,
            startedAt: performance.now(),
        };
        setHeader(config, 'x-client-trace-id', traceId);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (impersonatedTenantId) {
            config.params = { ...config.params, tenantId: impersonatedTenantId };
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const config = error.config as (ObservedRequestConfig & {
            method?: string;
            url?: string;
        }) | undefined;
        const responseHeaders = error.response?.headers;
        logApiError(error, {
            method: config?.method?.toUpperCase(),
            url: config?.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            requestTraceId: config?.metadata?.traceId,
            auditCorrelationId:
                getHeader(responseHeaders, 'x-audit-id') ||
                getHeader(responseHeaders, 'x-request-id') ||
                getHeader(responseHeaders, 'x-correlation-id'),
            durationMs: config?.metadata
                ? Math.round(performance.now() - config.metadata.startedAt)
                : undefined,
        });
        if (error.response?.status === 401) {
            useAuth.getState().logout();
        }
        return Promise.reject(error);
    }
);

export default api;
