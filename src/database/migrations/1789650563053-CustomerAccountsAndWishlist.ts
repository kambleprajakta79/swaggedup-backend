import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer accounts & wishlist:
 * - users: name, phone, isVerified
 * - orders: userId (nullable link to customer account)
 * - otps: new table for OTP verification codes
 * - wishlists: new table for server-side wishlists
 *
 * Written by hand (not auto-generated) to be additive-only and safe on
 * databases that have drifted from the entity definitions.
 */
export class CustomerAccountsAndWishlist1789650563053 implements MigrationInterface {
  name = 'CustomerAccountsAndWishlist1789650563053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;

    // --- users: new profile columns ---
    await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`name\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`phone\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`isVerified\` tinyint NOT NULL DEFAULT 0`);

    // --- orders: link to customer account ---
    await queryRunner.query(`ALTER TABLE \`orders\` ADD COLUMN \`userId\` int NULL`);

    // --- otps table ---
    if (dbType === 'mysql') {
      await queryRunner.query(
        `CREATE TABLE \`otps\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`codeHash\` varchar(255) NOT NULL, \`purpose\` varchar(255) NOT NULL, \`expiresAt\` datetime NOT NULL, \`consumedAt\` datetime NULL, \`attempts\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_otps_email_purpose\` (\`email\`, \`purpose\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
      await queryRunner.query(
        `CREATE TABLE \`wishlists\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`productId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_wishlists_user_product\` (\`userId\`, \`productId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    } else {
      // sqlite (better-sqlite3)
      await queryRunner.query(
        `CREATE TABLE "otps" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" varchar NOT NULL, "codeHash" varchar NOT NULL, "purpose" varchar NOT NULL, "expiresAt" datetime NOT NULL, "consumedAt" datetime, "attempts" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_otps_email_purpose" ON "otps" ("email", "purpose")`,
      );
      await queryRunner.query(
        `CREATE TABLE "wishlists" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "productId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "IDX_wishlists_user_product" ON "wishlists" ("userId", "productId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`wishlists\``);
    await queryRunner.query(`DROP TABLE \`otps\``);
    await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`userId\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`isVerified\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`name\``);
  }
}
