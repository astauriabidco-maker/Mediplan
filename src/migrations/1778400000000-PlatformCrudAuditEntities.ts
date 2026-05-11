import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformCrudAuditEntities1778400000000
  implements MigrationInterface
{
  name = 'PlatformCrudAuditEntities1778400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_entitytype_enum') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'PLATFORM_TENANT'
              AND enumtypid = 'audit_log_entitytype_enum'::regtype
          ) THEN
            ALTER TYPE "audit_log_entitytype_enum" ADD VALUE 'PLATFORM_TENANT';
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumlabel = 'PLATFORM_USER'
              AND enumtypid = 'audit_log_entitytype_enum'::regtype
          ) THEN
            ALTER TYPE "audit_log_entitytype_enum" ADD VALUE 'PLATFORM_USER';
          END IF;
        END IF;
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be safely removed without rebuilding the type.
  }
}
