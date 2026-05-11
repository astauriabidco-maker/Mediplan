import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, UserRole, UserStatus } from '../agents/entities/agent.entity';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { Role } from '../auth/entities/role.entity';
import { HOSPITAL_ROLE_PERMISSIONS } from '../auth/permissions';
import { MailService } from '../mail/mail.service';
import {
  CreateTenantAdminDto,
  assertNonEmptyString,
  normalizeRequiredEmail,
} from './dto/platform.dto';
import { generatePlatformInvitationToken } from './platform-invitation-token';
import { PlatformSettingsService } from './platform-settings.service';
import type { PlatformActor } from './platform.service';

export interface PlatformTenantAdminInvitation {
  id: number;
  email: string;
  nom: string;
  tenantId: string;
  role: UserRole.ADMIN | UserRole.SUPER_ADMIN;
  status: UserStatus.INVITED;
  invitationSent: true;
}

@Injectable()
export class PlatformInvitationsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  async inviteTenantAdmin(
    tenantId: string,
    input: CreateTenantAdminDto,
    actor: PlatformActor,
  ): Promise<PlatformTenantAdminInvitation> {
    const email = normalizeRequiredEmail(input.email);
    const fullName = assertNonEmptyString(input.fullName ?? email, 'fullName');
    const roleName = input.role ?? UserRole.ADMIN;
    await this.platformSettingsService.validateTenantAdminCreation(input);

    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(roleName)) {
      throw new BadRequestException('role must be ADMIN or SUPER_ADMIN');
    }

    const role = await this.ensureTenantRole(tenantId, roleName);
    const token = generatePlatformInvitationToken();
    const existing = await this.agentRepository.findOne({
      where: { tenantId, email },
      select: [
        'id',
        'email',
        'nom',
        'firstName',
        'lastName',
        'role',
        'roleId',
        'status',
        'invitationToken',
        'tenantId',
        'matricule',
        'telephone',
      ],
    });

    if (existing && existing.status !== UserStatus.INVITED) {
      throw new ConflictException(
        `User ${email} already exists on ${tenantId}`,
      );
    }

    const user = existing ?? this.createInvitedAdmin(tenantId, email);
    user.nom = fullName;
    user.firstName = fullName.split(' ')[0] ?? fullName;
    user.lastName = fullName.split(' ').slice(1).join(' ');
    user.role = roleName;
    user.roleId = role.id;
    user.status = UserStatus.INVITED;
    user.invitationToken = token;

    const saved = await this.agentRepository.save(user);
    await this.mailService.sendInvitation(email, token);

    await this.auditService.log(
      'PLATFORM',
      actor.id,
      existing ? AuditAction.UPDATE : AuditAction.CREATE,
      AuditEntityType.PLATFORM_USER,
      saved.id,
      {
        action: existing ? 'REINVITE_TENANT_ADMIN' : 'INVITE_TENANT_ADMIN',
        tenantId,
        userId: saved.id,
        role: roleName,
        actorEmail: actor.email,
      },
    );

    return {
      id: saved.id,
      email: saved.email,
      nom: saved.nom,
      tenantId: saved.tenantId,
      role: roleName,
      status: UserStatus.INVITED,
      invitationSent: true,
    };
  }

  private createInvitedAdmin(tenantId: string, email: string) {
    return this.agentRepository.create({
      tenantId,
      email,
      nom: email,
      role: UserRole.ADMIN,
      status: UserStatus.INVITED,
      matricule: `INV-${tenantId}-${Date.now()}`,
      telephone: 'N/A',
    });
  }

  private async ensureTenantRole(tenantId: string, roleName: UserRole) {
    const existing = await this.roleRepository.findOne({
      where: { tenantId, name: roleName },
    });
    if (existing) return existing;

    const definition = HOSPITAL_ROLE_PERMISSIONS[roleName];
    return this.roleRepository.save(
      this.roleRepository.create({
        name: definition.name,
        description: definition.description,
        permissions: definition.permissions,
        isSystem: true,
        tenantId,
      }),
    );
  }
}
