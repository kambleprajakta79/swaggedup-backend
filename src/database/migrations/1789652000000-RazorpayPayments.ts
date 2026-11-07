import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Razorpay payments: payments table tracking provider orders/payments.
 */
export class RazorpayPayments1789652000000 implements MigrationInterface {
  name = 'RazorpayPayments1789652000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;

    if (dbType === 'mysql') {
      await queryRunner.query(
        `CREATE TABLE \`payments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`orderId\` int NOT NULL, \`provider\` varchar(255) NOT NULL DEFAULT 'RAZORPAY', \`providerOrderId\` varchar(255) NOT NULL, \`providerPaymentId\` varchar(255) NULL, \`amount\` decimal(10,2) NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'CREATED', \`rawPayload\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_payments_orderId\` (\`orderId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    } else {
      await queryRunner.query(
        `CREATE TABLE "payments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "orderId" integer NOT NULL, "provider" varchar NOT NULL DEFAULT 'RAZORPAY', "providerOrderId" varchar NOT NULL, "providerPaymentId" varchar, "amount" decimal(10,2) NOT NULL, "status" varchar NOT NULL DEFAULT 'CREATED', "rawPayload" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`,
      );
      await queryRunner.query(`CREATE INDEX "IDX_payments_orderId" ON "payments" ("orderId")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`payments\``);
  }
}
