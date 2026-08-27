-- DropIndex
DROP INDEX "files_owner_id_idx";

-- DropIndex
DROP INDEX "refresh_tokens_user_id_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "storage_used_bytes" BIGINT NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "files_owner_id_uploaded_at_idx" ON "files"("owner_id", "uploaded_at" DESC);

-- CreateIndex
CREATE INDEX "files_owner_id_visibility_idx" ON "files"("owner_id", "visibility");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_token_hash_revoked_idx" ON "refresh_tokens"("user_id", "token_hash", "revoked");
