import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OpsOnCallConfig } from './entities/ops-on-call-config.entity';
import { OpsOnCallConfigService } from './ops-on-call-config.service';

type QueryBuilderMock = {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  getMany: jest.Mock;
};

type RepositoryMock = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createQueryBuilderMock = (
  rows: Partial<OpsOnCallConfig>[] = [],
): QueryBuilderMock => {
  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    getMany: jest.fn().mockResolvedValue(rows),
  } as QueryBuilderMock;
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.addOrderBy.mockReturnValue(qb);
  return qb;
};

const createRepositoryMock = (
  queryRows: Partial<OpsOnCallConfig>[] = [],
): RepositoryMock => ({
  create: jest.fn((entity: Partial<OpsOnCallConfig>) => entity),
  save: jest.fn((entity: Partial<OpsOnCallConfig>) =>
    Promise.resolve({ id: entity.id ?? 12, ...entity }),
  ),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => createQueryBuilderMock(queryRows)),
});

describe('OpsOnCallConfigService', () => {
  let service: OpsOnCallConfigService;
  let repository: RepositoryMock;

  const buildService = async (queryRows: Partial<OpsOnCallConfig>[] = []) => {
    repository = createRepositoryMock(queryRows);

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpsOnCallConfigService,
        {
          provide: getRepositoryToken(OpsOnCallConfig),
          useValue: repository,
        },
      ],
    }).compile();

    service = moduleRef.get(OpsOnCallConfigService);
  };

  beforeEach(async () => {
    await buildService();
  });

  it('creates tenant-scoped configs with normalized role and recipients', async () => {
    const result = await service.createTenantConfig(
      'tenant-a',
      {
        role: ' on_call ',
        recipients: [' astreinte@mediplan.test ', 'astreinte@mediplan.test'],
        activeFrom: '2026-05-08T08:00:00.000Z',
        priority: 10,
      },
      77,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        role: 'ON_CALL',
        recipients: ['astreinte@mediplan.test'],
        priority: 10,
        enabled: true,
        createdById: 77,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 12 }));
  });

  it('updates only configs owned by the resolved tenant', async () => {
    repository.findOne.mockResolvedValue({
      id: 44,
      tenantId: 'tenant-a',
      role: 'OPS',
      recipients: ['ops@mediplan.test'],
      activeFrom: null,
      activeUntil: null,
      priority: 100,
      enabled: true,
    });

    await service.updateTenantConfig(
      'tenant-a',
      44,
      {
        recipients: ['l2@mediplan.test'],
        activeUntil: '2026-05-08T20:00:00.000Z',
        enabled: false,
      },
      77,
    );

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 44, tenantId: 'tenant-a' },
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: ['l2@mediplan.test'],
        activeUntil: new Date('2026-05-08T20:00:00.000Z'),
        enabled: false,
        updatedById: 77,
      }),
    );
  });

  it('rejects cross-tenant updates by returning not found', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.updateTenantConfig('tenant-a', 44, { enabled: false }, 77),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves active recipients by role using priority order and de-duplicates', async () => {
    await buildService([
      {
        id: 1,
        role: 'OPS',
        priority: 1,
        recipients: ['ops-l1@mediplan.test', 'shared@mediplan.test'],
      },
      {
        id: 2,
        role: 'ON_CALL',
        priority: 2,
        recipients: ['shared@mediplan.test', 'l2@mediplan.test'],
      },
    ]);

    const recipients = await service.resolveRecipients(
      'tenant-a',
      ['ops', 'ON_CALL', 'ops'],
      new Date('2026-05-08T10:00:00.000Z'),
    );

    expect(recipients).toEqual([
      'ops-l1@mediplan.test',
      'shared@mediplan.test',
      'l2@mediplan.test',
    ]);
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('config');
  });
});
