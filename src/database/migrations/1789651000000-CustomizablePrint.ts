import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customizable print products:
 * - products: isCustomizable flag + customizationNote text
 */
export class CustomizablePrint1789651000000 implements MigrationInterface {
  name = 'CustomizablePrint1789651000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`products\` ADD COLUMN \`isCustomizable\` tinyint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE \`products\` ADD COLUMN \`customizationNote\` text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`customizationNote\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`isCustomizable\``);
  }
}
