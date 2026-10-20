import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignSavedForecastCursorPrecision1792512000000 implements MigrationInterface {
  name = "AlignSavedForecastCursorPrecision1792512000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_saved_forecasts_user_saved_at"',
    );
    await queryRunner.query(`
      ALTER TABLE "saved_forecasts"
      ALTER COLUMN "saved_at" TYPE timestamptz(3)
        USING date_trunc('milliseconds', "saved_at"),
      ALTER COLUMN "saved_at" SET DEFAULT CURRENT_TIMESTAMP(3)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_saved_forecasts_user_saved_at"
      ON "saved_forecasts" ("user_id", "saved_at", "id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_saved_forecasts_user_saved_at"',
    );
    await queryRunner.query(`
      ALTER TABLE "saved_forecasts"
      ALTER COLUMN "saved_at" TYPE timestamptz,
      ALTER COLUMN "saved_at" SET DEFAULT CURRENT_TIMESTAMP
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_saved_forecasts_user_saved_at"
      ON "saved_forecasts" ("user_id", "saved_at")
    `);
  }
}
