import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformAdminSeparation1778300000000
  implements MigrationInterface
{
  name = 'PlatformAdminSeparation1778300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_role_enum') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'PLATFORM_SUPER_ADMIN'
              AND enumtypid = 'agent_role_enum'::regtype
          ) THEN
            ALTER TYPE "agent_role_enum" ADD VALUE 'PLATFORM_SUPER_ADMIN';
          END IF;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "agent"
      ALTER COLUMN "tenantId" DROP NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_action_enum') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'IMPERSONATION_START'
              AND enumtypid = 'audit_log_action_enum'::regtype
          ) THEN
            ALTER TYPE "audit_log_action_enum" ADD VALUE 'IMPERSONATION_START';
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'IMPERSONATION_STOP'
              AND enumtypid = 'audit_log_action_enum'::regtype
          ) THEN
            ALTER TYPE "audit_log_action_enum" ADD VALUE 'IMPERSONATION_STOP';
          END IF;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_entitytype_enum') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'TENANT_IMPERSONATION'
              AND enumtypid = 'audit_log_entitytype_enum'::regtype
          ) THEN
            ALTER TYPE "audit_log_entitytype_enum" ADD VALUE 'TENANT_IMPERSONATION';
          END IF;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "agent"
      SET "tenantId" = 'DEFAULT_TENANT'
      WHERE "tenantId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "agent"
      ALTER COLUMN "tenantId" SET NOT NULL
    `);
  }
}
