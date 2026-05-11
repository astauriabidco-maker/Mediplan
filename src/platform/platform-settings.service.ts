import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  PlatformAdminCreationSecurity,
  PlatformSettings,
  PlatformTenantDefaults,
} from './platform-settings.entity';
import {
  UpdatePlatformSettingsDto,
  normalizeBoolean,
  normalizeInteger,
  normalizeNullableEmail,
  normalizeString,
} from './platform-settings.dto';
import type { PlatformActor } from './platform.service';

export interface PlatformSettingsView {
  sessionDurationMinutes: number;
  impersonationReasonRequired: boolean;
  impersonationMinimumReasonLength: number;
  tenantDefaults: PlatformTenantDefaults;
  adminCreationSecurity: PlatformAdminCreationSecurity;
  updatedAt: Date | null;
}

const SETTINGS_ID = 'global';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsView = {
  sessionDurationMinutes: 60,
  impersonationReasonRequired: true,
  impersonationMinimumReasonLength: 20,
  tenantDefaults: {
    region: 'GLOBAL',
    isActive: true,
    contactEmail: null,
  },
  adminCreationSecurity: {
    requireInvitationAcceptance: true,
    allowDirectPasswordProvisioning: false,
    minimumPasswordLength: 12,
  },
  updatedAt: null,
};

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepository: Repository<PlatformSettings>,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(actor?: PlatformActor): Promise<PlatformSettingsView> {
    const settings = await this.loadOrCreate();
    const view = this.toView(settings);

    if (actor) {
      await this.logSettingsAudit(actor, AuditAction.READ, {
        action: 'READ_PLATFORM_SETTINGS',
      });
    }

    return view;
  }

  async updateSettings(
    input: UpdatePlatformSettingsDto,
    actor: PlatformActor,
  ): Promise<PlatformSettingsView> {
    const settings = await this.loadOrCreate();
    const before = this.toView(settings);

    if (input.sessionDurationMinutes !== undefined) {
      settings.sessionDurationMinutes = normalizeInteger(
        input.sessionDurationMinutes,
        'sessionDurationMinutes',
        5,
        1440,
      );
    }

    if (input.impersonationReasonRequired !== undefined) {
      settings.impersonationReasonRequired = normalizeBoolean(
        input.impersonationReasonRequired,
        'impersonationReasonRequired',
      );
    }

    if (input.impersonationMinimumReasonLength !== undefined) {
      settings.impersonationMinimumReasonLength = normalizeInteger(
        input.impersonationMinimumReasonLength,
        'impersonationMinimumReasonLength',
        0,
        500,
      );
    }

    if (input.tenantDefaults !== undefined) {
      settings.tenantDefaults = {
        ...this.normalizeTenantDefaults(settings.tenantDefaults),
        ...this.normalizeTenantDefaultsPatch(input.tenantDefaults),
      };
    }

    if (input.adminCreationSecurity !== undefined) {
      settings.adminCreationSecurity = {
        ...this.normalizeAdminCreationSecurity(settings.adminCreationSecurity),
        ...this.normalizeAdminCreationSecurityPatch(
          input.adminCreationSecurity,
        ),
      };
    }

    const saved = await this.settingsRepository.save(settings);
    const after = this.toView(saved);

    await this.logSettingsAudit(actor, AuditAction.UPDATE, {
      action: 'UPDATE_PLATFORM_SETTINGS',
      changedFields: this.changedTopLevelFields(before, after),
      before,
      after,
    });

    return after;
  }

  async getSessionDurationMinutes(): Promise<number> {
    const settings = await this.loadOrCreate();
    return this.toView(settings).sessionDurationMinutes;
  }

  async getTenantDefaults(): Promise<PlatformTenantDefaults> {
    const settings = await this.loadOrCreate();
    return this.toView(settings).tenantDefaults;
  }

  async validateImpersonationReason(
    reason?: string,
  ): Promise<string | undefined> {
    const settings = await this.loadOrCreate();
    const policy = this.toView(settings);
    const normalized = reason?.trim();

    if (!policy.impersonationReasonRequired && !normalized) {
      return undefined;
    }

    if (!normalized) {
      throw new BadRequestException('Impersonation reason is required');
    }

    if (normalized.length < policy.impersonationMinimumReasonLength) {
      throw new BadRequestException(
        `Impersonation reason must contain at least ${policy.impersonationMinimumReasonLength} characters`,
      );
    }

    return normalized;
  }

  async validateTenantAdminCreation(input: {
    password?: string;
  }): Promise<void> {
    const settings = await this.loadOrCreate();
    const policy = this.toView(settings).adminCreationSecurity;
    const normalized = input.password?.trim();

    if (policy.requireInvitationAcceptance && normalized) {
      throw new BadRequestException(
        'password cannot be set directly when invitation acceptance is required',
      );
    }

    if (!normalized) {
      return;
    }

    if (!policy.allowDirectPasswordProvisioning) {
      throw new BadRequestException(
        'direct password provisioning is disabled for tenant admin creation',
      );
    }

    if (normalized.length < policy.minimumPasswordLength) {
      throw new BadRequestException(
        `password must contain at least ${policy.minimumPasswordLength} characters`,
      );
    }

    return;
  }

  private async loadOrCreate(): Promise<PlatformSettings> {
    const existing = await this.settingsRepository.findOne({
      where: { id: SETTINGS_ID },
    });
    if (existing) return existing;

    return this.settingsRepository.save(
      this.settingsRepository.create({
        id: SETTINGS_ID,
        sessionDurationMinutes:
          DEFAULT_PLATFORM_SETTINGS.sessionDurationMinutes,
        impersonationReasonRequired:
          DEFAULT_PLATFORM_SETTINGS.impersonationReasonRequired,
        impersonationMinimumReasonLength:
          DEFAULT_PLATFORM_SETTINGS.impersonationMinimumReasonLength,
        tenantDefaults: DEFAULT_PLATFORM_SETTINGS.tenantDefaults,
        adminCreationSecurity: DEFAULT_PLATFORM_SETTINGS.adminCreationSecurity,
      }),
    );
  }

  private toView(settings: PlatformSettings): PlatformSettingsView {
    return {
      sessionDurationMinutes:
        settings.sessionDurationMinutes ||
        DEFAULT_PLATFORM_SETTINGS.sessionDurationMinutes,
      impersonationReasonRequired:
        settings.impersonationReasonRequired ??
        DEFAULT_PLATFORM_SETTINGS.impersonationReasonRequired,
      impersonationMinimumReasonLength:
        settings.impersonationMinimumReasonLength ??
        DEFAULT_PLATFORM_SETTINGS.impersonationMinimumReasonLength,
      tenantDefaults: this.normalizeTenantDefaults(settings.tenantDefaults),
      adminCreationSecurity: this.normalizeAdminCreationSecurity(
        settings.adminCreationSecurity,
      ),
      updatedAt: settings.updatedAt ?? null,
    };
  }

  private normalizeTenantDefaults(
    value?: Partial<PlatformTenantDefaults> | null,
  ): PlatformTenantDefaults {
    return {
      region:
        typeof value?.region === 'string' && value.region.trim()
          ? value.region.trim()
          : DEFAULT_PLATFORM_SETTINGS.tenantDefaults.region,
      isActive:
        typeof value?.isActive === 'boolean'
          ? value.isActive
          : DEFAULT_PLATFORM_SETTINGS.tenantDefaults.isActive,
      contactEmail:
        value?.contactEmail === null || typeof value?.contactEmail === 'string'
          ? value.contactEmail
          : DEFAULT_PLATFORM_SETTINGS.tenantDefaults.contactEmail,
    };
  }

  private normalizeAdminCreationSecurity(
    value?: Partial<PlatformAdminCreationSecurity> | null,
  ): PlatformAdminCreationSecurity {
    return {
      requireInvitationAcceptance:
        typeof value?.requireInvitationAcceptance === 'boolean'
          ? value.requireInvitationAcceptance
          : DEFAULT_PLATFORM_SETTINGS.adminCreationSecurity
              .requireInvitationAcceptance,
      allowDirectPasswordProvisioning:
        typeof value?.allowDirectPasswordProvisioning === 'boolean'
          ? value.allowDirectPasswordProvisioning
          : DEFAULT_PLATFORM_SETTINGS.adminCreationSecurity
              .allowDirectPasswordProvisioning,
      minimumPasswordLength:
        typeof value?.minimumPasswordLength === 'number'
          ? value.minimumPasswordLength
          : DEFAULT_PLATFORM_SETTINGS.adminCreationSecurity
              .minimumPasswordLength,
    };
  }

  private normalizeTenantDefaultsPatch(
    value: NonNullable<UpdatePlatformSettingsDto['tenantDefaults']>,
  ): Partial<PlatformTenantDefaults> {
    const patch: Partial<PlatformTenantDefaults> = {};
    if (value.region !== undefined) {
      patch.region = normalizeString(
        value.region,
        'tenantDefaults.region',
        2,
        80,
      );
    }
    if (value.isActive !== undefined) {
      patch.isActive = normalizeBoolean(
        value.isActive,
        'tenantDefaults.isActive',
      );
    }
    if (value.contactEmail !== undefined) {
      patch.contactEmail = normalizeNullableEmail(
        value.contactEmail,
        'tenantDefaults.contactEmail',
      );
    }
    return patch;
  }

  private normalizeAdminCreationSecurityPatch(
    value: NonNullable<UpdatePlatformSettingsDto['adminCreationSecurity']>,
  ): Partial<PlatformAdminCreationSecurity> {
    const patch: Partial<PlatformAdminCreationSecurity> = {};
    if (value.requireInvitationAcceptance !== undefined) {
      patch.requireInvitationAcceptance = normalizeBoolean(
        value.requireInvitationAcceptance,
        'adminCreationSecurity.requireInvitationAcceptance',
      );
    }
    if (value.allowDirectPasswordProvisioning !== undefined) {
      patch.allowDirectPasswordProvisioning = normalizeBoolean(
        value.allowDirectPasswordProvisioning,
        'adminCreationSecurity.allowDirectPasswordProvisioning',
      );
    }
    if (value.minimumPasswordLength !== undefined) {
      patch.minimumPasswordLength = normalizeInteger(
        value.minimumPasswordLength,
        'adminCreationSecurity.minimumPasswordLength',
        8,
        128,
      );
    }
    return patch;
  }

  private changedTopLevelFields(
    before: PlatformSettingsView,
    after: PlatformSettingsView,
  ): string[] {
    return [
      'sessionDurationMinutes',
      'impersonationReasonRequired',
      'impersonationMinimumReasonLength',
      'tenantDefaults',
      'adminCreationSecurity',
    ].filter(
      (field) =>
        JSON.stringify(before[field as keyof PlatformSettingsView]) !==
        JSON.stringify(after[field as keyof PlatformSettingsView]),
    );
  }

  private async logSettingsAudit(
    actor: PlatformActor,
    action: AuditAction,
    details: Record<string, unknown>,
  ) {
    return this.auditService.log(
      'PLATFORM',
      actor.id,
      action,
      AuditEntityType.PLATFORM_SETTINGS,
      SETTINGS_ID,
      {
        ...details,
        actorEmail: actor.email,
      },
    );
  }
}
