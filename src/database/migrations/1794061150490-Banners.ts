import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Banners: admin-managed homepage carousel banners.
 */
export class Banners1794061150490 implements MigrationInterface {
  name = 'Banners1794061150490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;

    if (dbType === 'mysql') {
      await queryRunner.query(
        `CREATE TABLE \`banners\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`subtitle\` text NULL, \`image\` text NULL, \`link\` varchar(500) NULL, \`sortOrder\` int NOT NULL DEFAULT 0, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    } else {
      await queryRunner.query(
        `CREATE TABLE "banners" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar NOT NULL, "subtitle" text, "image" text, "link" varchar, "sortOrder" integer NOT NULL DEFAULT 0, "isActive" boolean NOT NULL DEFAULT 1, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`banners\``);
  }
}
