import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface PlatformTenantDefaults {
  region: string;
  isActive: boolean;
  contactEmail: string | null;
}

export interface PlatformAdminCreationSecurity {
  requireInvitationAcceptance: boolean;
  allowDirectPasswordProvisioning: boolean;
  minimumPasswordLength: number;
}

@Entity('platform_settings')
export class PlatformSettings {
  @PrimaryColumn({ default: 'global' })
  id: string;

  @Column({ type: 'integer', default: 60 })
  sessionDurationMinutes: number;

  @Column({ default: true })
  impersonationReasonRequired: boolean;

  @Column({ type: 'integer', default: 20 })
  impersonationMinimumReasonLength: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  tenantDefaults: PlatformTenantDefaults;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  adminCreationSecurity: PlatformAdminCreationSecurity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
