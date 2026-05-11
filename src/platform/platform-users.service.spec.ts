import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Agent, UserRole, UserStatus } from '../agents/entities/agent.entity';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { Role } from '../auth/entities/role.entity';
import { PlatformUsersService } from './platform-users.service';

const actor = {
  id: 1,
  email: 'root@platform.test',
};

const platformUser = (overrides: Partial<Agent> = {}) =>
  ({
    id: 10,
    email: 'admin@platform.test',
    nom: 'Admin Platform',
    tenantId: 'PLATFORM',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    dbRole: { name: UserRole.PLATFORM_SUPER_ADMIN },
    status: UserStatus.ACTIVE,
    ...overrides,
  }) as Agent;

const createQueryBuilderMock = () => {
  const builder = {
    leftJoinAndSelect: jest.fn(() => builder),
    where: jest.fn(() => builder),
    orWhere: jest.fn(() => builder),
    andWhere: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    addOrderBy: jest.fn(() => builder),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  return builder;
};

const createRepositoryMock = () => ({
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ ...data, id: data.id ?? 99 })),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('PlatformUsersService', () => {
  let service: PlatformUsersService;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let roleRepository: ReturnType<typeof createRepositoryMock>;
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    agentRepository = createRepositoryMock();
    roleRepository = createRepositoryMock();
    auditService = { log: jest.fn(async () => ({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformUsersService,
        { provide: getRepositoryToken(Agent), useValue: agentRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(PlatformUsersService);
  });

  it('lists only platform super administrator accounts', async () => {
    const qb = createQueryBuilderMock();
    qb.getMany.mockResolvedValue([platformUser()]);
    agentRepository.createQueryBuilder.mockReturnValue(qb);

    await expect(service.listPlatformUsers()).resolves.toEqual([
      {
        id: 10,
        email: 'admin@platform.test',
        nom: 'Admin Platform',
        tenantId: 'PLATFORM',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    ]);

    expect(qb.where).toHaveBeenCalledWith('agent.role::text = :role', {
      role: UserRole.PLATFORM_SUPER_ADMIN,
    });
    expect(qb.orWhere).toHaveBeenCalledWith('role.name = :role', {
      role: UserRole.PLATFORM_SUPER_ADMIN,
    });
  });

  it('creates a PLATFORM_SUPER_ADMIN account with the platform role and audit', async () => {
    const qb = createQueryBuilderMock();
    qb.getOne.mockResolvedValue(null);
    agentRepository.createQueryBuilder.mockReturnValue(qb);
    roleRepository.findOne.mockResolvedValue({
      id: 4,
      name: UserRole.PLATFORM_SUPER_ADMIN,
      tenantId: 'PLATFORM',
    });

    const result = await service.createPlatformUser(
      {
        email: 'NEW@PLATFORM.TEST',
        fullName: 'New Root',
        password: 'Temporary123',
      },
      actor,
    );

    expect(agentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'PLATFORM',
        email: 'new@platform.test',
        nom: 'New Root',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        roleId: 4,
        status: UserStatus.ACTIVE,
        password: expect.any(String),
      }),
    );
    const createdArg = agentRepository.create.mock.calls[0][0];
    await expect(bcrypt.compare('Temporary123', createdArg.password)).resolves.toBe(
      true,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        email: 'new@platform.test',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        initialPassword: 'Temporary123',
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'PLATFORM',
      1,
      AuditAction.CREATE,
      AuditEntityType.PLATFORM_USER,
      99,
      expect.objectContaining({
        action: 'CREATE_PLATFORM_SUPER_ADMIN',
        role: UserRole.PLATFORM_SUPER_ADMIN,
      }),
    );
    expect(auditService.log.mock.calls[0][5]).not.toHaveProperty('password');
  });

  it('rejects duplicate platform users', async () => {
    const qb = createQueryBuilderMock();
    qb.getOne.mockResolvedValue(platformUser());
    agentRepository.createQueryBuilder.mockReturnValue(qb);

    await expect(
      service.createPlatformUser(
        { email: 'admin@platform.test', fullName: 'Admin Platform' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(agentRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('creates the system platform role when it is missing', async () => {
    const qb = createQueryBuilderMock();
    qb.getOne.mockResolvedValue(null);
    agentRepository.createQueryBuilder.mockReturnValue(qb);
    roleRepository.findOne.mockResolvedValue(null);

    await service.createPlatformUser(
      { email: 'new@platform.test', fullName: 'New Root' },
      actor,
    );

    expect(roleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'PLATFORM',
        name: UserRole.PLATFORM_SUPER_ADMIN,
        isSystem: true,
        permissions: expect.arrayContaining(['platform:*']),
      }),
    );
  });

  it('disables a platform user and audits the status transition', async () => {
    agentRepository.findOne.mockResolvedValue(platformUser());

    await expect(service.disablePlatformUser(10, actor)).resolves.toEqual(
      expect.objectContaining({ status: UserStatus.DISABLED }),
    );

    expect(agentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, status: UserStatus.DISABLED }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'PLATFORM',
      1,
      AuditAction.UPDATE,
      AuditEntityType.PLATFORM_USER,
      10,
      expect.objectContaining({
        action: 'DISABLE_PLATFORM_SUPER_ADMIN',
        beforeStatus: UserStatus.ACTIVE,
        afterStatus: UserStatus.DISABLED,
      }),
    );
  });

  it('does not allow a platform user to disable their own account', async () => {
    await expect(service.disablePlatformUser(1, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(agentRepository.findOne).not.toHaveBeenCalled();
  });

  it('reactivates a disabled platform user', async () => {
    agentRepository.findOne.mockResolvedValue(
      platformUser({ status: UserStatus.DISABLED }),
    );

    await expect(service.reactivatePlatformUser(10, actor)).resolves.toEqual(
      expect.objectContaining({ status: UserStatus.ACTIVE }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'PLATFORM',
      1,
      AuditAction.UPDATE,
      AuditEntityType.PLATFORM_USER,
      10,
      expect.objectContaining({
        action: 'REACTIVATE_PLATFORM_SUPER_ADMIN',
        beforeStatus: UserStatus.DISABLED,
        afterStatus: UserStatus.ACTIVE,
      }),
    );
  });

  it('rotates a platform user password without writing it to audit details', async () => {
    const user = platformUser();
    agentRepository.findOne.mockResolvedValue(user);

    const result = await service.resetPlatformUserPassword(
      10,
      { password: 'Rotated123' },
      actor,
    );

    expect(result).toEqual(
      expect.objectContaining({ temporaryPassword: 'Rotated123' }),
    );
    await expect(bcrypt.compare('Rotated123', user.password ?? '')).resolves.toBe(
      true,
    );
    expect(auditService.log.mock.calls[0][5]).toEqual(
      expect.objectContaining({
        action: 'RESET_PLATFORM_SUPER_ADMIN_PASSWORD',
        passwordRotated: true,
      }),
    );
    expect(auditService.log.mock.calls[0][5]).not.toHaveProperty('password');
    expect(auditService.log.mock.calls[0][5]).not.toHaveProperty(
      'temporaryPassword',
    );
  });

  it('rejects short passwords', async () => {
    await expect(
      service.createPlatformUser(
        { email: 'new@platform.test', fullName: 'New Root', password: 'short' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-platform users on mutations', async () => {
    agentRepository.findOne.mockResolvedValue(
      platformUser({
        role: UserRole.ADMIN,
        dbRole: { name: UserRole.ADMIN } as Role,
      }),
    );

    await expect(service.reactivatePlatformUser(10, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
