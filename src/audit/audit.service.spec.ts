import { AuditAction, AuditEntityType } from './entities/audit-log.entity';
import { AuditService } from './audit.service';

const createQueryBuilderMock = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(async () => []),
});

describe('AuditService', () => {
  it('chains audit events per tenant when logging sensitive actions', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-01T10:00:00.000Z'));
    const previousLog = {
      id: 10,
      tenantId: 'tenant-a',
      chainSequence: 2,
      eventHash: 'previous-hash',
      timestamp: new Date('2026-02-01T09:00:00.000Z'),
    };
    const repository = {
      findOne: jest.fn(async () => previousLog),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 11, ...data })),
    };
    const service = new AuditService(repository as any);

    const result = await service.log(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      12,
      { action: 'UPDATE_AGENT', after: { name: 'Ada' } },
    );

    expect(repository.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: 'tenant-a' }),
      order: { chainSequence: 'DESC', timestamp: 'DESC', id: 'DESC' },
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        actorId: 42,
        chainSequence: 3,
        previousHash: 'previous-hash',
        eventHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(result.eventHash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
    jest.useRealTimers();
  });

  it('redacts personal and HR identifiers before saving audit details', async () => {
    const repository = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 11, ...data })),
    };
    const service = new AuditService(repository as any);

    await service.log(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      12,
      {
        action: 'UPDATE_AGENT',
        email: 'agent@example.test',
        matricule: 'MAT-001',
        after: {
          nir: '1880123456789',
          personalEmail: 'private@example.test',
          hospitalServiceId: 7,
        },
      },
    );

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        details: {
          action: 'UPDATE_AGENT',
          email: '[redacted]',
          matricule: '[redacted]',
          after: {
            nir: '[redacted]',
            personalEmail: '[redacted]',
            hospitalServiceId: 7,
          },
        },
      }),
    );
  });

  it('filters logs by nested detail action through query builder', async () => {
    const queryBuilder = createQueryBuilderMock();
    const repository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      find: jest.fn(),
    };
    const service = new AuditService(repository as any);

    await service.getLogs('tenant-a', {
      actorId: 42,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
      detailAction: 'PUBLISH_PLANNING',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      limit: 25,
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('audit');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      `audit.details ->> 'action' = :detailAction`,
      { detailAction: 'PUBLISH_PLANNING' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'audit.actorId = :actorId',
      { actorId: 42 },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'audit.action = :action',
      { action: AuditAction.UPDATE },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'audit.entityType = :entityType',
      { entityType: AuditEntityType.PLANNING },
    );
    expect(queryBuilder.take).toHaveBeenCalledWith(25);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('filters logs by multiple nested detail actions through query builder', async () => {
    const queryBuilder = createQueryBuilderMock();
    const repository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      find: jest.fn(),
    };
    const service = new AuditService(repository as any);

    await service.getLogs('tenant-a', {
      entityType: AuditEntityType.PLANNING,
      detailActions: ['CREATE_PRODUCTION_SIGNOFF', 'UPDATE_PRODUCTION_SIGNOFF'],
      limit: 500,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      `audit.details ->> 'action' IN (:...detailActions)`,
      {
        detailActions: [
          'CREATE_PRODUCTION_SIGNOFF',
          'UPDATE_PRODUCTION_SIGNOFF',
        ],
      },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'audit.entityType = :entityType',
      { entityType: AuditEntityType.PLANNING },
    );
    expect(queryBuilder.take).toHaveBeenCalledWith(500);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('detects altered hashes, broken links and missing sequence entries', async () => {
    const service = new AuditService({} as any);
    const firstLog: any = {
      id: 1,
      tenantId: 'tenant-a',
      timestamp: new Date('2026-02-01T10:00:00.000Z'),
      actorId: 42,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.SHIFT,
      entityId: '100',
      details: { action: 'CREATE_SHIFT' },
      chainSequence: 1,
      previousHash: null,
    };
    firstLog['eventHash'] = (service as any).computeEventHash(firstLog);
    const alteredSecondLog = {
      id: 2,
      tenantId: 'tenant-a',
      timestamp: new Date('2026-02-01T11:00:00.000Z'),
      actorId: 42,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.SHIFT,
      entityId: '100',
      details: { action: 'REASSIGN_SHIFT', agentId: 99 },
      chainSequence: 3,
      previousHash: 'wrong-link',
      eventHash: 'wrong-hash',
    };
    (service as any).auditLogRepository = {
      find: jest.fn(async () => [firstLog, alteredSecondLog]),
    };

    const verification = await service.verifyChain('tenant-a');

    expect(verification.valid).toBe(false);
    expect(verification.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'SEQUENCE_GAP', auditLogId: 2 }),
        expect.objectContaining({ type: 'BROKEN_LINK', auditLogId: 2 }),
        expect.objectContaining({ type: 'HASH_MISMATCH', auditLogId: 2 }),
      ]),
    );
  });

  it('exports filtered logs with full-chain verification metadata', async () => {
    const repository = {
      find: jest
        .fn()
        .mockResolvedValueOnce([{ id: 99, tenantId: 'tenant-a' }])
        .mockResolvedValueOnce([]),
    };
    const service = new AuditService(repository as any);

    const result = await service.exportLogs('tenant-a', {
      action: AuditAction.DELETE,
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-31T23:59:59.000Z'),
    });

    expect(result.tenantId).toBe('tenant-a');
    expect(result.logs).toEqual([{ id: 99, tenantId: 'tenant-a' }]);
    expect(result.chainVerification.valid).toBe(true);
    expect(repository.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          action: AuditAction.DELETE,
        }),
      }),
    );
  });
});
