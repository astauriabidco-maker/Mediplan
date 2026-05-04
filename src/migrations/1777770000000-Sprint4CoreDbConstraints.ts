import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint4CoreDbConstraints1777770000000 implements MigrationInterface {
    name = 'Sprint4CoreDbConstraints1777770000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasWorkPolicy = await queryRunner.hasTable('work_policy');
        if (hasWorkPolicy) {
            const hasMaxWeeklyHours = await queryRunner.hasColumn('work_policy', 'maxWeeklyHours');
            if (!hasMaxWeeklyHours) {
                await queryRunner.query(`ALTER TABLE "work_policy" ADD "maxWeeklyHours" integer NOT NULL DEFAULT 48`);
            }

            await queryRunner.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "IDX_work_policy_tenant_default_unique"
                ON "work_policy" ("tenantId")
                WHERE "hospitalServiceId" IS NULL AND "gradeId" IS NULL
            `);
            await queryRunner.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "IDX_work_policy_tenant_service_unique"
                ON "work_policy" ("tenantId", "hospitalServiceId")
                WHERE "hospitalServiceId" IS NOT NULL AND "gradeId" IS NULL
            `);
            await queryRunner.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "IDX_work_policy_tenant_grade_unique"
                ON "work_policy" ("tenantId", "gradeId")
                WHERE "hospitalServiceId" IS NULL AND "gradeId" IS NOT NULL
            `);
            await queryRunner.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "IDX_work_policy_tenant_service_grade_unique"
                ON "work_policy" ("tenantId", "hospitalServiceId", "gradeId")
                WHERE "hospitalServiceId" IS NOT NULL AND "gradeId" IS NOT NULL
            `);
        }

        const hasAgentAlert = await queryRunner.hasTable('agent_alert');
        if (hasAgentAlert) {
            const hasIsResolved = await queryRunner.hasColumn('agent_alert', 'isResolved');
            if (!hasIsResolved) {
                await queryRunner.query(`ALTER TABLE "agent_alert" ADD "isResolved" boolean NOT NULL DEFAULT false`);
            }

            const hasResolvedAt = await queryRunner.hasColumn('agent_alert', 'resolvedAt');
            if (!hasResolvedAt) {
                await queryRunner.query(`ALTER TABLE "agent_alert" ADD "resolvedAt" TIMESTAMP`);
            }

            const hasResolutionReason = await queryRunner.hasColumn('agent_alert', 'resolutionReason');
            if (!hasResolutionReason) {
                await queryRunner.query(`ALTER TABLE "agent_alert" ADD "resolutionReason" text`);
            }

            await queryRunner.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_alert_open_unique"
                ON "agent_alert" ("tenantId", "agentId", "type", "message")
                WHERE "isAcknowledged" = false AND "isResolved" = false
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_agent_alert_open_by_tenant_agent"
                ON "agent_alert" ("tenantId", "agentId", "type", "severity")
                WHERE "isAcknowledged" = false AND "isResolved" = false
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_agent_alert_resolved_by_tenant"
                ON "agent_alert" ("tenantId", "isResolved", "resolvedAt")
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasAgentAlert = await queryRunner.hasTable('agent_alert');
        if (hasAgentAlert) {
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_alert_resolved_by_tenant"`);
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_alert_open_by_tenant_agent"`);
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_alert_open_unique"`);

            const hasResolutionReason = await queryRunner.hasColumn('agent_alert', 'resolutionReason');
            if (hasResolutionReason) {
                await queryRunner.query(`ALTER TABLE "agent_alert" DROP COLUMN "resolutionReason"`);
            }

            const hasResolvedAt = await queryRunner.hasColumn('agent_alert', 'resolvedAt');
            if (hasResolvedAt) {
                await queryRunner.query(`ALTER TABLE "agent_alert" DROP COLUMN "resolvedAt"`);
            }

            const hasIsResolved = await queryRunner.hasColumn('agent_alert', 'isResolved');
            if (hasIsResolved) {
                await queryRunner.query(`ALTER TABLE "agent_alert" DROP COLUMN "isResolved"`);
            }
        }

        const hasWorkPolicy = await queryRunner.hasTable('work_policy');
        if (hasWorkPolicy) {
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_policy_tenant_service_grade_unique"`);
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_policy_tenant_grade_unique"`);
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_policy_tenant_service_unique"`);
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_policy_tenant_default_unique"`);

            const hasMaxWeeklyHours = await queryRunner.hasColumn('work_policy', 'maxWeeklyHours');
            if (hasMaxWeeklyHours) {
                await queryRunner.query(`ALTER TABLE "work_policy" DROP COLUMN "maxWeeklyHours"`);
            }
        }
    }
}
