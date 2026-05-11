import { BadRequestException } from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { PlatformAuditService } from './platform-audit.service';

const createQueryBuilderMock = () => {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  return queryBuilder;
};

describe('PlatformAuditService', () => {
  it('filters platform and impersonation audits with readable rows', async () => {
    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 10,
        timestamp: new Date('2026-05-10T08:00:00.000Z'),
        tenantId: 'PLATFORM',
        actorId: 1,
        actor: { email: 'platform@mediplan.test', nom: 'Platform Admin' },
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PLATFORM_TENANT,
        entityId: 'TENANT-A',
        details: {
          action: 'CREATE_PLATFORM_TENANT',
          tenantId: 'TENANT-A',
          name: 'Tenant A',
        },
      },
      {
        id: 11,
        timestamp: new Date('2026-05-10T09:00:00.000Z'),
        tenantId: 'TENANT-A',
        actorId: 1,
        actor: { email: 'platform@mediplan.test', nom: 'Platform Admin' },
        action: AuditAction.IMPERSONATION_START,
        entityType: AuditEntityType.TENANT_IMPERSONATION,
        entityId: 'TENANT-A',
        details: {
          action: 'START_TENANT_IMPERSONATION',
          sourceTenantId: 'PLATFORM',
          targetTenantId: 'TENANT-A',
          reason: 'Support INC-42',
        },
      },
    ]);
    const repository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const service = new PlatformAuditService(repository as any);

    const rows = await service.list({
      actor: 'platform@mediplan.test',
      tenantId: 'TENANT-A',
      action: 'CREATE_PLATFORM_TENANT',
      entityType: AuditEntityType.PLATFORM_TENANT,
      from: '2026-05-10T00:00:00.000Z',
      to: '2026-05-11T00:00:00.000Z',
      limit: '25',
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('audit');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining('audit.tenantId = :platformTenant'),
      expect.objectContaining({
        platformTenant: 'PLATFORM',
        platformEntityTypes: expect.arrayContaining([
          AuditEntityType.PLATFORM_TENANT,
          AuditEntityType.TENANT_IMPERSONATION,
        ]),
      }),
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'LOWER(actor.email) LIKE :actorLookup',
      { actorLookup: '%platform@mediplan.test%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("audit.details ->> 'targetTenantId' = :tenantId"),
      { tenantId: 'TENANT-A' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "audit.details ->> 'action' = :detailAction",
      { detailAction: 'CREATE_PLATFORM_TENANT' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'audit.entityType = :entityType',
      { entityType: AuditEntityType.PLATFORM_TENANT },
    );
    expect(queryBuilder.take).toHaveBeenCalledWith(25);
    expect(rows).toEqual([
      expect.objectContaining({
        id: 10,
        action: 'CREATE_PLATFORM_TENANT',
        category: 'platform',
        summary: 'creation tenant TENANT-A (Tenant A)',
      }),
      expect.objectContaining({
        id: 11,
        category: 'impersonation',
        summary: 'debut impersonation PLATFORM -> TENANT-A (Support INC-42)',
      }),
    ]);
  });

  it('exports CSV payloads with readable summaries', async () => {
    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 12,
        timestamp: new Date('2026-05-10T10:00:00.000Z'),
        tenantId: 'PLATFORM',
        actorId: 1,
        actor: { email: 'platform@mediplan.test' },
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PLATFORM_TENANT,
        entityId: 'TENANT-A',
        details: {
          action: 'UPDATE_PLATFORM_TENANT',
          tenantId: 'TENANT-A',
          fields: ['name', 'contactEmail'],
        },
      },
    ]);
    const service = new PlatformAuditService({
      createQueryBuilder: jest.fn(() => queryBuilder),
    } as any);

    const payload = await service.export({ limit: '5' }, 'csv');

    expect(payload.format).toBe('csv');
    expect(payload.contentType).toBe('text/csv; charset=utf-8');
    expect(payload.filename).toMatch(/^platform-audit-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(payload.data).toContain('"id","timestamp","tenantId"');
    expect(payload.data).toContain(
      '"12","2026-05-10T10:00:00.000Z","PLATFORM","1","platform@mediplan.test","UPDATE_PLATFORM_TENANT"',
    );
    expect(payload.data).toContain(
      '"mise a jour tenant TENANT-A: name, contactEmail"',
    );
  });

  it('normalizes bounds and rejects invalid filters', () => {
    const service = new PlatformAuditService({} as any);

    expect(service.normalizeFilters({ limit: '9999' }).limit).toBe(500);
    expect(service.normalizeFilters({ limit: '-4' }).limit).toBe(1);
    expect(() =>
      service.normalizeFilters({ from: '2026-05-12', to: '2026-05-11' }),
    ).toThrow(BadRequestException);
    expect(() => service.normalizeFilters({ entityType: 'UNKNOWN' })).toThrow(
      BadRequestException,
    );
  });
});
