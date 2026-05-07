import type { AuthenticatedRequest } from '../auth/authenticated-request';
import {
  OperationIncidentSeverity,
  OperationIncidentStatus,
} from './entities/operation-incident.entity';
import {
  OperationalAlertSeverity,
  OperationalAlertStatus,
  OperationalAlertType,
} from './entities/operational-alert.entity';
import {
  OperationsJournalEntrySeverity,
  OperationsJournalEntryStatus,
  OperationsJournalEntryType,
} from './entities/operations-journal-entry.entity';
import {
  OpsActionCenterItemType,
  OpsActionCenterStatus,
} from './dto/ops-action-center.dto';
import { OperationsController } from './operations.controller';
import { OpsPreActionValidationService } from './ops-pre-action-validation.service';
import { OperationsService } from './operations.service';

type RequestOverrides = Partial<AuthenticatedRequest['user']>;
type OperationsServiceMock = jest.Mocked<
  Pick<
    OperationsService,
    | 'getActionCenter'
    | 'findIncidents'
    | 'findIncident'
    | 'declareIncident'
    | 'assignIncident'
    | 'escalateIncident'
    | 'resolveIncident'
    | 'closeIncident'
    | 'findJournalEntries'
    | 'getJournalEntry'
    | 'createJournalEntry'
    | 'updateJournalEntry'
    | 'findAlerts'
    | 'getAlert'
    | 'resolveAlert'
    | 'generateAlertRunbook'
    | 'generateIncidentRunbook'
    | 'generateJournalRunbook'
    | 'runOperationalEscalation'
  >
>;

const createRequest = (overrides: RequestOverrides = {}) =>
  ({
    user: {
      id: 42,
      userId: 42,
      sub: 42,
      email: 'ops@tenant-a.test',
      tenantId: 'tenant-a',
      tenant: 'tenant-a',
      role: 'ADMIN',
      permissions: ['operations:read', 'operations:write'],
      ...overrides,
    },
  }) as AuthenticatedRequest;

const createServiceMock = (): OperationsServiceMock => ({
  getActionCenter: jest.fn(),
  findIncidents: jest.fn(),
  findIncident: jest.fn(),
  declareIncident: jest.fn(),
  assignIncident: jest.fn(),
  escalateIncident: jest.fn(),
  resolveIncident: jest.fn(),
  closeIncident: jest.fn(),
  findJournalEntries: jest.fn(),
  getJournalEntry: jest.fn(),
  createJournalEntry: jest.fn(),
  updateJournalEntry: jest.fn(),
  findAlerts: jest.fn(),
  getAlert: jest.fn(),
  resolveAlert: jest.fn(),
  generateAlertRunbook: jest.fn(),
  generateIncidentRunbook: jest.fn(),
  generateJournalRunbook: jest.fn(),
  runOperationalEscalation: jest.fn(),
});

