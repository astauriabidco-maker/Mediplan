import { MigrationInterface, QueryRunner } from "typeorm";
export declare class CompleteSchema1766959186786 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
