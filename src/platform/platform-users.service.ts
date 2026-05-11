import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Agent, UserRole, UserStatus } from '../agents/entities/agent.entity';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { Role } from '../auth/entities/role.entity';
import { HOSPITAL_ROLE_PERMISSIONS } from '../auth/permissions';
import {
  assertNonEmptyString,
  normalizeRequiredEmail,
} from './dto/platform.dto';
import type { PlatformActor } from './platform.service';

export interface CreatePlatformUserDto {
  email?: string;
  fullName?: string;
  password?: string;
}

export interface ResetPlatformUserPasswordDto {
  password?: string;
}

const PLATFORM_TENANT_ID = 'PLATFORM';
const DEFAULT_PHONE = 'N/A';

@Injectable()
export class PlatformUsersService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  async listPlatformUsers() {
    const users = await this.agentRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.dbRole', 'role')
      .where('agent.role::text = :role', {
        role: UserRole.PLATFORM_SUPER_ADMIN,
      })
      .orWhere('role.name = :role', { role: UserRole.PLATFORM_SUPER_ADMIN })
      .orderBy('agent.nom', 'ASC')
      .addOrderBy('agent.email', 'ASC')
      .getMany();

    return users.map((user) => this.toPlatformUserSummary(user));
  }

  async createPlatformUser(input: CreatePlatformUserDto, actor: PlatformActor) {
    const email = normalizeRequiredEmail(input.email);
    const fullName = assertNonEmptyString(input.fullName ?? email, 'fullName');
    const password = this.resolvePassword(input.password);

    const existing = await this.findPlatformUserByEmail(email);
    if (existing) {
      throw new ConflictException(`Platform user ${email} already exists`);
    }

    const role = await this.ensurePlatformRole();
    const [firstName, ...lastNameParts] = fullName.split(/\s+/);
    const user = await this.agentRepository.save(
      this.agentRepository.create({
        tenantId: PLATFORM_TENANT_ID,
        email,
        nom: fullName,
        firstName,
        lastName: lastNameParts.join(' ') || undefined,
        role: UserRole.PLATFORM_SUPER_ADMIN,
        roleId: role.id,
        status: UserStatus.ACTIVE,
        matricule: `PSA-${Date.now()}`,
        telephone: DEFAULT_PHONE,
        password: await bcrypt.hash(password, 10),
      }),
    );

    await this.logPlatformUserAudit(
      actor,
      AuditAction.CREATE,
      user.id,
      'CREATE_PLATFORM_SUPER_ADMIN',
      { role: UserRole.PLATFORM_SUPER_ADMIN, status: user.status },
    );

    return {
      ...this.toPlatformUserSummary(user),
      initialPassword: password,
    };
  }

  async disablePlatformUser(userId: number, actor: PlatformActor) {
    if (userId === actor.id) {
      throw new ForbiddenException('A platform user cannot disable their own account');
    }

    const user = await this.getPlatformUserOrThrow(userId);
    const beforeStatus = user.status;
    user.status = UserStatus.DISABLED;
    const saved = await this.agentRepository.save(user);

    await this.logPlatformUserAudit(
      actor,
      AuditAction.UPDATE,
      saved.id,
      'DISABLE_PLATFORM_SUPER_ADMIN',
      { beforeStatus, afterStatus: saved.status },
    );

    return this.toPlatformUserSummary(saved);
  }

  async reactivatePlatformUser(userId: number, actor: PlatformActor) {
    const user = await this.getPlatformUserOrThrow(userId);
    const beforeStatus = user.status;
    user.status = UserStatus.ACTIVE;
    const saved = await this.agentRepository.save(user);

    await this.logPlatformUserAudit(
      actor,
      AuditAction.UPDATE,
      saved.id,
      'REACTIVATE_PLATFORM_SUPER_ADMIN',
      { beforeStatus, afterStatus: saved.status },
    );

    return this.toPlatformUserSummary(saved);
  }

  async resetPlatformUserPassword(
    userId: number,
    input: ResetPlatformUserPasswordDto,
    actor: PlatformActor,
  ) {
    const user = await this.getPlatformUserOrThrow(userId);
    const temporaryPassword = this.resolvePassword(input.password);
    user.password = await bcrypt.hash(temporaryPassword, 10);
    const saved = await this.agentRepository.save(user);

    await this.logPlatformUserAudit(
      actor,
      AuditAction.UPDATE,
      saved.id,
      'RESET_PLATFORM_SUPER_ADMIN_PASSWORD',
      { passwordRotated: true, status: saved.status },
    );

    return {
      ...this.toPlatformUserSummary(saved),
      temporaryPassword,
    };
  }

  private async findPlatformUserByEmail(email: string) {
    return this.agentRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.dbRole', 'role')
      .where('LOWER(agent.email) = :email', { email })
      .andWhere('(agent.role::text = :role OR role.name = :role)', {
        role: UserRole.PLATFORM_SUPER_ADMIN,
      })
      .getOne();
  }

  private async getPlatformUserOrThrow(userId: number) {
    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('userId must be a positive integer');
    }

    const user = await this.agentRepository.findOne({
      where: { id: userId },
      relations: ['dbRole'],
    });

    if (
      !user ||
      (user.role !== UserRole.PLATFORM_SUPER_ADMIN &&
        user.dbRole?.name !== UserRole.PLATFORM_SUPER_ADMIN)
    ) {
      throw new NotFoundException(`Platform user ${userId} not found`);
    }

    return user;
  }

  private async ensurePlatformRole() {
    const existing = await this.roleRepository.findOne({
      where: {
        tenantId: PLATFORM_TENANT_ID,
        name: UserRole.PLATFORM_SUPER_ADMIN,
      },
    });
    if (existing) return existing;

    const definition = HOSPITAL_ROLE_PERMISSIONS[UserRole.PLATFORM_SUPER_ADMIN];
    return this.roleRepository.save(
      this.roleRepository.create({
        name: definition.name,
        description: definition.description,
        permissions: definition.permissions,
        isSystem: true,
        tenantId: PLATFORM_TENANT_ID,
      }),
    );
  }

  private resolvePassword(password?: string) {
    const resolved = password?.trim() || this.generateTemporaryPassword();
    if (resolved.length < 8) {
      throw new BadRequestException('password must contain at least 8 characters');
    }
    return resolved;
  }

  private generateTemporaryPassword() {
    return `Mp-${randomBytes(12).toString('base64url')}`;
  }

  private toPlatformUserSummary(user: Agent) {
    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      tenantId: user.tenantId ?? null,
      role: user.dbRole?.name ?? user.role,
      status: user.status,
    };
  }

  private async logPlatformUserAudit(
    actor: PlatformActor,
    action: AuditAction,
    entityId: string | number,
    detailAction: string,
    details: Record<string, unknown>,
  ) {
    return this.auditService.log(
      PLATFORM_TENANT_ID,
      actor.id,
      action,
      AuditEntityType.PLATFORM_USER,
      entityId,
      {
        action: detailAction,
        ...details,
        actorEmail: actor.email,
      },
    );
  }
}
