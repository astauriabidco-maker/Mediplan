import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Agent,
  UserStatus,
  isPlatformRole,
} from '../agents/entities/agent.entity';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import { getDefaultPermissionsForRole } from './permissions';
import { AuditService } from '../audit/audit.service';
import type {
  AuthenticatedUser,
  TenantImpersonationContext,
} from './authenticated-request';
import { PlatformSettingsService } from '../platform/platform-settings.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    private jwtService: JwtService,
    private mailService: MailService,
    private auditService: AuditService,
    private platformSettingsService: PlatformSettingsService,
  ) {}

  async inviteUser(
    email: string,
    roleId: number,
    tenantId: string,
  ): Promise<Agent> {
    const token = crypto.randomBytes(32).toString('hex');

    // Check if user already exists
    let agent = await this.agentRepository.findOne({ where: { email } });

    if (agent) {
      if (agent.status !== UserStatus.INVITED) {
        throw new Error('User already exists and is not in invited status');
      }
      // Update existing invited user with new token/role
      agent.invitationToken = token;
      agent.roleId = roleId;
    } else {
      // Create new user (Agent entity)
      const name = email.split('@')[0];
      agent = this.agentRepository.create({
        email,
        nom: name,
        roleId,
        status: UserStatus.INVITED,
        invitationToken: token,
        tenantId,
        matricule: `INV-${Date.now()}`,
        telephone: 'N/A',
      });
    }

    await this.agentRepository.save(agent);
    await this.mailService.sendInvitation(email, token);

    return agent;
  }

  async acceptInvite(token: string, password: string): Promise<any> {
    const agent = await this.agentRepository.findOne({
      where: { invitationToken: token },
      relations: ['dbRole'],
      select: [
        'id',
        'email',
        'password',
        'status',
        'invitationToken',
        'tenantId',
        'role',
        'roleId',
      ],
    });

    if (!agent) {
      throw new UnauthorizedException('Invalid or expired invitation token');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    agent.password = hashedPassword;
    agent.status = UserStatus.ACTIVE;
    agent.invitationToken = null;

    await this.agentRepository.save(agent);

    return this.login(agent);
  }

  async changePassword(
    agentId: number,
    oldPass: string,
    newPass: string,
  ): Promise<void> {
    const agent = await this.agentRepository
      .createQueryBuilder('agent')
      .addSelect('agent.password')
      .where('agent.id = :id', { id: agentId })
      .getOne();

    if (!agent || !agent.password) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(oldPass, agent.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    agent.password = await bcrypt.hash(newPass, 10);
    await this.agentRepository.save(agent);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    // Explicitly select password as it is hidden by default
    const user = await this.agentRepository
      .createQueryBuilder('agent')
      .addSelect('agent.password')
      .leftJoinAndSelect('agent.dbRole', 'role')
      .where('agent.email = :email', { email })
      .getOne();

    if (!user || !user.password) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (isMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const tenantId = payload.tenant ?? null;

    return {
      id: userId,
      userId,
      sub: userId,
      email: payload.username,
      tenantId,
      tenant: tenantId,
      role: payload.role,
      permissions: payload.permissions || [],
      impersonation: payload.impersonation,
    };
  }

  async login(user: any) {
    const roleName = user.dbRole?.name || user.role;
    const permissions = user.dbRole?.permissions?.length
      ? user.dbRole.permissions
      : getDefaultPermissionsForRole(roleName);
    const tenantId = isPlatformRole(roleName)
      ? null
      : user.tenantId || 'DEFAULT_TENANT';

    const payload = {
      username: user.email,
      sub: user.id,
      tenant: tenantId,
      role: roleName,
      permissions: permissions,
    };
    return {
      access_token: this.jwtService.sign(
        payload,
        await this.getSessionSignOptions(),
      ),
      user: {
        id: user.id,
        email: user.email,
        tenantId,
        role: roleName,
        permissions: permissions,
      },
    };
  }

  async startTenantImpersonation(
    actor: AuthenticatedUser,
    targetTenantId: string,
    reason?: string,
  ) {
    const normalizedTargetTenantId = targetTenantId?.trim();
    if (!normalizedTargetTenantId) {
      throw new BadRequestException('Target tenant is required');
    }
    if (!isPlatformRole(actor.role)) {
      throw new ForbiddenException(
        'Tenant impersonation is restricted to platform super administrators',
      );
    }
    if (actor.impersonation?.active) {
      throw new BadRequestException('Already impersonating a tenant');
    }
    if (actor.tenantId && normalizedTargetTenantId === actor.tenantId) {
      throw new BadRequestException(
        'Target tenant must differ from the current tenant',
      );
    }

    const normalizedReason =
      await this.platformSettingsService.validateImpersonationReason(reason);
    const startedAt = new Date().toISOString();
    const impersonation: TenantImpersonationContext = {
      active: true,
      actorId: actor.id,
      actorEmail: actor.email,
      sourceTenantId: actor.tenantId,
      targetTenantId: normalizedTargetTenantId,
      startedAt,
      reason: normalizedReason,
    };

    await this.auditService.logTenantImpersonationStart({
      actorId: actor.id,
      actorEmail: actor.email,
      sourceTenantId: actor.tenantId,
      targetTenantId: normalizedTargetTenantId,
      reason: normalizedReason,
      startedAt,
    });

    return this.issueAccessToken({
      id: actor.id,
      email: actor.email,
      tenantId: normalizedTargetTenantId,
      role: actor.role,
      permissions: actor.permissions || [],
      impersonation,
    });
  }

  async stopTenantImpersonation(actor: AuthenticatedUser, reason?: string) {
    const impersonation = actor.impersonation;
    if (!impersonation?.active) {
      throw new BadRequestException('No active tenant impersonation');
    }

    const stoppedAt = new Date().toISOString();
    await this.auditService.logTenantImpersonationStop({
      actorId: impersonation.actorId,
      actorEmail: impersonation.actorEmail,
      sourceTenantId: impersonation.sourceTenantId,
      targetTenantId: impersonation.targetTenantId,
      reason,
      startedAt: impersonation.startedAt,
      stoppedAt,
    });

    return this.issueAccessToken({
      id: impersonation.actorId,
      email: impersonation.actorEmail,
      tenantId: impersonation.sourceTenantId,
      role: actor.role,
      permissions: actor.permissions || [],
    });
  }

  // SSO Ségur de la Santé (Pro Santé Connect) - Mock Implementation
  async loginWithProSanteConnect(rpps: string, userinfo: any) {
    // En vrai: Vérifier la signature du token OIDC Ségur
    // Rechercher l'agent correspondant via son NIR/RPPS (ici stocké dans nir ou matricule)
    const agent = await this.agentRepository.findOne({
      where: [{ matricule: rpps }, { nir: rpps }],
      relations: ['dbRole'],
    });

    if (!agent) {
      throw new UnauthorizedException(
        `Aucun compte rattaché au RPPS ${rpps}. Accès refusé selon la norme Ségur.`,
      );
    }

    if (agent.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Connexion réussie, création du JWT interne
    return this.login(agent);
  }

  private async issueAccessToken(user: {
    id: number;
    email: string;
    tenantId: string | null;
    role: string;
    permissions: string[];
    impersonation?: TenantImpersonationContext;
  }) {
    const payload = {
      username: user.email,
      sub: user.id,
      tenant: user.tenantId,
      role: user.role,
      permissions: user.permissions,
      impersonation: user.impersonation,
    };

    return {
      access_token: this.jwtService.sign(
        payload,
        await this.getSessionSignOptions(),
      ),
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        permissions: user.permissions,
        impersonation: user.impersonation,
      },
    };
  }

  private async getSessionSignOptions() {
    const minutes =
      await this.platformSettingsService.getSessionDurationMinutes();
    return { expiresIn: minutes * 60 };
  }
}
