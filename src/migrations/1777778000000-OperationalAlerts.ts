import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationalAlerts1777778000000 implements MigrationInterface {
  name = 'OperationalAlerts1777778000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'audit_log_entitytype_enum'
        ) THEN
          ALTER TYPE "public"."audit_log_entitytype_enum"
          ADD VALUE IF NOT EXISTS 'OPERATION_ALERT';
        END IF;
      END
      $$;
    `);

    const hasTable = await queryRunner.hasTable('operational_alert');
    if (hasTable) return;

    await queryRunner.query(`
      CREATE TABLE "operational_alert" (
        "id" SERIAL NOT NULL,
        "tenantId" character varying NOT NULL,
        "type" character varying(48) NOT NULL,
        "severity" character varying(16) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'OPEN',
        "source" character varying(120) NOT NULL,
        "sourceReference" character varying(240) NOT NULL,
        "message" text NOT NULL,
        "metadata" jsonb,
        "openedAt" TIMESTAMP NOT NULL,
        "lastSeenAt" TIMESTAMP NOT NULL,
        "occurrenceCount" integer NOT NULL DEFAULT 1,
        "resolvedAt" TIMESTAMP,
        "resolvedById" integer,
        "resolutionSummary" character varying(2000),
        "createAuditLogId" integer,
        "resolveAuditLogId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_operational_alert_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_operational_alert_create_audit" FOREIGN KEY ("createAuditLogId") REFERENCES "audit_log"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_operational_alert_resolve_audit" FOREIGN KEY ("resolveAuditLogId") REFERENCES "audit_log"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_operational_alert_type" CHECK ("type" IN ('SLO_BREACH', 'BACKUP_STALE', 'BACKUP_EXPORT_FAILED', 'AUDIT_CHAIN_INVALID', 'CRITICAL_INCIDENT_OPEN')),
        CONSTRAINT "CHK_operational_alert_severity" CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        CONSTRAINT "CHK_operational_alert_status" CHECK ("status" IN ('OPEN', 'RESOLVED'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_operational_alert_tenant_status"
      ON "operational_alert" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_operational_alert_tenant_type"
      ON "operational_alert" ("tenantId", "type")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_operational_alert_open_dedup"
      ON "operational_alert" ("tenantId", "type", "source", "sourceReference")
      WHERE "status" = 'OPEN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('operational_alert');
    if (!hasTable) return;

    await queryRunner.query(`DROP TABLE "operational_alert"`);
  }
}
