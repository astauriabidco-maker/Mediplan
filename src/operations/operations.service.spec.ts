import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  OperationIncident,
  OperationIncidentSeverity,
  OperationIncidentStatus,
} from './entities/operation-incident.entity';
import {
  OperationsJournalEntry,
  OperationsJournalEntrySeverity,
  OperationsJournalEntryStatus,
  OperationsJournalEntryType,
} from './entities/operations-journal-entry.entity';
import { OperationsService } from './operations.service';

type RepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

const createRepositoryMock = (): RepositoryMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(
    (entity: Partial<OperationIncident | OperationsJournalEntry>) => entity,
  ),
  save: jest.fn((entity: Partial<OperationIncident | OperationsJournalEntry>) =>
    Promise.resolve({
      id: entity.id ?? 1,
      createdAt: entity.createdAt ?? new Date('2026-05-07T08:00:00.000Z'),
      updatedAt: entity.updatedAt ?? new Date('2026-05-07T08:00:00.000Z'),
      ...entity,
    } as OperationIncident | OperationsJournalEntry),
  ),
});

const objectContaining = <T extends object>(value: T): T =>
  expect.objectContaining(value) as unknown as T;

const createIncident = (
  overrides: Partial<OperationIncident> = {},
): OperationIncident =>
  ({
    id: 12,
    tenantId: 'tenant-a',
    title: 'API prod indisponible',
    description: 'Erreur 500 sur publication planning',
    severity: OperationIncidentSeverity.CRITICAL,
    status: OperationIncidentStatus.DECLARED,
    impactedService: 'planning',
    evidenceUrl: null,
    evidenceLabel: null,
    declaredById: 42,
    declaredAt: new Date('2026-05-07T08:00:00.000Z'),
    assignedToId: null,
    assignedAt: null,
    escalatedToId: null,
    escalationReason: null,
    escalatedAt: null,
    resolutionSummary: null,
    resolvedById: null,
    resolvedAt: null,
    closureSummary: null,
    closedById: null,
    closedAt: null,
    evidence: [],
    timeline: [],
    createdAt: new Date('2026-05-07T08:00:00.000Z'),
    updatedAt: new Date('2026-05-07T08:00:00.000Z'),
    ...overrides,
  }) as OperationIncident;

