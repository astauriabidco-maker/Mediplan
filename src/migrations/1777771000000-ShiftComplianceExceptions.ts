import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShiftComplianceExceptions1777771000000 implements MigrationInterface {
  name = 'ShiftComplianceExceptions1777771000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasShift = await queryRunner.hasTable('shift');
    if (!hasShift) return;

    const hasApproved = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionApproved',
    );
    if (!hasApproved) {
      await queryRunner.query(
        `ALTER TABLE "shift" ADD "complianceExceptionApproved" boolean NOT NULL DEFAULT false`,
      );
    }

    const hasReason = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionReason',
    );
    if (!hasReason) {
      await queryRunner.query(
        `ALTER TABLE "shift" ADD "complianceExceptionReason" text`,
      );
    }

    const hasApprovedBy = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionApprovedById',
    );
    if (!hasApprovedBy) {
      await queryRunner.query(
        `ALTER TABLE "shift" ADD "complianceExceptionApprovedById" integer`,
      );
    }

    const hasApprovedAt = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionApprovedAt',
    );
    if (!hasApprovedAt) {
      await queryRunner.query(
        `ALTER TABLE "shift" ADD "complianceExceptionApprovedAt" TIMESTAMP`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasShift = await queryRunner.hasTable('shift');
    if (!hasShift) return;

    const hasApprovedAt = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionApprovedAt',
    );
    if (hasApprovedAt) {
      await queryRunner.query(
        `ALTER TABLE "shift" DROP COLUMN "complianceExceptionApprovedAt"`,
      );
    }

    const hasApprovedBy = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionApprovedById',
    );
    if (hasApprovedBy) {
      await queryRunner.query(
        `ALTER TABLE "shift" DROP COLUMN "complianceExceptionApprovedById"`,
      );
    }

    const hasReason = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionReason',
    );
    if (hasReason) {
      await queryRunner.query(
        `ALTER TABLE "shift" DROP COLUMN "complianceExceptionReason"`,
      );
    }

    const hasApproved = await queryRunner.hasColumn(
      'shift',
      'complianceExceptionApproved',
    );
    if (hasApproved) {
      await queryRunner.query(
        `ALTER TABLE "shift" DROP COLUMN "complianceExceptionApproved"`,
      );
    }
  }
}
