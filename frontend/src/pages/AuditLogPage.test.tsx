import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAuditLogs, AuditLog } from '../api/audit.api';
import { renderWithQueryClient } from '../test/render';
import { AuditLogPage } from './AuditLogPage';

vi.mock('../api/audit.api', async () => {
  const actual = await vi.importActual<typeof import('../api/audit.api')>(
    '../api/audit.api',
  );

  return {
    ...actual,
    fetchAuditLogs: vi.fn(),
  };
});

vi.mock('../store/useAuth', () => ({
  useAuth: () => ({
    impersonatedTenantId: 'tenant-a',
  }),
}));

const buildLogs = (): AuditLog[] => [
  {
    id: 1,
    timestamp: '2026-05-05T08:00:00.000Z',
    actorId: 42,
    actor: {
      nom: 'Ops',
      prenom: 'Manager',
      jobTitle: 'Cadre ops',
    },
    action: 'UPDATE',
    entityType: 'PLANNING',
    entityId: 'ops-action-center:operational-alert-12:workflow:701',
    details: {
      action: 'OPS_ACTION_CENTER_ASSIGN',
      itemId: 'operational-alert-12',
      itemType: 'OPERATIONAL_ALERT',
      sourceEntity: 'OperationalAlert',
      sourceId: 12,
      assignedToId: 7,
      comment: 'Contient une donnée à ne pas exposer',
      before: { status: 'OPEN', email: 'secret@example.test' },
      after: { status: 'IN_PROGRESS' },
    },
  },
  {
    id: 2,
    timestamp: '2026-05-05T08:02:00.000Z',
    actorId: 42,
    actor: null,
    action: 'READ',
    entityType: 'OPERATION_ALERT',
    entityId: 'ops-runbook:alert:12',
    details: {
      action: 'READ_OPS_RUNBOOK',
      sourceType: 'ALERT',
      sourceId: 12,
      status: 'OPEN',
      severity: 'CRITICAL',
      recommendedActionId: 'resolve-alert',
      waitingOn: ['Capture monitoring'],
    },
  },
  {
    id: 3,
    timestamp: '2026-05-05T08:04:00.000Z',
    actorId: 0,
    actor: null,
    action: 'CREATE',
    entityType: 'OPERATION_ALERT',
    entityId: 'operational-alert:12',
    details: {
      action: 'CREATE_OPERATIONAL_ALERT',
      alertId: 12,
      alertType: 'SLO_BREACH',
      source: 'production-readiness.slo',
      sourceReference: 'slo:api:p95',
      token: 'never-render',
      after: { message: 'payload masqué' },
    },
  },
];

const mockFetchAuditLogs = vi.mocked(fetchAuditLogs);

afterEach(() => {
  vi.clearAllMocks();
});

describe('AuditLogPage', () => {
  it('charge le endpoint audit existant avec tenant et affiche une timeline ops lisible', async () => {
    mockFetchAuditLogs.mockResolvedValue(buildLogs());

    renderWithQueryClient(<AuditLogPage />);

    expect(
      await screen.findByRole('heading', { name: 'Journal audit ops' }),
    ).toBeInTheDocument();
    expect(mockFetchAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        limit: 250,
        from: expect.any(String),
        to: expect.any(String),
      }),
    );

    expect(screen.getAllByText('Assignation action-center').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lecture runbook').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alerte opérationnelle créée').length).toBeGreaterThan(0);
    expect(screen.getAllByText('slo:api:p95').length).toBeGreaterThan(0);
    expect(screen.queryByText('never-render')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Contient une donnée à ne pas exposer'),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/champ\(s\) sensible\(s\)/i).length).toBeGreaterThan(0);
  });

  it('filtre la timeline par famille runbook et SLO', async () => {
    const user = userEvent.setup();
    mockFetchAuditLogs.mockResolvedValue(buildLogs());

    renderWithQueryClient(<AuditLogPage />);

    await screen.findAllByText('Assignation action-center');
    await user.click(screen.getByRole('button', { name: /runbook/i }));

    expect(screen.getAllByText('Lecture runbook').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Assignation action-center')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /^SLO/i }));
    expect(screen.getAllByText('Alerte opérationnelle créée').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Lecture runbook')).toHaveLength(0);
  });

  it('conserve une recherche textuelle sur les détails utiles uniquement', async () => {
    const user = userEvent.setup();
    mockFetchAuditLogs.mockResolvedValue(buildLogs());

    renderWithQueryClient(<AuditLogPage />);

    await screen.findAllByText('Assignation action-center');
    await user.type(
      screen.getByRole('textbox', { name: /rechercher dans le journal audit ops/i }),
      'resolve-alert',
    );

    const timeline = screen.getAllByText('Lecture runbook')[0].closest('article');
    expect(timeline).not.toBeNull();
    expect(within(timeline as HTMLElement).getByText('resolve-alert')).toBeInTheDocument();
    expect(screen.queryAllByText('Assignation action-center')).toHaveLength(0);
  });
});
