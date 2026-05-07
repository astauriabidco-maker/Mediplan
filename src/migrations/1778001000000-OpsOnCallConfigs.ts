import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpsOnCallConfigs1778001000000 implements MigrationInterface {
  name = 'OpsOnCallConfigs1778001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('ops_on_call_config');
    if (hasTable) return;

    await queryRunner.query(`
      CREATE TABLE "ops_on_call_config" (
        "id" SERIAL NOT NULL,
        "tenantId" character varying NOT NULL,
        "role" character varying(80) NOT NULL,
        "recipients" jsonb NOT NULL DEFAULT '[]',
        "activeFrom" TIMESTAMP,
        "activeUntil" TIMESTAMP,
        "priority" integer NOT NULL DEFAULT 100,
        "enabled" boolean NOT NULL DEFAULT true,
        "createdById" integer NOT NULL,
        "updatedById" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ops_on_call_config_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ops_on_call_config_tenant_role_enabled"
      ON "ops_on_call_config" ("tenantId", "role", "enabled")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ops_on_call_config_tenant_priority"
      ON "ops_on_call_config" ("tenantId", "priority")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT 1');
  }
}