describe('OperationsService', () => {
  let service: OperationsService;
  let incidentRepository: RepositoryMock;
  let journalRepository: RepositoryMock;
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    incidentRepository = createRepositoryMock();
    journalRepository = createRepositoryMock();
    incidentRepository.find.mockResolvedValue([]);
    incidentRepository.findOne.mockResolvedValue(null);
    journalRepository.find.mockResolvedValue([]);
    journalRepository.findOne.mockResolvedValue(null);
    auditService = { log: jest.fn().mockResolvedValue({ id: 99 }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OperationsService,
        {
          provide: getRepositoryToken(OperationIncident),
          useValue: incidentRepository,
        },
        {
          provide: getRepositoryToken(OperationsJournalEntry),
          useValue: journalRepository,
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = moduleRef.get(OperationsService);
  });

  it('declares a post-production incident with initial proof and audit', async () => {
    const incident = await service.declareIncident(
      'tenant-a',
      {
        title: 'API prod indisponible',
        description: 'Erreur 500 sur publication planning',
        severity: OperationIncidentSeverity.CRITICAL,
        impactedService: 'planning',
        evidenceUrl: 'https://evidence.test/incidents/12/declaration',
        evidenceLabel: 'Capture alerte',
      },
      42,
    );

    expect(incident).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        status: OperationIncidentStatus.DECLARED,
        declaredById: 42,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.OPERATION_INCIDENT,
      'operation-incident:1',
      expect.objectContaining({
        action: 'DECLARE_INCIDENT',
        before: null,
      }),
    );
  });

  it('requires assignment or escalation before incident resolution', async () => {
    incidentRepository.findOne.mockResolvedValue(createIncident());

    await expect(
      service.resolveIncident(
        'tenant-a',
        12,
        {
          resolutionSummary: 'Correctif applique',
          evidenceUrl: 'https://evidence.test/incidents/12/resolution',
        },
        51,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns, escalates, resolves and closes an incident with proof', async () => {
    const incident = createIncident();
    incidentRepository.findOne
      .mockResolvedValueOnce(incident)
      .mockResolvedValueOnce({
        ...incident,
        status: OperationIncidentStatus.ASSIGNED,
        assignedToId: 77,
        timeline: [],
      })
      .mockResolvedValueOnce({
        ...incident,
        status: OperationIncidentStatus.ESCALATED,
        escalatedToId: 88,
        timeline: [],
      })
      .mockResolvedValueOnce({
        ...incident,
        status: OperationIncidentStatus.RESOLVED,
        resolvedById: 51,
        resolvedAt: new Date('2026-05-07T09:00:00.000Z'),
        evidence: [
          {
            label: 'Rapport correction',
            url: 'https://evidence.test/incidents/12/resolution',
            addedAt: '2026-05-07T09:00:00.000Z',
            addedById: 51,
            type: 'RESOLUTION',
          },
        ],
        timeline: [],
      });

    const assigned = await service.assignIncident(
      'tenant-a',
      12,
      { assignedToId: 77, note: 'Astreinte L1' },
      42,
    );
    const escalated = await service.escalateIncident(
      'tenant-a',
      12,
      {
        escalatedToId: 88,
        reason: 'Impact patient potentiel',
        evidenceUrl: 'https://evidence.test/incidents/12/escalation',
      },
      42,
    );
    const resolved = await service.resolveIncident(
      'tenant-a',
      12,
      {
        resolutionSummary: 'Correctif applique et smoke API vert',
        evidenceUrl: 'https://evidence.test/incidents/12/resolution',
        evidenceLabel: 'Rapport correction',
      },
      51,
    );
    const closed = await service.closeIncident(
      'tenant-a',
      12,
      {
        closureSummary: 'Reprise validee par exploitation',
        evidenceUrl: 'https://evidence.test/incidents/12/closure',
      },
      52,
    );

    expect(assigned.status).toBe(OperationIncidentStatus.ASSIGNED);
    expect(escalated.status).toBe(OperationIncidentStatus.ESCALATED);
    expect(resolved.status).toBe(OperationIncidentStatus.RESOLVED);
    expect(closed).toEqual(
      expect.objectContaining({
        status: OperationIncidentStatus.CLOSED,
        closedById: 52,
      }),
    );
    expect(closed.evidence).toEqual([
      objectContaining({ type: 'RESOLUTION' }),
      objectContaining({ type: 'CLOSURE' }),
    ]);
    expect(auditService.log).toHaveBeenLastCalledWith(
      'tenant-a',
      52,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_INCIDENT,
      'operation-incident:12',
      objectContaining({
        action: 'CLOSE_INCIDENT',
        before: objectContaining({
          status: OperationIncidentStatus.RESOLVED,
        }),
        after: objectContaining({
          status: OperationIncidentStatus.CLOSED,
        }),
      }),
    );
  });

  it('prevents closing an unresolved incident', async () => {
    incidentRepository.findOne.mockResolvedValue(
      createIncident({ status: OperationIncidentStatus.ASSIGNED }),
    );

    await expect(
      service.closeIncident(
        'tenant-a',
        12,
        {
          closureSummary: 'Tentative de cloture',
          evidenceUrl: 'https://evidence.test/incidents/12/closure',
        },
        52,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes incident lookup by tenant', async () => {
    await expect(service.findIncident('tenant-b', 12)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(incidentRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-b', id: 12 },
    });
  });

  it('creates a journal entry linked to audit evidence', async () => {
    const entry = await service.createJournalEntry(
      'tenant-a',
      {
        type: OperationsJournalEntryType.INCIDENT,
        severity: OperationsJournalEntrySeverity.HIGH,
        title: 'Latence API post-deploiement',
        description: 'P95 au-dessus du seuil sur les routes planning',
        relatedAuditLogId: 12,
        occurredAt: '2026-05-06T08:00:00.000Z',
      },
      42,
    );

    expect(entry).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        type: OperationsJournalEntryType.INCIDENT,
        status: OperationsJournalEntryStatus.OPEN,
        severity: OperationsJournalEntrySeverity.HIGH,
        auditLogId: 99,
        relatedAuditLogId: 12,
        createdById: 42,
      }),
    );
    expect(auditService.log).toHaveBeenLastCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.PLANNING,
      'operations-journal:1',
      expect.objectContaining({
        action: 'CREATE_OPERATIONS_JOURNAL_ENTRY',
        journalEntryId: 1,
        journalEntryType: OperationsJournalEntryType.INCIDENT,
        relatedAuditLogId: 12,
      }),
    );
  });

  it('requires evidence journal entries to include an evidence URL', async () => {
    await expect(
      service.createJournalEntry(
        'tenant-a',
        {
          type: OperationsJournalEntryType.EVIDENCE,
          title: 'Capture audit',
        },
        42,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a journal entry and records before/after snapshots in audit', async () => {
    journalRepository.findOne.mockResolvedValue({
      id: 4,
      tenantId: 'tenant-a',
      type: OperationsJournalEntryType.ACTION,
      status: OperationsJournalEntryStatus.IN_PROGRESS,
      severity: OperationsJournalEntrySeverity.MEDIUM,
      title: 'Verifier sauvegarde',
      description: null,
      occurredAt: new Date('2026-05-06T08:00:00.000Z'),
      resolvedAt: null,
      ownerId: null,
      createdById: 1,
      updatedById: null,
      auditLogId: 55,
      relatedAuditLogId: 12,
      relatedReference: null,
      evidenceUrl: null,
      evidenceLabel: null,
      metadata: null,
    });

    const entry = await service.updateJournalEntry(
      'tenant-a',
      4,
      {
        status: OperationsJournalEntryStatus.RESOLVED,
        resolvedAt: '2026-05-06T09:00:00.000Z',
        evidenceUrl: 'https://evidence.test/backup-ok',
      },
      42,
    );

    expect(entry).toEqual(
      expect.objectContaining({
        id: 4,
        status: OperationsJournalEntryStatus.RESOLVED,
        auditLogId: 99,
        updatedById: 42,
      }),
    );
    expect(auditService.log).toHaveBeenLastCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      'operations-journal:4',
      expect.objectContaining({
        action: 'UPDATE_OPERATIONS_JOURNAL_ENTRY',
        before: objectContaining({
          status: OperationsJournalEntryStatus.IN_PROGRESS,
        }),
        after: objectContaining({
          status: OperationsJournalEntryStatus.RESOLVED,
          evidenceUrl: 'https://evidence.test/backup-ok',
        }),
      }),
    );
  });

  it('scopes journal lookup by tenant and filters by linked audit log', async () => {
    await service.findJournalEntries('tenant-a', {
      type: OperationsJournalEntryType.DECISION,
      relatedAuditLogId: 12,
      limit: 25,
    });
    await expect(
      service.getJournalEntry('tenant-b', 404),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(journalRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: objectContaining({
          tenantId: 'tenant-a',
          type: OperationsJournalEntryType.DECISION,
          relatedAuditLogId: 12,
        }),
        order: { occurredAt: 'DESC', id: 'DESC' },
        take: 25,
      }),
    );
    expect(journalRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-b', id: 404 },
    });
  });
});