describe('OperationsController', () => {
  let controller: OperationsController;
  let operationsService: OperationsServiceMock;
  let preActionValidationService: { assertAllowed: jest.Mock };

  beforeEach(() => {
    operationsService = createServiceMock();
    preActionValidationService = {
      assertAllowed: jest.fn().mockReturnValue({ allowed: true }),
    };
    controller = new OperationsController(
      operationsService as unknown as OperationsService,
      preActionValidationService as unknown as OpsPreActionValidationService,
    );
  });

  it('ignores tenantId query parameters for non-super-admin users', async () => {
    const req = createRequest({ role: 'ADMIN' });

    await controller.findIncidents(
      req,
      { status: OperationIncidentStatus.DECLARED },
      'tenant-b',
    );
    await controller.findIncident(req, { id: 12 }, 'tenant-b');

    expect(operationsService.findIncidents).toHaveBeenCalledWith('tenant-a', {
      status: OperationIncidentStatus.DECLARED,
    });
    expect(operationsService.findIncident).toHaveBeenCalledWith('tenant-a', 12);
  });

  it('allows SUPER_ADMIN users to inspect another tenant', async () => {
    const req = createRequest({ role: 'SUPER_ADMIN' });

    await controller.findIncident(req, { id: 12 }, 'tenant-b');

    expect(operationsService.findIncident).toHaveBeenCalledWith('tenant-b', 12);
  });

  it('resolves tenants and filters for action center reads', async () => {
    const req = createRequest({ role: 'ADMIN' });
    const filters = {
      status: OpsActionCenterStatus.WAITING_DECISION,
      type: OpsActionCenterItemType.DECISION_REQUIRED,
      limit: 25,
    };

    await controller.getActionCenter(req, filters, 'tenant-b');

    expect(operationsService.getActionCenter).toHaveBeenCalledWith(
      'tenant-a',
      filters,
    );
  });

  it('resolves tenants for journal reads', async () => {
    const req = createRequest({ role: 'ADMIN' });
    const query = {
      type: OperationsJournalEntryType.INCIDENT,
      relatedAuditLogId: 12,
    };

    await controller.findJournalEntries(req, query, 'tenant-b');
    await controller.getJournalEntry(req, 4, 'tenant-b');

    expect(operationsService.findJournalEntries).toHaveBeenCalledWith(
      'tenant-a',
      query,
    );
    expect(operationsService.getJournalEntry).toHaveBeenCalledWith(
      'tenant-a',
      4,
    );
  });

  it('resolves tenants for alert reads and resolution', async () => {
    const req = createRequest({ role: 'ADMIN', id: 77 });
    const filters = {
      type: OperationalAlertType.SLO_BREACH,
      status: OperationalAlertStatus.OPEN,
      severity: OperationalAlertSeverity.HIGH,
    };
    const resolution = { resolutionSummary: 'Controle revenu nominal' };

    await controller.findAlerts(req, filters, 'tenant-b');
    await controller.getAlert(req, { id: 44 }, 'tenant-b');
    await controller.resolveAlert(req, { id: 44 }, resolution, 'tenant-b');

    expect(operationsService.findAlerts).toHaveBeenCalledWith(
      'tenant-a',
      filters,
    );
    expect(operationsService.getAlert).toHaveBeenCalledWith('tenant-a', 44);
    expect(operationsService.resolveAlert).toHaveBeenCalledWith(
      'tenant-a',
      44,
      resolution,
      77,
    );
  });

  it('resolves tenants for generated runbooks', async () => {
    const req = createRequest({ role: 'ADMIN' });

    await controller.generateAlertRunbook(req, { id: 44 }, 'tenant-b');
    await controller.generateIncidentRunbook(req, { id: 12 }, 'tenant-b');
    await controller.generateJournalRunbook(req, 4, 'tenant-b');

    expect(operationsService.generateAlertRunbook).toHaveBeenCalledWith(
      'tenant-a',
      44,
    );
    expect(operationsService.generateIncidentRunbook).toHaveBeenCalledWith(
      'tenant-a',
      12,
    );
    expect(operationsService.generateJournalRunbook).toHaveBeenCalledWith(
      'tenant-a',
      4,
    );
  });

  it('passes actor id and resolved tenant to journal mutations', async () => {
    const req = createRequest({ id: 77 });
    const createDto = {
      type: OperationsJournalEntryType.EVIDENCE,
      title: 'Preuve backup',
      evidenceUrl: 'https://evidence.test/backup',
      severity: OperationsJournalEntrySeverity.LOW,
    };
    const updateDto = {
      status: OperationsJournalEntryStatus.RESOLVED,
      resolvedAt: '2026-05-06T09:00:00.000Z',
    };

    await controller.createJournalEntry(req, createDto, 'tenant-b');
    await controller.updateJournalEntry(req, 4, updateDto, 'tenant-b');

    expect(operationsService.createJournalEntry).toHaveBeenCalledWith(
      'tenant-a',
      createDto,
      77,
    );
    expect(operationsService.updateJournalEntry).toHaveBeenCalledWith(
      'tenant-a',
      4,
      updateDto,
      77,
    );
  });

  it('passes actor id and resolved tenant to every incident mutation', async () => {
    const req = createRequest({ id: 77 });

    await controller.declareIncident(
      req,
      {
        title: 'Erreur production',
        description: 'Incident post-prod',
        severity: OperationIncidentSeverity.HIGH,
      },
      'tenant-b',
    );
    await controller.assignIncident(
      req,
      { id: 12 },
      { assignedToId: 88 },
      'tenant-b',
    );
    await controller.escalateIncident(
      req,
      { id: 12 },
      { escalatedToId: 99, reason: 'SLA dépassé' },
      'tenant-b',
    );
    await controller.resolveIncident(
      req,
      { id: 12 },
      {
        resolutionSummary: 'Correctif validé',
        evidenceUrl: 'https://evidence.test/resolution',
      },
      'tenant-b',
    );
    await controller.closeIncident(
      req,
      { id: 12 },
      {
        closureSummary: 'Clôture validée',
        evidenceUrl: 'https://evidence.test/closure',
      },
      'tenant-b',
    );

    expect(operationsService.declareIncident).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ severity: OperationIncidentSeverity.HIGH }),
      77,
    );
    expect(operationsService.assignIncident).toHaveBeenCalledWith(
      'tenant-a',
      12,
      { assignedToId: 88 },
      77,
    );
    expect(operationsService.escalateIncident).toHaveBeenCalledWith(
      'tenant-a',
      12,
      { escalatedToId: 99, reason: 'SLA dépassé' },
      77,
    );
    expect(operationsService.resolveIncident).toHaveBeenCalledWith(
      'tenant-a',
      12,
      {
        resolutionSummary: 'Correctif validé',
        evidenceUrl: 'https://evidence.test/resolution',
      },
      77,
    );
    expect(operationsService.closeIncident).toHaveBeenCalledWith(
      'tenant-a',
      12,
      {
        closureSummary: 'Clôture validée',
        evidenceUrl: 'https://evidence.test/closure',
      },
      77,
    );
  });

  it('passes actor id and resolved tenant to operational escalation run', async () => {
    const req = createRequest({ id: 77 });
    const dto = {
      escalationUserId: 91,
      criticalUnassignedDelayMinutes: 10,
      now: '2026-05-07T10:00:00.000Z',
    };

    await controller.runOperationalEscalation(req, dto, 'tenant-b');

    expect(operationsService.runOperationalEscalation).toHaveBeenCalledWith(
      'tenant-a',
      dto,
      77,
    );
  });
});
