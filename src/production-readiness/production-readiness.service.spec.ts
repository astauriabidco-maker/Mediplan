import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  ProductionGate,
  ProductionGateKey,
  ProductionGateStatus,
} from './entities/production-gate.entity';
import {
  ProductionSignoff,
  ProductionSignoffKey,
  ProductionSignoffStatus,
} from './entities/production-signoff.entity';
import { ProductionReadinessService } from './production-readiness.service';

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
    (entity: Partial<ProductionSignoff | ProductionGate>) =>
      entity as ProductionSignoff | ProductionGate,
  ),
  save: jest.fn((entity: Partial<ProductionSignoff | ProductionGate>) =>
    Promise.resolve({
      id: entity.id ?? 1,
      ...entity,
    } as ProductionSignoff | ProductionGate),
  ),
});

describe('ProductionReadinessService', () => {
  let service: ProductionReadinessService;
  let repository: RepositoryMock;
  let gateRepository: RepositoryMock;
  let auditService: { log: jest.Mock; getLogs: jest.Mock };
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    repository = createRepositoryMock();
    gateRepository = createRepositoryMock();
    repository.find.mockResolvedValue([]);
    gateRepository.find.mockResolvedValue([]);
    auditService = { log: jest.fn(), getLogs: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductionReadinessService,
        {
          provide: getRepositoryToken(ProductionSignoff),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(ProductionGate),
          useValue: gateRepository,
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = moduleRef.get(ProductionReadinessService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects GO signoffs without proof URL', async () => {
    await expect(
      service.upsertSignoff(
        'tenant-a',
        ProductionSignoffKey.HR,
        {
          status: ProductionSignoffStatus.GO,
          signerName: 'Directrice RH',
        },
        42,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a signoff and writes a production audit event', async () => {
    repository.findOne.mockResolvedValue(null);

    const signoff = await service.upsertSignoff(
      'tenant-a',
      ProductionSignoffKey.SECURITY,
      {
        status: ProductionSignoffStatus.GO,
        signerName: 'RSSI',
        proofUrl: 'https://evidence.test/security',
        comment: 'Validation sécurité OK',
      },
      51,
    );

    expect(signoff).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        key: ProductionSignoffKey.SECURITY,
        status: ProductionSignoffStatus.GO,
        signedById: 51,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      51,
      AuditAction.CREATE,
      AuditEntityType.PLANNING,
      'production-signoff:SECURITY',
      expect.objectContaining({
        action: 'CREATE_PRODUCTION_SIGNOFF',
        signoffKey: ProductionSignoffKey.SECURITY,
        after: expect.objectContaining({
          comment: 'Validation sécurité OK',
        }),
      }),
    );
  });

  it('rebuilds signoff history from production audit events grouped by role', async () => {
    repository.find.mockResolvedValue([
      {
        key: ProductionSignoffKey.SECURITY,
        status: ProductionSignoffStatus.GO,
        proofUrl: 'https://evidence.test/security',
      },
    ]);
    auditService.getLogs.mockResolvedValue([
      {
        id: 12,
        timestamp: new Date('2026-05-04T09:30:00.000Z'),
        actorId: 51,
        actor: { nom: 'RSSI' },
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PLANNING,
        entityId: 'production-signoff:SECURITY',
        tenantId: 'tenant-a',
        chainSequence: 7,
        eventHash: 'hash-security-go',
        details: {
          action: 'CREATE_PRODUCTION_SIGNOFF',
          signoffKey: ProductionSignoffKey.SECURITY,
          after: {
            status: ProductionSignoffStatus.GO,
            signerName: 'RSSI',
            signerRole: 'Sécurité',
            signedById: 51,
            signedAt: '2026-05-04T09:30:00.000Z',
            proofUrl: 'https://evidence.test/security',
            proofLabel: 'Rapport sécurité',
            comment: 'Validation sécurité OK',
          },
        },
      },
    ]);

    const history = await service.getSignoffHistory('tenant-a');

    expect(auditService.getLogs).toHaveBeenCalledWith('tenant-a', {
      entityType: AuditEntityType.PLANNING,
      detailActions: ['CREATE_PRODUCTION_SIGNOFF', 'UPDATE_PRODUCTION_SIGNOFF'],
      limit: 500,
    });
    expect(history.decision.status).toBe('PROD_NO_GO');
    expect(history.entries).toEqual([
      expect.objectContaining({
        auditLogId: 12,
        chainSequence: 7,
        eventHash: 'hash-security-go',
        key: ProductionSignoffKey.SECURITY,
        actorId: 51,
        actorName: 'RSSI',
        status: ProductionSignoffStatus.GO,
        proofUrl: 'https://evidence.test/security',
        comment: 'Validation sécurité OK',
      }),
    ]);
    expect(history.byRole.SECURITY).toHaveLength(1);
    expect(history.byRole.HR).toEqual([]);
  });

  it('returns PROD_NO_GO while gates or signoffs are missing', async () => {
    repository.find.mockResolvedValue([
      {
        key: ProductionSignoffKey.HR,
        status: ProductionSignoffStatus.GO,
        proofUrl: 'https://evidence.test/hr',
      },
    ]);

    const decision = await service.getDecision('tenant-a');

    expect(decision.status).toBe('PROD_NO_GO');
    expect(decision.signoffSummary.missing).toEqual(
      expect.arrayContaining([
        ProductionSignoffKey.SECURITY,
        ProductionSignoffKey.OPERATIONS,
        ProductionSignoffKey.TECHNICAL,
        ProductionSignoffKey.DIRECTION,
      ]),
    );
    expect(decision.blockers).toContain('FREEZE gate is UNKNOWN');
  });

  it('returns PROD_READY when every signoff and final gate is passed', async () => {
    process.env.PROD_FREEZE_STATUS = 'FREEZE_READY';
    for (const gate of [
      'MIGRATION',
      'SEED',
      'SMOKE',
      'COMPLIANCE',
      'AUDIT',
      'BACKUP',
    ]) {
      process.env[`PROD_GATE_${gate}`] = 'PASSED';
    }

    repository.find.mockResolvedValue(
      Object.values(ProductionSignoffKey).map((key) => ({
        key,
        status: ProductionSignoffStatus.GO,
        proofUrl: `https://evidence.test/${key.toLowerCase()}`,
      })),
    );

    const decision = await service.getDecision('tenant-a');

    expect(decision.status).toBe('PROD_READY');
    expect(decision.blockers).toEqual([]);
  });

  it('uses persisted gates before environment fallbacks in the final decision', async () => {
    process.env.PROD_FREEZE_STATUS = 'FREEZE_READY';
    for (const gate of [
      'MIGRATION',
      'SEED',
      'SMOKE',
      'COMPLIANCE',
      'AUDIT',
      'BACKUP',
    ]) {
      process.env[`PROD_GATE_${gate}`] = 'PASSED';
    }

    repository.find.mockResolvedValue(
      Object.values(ProductionSignoffKey).map((key) => ({
        key,
        status: ProductionSignoffStatus.GO,
        proofUrl: `https://evidence.test/${key.toLowerCase()}`,
      })),
    );
    gateRepository.find.mockResolvedValue([
      {
        key: ProductionGateKey.SMOKE,
        status: ProductionGateStatus.FAILED,
        source: 'CI',
        evidenceUrl: 'https://ci.test/run/123',
        checkedAt: new Date('2026-05-05T09:00:00.000Z'),
      },
    ]);

    const decision = await service.getDecision('tenant-a');

    expect(decision.status).toBe('PROD_NO_GO');
    expect(decision.blockers).toContain('SMOKE gate is FAILED');
    expect(decision.gates.checks).toContainEqual(
      expect.objectContaining({
        key: ProductionGateKey.SMOKE,
        status: ProductionGateStatus.FAILED,
        source: 'CI',
      }),
    );
  });

  it('upserts a production gate and writes an audit mutation', async () => {
    gateRepository.findOne.mockResolvedValue(null);

    const gate = await service.upsertGate(
      'tenant-a',
      ProductionGateKey.BACKUP,
      {
        status: ProductionGateStatus.PASSED,
        source: 'backup-restore-drill',
        evidenceUrl: 'https://evidence.test/backup',
        snapshot: { restoreDrill: 'ok' },
        checkedAt: '2026-05-05T10:00:00.000Z',
      },
      51,
    );

    expect(gate).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        key: ProductionGateKey.BACKUP,
        status: ProductionGateStatus.PASSED,
        updatedById: 51,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      51,
      AuditAction.CREATE,
      AuditEntityType.PLANNING,
      'production-gate:BACKUP',
      expect.objectContaining({
        action: 'CREATE_PRODUCTION_GATE',
        gateKey: ProductionGateKey.BACKUP,
      }),
    );
  });
});
