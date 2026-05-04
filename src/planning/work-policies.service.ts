import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { WorkPolicy } from './entities/work-policy.entity';

export interface ResolvedWorkPolicyRules {
  restHoursAfterGuard: number;
  maxGuardDuration: number;
  maxWeeklyHours: number;
  onCallCompensationPercent: number;
  source:
    | 'service_grade'
    | 'grade'
    | 'service'
    | 'tenant_default'
    | 'system_default';
  policyId?: number;
}

type WorkPolicyRuleInput = Partial<
  Pick<
    WorkPolicy,
    | 'hospitalServiceId'
    | 'gradeId'
    | 'restHoursAfterGuard'
    | 'maxGuardDuration'
    | 'maxWeeklyHours'
    | 'onCallCompensationPercent'
  >
>;

@Injectable()
export class WorkPoliciesService {
  constructor(
    @InjectRepository(WorkPolicy)
    private workPoliciesRepository: Repository<WorkPolicy>,
    private auditService: AuditService,
  ) {}

  findAll(tenantId: string) {
    return this.workPoliciesRepository.find({
      where: { tenantId },
      relations: ['hospitalService', 'grade'],
    });
  }

  async create(tenantId: string, data: Partial<WorkPolicy>, actorId?: number) {
    const normalizedData = this.validateAndNormalizePolicyData(data);
    await this.assertUniqueScope(tenantId, normalizedData);

    const policy = this.workPoliciesRepository.create({
      ...normalizedData,
      tenantId,
    });
    const savedPolicy = await this.workPoliciesRepository.save(policy);

    if (actorId) {
      await this.auditService.log(
        tenantId,
        actorId,
        AuditAction.CREATE,
        AuditEntityType.WORK_POLICY,
        savedPolicy.id,
        {
          action: 'CREATE_WORK_POLICY',
          after: this.getPolicySnapshot(savedPolicy),
        },
      );
    }

    return savedPolicy;
  }

  async update(
    tenantId: string,
    id: number,
    data: Partial<WorkPolicy>,
    actorId?: number,
  ) {
    const policy = await this.workPoliciesRepository.findOne({
      where: { id, tenantId },
    });
    if (!policy) {
      throw new NotFoundException('Work policy not found');
    }

    const before = this.getPolicySnapshot(policy);
    const normalizedData = this.validateAndNormalizePolicyData(data, policy);
    await this.assertUniqueScope(tenantId, normalizedData, id);

    Object.assign(policy, normalizedData, { tenantId });
    const savedPolicy = await this.workPoliciesRepository.save(policy);

    if (actorId) {
      await this.auditService.log(
        tenantId,
        actorId,
        AuditAction.UPDATE,
        AuditEntityType.WORK_POLICY,
        savedPolicy.id,
        {
          action: 'UPDATE_WORK_POLICY',
          before,
          after: this.getPolicySnapshot(savedPolicy),
        },
      );
    }

    return savedPolicy;
  }

  async remove(tenantId: string, id: number, actorId?: number) {
    const policy = await this.workPoliciesRepository.findOne({
      where: { id, tenantId },
    });
    if (!policy) {
      throw new NotFoundException('Work policy not found');
    }

    await this.workPoliciesRepository.delete({ id, tenantId });

    if (actorId) {
      await this.auditService.log(
        tenantId,
        actorId,
        AuditAction.DELETE,
        AuditEntityType.WORK_POLICY,
        id,
        {
          action: 'DELETE_WORK_POLICY',
          before: this.getPolicySnapshot(policy),
        },
      );
    }

    return { deleted: true };
  }

  async resolveForAgent(
    tenantId: string,
    agent: Agent,
  ): Promise<ResolvedWorkPolicyRules> {
    const defaults = this.getSystemDefaults();

    const candidates: Array<{
      source: ResolvedWorkPolicyRules['source'];
      where: FindOptionsWhere<WorkPolicy>;
      enabled: boolean;
    }> = [
      {
        source: 'service_grade',
        where: {
          tenantId,
          hospitalServiceId: agent.hospitalServiceId,
          gradeId: agent.gradeId,
        },
        enabled: !!agent.hospitalServiceId && !!agent.gradeId,
      },
      {
        source: 'grade',
        where: {
          tenantId,
          gradeId: agent.gradeId,
          hospitalServiceId: IsNull(),
        },
        enabled: !!agent.gradeId,
      },
      {
        source: 'service',
        where: {
          tenantId,
          hospitalServiceId: agent.hospitalServiceId,
          gradeId: IsNull(),
        },
        enabled: !!agent.hospitalServiceId,
      },
      {
        source: 'tenant_default',
        where: { tenantId, hospitalServiceId: IsNull(), gradeId: IsNull() },
        enabled: true,
      },
    ];

    for (const candidate of candidates) {
      if (!candidate.enabled) continue;

      const policy = await this.workPoliciesRepository.findOne({
        where: candidate.where,
      });
      if (policy) {
        return this.toResolvedRules(policy, candidate.source);
      }
    }

    return defaults;
  }

