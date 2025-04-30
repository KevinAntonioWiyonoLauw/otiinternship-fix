-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "niu" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "reset_token" TEXT,
    "reset_token_expired_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "division_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("division_id")
);

-- CreateTable
CREATE TABLE "user_divisions" (
    "user_id" UUID NOT NULL,
    "division_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "user_divisions_pkey" PRIMARY KEY ("user_id","division_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "refresh_token_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_value" TEXT NOT NULL,
    "expired_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("refresh_token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_niu_key" ON "users"("niu");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_niu" ON "users"("niu");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_name_key" ON "divisions"("name");

-- CreateIndex
CREATE INDEX "idx_user_divisions_user_id" ON "user_divisions"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_divisions_division_id" ON "user_divisions"("division_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_refresh_token_value_key" ON "refresh_tokens"("refresh_token_value");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_refresh_token_value" ON "refresh_tokens"("refresh_token_value");

-- AddForeignKey
ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("division_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
