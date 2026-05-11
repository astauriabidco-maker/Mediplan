import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
} from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { Ght } from '../ght/entities/ght.entity';
import {
  CreatePlatformTenantDto,
  CreateTenantAdminDto,
  UpdatePlatformTenantDto,
  assertNonEmptyString,
  normalizeOptionalEmail,
  normalizeTenantId,
} from './dto/platform.dto';
import { PlatformInvitationsService } from './platform-invitations.service';
import { PlatformSettingsService } from './platform-settings.service';

export interface PlatformTenantSummary {
  id: string;
  name: string;
  region: string | null;
  contactEmail: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: Date | null;
}

export interface PlatformActor {
  id: number;
  email?: string;
}

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Ght)
    private readonly ghtRepository: Repository<Ght>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly auditService: AuditService,
    private readonly platformInvitationsService: PlatformInvitationsService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  async getTenantSummaries(): Promise<PlatformTenantSummary[]> {
    const [ghts, agentCounts] = await Promise.all([
      this.ghtRepository.find({ order: { name: 'ASC' } }),
      this.agentRepository
        .createQueryBuilder('agent')
        .select('agent.tenantId', 'tenantId')
        .addSelect('COUNT(agent.id)', 'userCount')
        .groupBy('agent.tenantId')
        .getRawMany<{ tenantId: string; userCount: string }>(),
    ]);

    const summaries = new Map<string, PlatformTenantSummary>();

    for (const ght of ghts) {
      summaries.set(ght.id, {
        id: ght.id,
        name: ght.name,
        region: ght.region ?? null,
        contactEmail: ght.contactEmail ?? null,
        isActive: ght.isActive,
        userCount: 0,
        createdAt: ght.createdAt ?? null,
      });
    }

    for (const count of agentCounts) {
      const tenantId = count.tenantId || 'DEFAULT_TENANT';
      const existing = summaries.get(tenantId);
      const userCount = Number(count.userCount) || 0;

      summaries.set(tenantId, {
        id: tenantId,
        name: existing?.name ?? tenantId,
        region: existing?.region ?? null,
        contactEmail: existing?.contactEmail ?? null,
        isActive: existing?.isActive ?? true,
        userCount,
        createdAt: existing?.createdAt ?? null,
      });
    }

    return Array.from(summaries.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  async getPlatformUser(userId: number) {
    const agent = await this.agentRepository.findOne({
      where: { id: userId },
      relations: ['dbRole'],
    });

    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      email: agent.email,
      nom: agent.nom,
      tenantId: agent.tenantId,
      role: agent.dbRole?.name ?? agent.role,
      status: agent.status,
    };
  }

  async createTenant(input: CreatePlatformTenantDto, actor: PlatformActor) {
    const name = assertNonEmptyString(input.name, 'name');
    const tenantId = normalizeTenantId(input.id ?? name);
    const existing = await this.ghtRepository.findOne({
      where: { id: tenantId },
    });

    if (existing) {
      throw new ConflictException(`Tenant ${tenantId} already exists`);
    }

    const tenantDefaults =
      await this.platformSettingsService.getTenantDefaults();
    const tenant = await this.ghtRepository.save(
      this.ghtRepository.create({
        id: tenantId,
        name,
        region: assertNonEmptyString(
          input.region ?? tenantDefaults.region,
          'region',
          80,
        ),
        contactEmail:
          normalizeOptionalEmail(
            input.contactEmail ?? tenantDefaults.contactEmail,
          ) ?? undefined,
        isActive: input.isActive ?? tenantDefaults.isActive,
      }),
    );

    await this.logPlatformAudit(
      actor,
      AuditAction.CREATE,
      AuditEntityType.PLATFORM_TENANT,
      tenant.id,
      {
        action: 'CREATE_PLATFORM_TENANT',
        tenantId: tenant.id,
        name: tenant.name,
        isActive: tenant.isActive,
      },
    );

    return this.toTenantSummary(tenant, 0);
  }

  async updateTenant(
    tenantIdInput: string,
    input: UpdatePlatformTenantDto,
    actor: PlatformActor,
  ) {
    const tenantId = normalizeTenantId(tenantIdInput);
    const tenant = await this.getTenantOrThrow(tenantId);

    if (input.name !== undefined) {
      tenant.name = assertNonEmptyString(input.name, 'name');
    }
    if (input.region !== undefined) {
      tenant.region = assertNonEmptyString(input.region, 'region', 80);
    }
    if (input.contactEmail !== undefined) {
      const mutableTenant = tenant as unknown as {
        contactEmail: string | null;
      };
      mutableTenant.contactEmail = normalizeOptionalEmail(input.contactEmail);
    }
    if (input.isActive !== undefined) {
      tenant.isActive = Boolean(input.isActive);
    }

    const saved = await this.ghtRepository.save(tenant);
    const userCount = await this.countTenantUsers(saved.id);

    await this.logPlatformAudit(
      actor,
      AuditAction.UPDATE,
      AuditEntityType.PLATFORM_TENANT,
      saved.id,
      {
        action: 'UPDATE_PLATFORM_TENANT',
        tenantId: saved.id,
        fields: Object.keys(input),
      },
    );

    return this.toTenantSummary(saved, userCount);
  }

  async suspendTenant(tenantIdInput: string, actor: PlatformActor) {
    return this.updateTenant(tenantIdInput, { isActive: false }, actor);
  }

  async activateTenant(tenantIdInput: string, actor: PlatformActor) {
    return this.updateTenant(tenantIdInput, { isActive: true }, actor);
  }

  async listTenantUsers(tenantIdInput: string) {
    const tenantId = normalizeTenantId(tenantIdInput);
    await this.getTenantOrThrow(tenantId);
    const users = await this.agentRepository.find({
      where: { tenantId },
      relations: ['dbRole'],
      order: { nom: 'ASC', email: 'ASC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.dbRole?.name ?? user.role,
      status: user.status,
      tenantId: user.tenantId,
    }));
  }

  async createTenantAdmin(
    tenantIdInput: string,
    input: CreateTenantAdminDto,
    actor: PlatformActor,
  ) {
    const tenantId = normalizeTenantId(tenantIdInput);
    await this.getTenantOrThrow(tenantId);

    return this.platformInvitationsService.inviteTenantAdmin(
      tenantId,
      input,
      actor,
    );
  }

  async listPlatformAudit(limit = 100) {
    const boundedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .where('audit.tenantId = :platformTenant', { platformTenant: 'PLATFORM' })
      .orWhere('audit.entityType = :impersonationType', {
        impersonationType: AuditEntityType.TENANT_IMPERSONATION,
      })
      .orderBy('audit.timestamp', 'DESC')
      .take(boundedLimit)
      .getMany();
  }

  private async getTenantOrThrow(tenantId: string) {
    const tenant = await this.ghtRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    return tenant;
  }

  private async countTenantUsers(tenantId: string) {
    return this.agentRepository.count({ where: { tenantId } });
  }

  private toTenantSummary(
    tenant: Ght,
    userCount: number,
  ): PlatformTenantSummary {
    return {
      id: tenant.id,
      name: tenant.name,
      region: tenant.region ?? null,
      contactEmail: tenant.contactEmail ?? null,
      isActive: tenant.isActive,
      userCount,
      createdAt: tenant.createdAt ?? null,
    };
  }

  private async logPlatformAudit(
    actor: PlatformActor,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | number,
    details: Record<string, unknown>,
  ) {
    return this.auditService.log(
      'PLATFORM',
      actor.id,
      action,
      entityType,
      entityId,
      {
        ...details,
        actorEmail: actor.email,
      },
    );
  }
}