  private getSystemDefaults(): ResolvedWorkPolicyRules {
    return {
      restHoursAfterGuard: 24,
      maxGuardDuration: 24,
      maxWeeklyHours: 48,
      onCallCompensationPercent: 0,
      source: 'system_default',
    };
  }

  private toResolvedRules(
    policy: WorkPolicy,
    source: ResolvedWorkPolicyRules['source'],
  ): ResolvedWorkPolicyRules {
    return {
      restHoursAfterGuard: policy.restHoursAfterGuard,
      maxGuardDuration: policy.maxGuardDuration,
      maxWeeklyHours: policy.maxWeeklyHours,
      onCallCompensationPercent: policy.onCallCompensationPercent,
      source,
      policyId: policy.id,
    };
  }

  private validateAndNormalizePolicyData(
    data: WorkPolicyRuleInput,
    existing?: WorkPolicy,
  ): Required<WorkPolicyRuleInput> {
    const merged = {
      hospitalServiceId: existing?.hospitalServiceId ?? null,
      gradeId: existing?.gradeId ?? null,
      restHoursAfterGuard: existing?.restHoursAfterGuard ?? 24,
      maxGuardDuration: existing?.maxGuardDuration ?? 24,
      maxWeeklyHours: existing?.maxWeeklyHours ?? 48,
      onCallCompensationPercent: existing?.onCallCompensationPercent ?? 0,
      ...data,
    };

    const normalized = {
      hospitalServiceId: this.normalizeScopeId(
        merged.hospitalServiceId,
        'hospitalServiceId',
      ),
      gradeId: this.normalizeScopeId(merged.gradeId, 'gradeId'),
      restHoursAfterGuard: this.requireIntegerInRange(
        merged.restHoursAfterGuard,
        'restHoursAfterGuard',
        1,
        168,
      ),
      maxGuardDuration: this.requireIntegerInRange(
        merged.maxGuardDuration,
        'maxGuardDuration',
        1,
        48,
      ),
      maxWeeklyHours: this.requireIntegerInRange(
        merged.maxWeeklyHours,
        'maxWeeklyHours',
        1,
        168,
      ),
      onCallCompensationPercent: this.requireNumberInRange(
        merged.onCallCompensationPercent,
        'onCallCompensationPercent',
        0,
        1,
      ),
    };

    if (normalized.maxWeeklyHours < normalized.maxGuardDuration) {
      throw new BadRequestException(
        'maxWeeklyHours must be greater than or equal to maxGuardDuration',
      );
    }

    return normalized;
  }

  private normalizeScopeId(
    value: unknown,
    field: 'hospitalServiceId' | 'gradeId',
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(
        `${field} must be a positive integer when provided`,
      );
    }

    return value;
  }

  private requireIntegerInRange(
    value: unknown,
    field: string,
    min: number,
    max: number,
  ): number {
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < min ||
      value > max
    ) {
      throw new BadRequestException(
        `${field} must be an integer between ${min} and ${max}`,
      );
    }

    return value;
  }

  private requireNumberInRange(
    value: unknown,
    field: string,
    min: number,
    max: number,
  ): number {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    ) {
      throw new BadRequestException(
        `${field} must be a number between ${min} and ${max}`,
      );
    }

    return value;
  }

  private async assertUniqueScope(
    tenantId: string,
    policy: Pick<WorkPolicy, 'hospitalServiceId' | 'gradeId'>,
    excludePolicyId?: number,
  ): Promise<void> {
    const existingPolicy = await this.workPoliciesRepository.findOne({
      where: {
        tenantId,
        hospitalServiceId: policy.hospitalServiceId ?? IsNull(),
        gradeId: policy.gradeId ?? IsNull(),
      },
    });

    if (existingPolicy && existingPolicy.id !== excludePolicyId) {
      throw new ConflictException(
        'A work policy already exists for this tenant, service and grade scope',
      );
    }
  }

  private getPolicySnapshot(policy: WorkPolicy): Record<string, unknown> {
    return {
      id: policy.id,
      tenantId: policy.tenantId,
      hospitalServiceId: policy.hospitalServiceId,
      gradeId: policy.gradeId,
      restHoursAfterGuard: policy.restHoursAfterGuard,
      maxGuardDuration: policy.maxGuardDuration,
      maxWeeklyHours: policy.maxWeeklyHours,
      onCallCompensationPercent: policy.onCallCompensationPercent,
    };
  }
}
