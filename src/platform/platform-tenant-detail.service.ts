import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Agent, UserRole } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { AuditEntityType, AuditLog } from '../audit/entities/audit-log.entity';
import { Ght } from '../ght/entities/ght.entity';
import { Leave } from '../planning/entities/leave.entity';
import { Shift } from '../planning/entities/shift.entity';
import { normalizeTenantId } from './dto/platform.dto';

export interface PlatformTenantDetailAdmin {
  id: number;
  email: string;
  nom: string;
  role: string;
  status: string;
}

export interface PlatformTenantDetailCounts {
  agents: number;
  services: number;
  shifts: number;
  leaves: number;
  audits: number;
}

export interface PlatformTenantDetailAudit {
  id: number;
  timestamp: Date;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: {
    id: number;
    email: string | null;
    nom: string | null;
  } | null;
  details: unknown;
}

export interface PlatformTenantQuickAction {
  id: string;
  label: string;
  enabled: boolean;
  reason?: string;
}

export interface PlatformTenantDetail {
  tenant: {
    id: string;
    name: string;
    region: string | null;
    contactEmail: string | null;
    isActive: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  admins: PlatformTenantDetailAdmin[];
  counts: PlatformTenantDetailCounts;
  status: {
    isActive: boolean;
    label: 'ACTIVE' | 'SUSPENDED';
  };
  recentAudits: PlatformTenantDetailAudit[];
  quickActions: PlatformTenantQuickAction[];
}

@Injectable()
export class PlatformTenantDetailService {
  constructor(
    @InjectRepository(Ght)
    private readonly ghtRepository: Repository<Ght>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(HospitalService)
    private readonly hospitalServiceRepository: Repository<HospitalService>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async getTenantDetail(tenantIdInput: string): Promise<PlatformTenantDetail> {
    const tenantId = normalizeTenantId(tenantIdInput);
    const tenant = await this.ghtRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      const agentCount = await this.agentRepository.count({
        where: { tenantId },
      });
      if (agentCount === 0) {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      }
    }

    const [admins, counts, recentAudits] = await Promise.all([
      this.listTenantAdmins(tenantId),
      this.countTenantResources(tenantId),
      this.listRecentTenantAudits(tenantId),
    ]);

    return {
      tenant: {
        id: tenant?.id ?? tenantId,
        name: tenant?.name ?? tenantId,
        region: tenant?.region ?? null,
        contactEmail: tenant?.contactEmail ?? null,
        isActive: tenant?.isActive ?? true,
        createdAt: tenant?.createdAt ?? null,
        updatedAt: tenant?.updatedAt ?? null,
      },
      admins,
      counts,
      status: {
        isActive: tenant?.isActive ?? true,
        label: tenant?.isActive === false ? 'SUSPENDED' : 'ACTIVE',
      },
      recentAudits,
      quickActions: this.buildQuickActions(tenant?.isActive ?? true, admins.length),
    };
  }

  private async listTenantAdmins(
    tenantId: string,
  ): Promise<PlatformTenantDetailAdmin[]> {
    const admins = await this.agentRepository.find({
      where: {
        tenantId,
        role: In([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
      },
      relations: ['dbRole'],
      order: { nom: 'ASC', email: 'ASC' },
    });

    return admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      role: admin.dbRole?.name ?? admin.role,
      status: admin.status,
    }));
  }

  private async countTenantResources(
    tenantId: string,
  ): Promise<PlatformTenantDetailCounts> {
    const [agents, services, shifts, leaves, audits] = await Promise.all([
      this.agentRepository.count({ where: { tenantId } }),
      this.hospitalServiceRepository.count({ where: { tenantId } }),
      this.shiftRepository.count({ where: { tenantId } }),
      this.leaveRepository.count({ where: { tenantId } }),
      this.countTenantAudits(tenantId),
    ]);

    return { agents, services, shifts, leaves, audits };
  }

  private async countTenantAudits(tenantId: string): Promise<number> {
    return this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId })
      .orWhere(
        new Brackets((qb) => {
          qb.where('audit.entityType = :platformTenantType', {
            platformTenantType: AuditEntityType.PLATFORM_TENANT,
          }).andWhere('audit.entityId = :tenantId', { tenantId });
        }),
      )
      .getCount();
  }

  private async listRecentTenantAudits(
    tenantId: string,
  ): Promise<PlatformTenantDetailAudit[]> {
    const audits = await this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .where('audit.tenantId = :tenantId', { tenantId })
      .orWhere(
        new Brackets((qb) => {
          qb.where('audit.entityType = :platformTenantType', {
            platformTenantType: AuditEntityType.PLATFORM_TENANT,
          }).andWhere('audit.entityId = :tenantId', { tenantId });
        }),
      )
      .orderBy('audit.timestamp', 'DESC')
      .take(10)
      .getMany();

    return audits.map((audit) => {
      const details = (audit as { details?: unknown }).details ?? null;

      return {
        id: audit.id,
        timestamp: audit.timestamp,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId ?? null,
        actor: audit.actor
          ? {
              id: audit.actor.id,
              email: audit.actor.email ?? null,
              nom: audit.actor.nom ?? null,
            }
          : null,
        details,
      };
    });
  }

  private buildQuickActions(
    isActive: boolean,
    adminCount: number,
  ): PlatformTenantQuickAction[] {
    return [
      {
        id: isActive ? 'suspendTenant' : 'activateTenant',
        label: isActive ? 'Suspendre le tenant' : 'Réactiver le tenant',
        enabled: true,
      },
      {
        id: 'createAdmin',
        label: 'Créer un admin tenant',
        enabled: isActive,
        reason: isActive ? undefined : 'Tenant suspendu',
      },
      {
        id: 'reviewAdmins',
        label: 'Vérifier les administrateurs',
        enabled: adminCount > 0,
        reason: adminCount > 0 ? undefined : 'Aucun administrateur tenant',
      },
      {
        id: 'openAuditTrail',
        label: 'Consulter les audits',
        enabled: true,
      },
    ];
  }
}
