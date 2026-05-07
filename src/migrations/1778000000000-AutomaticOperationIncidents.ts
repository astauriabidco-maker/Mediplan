import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutomaticOperationIncidents1778000000000 implements MigrationInterface {
  name = 'AutomaticOperationIncidents1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('operation_incident');
    if (!hasTable) return;

    const hasMetadataColumn = await queryRunner.hasColumn(
      'operation_incident',
      'metadata',
    );
    if (!hasMetadataColumn) {
      await queryRunner.query(
        `ALTER TABLE "operation_incident" ADD "metadata" jsonb`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "operation_incident"
      DROP CONSTRAINT IF EXISTS "CHK_operation_incident_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "operation_incident"
      ADD CONSTRAINT "CHK_operation_incident_status"
      CHECK ("status" IN ('OPEN', 'DECLARED', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('operation_incident');
    if (!hasTable) return;

    await queryRunner.query(`
      ALTER TABLE "operation_incident"
      DROP CONSTRAINT IF EXISTS "CHK_operation_incident_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "operation_incident"
      ADD CONSTRAINT "CHK_operation_incident_status"
      CHECK ("status" IN ('DECLARED', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED'))
    `);

    const hasMetadataColumn = await queryRunner.hasColumn(
      'operation_incident',
      'metadata',
    );
    if (hasMetadataColumn) {
      await queryRunner.query(
        `ALTER TABLE "operation_incident" DROP COLUMN "metadata"`,
      );
    }
  }
}
