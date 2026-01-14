"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompleteSchema1766959186786 = void 0;
class CompleteSchema1766959186786 {
    name = 'CompleteSchema1766959186786';
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "contract" ("id" SERIAL NOT NULL, "type" character varying NOT NULL, "date_debut" TIMESTAMP NOT NULL, "solde_conges" double precision NOT NULL, "agentId" integer, CONSTRAINT "PK_17c3a89f58a2997276084e706e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "competency" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "category" character varying NOT NULL, CONSTRAINT "PK_9b9cd5b5654e3900e92f6956436" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "agent_competency" ("id" SERIAL NOT NULL, "level" integer NOT NULL, "expirationDate" TIMESTAMP NOT NULL, "agentId" integer, "competencyId" integer, CONSTRAINT "PK_6a8375d1ae459e1aa1534908b0d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "shift" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP NOT NULL, "postId" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'PLANNED', "agentId" integer, CONSTRAINT "PK_53071a6485a1e9dc75ec3db54b9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "agent" ("id" SERIAL NOT NULL, "nom" character varying NOT NULL, "email" character varying NOT NULL, "matricule" character varying NOT NULL, "telephone" character varying NOT NULL, CONSTRAINT "UQ_c8e51500f3876fa1bbd4483ecc1" UNIQUE ("email"), CONSTRAINT "UQ_c0e005072cf74273d618b9dbd09" UNIQUE ("matricule"), CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "contract" ADD CONSTRAINT "FK_c5764ce756afc868fb188761998" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_competency" ADD CONSTRAINT "FK_e42937a60f8862862f0a546c2dd" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_competency" ADD CONSTRAINT "FK_65a995f73f1de1f96238efa108b" FOREIGN KEY ("competencyId") REFERENCES "competency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shift" ADD CONSTRAINT "FK_77b62a5d028e8230f233a860d48" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "shift" DROP CONSTRAINT "FK_77b62a5d028e8230f233a860d48"`);
        await queryRunner.query(`ALTER TABLE "agent_competency" DROP CONSTRAINT "FK_65a995f73f1de1f96238efa108b"`);
        await queryRunner.query(`ALTER TABLE "agent_competency" DROP CONSTRAINT "FK_e42937a60f8862862f0a546c2dd"`);
        await queryRunner.query(`ALTER TABLE "contract" DROP CONSTRAINT "FK_c5764ce756afc868fb188761998"`);
        await queryRunner.query(`DROP TABLE "agent"`);
        await queryRunner.query(`DROP TABLE "shift"`);
        await queryRunner.query(`DROP TABLE "agent_competency"`);
        await queryRunner.query(`DROP TABLE "competency"`);
        await queryRunner.query(`DROP TABLE "contract"`);
    }
}
exports.CompleteSchema1766959186786 = CompleteSchema1766959186786;
//# sourceMappingURL=1766959186786-CompleteSchema.js.map