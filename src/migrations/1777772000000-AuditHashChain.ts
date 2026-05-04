import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditHashChain1777772000000 implements MigrationInterface {
    name = 'AuditHashChain1777772000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasAuditLog = await queryRunner.hasTable('audit_log');
        if (!hasAuditLog) return;

        const hasChainSequence = await queryRunner.hasColumn('audit_log', 'chainSequence');
        if (!hasChainSequence) {
            await queryRunner.query(`ALTER TABLE "audit_log" ADD "chainSequence" integer`);
            await queryRunner.query(`
                UPDATE "audit_log" audit
                SET "chainSequence" = ordered.sequence
                FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY "tenantId"
                        ORDER BY "timestamp" ASC, id ASC
                    ) AS sequence
                    FROM "audit_log"
                ) ordered
                WHERE audit.id = ordered.id
            `);
            await queryRunner.query(`ALTER TABLE "audit_log" ALTER COLUMN "chainSequence" SET NOT NULL`);
        }

        const hasPreviousHash = await queryRunner.hasColumn('audit_log', 'previousHash');
        if (!hasPreviousHash) {
            await queryRunner.query(`ALTER TABLE "audit_log" ADD "previousHash" character varying`);
        }

        const hasEventHash = await queryRunner.hasColumn('audit_log', 'eventHash');
        if (!hasEventHash) {
            await queryRunner.query(`ALTER TABLE "audit_log" ADD "eventHash" character varying`);
        }

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_audit_log_tenant_chain_sequence"
            ON "audit_log" ("tenantId", "chainSequence")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_audit_log_export_filters"
            ON "audit_log" ("tenantId", "timestamp", "action")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasAuditLog = await queryRunner.hasTable('audit_log');
        if (!hasAuditLog) return;

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_export_filters"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_tenant_chain_sequence"`);

        const hasEventHash = await queryRunner.hasColumn('audit_log', 'eventHash');
        if (hasEventHash) {
            await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "eventHash"`);
        }

        const hasPreviousHash = await queryRunner.hasColumn('audit_log', 'previousHash');
        if (hasPreviousHash) {
            await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "previousHash"`);
        }

        const hasChainSequence = await queryRunner.hasColumn('audit_log', 'chainSequence');
        if (hasChainSequence) {
            await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "chainSequence"`);
        }
    }
}
