import { NotFoundException } from '@nestjs/common';
import { PlatformTenantDetailService } from './platform-tenant-detail.service';

const createAuditQueryBuilder = (audits: any[], count: number) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(audits),
  getCount: jest.fn().mockResolvedValue(count),
});

describe('PlatformTenantDetailService', () => {
  const now = new Date('2026-05-11T08:00:00.000Z');
  const ghtRepository = {
    findOne: jest.fn(),
  };
  const agentRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const hospitalServiceRepository = {
    count: jest.fn(),
  };
  const shiftRepository = {
    count: jest.fn(),
  };
  const leaveRepository = {
    count: jest.fn(),
  };
  const auditLogRepository = {
    createQueryBuilder: jest.fn(),
  };

  let service: PlatformTenantDetailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformTenantDetailService(
      ghtRepository as any,
      agentRepository as any,
      hospitalServiceRepository as any,
      shiftRepository as any,
      leaveRepository as any,
      auditLogRepository as any,
    );
  });

  it('builds the tenant detail aggregate with admins, counts, audits and quick actions', async () => {
    const auditQueryBuilder = createAuditQueryBuilder(
      [
        {
          id: 501,
          timestamp: now,
          action: 'UPDATE',
          entityType: 'PLATFORM_TENANT',
          entityId: 'GHT-A',
          actor: {
            id: 1,
            email: 'platform@mediplan.test',
            nom: 'Platform Admin',
          },
          details: { action: 'UPDATE_PLATFORM_TENANT' },
        },
      ],
      7,
    );

    ghtRepository.findOne.mockResolvedValue({
      id: 'GHT-A',
      name: 'GHT A',
      region: 'FR-IDF',
      contactEmail: 'contact@ght-a.test',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    agentRepository.find.mockResolvedValue([
      {
        id: 10,
        email: 'admin@ght-a.test',
        nom: 'Admin GHT A',
        role: 'ADMIN',
        status: 'ACTIVE',
        dbRole: { name: 'ADMIN' },
      },
    ]);
    agentRepository.count.mockResolvedValue(12);
    hospitalServiceRepository.count.mockResolvedValue(4);
    shiftRepository.count.mockResolvedValue(36);
    leaveRepository.count.mockResolvedValue(3);
    auditLogRepository.createQueryBuilder.mockReturnValue(auditQueryBuilder);

    await expect(service.getTenantDetail('ght a')).resolves.toEqual({
      tenant: {
        id: 'GHT-A',
        name: 'GHT A',
        region: 'FR-IDF',
        contactEmail: 'contact@ght-a.test',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      admins: [
        {
          id: 10,
          email: 'admin@ght-a.test',
          nom: 'Admin GHT A',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      ],
      counts: {
        agents: 12,
        services: 4,
        shifts: 36,
        leaves: 3,
        audits: 7,
      },
      status: {
        isActive: true,
        label: 'ACTIVE',
      },
      recentAudits: [
        {
          id: 501,
          timestamp: now,
          action: 'UPDATE',
          entityType: 'PLATFORM_TENANT',
          entityId: 'GHT-A',
          actor: {
            id: 1,
            email: 'platform@mediplan.test',
            nom: 'Platform Admin',
          },
          details: { action: 'UPDATE_PLATFORM_TENANT' },
        },
      ],
      quickActions: [
        {
          id: 'suspendTenant',
          label: 'Suspendre le tenant',
          enabled: true,
        },
        {
          id: 'createAdmin',
          label: 'Créer un admin tenant',
          enabled: true,
        },
        {
          id: 'reviewAdmins',
          label: 'Vérifier les administrateurs',
          enabled: true,
        },
        {
          id: 'openAuditTrail',
          label: 'Consulter les audits',
          enabled: true,
        },
      ],
    });
    expect(agentRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'GHT-A' }),
        relations: ['dbRole'],
      }),
    );
    expect(auditLogRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
  });

  it('marks tenant admin actions unavailable when a tenant is suspended and has no admins', async () => {
    const auditQueryBuilder = createAuditQueryBuilder([], 0);
    ghtRepository.findOne.mockResolvedValue({
      id: 'GHT-B',
      name: 'GHT B',
      region: null,
      contactEmail: null,
      isActive: false,
      createdAt: null,
      updatedAt: null,
    });
    agentRepository.find.mockResolvedValue([]);
    agentRepository.count.mockResolvedValue(0);
    hospitalServiceRepository.count.mockResolvedValue(0);
    shiftRepository.count.mockResolvedValue(0);
    leaveRepository.count.mockResolvedValue(0);
    auditLogRepository.createQueryBuilder.mockReturnValue(auditQueryBuilder);

    const detail = await service.getTenantDetail('GHT-B');

    expect(detail.status).toEqual({ isActive: false, label: 'SUSPENDED' });
    expect(detail.quickActions).toEqual([
      {
        id: 'activateTenant',
        label: 'Réactiver le tenant',
        enabled: true,
      },
      {
        id: 'createAdmin',
        label: 'Créer un admin tenant',
        enabled: false,
        reason: 'Tenant suspendu',
      },
      {
        id: 'reviewAdmins',
        label: 'Vérifier les administrateurs',
        enabled: false,
        reason: 'Aucun administrateur tenant',
      },
      {
        id: 'openAuditTrail',
        label: 'Consulter les audits',
        enabled: true,
      },
    ]);
  });

  it('builds a synthetic detail when the tenant exists only through scoped agents', async () => {
    const auditQueryBuilder = createAuditQueryBuilder([], 2);
    ghtRepository.findOne.mockResolvedValue(null);
    agentRepository.find.mockResolvedValue([
      {
        id: 12,
        email: 'admin@legacy.test',
        nom: 'Admin Legacy',
        role: 'ADMIN',
        status: 'ACTIVE',
        dbRole: null,
      },
    ]);
    agentRepository.count.mockResolvedValue(6);
    hospitalServiceRepository.count.mockResolvedValue(1);
    shiftRepository.count.mockResolvedValue(8);
    leaveRepository.count.mockResolvedValue(1);
    auditLogRepository.createQueryBuilder.mockReturnValue(auditQueryBuilder);

    const detail = await service.getTenantDetail('legacy tenant');

    expect(detail.tenant).toEqual({
      id: 'LEGACY-TENANT',
      name: 'LEGACY-TENANT',
      region: null,
      contactEmail: null,
      isActive: true,
      createdAt: null,
      updatedAt: null,
    });
    expect(detail.counts.agents).toBe(6);
    expect(detail.status).toEqual({ isActive: true, label: 'ACTIVE' });
  });

  it('throws when the tenant does not exist', async () => {
    ghtRepository.findOne.mockResolvedValue(null);
    agentRepository.count.mockResolvedValue(0);

    await expect(service.getTenantDetail('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
