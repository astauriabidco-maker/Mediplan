import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  failManagerActionTrace,
  finishManagerActionTrace,
  logApiError,
  logUiError,
  ObservabilityEvent,
  setObservabilitySink,
  startManagerActionTrace,
} from './observability';

const events: ObservabilityEvent[] = [];

describe('frontend observability', () => {
  afterEach(() => {
    events.length = 0;
    setObservabilitySink(null);
    vi.restoreAllMocks();
  });

  it('emits structured manager action traces with one correlation id', () => {
    setObservabilitySink((event) => events.push(event));

    const traceId = startManagerActionTrace({
      actionCode: 'APPROVE_EXCEPTION',
      endpoint: '/api/planning/shifts/42/exception',
      method: 'POST',
      targetType: 'SHIFT',
      targetId: 42,
    });
    finishManagerActionTrace(
      traceId,
      {
        actionCode: 'APPROVE_EXCEPTION',
        endpoint: '/api/planning/shifts/42/exception',
        method: 'POST',
        targetType: 'SHIFT',
        targetId: 42,
      },
      { ok: true },
    );

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.type)).toEqual([
      'manager_action_started',
      'manager_action_succeeded',
    ]);
    expect(events.every((event) => event.traceId === traceId)).toBe(true);
    expect(events[0]).toMatchObject({
      source: 'frontend',
      level: 'info',
      details: {
        actionCode: 'APPROVE_EXCEPTION',
        targetType: 'SHIFT',
        targetId: 42,
      },
    });
  });

  it('records failed manager actions and UI errors without throwing', () => {
    setObservabilitySink((event) => events.push(event));
    const error = new Error('Validation impossible');
    const traceId = 'trace-test';

    failManagerActionTrace(
      traceId,
      {
        actionCode: 'REVALIDATE_SHIFT',
        endpoint: '/api/planning/shifts/90/revalidate',
        method: 'POST',
        targetType: 'SHIFT',
        targetId: 90,
      },
      error,
    );
    logUiError(error, { message: 'Manager guided action failed' });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: 'manager_action_failed',
      level: 'error',
      traceId,
      details: {
        error: {
          name: 'Error',
          message: 'Validation impossible',
        },
      },
    });
    expect(events[1]).toMatchObject({
      type: 'ui_error',
      level: 'error',
      message: 'Manager guided action failed',
    });
  });

  it('logs API errors with audit correlation and redacted details', () => {
    setObservabilitySink((event) => events.push(event));

    logApiError(new Error('Request failed'), {
      method: 'POST',
      url: '/api/planning/publish',
      status: 409,
      requestTraceId: 'client-trace-1',
      auditCorrelationId: 'audit-123',
      durationMs: 27,
      message: 'Publication refused',
      token: 'secret',
    } as never);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'api_error',
      level: 'error',
      traceId: 'client-trace-1',
      message: 'Publication refused',
      details: {
        method: 'POST',
        url: '/api/planning/publish',
        status: 409,
        auditCorrelationId: 'audit-123',
        token: '[redacted]',
      },
    });
  });
});
