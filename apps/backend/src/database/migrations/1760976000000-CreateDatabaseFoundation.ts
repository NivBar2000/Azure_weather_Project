import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDatabaseFoundation1760976000000 implements MigrationInterface {
  name = "CreateDatabaseFoundation1760976000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "identity_issuer" text NOT NULL,
        "external_subject_identifier" text NOT NULL,
        "identity_provider" text NOT NULL,
        "display_name" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_identity_issuer_external_subject"
          UNIQUE ("identity_issuer", "external_subject_identifier")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "saved_forecasts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "city_name" text NOT NULL,
        "country_code" varchar(2),
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "forecast_snapshot" jsonb NOT NULL,
        "saved_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_saved_forecasts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_forecasts_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_saved_forecasts_user_saved_at"
      ON "saved_forecasts" ("user_id", "saved_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_saved_forecasts_user_saved_at"',
    );
    await queryRunner.query('DROP TABLE "saved_forecasts"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
