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
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(`audit.details ->> 'action' = :detailAction`, { detailAction: 'PUBLISH_PLANNING' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit.actorId = :actorId', { actorId: 42 });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit.action = :action', { action: AuditAction.UPDATE });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit.entityType = :entityType', { entityType: AuditEntityType.PLANNING });
    expect(queryBuilder.take).toHaveBeenCalledWith(25);
    expect(repository.find).not.toHaveBeenCalled();
  });
});
