import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationRunbookTemplates1778202000000 implements MigrationInterface {
  name = 'OperationRunbookTemplates1778202000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('operation_runbook_template');
    if (hasTable) return;

    await queryRunner.query(`
      CREATE TABLE "operation_runbook_template" (
        "id" SERIAL NOT NULL,
        "tenantId" character varying,
        "service" character varying(160),
        "sourceType" character varying(24) NOT NULL,
        "type" character varying(80),
        "version" integer NOT NULL,
        "steps" jsonb NOT NULL DEFAULT '[]',
        "evidence" jsonb NOT NULL DEFAULT '[]',
        "actions" jsonb NOT NULL DEFAULT '[]',
        "requiredPermissions" jsonb,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_operation_runbook_template_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_operation_runbook_template_source_type" CHECK ("sourceType" IN ('ALERT', 'INCIDENT', 'JOURNAL')),
        CONSTRAINT "CHK_operation_runbook_template_version_positive" CHECK ("version" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_operation_runbook_template_active_source"
      ON "operation_runbook_template" ("active", "sourceType")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_operation_runbook_template_scope"
      ON "operation_runbook_template" ("tenantId", "service", "sourceType", "type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_operation_runbook_template_version"
      ON "operation_runbook_template" ("sourceType", "type", "version")
    `);
  }

  public async down(): Promise<void> {
    return undefined;
  }
}
