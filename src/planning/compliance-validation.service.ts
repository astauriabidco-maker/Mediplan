import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Agent, UserStatus } from '../agents/entities/agent.entity';
import {
  HealthRecord,
  HealthRecordStatus,
} from '../agents/entities/health-record.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { SettingsService } from '../settings/settings.service';
import { Leave } from './entities/leave.entity';
import { Shift } from './entities/shift.entity';
import { WorkPoliciesService } from './work-policies.service';
import { ComplianceAlertService } from './compliance-alert.service';
import {
  ComplianceRuleCode,
  ShiftValidationOptions,
  ShiftValidationResult,
} from './compliance-validation.types';

export { ComplianceRuleCode } from './compliance-validation.types';
export type {
  ShiftValidationOptions,
  ShiftValidationResult,
} from './compliance-validation.types';

@Injectable()
export class ComplianceValidationService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(HealthRecord)
    private healthRecordRepository: Repository<HealthRecord>,
    @InjectRepository(AgentCompetency)
    private agentCompRepository: Repository<AgentCompetency>,
    @InjectRepository(Leave)
    private leaveRepository: Repository<Leave>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @Inject(LOCALE_RULES)
    private localeRules: ILocaleRules,
    private settingsService: SettingsService,
    private workPoliciesService: WorkPoliciesService,
    private complianceAlertService: ComplianceAlertService,
  ) {}

  async validateShift(
    tenantId: string,
    agentId: number,
    start: Date,
    end: Date,
    options: ShiftValidationOptions = {},
  ): Promise<ShiftValidationResult> {
    const result: ShiftValidationResult = {
      isValid: true,
      blockingReasons: [],
      warnings: [],
      metadata: {},
    };

    const block = (
      reason: ComplianceRuleCode,
      metadata?: Record<string, unknown>,
    ) => {
      result.isValid = false;
      result.blockingReasons.push(reason);
      if (metadata) {
        result.metadata[reason] = metadata;
      }
    };

    if (
      !(start instanceof Date) ||
      Number.isNaN(start.getTime()) ||
      !(end instanceof Date) ||
      Number.isNaN(end.getTime())
    ) {
      block(ComplianceRuleCode.INVALID_SHIFT_DATES);
      return result;
    }

    if (end <= start) {
      block(ComplianceRuleCode.INVALID_SHIFT_RANGE, { start, end });
      return result;
    }

    const agent = await this.getAgentForValidation(tenantId, agentId, options);

    if (!agent) {
      block(ComplianceRuleCode.AGENT_NOT_FOUND, { agentId });
      return result;
    }

    if (agent.status !== UserStatus.ACTIVE) {
      block(ComplianceRuleCode.AGENT_INACTIVE, { status: agent.status });
    }

    const constraints = await this.getConstraintsForValidation(
      tenantId,
      agent,
      options,
    );
    const minRestHours =
      constraints.restHoursAfterGuard ||
      this.localeRules.getDailyRestHours?.() ||
      11;
    const shiftDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    result.metadata.constraints = constraints;
    result.metadata.shiftDurationHours = shiftDuration;

    const expiredMandatoryRecords = await this.getExpiredMandatoryRecords(
      tenantId,
      agentId,
      options,
    );

    if (expiredMandatoryRecords.length > 0) {
      block(ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED, {
        count: expiredMandatoryRecords.length,
        recordIds: expiredMandatoryRecords.map((record) => record.id),
      });
    }

    const mandatoryCompetencies = await this.getMandatoryCompetencies(
      tenantId,
      agentId,
      options,
    );

    const now = new Date();
    const expiredCompetencies = mandatoryCompetencies.filter(
      (ac: AgentCompetency) =>
        ac.expirationDate && ac.expirationDate.getTime() <= now.getTime(),
    );

    if (expiredCompetencies.length > 0) {
      block(ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED, {
        count: expiredCompetencies.length,
        competencyIds: expiredCompetencies.map((competency) => competency.id),
      });
    }

    const isAvailable = await this.checkLeaveAvailability(
      tenantId,
      agentId,
      start,
      end,
    );
    if (!isAvailable) {
      block(ComplianceRuleCode.APPROVED_LEAVE_OVERLAP, { start, end });
    }

    const weeklyLimit =
      constraints.source === 'system_default'
        ? (await this.getTenantWeeklyLimit(tenantId, options)) ||
          this.localeRules.getWeeklyWorkLimit?.() ||
          constraints.maxWeeklyHours
        : constraints.maxWeeklyHours;
    const currentWeeklyHours = await this.getWeeklyHours(
      tenantId,
      agentId,
      start,
      options,
    );

    result.metadata.weeklyHours = {
      current: currentWeeklyHours,
      shift: shiftDuration,
      projected: currentWeeklyHours + shiftDuration,
      limit: weeklyLimit,
    };

    if (currentWeeklyHours + shiftDuration > weeklyLimit) {
      block(
        ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
        result.metadata.weeklyHours as Record<string, unknown>,
      );
    }

    if (shiftDuration > constraints.maxGuardDuration) {
      block(ComplianceRuleCode.MAX_GUARD_DURATION_EXCEEDED, {
        shiftDuration,
        maxGuardDuration: constraints.maxGuardDuration,
      });
    }

    const previousShiftQuery = this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.agentId = :agentId', { agentId })
      .andWhere('shift.tenantId = :tenantId', { tenantId })
      .andWhere('shift.end <= :start', { start })
      .orderBy('shift.end', 'DESC');

    if (options.excludeShiftId) {
      previousShiftQuery.andWhere('shift.id != :excludeShiftId', {
        excludeShiftId: options.excludeShiftId,
      });
    }

    const previousShift = await previousShiftQuery.getOne();

    if (previousShift) {
      const restTimeBefore =
        (start.getTime() - previousShift.end.getTime()) / (1000 * 60 * 60);
      if (restTimeBefore < minRestHours) {
        block(ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT, {
          previousShiftId: previousShift.id,
          restTimeBefore,
          minRestHours,
        });
      }
    }

    const nextShiftQuery = this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.agentId = :agentId', { agentId })
      .andWhere('shift.tenantId = :tenantId', { tenantId })
      .andWhere('shift.start >= :end', { end })
      .orderBy('shift.start', 'ASC');

    if (options.excludeShiftId) {
      nextShiftQuery.andWhere('shift.id != :excludeShiftId', {
        excludeShiftId: options.excludeShiftId,
      });
    }

    const nextShift = await nextShiftQuery.getOne();

    if (nextShift) {
      const restTimeAfter =
        (nextShift.start.getTime() - end.getTime()) / (1000 * 60 * 60);
      if (restTimeAfter < minRestHours) {
        block(ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT, {
          nextShiftId: nextShift.id,
          restTimeAfter,
          minRestHours,
        });
      }
    }

    const overlappingShiftQuery = this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.tenantId = :tenantId', { tenantId })
      .andWhere('shift.agentId = :agentId', { agentId })
      .andWhere('shift.start < :end', { end })
      .andWhere('shift.end > :start', { start });

    if (options.excludeShiftId) {
      overlappingShiftQuery.andWhere('shift.id != :excludeShiftId', {
        excludeShiftId: options.excludeShiftId,
      });
    }

    const overlappingShift = await overlappingShiftQuery.getOne();

    if (overlappingShift) {
      block(ComplianceRuleCode.SHIFT_OVERLAP, {
        overlappingShiftId: overlappingShift.id,
      });
    }

    if (!options.skipAlertSync) {
      await this.complianceAlertService.syncShiftAlerts(
        tenantId,
        agentId,
        result,
      );
    }

    return result;
  }

  private async getAgentForValidation(
    tenantId: string,
    agentId: number,
    options: ShiftValidationOptions,
  ): Promise<Agent | null> {
    const cacheKey = `${tenantId}:${agentId}`;
    if (options.batchCache) {
      const cached = options.batchCache.agents.get(cacheKey);
      if (cached) return cached;
    }

    const lookup = this.agentRepository.findOne({
      where: { id: agentId, tenantId },
      relations: ['hospitalService', 'grade'],
    });
    options.batchCache?.agents.set(cacheKey, lookup);
    return lookup;
  }

  private async getConstraintsForValidation(
    tenantId: string,
    agent: Agent,
    options: ShiftValidationOptions,
  ) {
    const cacheKey = `${tenantId}:${agent.id}`;
    if (options.batchCache) {
      const cached = options.batchCache.constraints.get(cacheKey);
      if (cached) return cached;
    }

    const lookup = this.workPoliciesService.resolveForAgent(tenantId, agent);
    options.batchCache?.constraints.set(cacheKey, lookup);
    return lookup;
  }

  private async getExpiredMandatoryRecords(
    tenantId: string,
    agentId: number,
    options: ShiftValidationOptions,
  ): Promise<HealthRecord[]> {
    const cacheKey = `${tenantId}:${agentId}`;
    if (options.batchCache) {
      const cached = options.batchCache.mandatoryHealthRecords.get(cacheKey);
      if (cached) return cached;
    }

    const lookup = this.healthRecordRepository.find({
      where: {
        agentId,
        tenantId,
        isMandatory: true,
        status: HealthRecordStatus.EXPIRED,
      },
    });
    options.batchCache?.mandatoryHealthRecords.set(cacheKey, lookup);
    return lookup;
  }

  private async getMandatoryCompetencies(
    tenantId: string,
    agentId: number,
    options: ShiftValidationOptions,
  ): Promise<AgentCompetency[]> {
    const cacheKey = `${tenantId}:${agentId}`;
    if (options.batchCache) {
      const cached = options.batchCache.mandatoryCompetencies.get(cacheKey);
      if (cached) return cached;
    }

    const lookup = this.agentCompRepository.find({
      where: {
        agent: { id: agentId, tenantId },
        competency: { isMandatoryToWork: true },
      },
      relations: ['competency'],
    });
    options.batchCache?.mandatoryCompetencies.set(cacheKey, lookup);
    return lookup;
  }

  private async getTenantWeeklyLimit(
    tenantId: string,
    options: ShiftValidationOptions,
  ): Promise<number | null | undefined> {
    if (options.batchCache) {
      const cached = options.batchCache.tenantWeeklyLimits.get(tenantId);
      if (cached) return cached;
    }

    const lookup = this.settingsService.getSetting(
      tenantId,
      null,
      'planning.weekly_hours_limit',
    );
    options.batchCache?.tenantWeeklyLimits.set(tenantId, lookup);
    return lookup;
  }

  private async checkLeaveAvailability(
    tenantId: string,
    agentId: number,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const count = await this.leaveRepository
      .createQueryBuilder('leave')
      .where('leave.tenantId = :tenantId', { tenantId })
      .andWhere('leave.agentId = :agentId', { agentId })
      .andWhere('leave.status = :status', { status: 'APPROVED' })
      .andWhere('leave.start < :end', { end })
      .andWhere('leave.end > :start', { start })
      .getCount();

    return count === 0;
  }

  private async getWeeklyHours(
    tenantId: string,
    agentId: number,
    date: Date,
    options: ShiftValidationOptions = {},
  ): Promise<number> {
    const startOfWeek = new Date(date);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(
      date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1),
    );

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const cacheKey = `${tenantId}:${agentId}:${startOfWeek.toISOString()}`;

    if (options.batchCache) {
      const cached = options.batchCache.weeklyHours.get(cacheKey);
      if (cached) return cached;
    }

    const lookup = this.shiftRepository
      .find({
        where: {
          agent: { id: agentId },
          tenantId,
          start: Between(startOfWeek, endOfWeek),
        },
      })
      .then((shifts) =>
        shifts.reduce((total, shift) => {
          const duration =
            (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
          return total + duration;
        }, 0),
      );

    options.batchCache?.weeklyHours.set(cacheKey, lookup);
    return lookup;
  }
}
