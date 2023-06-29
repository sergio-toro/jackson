import { MigrationInterface, QueryRunner } from "typeorm";

export class MssNamespace1688036519383 implements MigrationInterface {
    name = 'MssNamespace1688036519383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "jackson_store" ADD "namespace" varchar(64)`);
        await queryRunner.query(`CREATE INDEX "_jackson_store_namespace" ON "jackson_store" ("namespace") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "_jackson_store_namespace" ON "jackson_store"`);
        await queryRunner.query(`ALTER TABLE "jackson_store" DROP COLUMN "namespace"`);
    }

}