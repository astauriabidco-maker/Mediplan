import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationRoutineRuns1778100000000 implements MigrationInterface {
  name = 'OperationRoutineRuns1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRunTable = await queryRunner.hasTable('operation_routine_run');

    if (!hasRunTable) {
      await queryRunner.query(`
        CREATE TABLE "operation_routine_run" (
          "id" SERIAL NOT NULL,
          "tenantId" character varying NOT NULL,
          "routine" character varying(120) NOT NULL,
          "status" character varying(24) NOT NULL,
          "startedAt" TIMESTAMP NOT NULL,
          "finishedAt" TIMESTAMP,
          "durationMs" integer,
          "error" text,
          "artifacts" jsonb,
          "metadata" jsonb,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_operation_routine_run_id" PRIMARY KEY ("id"),
          CONSTRAINT "CHK_operation_routine_run_status" CHECK ("status" IN ('RUNNING', 'PASSED', 'FAILED', 'SKIPPED', 'CANCELLED'))
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_operation_routine_run_tenant_routine_started"
        ON "operation_routine_run" ("tenantId", "routine", "startedAt")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_operation_routine_run_tenant_status_started"
        ON "operation_routine_run" ("tenantId", "status", "startedAt")
      `);
    }
  }

  public async down(): Promise<void> {
    // Additive-only migration: no destructive rollback.
  }
}
