import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationIncidents1777776000000 implements MigrationInterface {
  name = 'OperationIncidents1777776000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'audit_log_entitytype_enum'
        ) THEN
          ALTER TYPE "public"."audit_log_entitytype_enum"
          ADD VALUE IF NOT EXISTS 'OPERATION_INCIDENT';
        END IF;
      END
      $$;
    `);

    const hasTable = await queryRunner.hasTable('operation_incident');
    if (hasTable) return;

    await queryRunner.query(`
      CREATE TABLE "operation_incident" (
        "id" SERIAL NOT NULL,
        "tenantId" character varying NOT NULL,
        "title" character varying(160) NOT NULL,
        "description" text NOT NULL,
        "severity" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL,
        "impactedService" character varying(160),
        "evidenceUrl" character varying(500),
        "evidenceLabel" character varying(160),
        "declaredById" integer NOT NULL,
        "declaredAt" TIMESTAMP NOT NULL,
        "assignedToId" integer,
        "assignedAt" TIMESTAMP,
        "escalatedToId" integer,
        "escalationReason" character varying(2000),
        "escalatedAt" TIMESTAMP,
        "resolutionSummary" character varying(2000),
        "resolvedById" integer,
        "resolvedAt" TIMESTAMP,
        "closureSummary" character varying(2000),
        "closedById" integer,
        "closedAt" TIMESTAMP,
        "evidence" jsonb NOT NULL DEFAULT '[]',
        "timeline" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_operation_incident_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_operation_incident_severity" CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        CONSTRAINT "CHK_operation_incident_status" CHECK ("status" IN ('DECLARED', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_operation_incident_tenant_status" ON "operation_incident" ("tenantId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_operation_incident_tenant_severity" ON "operation_incident" ("tenantId", "severity")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('operation_incident');
    if (!hasTable) return;

    await queryRunner.query(`DROP TABLE "operation_incident"`);
  }
}
