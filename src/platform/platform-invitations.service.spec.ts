import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Agent, UserRole, UserStatus } from '../agents/entities/agent.entity';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { Role } from '../auth/entities/role.entity';
import { MailService } from '../mail/mail.service';
import { PlatformInvitationsService } from './platform-invitations.service';
import { PlatformSettingsService } from './platform-settings.service';

const actor = {
  id: 7,
  email: 'platform@mediplan.test',
};

describe('PlatformInvitationsService', () => {
  type AgentInput = Partial<Agent>;
  type SavedAgent = AgentInput & { id: number };

  const agentRepository = {
    findOne: jest.fn(),
    create: jest.fn((input: AgentInput): Agent => input as Agent),
    save: jest.fn(
      (agent: AgentInput): SavedAgent => ({
        ...agent,
        id: agent.id ?? 42,
      }),
    ),
  };
  const roleRepository = {
    findOne: jest.fn(),
    create: jest.fn((input: Partial<Role>): Partial<Role> => input),
    save: jest.fn(),
  };
  const mailService = {
    sendInvitation: jest.fn(),
  };
  const auditService = {
    log: jest.fn(),
  };
  const platformSettingsService = {
    validateTenantAdminCreation: jest.fn(() => Promise.resolve(undefined)),
  };

  let service: PlatformInvitationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1778400000000);
    roleRepository.findOne.mockResolvedValue({
      id: 12,
      name: UserRole.ADMIN,
      permissions: ['agents:read'],
    });
    agentRepository.save.mockImplementation(
      (agent: AgentInput): SavedAgent => ({
        ...agent,
        id: agent.id ?? 42,
      }),
    );
    service = new PlatformInvitationsService(
      agentRepository as unknown as Repository<Agent>,
      roleRepository as unknown as Repository<Role>,
      mailService as unknown as MailService,
      auditService as unknown as AuditService,
      platformSettingsService as unknown as PlatformSettingsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a tenant admin invitation without password or active status', async () => {
    agentRepository.findOne.mockResolvedValue(null);

    await expect(
      service.inviteTenantAdmin(
        'TENANT-A',
        { email: ' Admin@Tenant.test ', fullName: 'Tenant Admin' },
        actor,
      ),
    ).resolves.toEqual({
      id: 42,
      email: 'admin@tenant.test',
      nom: 'Tenant Admin',
      tenantId: 'TENANT-A',
      role: UserRole.ADMIN,
      status: UserStatus.INVITED,
      invitationSent: true,
    });

    expect(agentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'TENANT-A',
        email: 'admin@tenant.test',
        status: UserStatus.INVITED,
        matricule: 'INV-TENANT-A-1778400000000',
      }),
    );
    expect(
      platformSettingsService.validateTenantAdminCreation,
    ).toHaveBeenCalledWith({
      email: ' Admin@Tenant.test ',
      fullName: 'Tenant Admin',
    });
    const saveCalls = agentRepository.save.mock.calls as Array<[AgentInput]>;
    const savedNewUser = saveCalls[0][0];
    expect(savedNewUser.password).toBeUndefined();
    expect(mailService.sendInvitation).toHaveBeenCalledWith(
      'admin@tenant.test',
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'PLATFORM',
      actor.id,
      AuditAction.CREATE,
      AuditEntityType.PLATFORM_USER,
      42,
      expect.objectContaining({
        action: 'INVITE_TENANT_ADMIN',
        tenantId: 'TENANT-A',
        userId: 42,
        role: UserRole.ADMIN,
      }),
    );
  });

  it('refreshes the token and role for an existing invited admin', async () => {
    agentRepository.findOne.mockResolvedValue({
      id: 99,
      email: 'admin@tenant.test',
      nom: 'Old Name',
      tenantId: 'TENANT-A',
      status: UserStatus.INVITED,
      invitationToken: 'old-token',
      role: UserRole.ADMIN,
      roleId: 12,
      matricule: 'INV-TENANT-A-1',
      telephone: 'N/A',
    });
    roleRepository.findOne.mockResolvedValue({
      id: 13,
      name: UserRole.SUPER_ADMIN,
      permissions: ['tenant:*'],
    });

    await expect(
      service.inviteTenantAdmin(
        'TENANT-A',
        {
          email: 'admin@tenant.test',
          fullName: 'Tenant Owner',
          role: UserRole.SUPER_ADMIN,
        },
        actor,
      ),
    ).resolves.toMatchObject({
      id: 99,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.INVITED,
    });

    const saveCalls = agentRepository.save.mock.calls as Array<[SavedAgent]>;
    const savedReinvite = saveCalls[0][0];
    expect(savedReinvite).toMatchObject({
      id: 99,
      nom: 'Tenant Owner',
      role: UserRole.SUPER_ADMIN,
      roleId: 13,
    });
    expect(savedReinvite.invitationToken).toMatch(/^[a-f0-9]{64}$/);
    expect(auditService.log).toHaveBeenCalledWith(
      'PLATFORM',
      actor.id,
      AuditAction.UPDATE,
      AuditEntityType.PLATFORM_USER,
      99,
      expect.objectContaining({ action: 'REINVITE_TENANT_ADMIN' }),
    );
  });

  it('rejects invitation when the tenant user already exists and is active', async () => {
    agentRepository.findOne.mockResolvedValue({
      id: 100,
      email: 'admin@tenant.test',
      tenantId: 'TENANT-A',
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.inviteTenantAdmin(
        'TENANT-A',
        { email: 'admin@tenant.test', fullName: 'Tenant Admin' },
        actor,
      ),
    ).rejects.toThrow(ConflictException);

    expect(mailService.sendInvitation).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
