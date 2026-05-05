import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionReadinessGates1777775000000 implements MigrationInterface {
  name = 'ProductionReadinessGates1777775000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('production_gate');
    if (hasTable) return;

    await queryRunner.query(`
      CREATE TABLE "production_gate" (
        "id" SERIAL NOT NULL,
        "tenantId" character varying NOT NULL,
        "key" character varying(32) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'UNKNOWN',
        "source" character varying,
        "evidenceUrl" character varying,
        "comment" text,
        "snapshot" jsonb,
        "updatedById" integer,
        "checkedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_production_gate_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_production_gate_key" CHECK ("key" IN ('FREEZE', 'MIGRATION', 'SEED', 'SMOKE', 'COMPLIANCE', 'AUDIT', 'BACKUP')),
        CONSTRAINT "CHK_production_gate_status" CHECK ("status" IN ('PASSED', 'FAILED', 'UNKNOWN')),
        CONSTRAINT "UQ_production_gate_tenant_key" UNIQUE ("tenantId", "key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('production_gate');
    if (!hasTable) return;

    await queryRunner.query(`DROP TABLE "production_gate"`);
  }
}
