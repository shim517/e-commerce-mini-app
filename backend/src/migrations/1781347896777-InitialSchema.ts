import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1781347896777 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "email"         varchar(255)      NOT NULL,
        "password_hash" varchar           NOT NULL,
        "created_at"    TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"               uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash"       varchar       NOT NULL,
        "user_id"          uuid          NOT NULL,
        "last_activity_at" TIMESTAMPTZ   NOT NULL,
        "expires_at"       TIMESTAMPTZ   NOT NULL,
        "created_at"       TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_last_activity_at" ON "refresh_tokens" ("last_activity_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"          SERIAL            NOT NULL,
        "name"        varchar(255)      NOT NULL,
        "description" text              NOT NULL,
        "price"       numeric(10,2)     NOT NULL,
        "image_url"   varchar(500),
        "category"    varchar(100)      NOT NULL,
        "stock"       integer           NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_category" ON "products" ("category")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_created_at" ON "products" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
