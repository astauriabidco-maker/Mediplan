import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationsJournalEntries1777777000000 implements MigrationInterface {
  name = 'OperationsJournalEntries1777777000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasJournalTable = await queryRunner.hasTable(
      'operations_journal_entry',
    );

    if (!hasJournalTable) {
      await queryRunner.query(`
        CREATE TABLE "operations_journal_entry" (
          "id" SERIAL NOT NULL,
          "tenantId" character varying NOT NULL,
          "type" character varying(24) NOT NULL,
          "status" character varying(24) NOT NULL DEFAULT 'RECORDED',
          "severity" character varying(16) NOT NULL DEFAULT 'MEDIUM',
          "title" character varying(180) NOT NULL,
          "description" text,
          "occurredAt" TIMESTAMP NOT NULL,
          "resolvedAt" TIMESTAMP,
          "ownerId" integer,
          "createdById" integer NOT NULL,
          "updatedById" integer,
          "auditLogId" integer,
          "relatedAuditLogId" integer,
          "relatedReference" character varying(240),
          "evidenceUrl" character varying(500),
          "evidenceLabel" character varying(160),
          "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_operations_journal_entry_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_operations_journal_entry_audit_log" FOREIGN KEY ("auditLogId") REFERENCES "audit_log"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_operations_journal_entry_related_audit_log" FOREIGN KEY ("relatedAuditLogId") REFERENCES "audit_log"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_operations_journal_entry_type" CHECK ("type" IN ('INCIDENT', 'ACTION', 'DECISION', 'EVIDENCE')),
        CONSTRAINT "CHK_operations_journal_entry_status" CHECK ("status" IN ('RECORDED', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
        CONSTRAINT "CHK_operations_journal_entry_severity" CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_operations_journal_entry_tenant_type_occurred"
        ON "operations_journal_entry" ("tenantId", "type", "occurredAt")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_operations_journal_entry_tenant_status"
        ON "operations_journal_entry" ("tenantId", "status")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_operations_journal_entry_tenant_related_audit"
        ON "operations_journal_entry" ("tenantId", "relatedAuditLogId")
      `);
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('operations_journal_entry');

    if (hasTable) {
      await queryRunner.query(`DROP TABLE "operations_journal_entry"`);
    }
  }
}
