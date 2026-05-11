import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformSettings1778500000000 implements MigrationInterface {
  name = 'PlatformSettings1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_entitytype_enum') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'PLATFORM_SETTINGS'
              AND enumtypid = 'audit_log_entitytype_enum'::regtype
          ) THEN
            ALTER TYPE "audit_log_entitytype_enum" ADD VALUE 'PLATFORM_SETTINGS';
          END IF;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_settings" (
        "id" character varying NOT NULL DEFAULT 'global',
        "sessionDurationMinutes" integer NOT NULL DEFAULT 60,
        "impersonationReasonRequired" boolean NOT NULL DEFAULT true,
        "impersonationMinimumReasonLength" integer NOT NULL DEFAULT 20,
        "tenantDefaults" jsonb NOT NULL DEFAULT '{"region":"GLOBAL","isActive":true,"contactEmail":null}'::jsonb,
        "adminCreationSecurity" jsonb NOT NULL DEFAULT '{"requireInvitationAcceptance":true,"allowDirectPasswordProvisioning":false,"minimumPasswordLength":12}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "platform_settings" (
        "id",
        "sessionDurationMinutes",
        "impersonationReasonRequired",
        "impersonationMinimumReasonLength",
        "tenantDefaults",
        "adminCreationSecurity"
      )
      VALUES (
        'global',
        60,
        true,
        20,
        '{"region":"GLOBAL","isActive":true,"contactEmail":null}'::jsonb,
        '{"requireInvitationAcceptance":true,"allowDirectPasswordProvisioning":false,"minimumPasswordLength":12}'::jsonb
      )
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(): Promise<void> {
    // Non-destructive migration: keep platform settings data if reverted.
  }
}
