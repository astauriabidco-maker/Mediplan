import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreprodCurrentSchema1777918293394 implements MigrationInterface {
  name = 'PreprodCurrentSchema1777918293394';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contract" DROP CONSTRAINT "FK_c5764ce756afc868fb188761998"`,
    );
    await queryRunner.query(
      `CREATE TABLE "bonus_template" ("id" SERIAL NOT NULL, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "facilityId" integer, "name" character varying NOT NULL, "amount" double precision NOT NULL DEFAULT '0', "isTaxable" boolean NOT NULL DEFAULT true, "description" character varying, CONSTRAINT "PK_96f7da80e88275d60af07378418" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_bonus" ("id" SERIAL NOT NULL, "overrideAmount" double precision, "contractId" integer, "bonusTemplateId" integer, CONSTRAINT "PK_eeced351d3fd033481c47601bf1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "facilities" ("id" SERIAL NOT NULL, "tenantId" character varying NOT NULL, "name" character varying NOT NULL, "code" character varying, "address" character varying, "city" character varying, "zipCode" character varying, "latitude" double precision, "longitude" double precision, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2e6c685b2e1195e6d6394a22bc7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_type_enum" AS ENUM('CONGE_ANNUEL', 'MALADIE', 'RECUPERATION', 'ABSENCE_INJUSTIFIEE', 'AUTRE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "leave" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP NOT NULL, "type" "public"."leave_type_enum" NOT NULL DEFAULT 'CONGE_ANNUEL', "status" "public"."leave_status_enum" NOT NULL DEFAULT 'PENDING', "reason" character varying, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "rejectionReason" character varying, "aiRecommendation" text, "aiScore" integer, "isAutoRejected" boolean NOT NULL DEFAULT false, "agentId" integer, "approvedById" integer, CONSTRAINT "PK_501f6ea368365d2a40b1660e16b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."hospital_service_risklevel_enum" AS ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "hospital_service" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "code" character varying, "description" character varying, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "facilityId" integer, "parentServiceId" integer, "level" integer NOT NULL DEFAULT '1', "chiefId" integer, "deputyChiefId" integer, "majorId" integer, "nursingManagerId" integer, "maxAgents" integer, "minAgents" integer, "isActive" boolean NOT NULL DEFAULT true, "is24x7" boolean NOT NULL DEFAULT true, "bedCapacity" integer, "contactNumber" character varying, "riskLevel" "public"."hospital_service_risklevel_enum" NOT NULL DEFAULT 'NONE', "coverageRules" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9ca085f219dbf23648073f4196e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e83affdd12740b9f908a115bb1" ON "hospital_service" ("tenantId", "code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8f7aabe1bb9e7338c8f6b1160d" ON "hospital_service" ("tenantId", "name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "role" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "permissions" text, "isSystem" boolean NOT NULL DEFAULT false, "tenantId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "work_policy" ("id" SERIAL NOT NULL, "hospitalServiceId" integer, "gradeId" integer, "restHoursAfterGuard" integer NOT NULL DEFAULT '24', "maxGuardDuration" integer NOT NULL DEFAULT '24', "maxWeeklyHours" integer NOT NULL DEFAULT '48', "onCallCompensationPercent" double precision NOT NULL DEFAULT '0', "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', CONSTRAINT "PK_81f6c4e2f434929df41713bd1d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_work_policy_tenant_service_grade_unique" ON "work_policy" ("tenantId", "hospitalServiceId", "gradeId") WHERE "hospitalServiceId" IS NOT NULL AND "gradeId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_work_policy_tenant_grade_unique" ON "work_policy" ("tenantId", "gradeId") WHERE "hospitalServiceId" IS NULL AND "gradeId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_work_policy_tenant_service_unique" ON "work_policy" ("tenantId", "hospitalServiceId") WHERE "hospitalServiceId" IS NOT NULL AND "gradeId" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_work_policy_tenant_default_unique" ON "work_policy" ("tenantId") WHERE "hospitalServiceId" IS NULL AND "gradeId" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "grade" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL, "level" integer NOT NULL DEFAULT '0', "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', CONSTRAINT "UQ_3b476d2f648bed3dfb3087fe81b" UNIQUE ("name"), CONSTRAINT "UQ_11d21d8f15e00aff70a1704326c" UNIQUE ("code"), CONSTRAINT "PK_58c2176c3ae96bf57daebdbcb5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_beneficiary_relationship_enum" AS ENUM('CONJOINT', 'ENFANT', 'PARENT', 'TUTEUR', 'AUTRE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_beneficiary_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_beneficiary" ("id" SERIAL NOT NULL, "agentId" integer NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "relationship" "public"."agent_beneficiary_relationship_enum" NOT NULL DEFAULT 'ENFANT', "dateOfBirth" character varying, "gender" character varying, "idCardNumber" character varying, "photoUrl" character varying, "proofDocumentUrl" character varying, "status" "public"."agent_beneficiary_status_enum" NOT NULL DEFAULT 'PENDING', "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b44835d3320fe5b1262afd18321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."health_record_status_enum" AS ENUM('VALID', 'EXPIRING_SOON', 'EXPIRED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "health_record" ("id" SERIAL NOT NULL, "agentId" integer NOT NULL, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "type" character varying NOT NULL, "title" character varying NOT NULL, "datePerformed" date NOT NULL, "expirationDate" date, "isMandatory" boolean NOT NULL DEFAULT false, "status" "public"."health_record_status_enum" NOT NULL DEFAULT 'VALID', "documentUrl" character varying, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_abe4a44118137fd49ab9edff372" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."message_log_direction_enum" AS ENUM('INBOUND', 'OUTBOUND')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."message_log_status_enum" AS ENUM('SENT', 'DELIVERED', 'READ', 'UNREAD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "message_log" ("id" SERIAL NOT NULL, "from" character varying NOT NULL, "to" character varying NOT NULL, "content" text NOT NULL, "direction" "public"."message_log_direction_enum" NOT NULL, "status" "public"."message_log_status_enum" NOT NULL DEFAULT 'UNREAD', "agentId" integer, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f89fb3fddab953711137ce8b62c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."facility_setting_type_enum" AS ENUM('number', 'string', 'boolean', 'json')`,
    );
    await queryRunner.query(
      `CREATE TABLE "facility_setting" ("id" SERIAL NOT NULL, "key" character varying NOT NULL, "value" text NOT NULL, "type" "public"."facility_setting_type_enum" NOT NULL DEFAULT 'string', "description" character varying NOT NULL DEFAULT 'Par défaut', "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "facilityId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_89c50d759566aba1df1e0dc92bd" UNIQUE ("tenantId", "facilityId", "key"), CONSTRAINT "PK_8bf7f00d58461c47d444079cd31" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_proposal_type_enum" AS ENUM('REPLACEMENT', 'STAFFING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_proposal_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shift_proposal" ("id" SERIAL NOT NULL, "type" "public"."shift_proposal_type_enum" NOT NULL DEFAULT 'REPLACEMENT', "status" "public"."shift_proposal_status_enum" NOT NULL DEFAULT 'PENDING', "reason" text, "score" double precision NOT NULL DEFAULT '0', "shiftId" integer NOT NULL, "originalAgentId" integer, "suggestedAgentId" integer NOT NULL, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3d3b9789550a9c90e8eac41f9f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_application_status_enum" AS ENUM('PENDING', 'PENDING_GHT_APPROVAL', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shift_application" ("id" SERIAL NOT NULL, "appliedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."shift_application_status_enum" NOT NULL DEFAULT 'PENDING', "score" double precision, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "shiftId" integer, "agentId" integer, CONSTRAINT "PK_3f52a7665723c10c8d62257032c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_balance_type_enum" AS ENUM('CONGE_ANNUEL', 'MALADIE', 'RECUPERATION', 'ABSENCE_INJUSTIFIEE', 'AUTRE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "leave_balance" ("id" SERIAL NOT NULL, "type" "public"."leave_balance_type_enum" NOT NULL DEFAULT 'CONGE_ANNUEL', "year" integer NOT NULL, "allowance" double precision NOT NULL DEFAULT '0', "consumed" double precision NOT NULL DEFAULT '0', "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "agentId" integer, CONSTRAINT "PK_3455e264c75148742540634aca2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "attendance_log" ("id" SERIAL NOT NULL, "tenantId" character varying NOT NULL, "type" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "locationGPS" character varying, "source" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "agentId" integer, CONSTRAINT "PK_c5f15a2267f6b4a7174001ea912" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payslip_status_enum" AS ENUM('DRAFT', 'VALIDATED', 'PAID')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payslip" ("id" SERIAL NOT NULL, "month" integer NOT NULL, "year" integer NOT NULL, "baseSalary" double precision NOT NULL DEFAULT '0', "allowances" double precision NOT NULL DEFAULT '0', "status" "public"."payslip_status_enum" NOT NULL DEFAULT 'DRAFT', "details" jsonb, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "agentId" integer, CONSTRAINT "PK_2945d796bbfe386e3e1bd04d13d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payroll_variable" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "description" character varying NOT NULL, "value" double precision NOT NULL, "isPercentage" boolean NOT NULL DEFAULT false, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', CONSTRAINT "UQ_f2dc69589a68bd946d01d597f92" UNIQUE ("code"), CONSTRAINT "PK_b6fbba3d57decb21a9173db617a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payroll_rule_type_enum" AS ENUM('ALLOWANCE', 'DEDUCTION', 'TAX', 'CALCULATION')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payroll_rule" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL, "type" "public"."payroll_rule_type_enum" NOT NULL DEFAULT 'CALCULATION', "formula" character varying NOT NULL, "condition" character varying, "executionOrder" integer NOT NULL DEFAULT '1', "isActive" boolean NOT NULL DEFAULT true, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', CONSTRAINT "PK_be0ce90be1ae8dbd1a8bd652d55" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ghts" ("id" character varying NOT NULL, "name" character varying NOT NULL, "region" character varying NOT NULL, "contactEmail" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eb890c4cf849f76dd7383b3980a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" SERIAL NOT NULL, "tenantId" character varying NOT NULL, "title" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'Autre', "status" character varying NOT NULL DEFAULT 'DRAFT', "fileUrl" character varying NOT NULL, "agentId" integer, "otpSecret" character varying, "publicToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e31cb167a55bfd949c07e07a021" UNIQUE ("publicToken"), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "signature_logs" ("id" SERIAL NOT NULL, "ipAddress" character varying NOT NULL, "userAgent" character varying NOT NULL, "documentHash" character varying NOT NULL, "signedAt" TIMESTAMP NOT NULL DEFAULT now(), "documentId" integer, "agentId" integer, CONSTRAINT "PK_0bdb93375411e0d8719506dbdb2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_templates" ("id" SERIAL NOT NULL, "tenantId" character varying NOT NULL, "title" character varying NOT NULL, "type" character varying NOT NULL, "content" text NOT NULL, "metadata" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_59af2fd9eadd293fe10fdb2c702" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_log_action_enum" AS ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'VALIDATE', 'REJECT', 'AUTO_GENERATE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_log_entitytype_enum" AS ENUM('SHIFT', 'LEAVE', 'PLANNING', 'AGENT', 'CONTRACT', 'PAYROLL', 'DOCUMENT', 'HOSPITAL_SERVICE', 'WORK_POLICY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "actorId" integer NOT NULL, "action" "public"."audit_log_action_enum" NOT NULL, "entityType" "public"."audit_log_entitytype_enum" NOT NULL, "entityId" character varying, "details" jsonb, "tenantId" character varying NOT NULL, "chainSequence" integer, "previousHash" character varying, "eventHash" character varying, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_alert_type_enum" AS ENUM('QVT_FATIGUE', 'COMPLIANCE', 'GPEC')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_alert_severity_enum" AS ENUM('HIGH', 'MEDIUM', 'LOW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_alert" ("id" SERIAL NOT NULL, "agentId" integer NOT NULL, "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT', "type" "public"."agent_alert_type_enum" NOT NULL, "severity" "public"."agent_alert_severity_enum" NOT NULL, "message" text NOT NULL, "metadata" jsonb, "isAcknowledged" boolean NOT NULL DEFAULT false, "isResolved" boolean NOT NULL DEFAULT false, "resolvedAt" TIMESTAMP, "resolutionReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_00f64a7e35b9f40ea0a216b3cdf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_agent_alert_resolved_by_tenant" ON "agent_alert" ("tenantId", "isResolved", "resolvedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_agent_alert_open_by_tenant_agent" ON "agent_alert" ("tenantId", "agentId", "type", "severity") WHERE "isAcknowledged" = false AND "isResolved" = false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_agent_alert_open_unique" ON "agent_alert" ("tenantId", "agentId", "type", "message") WHERE "isAcknowledged" = false AND "isResolved" = false`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract" ADD "baseSalary" double precision DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract" ADD "hourlyRate" double precision DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."competency_type_enum" AS ENUM('SKILL', 'LEGAL_CERTIFICATION', 'CACES', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "competency" ADD "type" "public"."competency_type_enum" NOT NULL DEFAULT 'SKILL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "competency" ADD "isMandatoryToWork" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_type_enum" AS ENUM('NORMAL', 'GARDE_SUR_PLACE', 'ASTREINTE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" ADD "type" "public"."shift_type_enum" NOT NULL DEFAULT 'NORMAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" ADD "isSwapRequested" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" ADD "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT'`,
    );
    await queryRunner.query(`ALTER TABLE "shift" ADD "facilityId" integer`);
    await queryRunner.query(
      `CREATE TYPE "public"."agent_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "role" "public"."agent_role_enum" DEFAULT 'AGENT'`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "roleId" integer`);
    await queryRunner.query(
      `CREATE TYPE "public"."agent_status_enum" AS ENUM('INVITED', 'ACTIVE', 'DISABLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "status" "public"."agent_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "invitationToken" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "firstName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "lastName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "gender" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "dateOfBirth" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "placeOfBirth" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "nationality" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "department" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "hospitalServiceId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "jobTitle" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "hiringDate" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "contractType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "birthName" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "nir" character varying`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "maritalStatus" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "childrenCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "street" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "zipCode" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "city" character varying`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "personalEmail" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "workTimePercentage" double precision NOT NULL DEFAULT '100'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "gradeLegacy" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "step" character varying`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "index" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "gradeId" integer`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "contractEndDate" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "iban" character varying`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "bic" character varying`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "niu" character varying`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "cnpsNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "categorieEchelon" character varying`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_idtype_enum" AS ENUM('CNI', 'PASSPORT', 'ATTESTATION', 'RESIDENCE_PERMIT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "idType" "public"."agent_idtype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "idNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "idExpiryDate" character varying`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_mobilemoneyprovider_enum" AS ENUM('ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'MOOV_MONEY', 'AIRTEL_MONEY', 'TELMA_MONEY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "mobileMoneyProvider" "public"."agent_mobilemoneyprovider_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "mobileMoneyNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "isWhatsAppCompatible" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "mainDiploma" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "diplomaYear" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "emergencyContactName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "emergencyContactPhone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "password" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "tenantId" character varying NOT NULL DEFAULT 'DEFAULT_TENANT'`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "facilityId" integer`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "managerId" integer`);
    await queryRunner.query(
      `ALTER TABLE "agent_competency" ALTER COLUMN "expirationDate" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "UQ_c8e51500f3876fa1bbd4483ecc1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "UQ_c0e005072cf74273d618b9dbd09"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2a4d77e0f0a4eaec93703beffc" ON "agent" ("tenantId", "matricule") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b6728a67f548e23e5eed1a8c0e" ON "agent" ("tenantId", "email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_bonus" ADD CONSTRAINT "FK_fcce4be84280228963505a6bb37" FOREIGN KEY ("contractId") REFERENCES "contract"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_bonus" ADD CONSTRAINT "FK_c80cbb1ebf913eb279b4fa83ddb" FOREIGN KEY ("bonusTemplateId") REFERENCES "bonus_template"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract" ADD CONSTRAINT "FK_c5764ce756afc868fb188761998" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" ADD CONSTRAINT "FK_d59279df61f04886d3afbf4903f" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave" ADD CONSTRAINT "FK_ddc1b54b1619c09d0a23983479d" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave" ADD CONSTRAINT "FK_fb9407a17d10a081caef3d826ca" FOREIGN KEY ("approvedById") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" ADD CONSTRAINT "FK_7017117dcf7704cb90b4b1f16d3" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" ADD CONSTRAINT "FK_6c9a3a9d1aba6741a34251a9523" FOREIGN KEY ("parentServiceId") REFERENCES "hospital_service"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" ADD CONSTRAINT "FK_100641634aae58130b5740a6c91" FOREIGN KEY ("chiefId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" ADD CONSTRAINT "FK_d228e7d2e325c685b189aa99812" FOREIGN KEY ("deputyChiefId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" ADD CONSTRAINT "FK_86b3b2743f4737abf7716dc59f0" FOREIGN KEY ("majorId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" ADD CONSTRAINT "FK_92f8d12f19779932189d318e787" FOREIGN KEY ("nursingManagerId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_policy" ADD CONSTRAINT "FK_ec48a13e637dcae99da8535b312" FOREIGN KEY ("hospitalServiceId") REFERENCES "hospital_service"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_policy" ADD CONSTRAINT "FK_cfc2bfd5f5d459b66588ac66343" FOREIGN KEY ("gradeId") REFERENCES "grade"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_beneficiary" ADD CONSTRAINT "FK_7e5ae5634909ecdc0027ce7e2ec" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "health_record" ADD CONSTRAINT "FK_9fae390f3fc42965c2458119725" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_4de13a5a28e23e7e68b4136a444" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_a1807ebf1540f3c3afd3293f273" FOREIGN KEY ("hospitalServiceId") REFERENCES "hospital_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_c32703579d667a279d272c51995" FOREIGN KEY ("gradeId") REFERENCES "grade"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_bc9b96cfd3fb92adc55bf0de4db" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_3d607681370a515d8c685b0e8ff" FOREIGN KEY ("managerId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_log" ADD CONSTRAINT "FK_b191b2bb34338cbd68c6ce381d6" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "facility_setting" ADD CONSTRAINT "FK_9bdb7a91a7bb73f259aab5e373e" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_proposal" ADD CONSTRAINT "FK_da6e1258cfb1238cc9a0dcc1656" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_proposal" ADD CONSTRAINT "FK_6618abb4249532993b7e5fe1eaa" FOREIGN KEY ("originalAgentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_proposal" ADD CONSTRAINT "FK_3025c55f28371a0a2ebe837fb43" FOREIGN KEY ("suggestedAgentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_application" ADD CONSTRAINT "FK_16df122be4a7710f1b1ee26b718" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_application" ADD CONSTRAINT "FK_976ca8a47370e4101ac6a1f548e" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_balance" ADD CONSTRAINT "FK_4fe7d7b4c106c6a21537f20e0bc" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_log" ADD CONSTRAINT "FK_a7dc2a88f38aa22860fc34795f1" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslip" ADD CONSTRAINT "FK_560815500cc8c3541c2858c4c93" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_b21f2a976ecfe193ea83ca52df3" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_logs" ADD CONSTRAINT "FK_13d5521ee63db3a1f9130a44e69" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_logs" ADD CONSTRAINT "FK_58c5c381450eb8c5855a00ef9a2" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "FK_cb6aa6f6fd56f08eafb60316225" FOREIGN KEY ("actorId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_alert" ADD CONSTRAINT "FK_95f3b8f9af54740cc40b839405a" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_alert" DROP CONSTRAINT "FK_95f3b8f9af54740cc40b839405a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT "FK_cb6aa6f6fd56f08eafb60316225"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_logs" DROP CONSTRAINT "FK_58c5c381450eb8c5855a00ef9a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature_logs" DROP CONSTRAINT "FK_13d5521ee63db3a1f9130a44e69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_b21f2a976ecfe193ea83ca52df3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslip" DROP CONSTRAINT "FK_560815500cc8c3541c2858c4c93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_log" DROP CONSTRAINT "FK_a7dc2a88f38aa22860fc34795f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_balance" DROP CONSTRAINT "FK_4fe7d7b4c106c6a21537f20e0bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_application" DROP CONSTRAINT "FK_976ca8a47370e4101ac6a1f548e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_application" DROP CONSTRAINT "FK_16df122be4a7710f1b1ee26b718"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_proposal" DROP CONSTRAINT "FK_3025c55f28371a0a2ebe837fb43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_proposal" DROP CONSTRAINT "FK_6618abb4249532993b7e5fe1eaa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_proposal" DROP CONSTRAINT "FK_da6e1258cfb1238cc9a0dcc1656"`,
    );
    await queryRunner.query(
      `ALTER TABLE "facility_setting" DROP CONSTRAINT "FK_9bdb7a91a7bb73f259aab5e373e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_log" DROP CONSTRAINT "FK_b191b2bb34338cbd68c6ce381d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_3d607681370a515d8c685b0e8ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_bc9b96cfd3fb92adc55bf0de4db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_c32703579d667a279d272c51995"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_a1807ebf1540f3c3afd3293f273"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_4de13a5a28e23e7e68b4136a444"`,
    );
    await queryRunner.query(
      `ALTER TABLE "health_record" DROP CONSTRAINT "FK_9fae390f3fc42965c2458119725"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_beneficiary" DROP CONSTRAINT "FK_7e5ae5634909ecdc0027ce7e2ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_policy" DROP CONSTRAINT "FK_cfc2bfd5f5d459b66588ac66343"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_policy" DROP CONSTRAINT "FK_ec48a13e637dcae99da8535b312"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" DROP CONSTRAINT "FK_92f8d12f19779932189d318e787"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" DROP CONSTRAINT "FK_86b3b2743f4737abf7716dc59f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" DROP CONSTRAINT "FK_d228e7d2e325c685b189aa99812"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" DROP CONSTRAINT "FK_100641634aae58130b5740a6c91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" DROP CONSTRAINT "FK_6c9a3a9d1aba6741a34251a9523"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hospital_service" DROP CONSTRAINT "FK_7017117dcf7704cb90b4b1f16d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave" DROP CONSTRAINT "FK_fb9407a17d10a081caef3d826ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave" DROP CONSTRAINT "FK_ddc1b54b1619c09d0a23983479d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" DROP CONSTRAINT "FK_d59279df61f04886d3afbf4903f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract" DROP CONSTRAINT "FK_c5764ce756afc868fb188761998"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_bonus" DROP CONSTRAINT "FK_c80cbb1ebf913eb279b4fa83ddb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_bonus" DROP CONSTRAINT "FK_fcce4be84280228963505a6bb37"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b6728a67f548e23e5eed1a8c0e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a4d77e0f0a4eaec93703beffc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "UQ_c0e005072cf74273d618b9dbd09" UNIQUE ("matricule")`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "UQ_c8e51500f3876fa1bbd4483ecc1" UNIQUE ("email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_competency" ALTER COLUMN "expirationDate" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "managerId"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "facilityId"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "tenantId"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "password"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "emergencyContactPhone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "emergencyContactName"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "diplomaYear"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "mainDiploma"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "isWhatsAppCompatible"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "mobileMoneyNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "mobileMoneyProvider"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_mobilemoneyprovider_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "idExpiryDate"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "idNumber"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "idType"`);
    await queryRunner.query(`DROP TYPE "public"."agent_idtype_enum"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "categorieEchelon"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "cnpsNumber"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "niu"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "bic"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "iban"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "contractEndDate"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "gradeId"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "index"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "step"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "gradeLegacy"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "workTimePercentage"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "personalEmail"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "zipCode"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "street"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "childrenCount"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "maritalStatus"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "nir"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "birthName"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "contractType"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "hiringDate"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "jobTitle"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "hospitalServiceId"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "department"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "address"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "nationality"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "placeOfBirth"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "dateOfBirth"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "gender"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "firstName"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "invitationToken"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."agent_status_enum"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "roleId"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."agent_role_enum"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "facilityId"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "tenantId"`);
    await queryRunner.query(
      `ALTER TABLE "shift" DROP COLUMN "isSwapRequested"`,
    );
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."shift_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "competency" DROP COLUMN "isMandatoryToWork"`,
    );
    await queryRunner.query(`ALTER TABLE "competency" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."competency_type_enum"`);
    await queryRunner.query(`ALTER TABLE "contract" DROP COLUMN "hourlyRate"`);
    await queryRunner.query(`ALTER TABLE "contract" DROP COLUMN "baseSalary"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_agent_alert_open_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_agent_alert_open_by_tenant_agent"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_agent_alert_resolved_by_tenant"`,
    );
    await queryRunner.query(`DROP TABLE "agent_alert"`);
    await queryRunner.query(`DROP TYPE "public"."agent_alert_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."agent_alert_type_enum"`);
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP TYPE "public"."audit_log_entitytype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_log_action_enum"`);
    await queryRunner.query(`DROP TABLE "contract_templates"`);
    await queryRunner.query(`DROP TABLE "signature_logs"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "ghts"`);
    await queryRunner.query(`DROP TABLE "payroll_rule"`);
    await queryRunner.query(`DROP TYPE "public"."payroll_rule_type_enum"`);
    await queryRunner.query(`DROP TABLE "payroll_variable"`);
    await queryRunner.query(`DROP TABLE "payslip"`);
    await queryRunner.query(`DROP TYPE "public"."payslip_status_enum"`);
    await queryRunner.query(`DROP TABLE "attendance_log"`);
    await queryRunner.query(`DROP TABLE "leave_balance"`);
    await queryRunner.query(`DROP TYPE "public"."leave_balance_type_enum"`);
    await queryRunner.query(`DROP TABLE "shift_application"`);
    await queryRunner.query(
      `DROP TYPE "public"."shift_application_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "shift_proposal"`);
    await queryRunner.query(`DROP TYPE "public"."shift_proposal_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shift_proposal_type_enum"`);
    await queryRunner.query(`DROP TABLE "facility_setting"`);
    await queryRunner.query(`DROP TYPE "public"."facility_setting_type_enum"`);
    await queryRunner.query(`DROP TABLE "message_log"`);
    await queryRunner.query(`DROP TYPE "public"."message_log_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."message_log_direction_enum"`);
    await queryRunner.query(`DROP TABLE "health_record"`);
    await queryRunner.query(`DROP TYPE "public"."health_record_status_enum"`);
    await queryRunner.query(`DROP TABLE "agent_beneficiary"`);
    await queryRunner.query(
      `DROP TYPE "public"."agent_beneficiary_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_beneficiary_relationship_enum"`,
    );
    await queryRunner.query(`DROP TABLE "grade"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_work_policy_tenant_default_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_work_policy_tenant_service_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_work_policy_tenant_grade_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_work_policy_tenant_service_grade_unique"`,
    );
    await queryRunner.query(`DROP TABLE "work_policy"`);
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8f7aabe1bb9e7338c8f6b1160d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e83affdd12740b9f908a115bb1"`,
    );
    await queryRunner.query(`DROP TABLE "hospital_service"`);
    await queryRunner.query(
      `DROP TYPE "public"."hospital_service_risklevel_enum"`,
    );
    await queryRunner.query(`DROP TABLE "leave"`);
    await queryRunner.query(`DROP TYPE "public"."leave_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."leave_type_enum"`);
    await queryRunner.query(`DROP TABLE "facilities"`);
    await queryRunner.query(`DROP TABLE "contract_bonus"`);
    await queryRunner.query(`DROP TABLE "bonus_template"`);
    await queryRunner.query(
      `ALTER TABLE "contract" ADD CONSTRAINT "FK_c5764ce756afc868fb188761998" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
