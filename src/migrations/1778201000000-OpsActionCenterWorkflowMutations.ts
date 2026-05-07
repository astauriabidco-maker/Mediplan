import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpsActionCenterWorkflowMutations1778201000000
  implements MigrationInterface
{
  name = 'OpsActionCenterWorkflowMutations1778201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(
      'ops_action_center_workflow_mutation',
    );

    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE "ops_action_center_workflow_mutation" (
          "id" SERIAL NOT NULL,
          "tenantId" character varying NOT NULL,
          "itemId" character varying(240) NOT NULL,
          "itemType" character varying(48) NOT NULL,
          "sourceEntity" character varying(48) NOT NULL,
          "sourceId" integer NOT NULL,
          "action" character varying(24) NOT NULL,
          "actorId" integer NOT NULL,
          "assignedToId" integer,
          "priority" character varying(16),
          "status" character varying(24),
          "comment" character varying(2000),
          "beforeState" jsonb,
          "afterState" jsonb,
          "auditLogId" integer,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_ops_action_center_workflow_mutation_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_ops_action_center_workflow_mutation_audit_log" FOREIGN KEY ("auditLogId") REFERENCES "audit_log"("id") ON DELETE SET NULL,
          CONSTRAINT "CHK_ops_action_center_workflow_mutation_action" CHECK ("action" IN ('ASSIGN', 'COMMENT', 'PRIORITY', 'STATUS', 'RESOLVE')),
          CONSTRAINT "CHK_ops_action_center_workflow_mutation_priority" CHECK ("priority" IS NULL OR "priority" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          CONSTRAINT "CHK_ops_action_center_workflow_mutation_status" CHECK ("status" IS NULL OR "status" IN ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'WAITING_EVIDENCE', 'WAITING_DECISION', 'RESOLVED', 'CLOSED'))
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_ops_action_center_workflow_item"
        ON "ops_action_center_workflow_mutation" ("tenantId", "itemId", "createdAt")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_ops_action_center_workflow_source"
        ON "ops_action_center_workflow_mutation" ("tenantId", "sourceEntity", "sourceId")
      `);
    }
  }

  public async down(): Promise<void> {
    return undefined;
  }
}
