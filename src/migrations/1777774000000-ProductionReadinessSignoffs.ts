import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionReadinessSignoffs1777774000000 implements MigrationInterface {
  name = 'ProductionReadinessSignoffs1777774000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('production_signoff');
    if (hasTable) return;

    await queryRunner.query(`
      CREATE TABLE "production_signoff" (
        "id" SERIAL NOT NULL,
        "tenantId" character varying NOT NULL,
        "key" character varying(32) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'PENDING',
        "signerName" character varying,
        "signerRole" character varying,
        "proofUrl" character varying,
        "proofLabel" character varying,
        "comment" text,
        "signedById" integer,
        "signedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_production_signoff_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_production_signoff_key" CHECK ("key" IN ('HR', 'SECURITY', 'OPERATIONS', 'TECHNICAL', 'DIRECTION')),
        CONSTRAINT "CHK_production_signoff_status" CHECK ("status" IN ('PENDING', 'GO', 'NO_GO')),
        CONSTRAINT "UQ_production_signoff_tenant_key" UNIQUE ("tenantId", "key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('production_signoff');
    if (!hasTable) return;

    await queryRunner.query(`DROP TABLE "production_signoff"`);
  }
}
