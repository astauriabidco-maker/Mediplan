export type ObservabilityLevel = 'info' | 'warn' | 'error';

export type ObservabilityEventType =
  | 'api_error'
  | 'manager_action_started'
  | 'manager_action_succeeded'
  | 'manager_action_failed'
  | 'ui_error';

export interface ObservabilityEvent {
  type: ObservabilityEventType;
  level: ObservabilityLevel;
  timestamp: string;
  traceId: string;
  message: string;
  source: 'frontend';
  details?: Record<string, unknown>;
}

export interface ApiErrorContext {
  method?: string;
  url?: string;
  status?: number;
  statusText?: string;
  requestTraceId?: string;
  auditCorrelationId?: string;
  durationMs?: number;
  message?: string;
}

export interface ManagerActionTraceContext {
  actionCode: string;
  endpoint?: string;
  method?: string;
  targetType?: 'SHIFT' | 'ALERT' | 'PLANNING';
  targetId?: string | number;
}

export type ObservabilitySink = (event: ObservabilityEvent) => void;

let activeSink: ObservabilitySink | null = null;
let browserHandlersInstalled = false;

const sensitiveKeys = new Set([
  'authorization',
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
]);

export const createTraceId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const setObservabilitySink = (
  sink: ObservabilitySink | null,
): void => {
  activeSink = sink;
};

const sanitizeDetails = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeDetails);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sensitiveKeys.has(key.toLowerCase()) ? '[redacted]' : sanitizeDetails(entry),
    ]),
  );
};

const defaultSink: ObservabilitySink = (event) => {
  const log = event.level === 'error' ? console.error : console.info;
  log('[frontend-observability]', event);
};

export const emitObservabilityEvent = (
  event: Omit<ObservabilityEvent, 'timestamp' | 'source'>,
): ObservabilityEvent => {
  const observedEvent: ObservabilityEvent = {
    ...event,
    source: 'frontend',
    timestamp: new Date().toISOString(),
    details: event.details
      ? (sanitizeDetails(event.details) as Record<string, unknown>)
      : undefined,
  };

  (activeSink || defaultSink)(observedEvent);
  return observedEvent;
};

export const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { message?: unknown; name?: unknown };
    return {
      name: maybeError.name,
      message: maybeError.message,
    };
  }

  return { message: String(error) };
};

export const logApiError = (
  error: unknown,
  context: ApiErrorContext = {},
): ObservabilityEvent => {
  const traceId = context.requestTraceId || createTraceId();
  return emitObservabilityEvent({
    type: 'api_error',
    level: 'error',
    traceId,
    message:
      context.message ||
      `API ${context.method || 'REQUEST'} ${context.url || 'unknown'} failed`,
    details: {
      ...context,
      error: serializeError(error),
    },
  });
};

export const logUiError = (
  error: unknown,
  details: Record<string, unknown> = {},
): ObservabilityEvent => {
  return emitObservabilityEvent({
    type: 'ui_error',
    level: 'error',
    traceId: createTraceId(),
    message: String(details.message || 'UI error'),
    details: {
      ...details,
      error: serializeError(error),
    },
  });
};

export const startManagerActionTrace = (
  context: ManagerActionTraceContext,
): string => {
  const traceId = createTraceId();
  emitObservabilityEvent({
    type: 'manager_action_started',
    level: 'info',
    traceId,
    message: `Manager action ${context.actionCode} started`,
    details: { ...context },
  });
  return traceId;
};

export const finishManagerActionTrace = (
  traceId: string,
  context: ManagerActionTraceContext,
  result?: unknown,
): ObservabilityEvent => {
  return emitObservabilityEvent({
    type: 'manager_action_succeeded',
    level: 'info',
    traceId,
    message: `Manager action ${context.actionCode} succeeded`,
    details: {
      ...context,
      result,
    },
  });
};

export const failManagerActionTrace = (
  traceId: string,
  context: ManagerActionTraceContext,
  error: unknown,
): ObservabilityEvent => {
  return emitObservabilityEvent({
    type: 'manager_action_failed',
    level: 'error',
    traceId,
    message: `Manager action ${context.actionCode} failed`,
    details: {
      ...context,
      error: serializeError(error),
    },
  });
};

export const setupFrontendObservability = (): void => {
  if (browserHandlersInstalled || typeof window === 'undefined') return;

  browserHandlersInstalled = true;
  window.addEventListener('error', (event) => {
    logUiError(event.error || event.message, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    logUiError(event.reason, {
      message: 'Unhandled promise rejection',
    });
  });
};
