-- AlterTable: add OTP verification fields to users
ALTER TABLE "users" ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "otp_code" TEXT;
ALTER TABLE "users" ADD COLUMN "otp_expires_at" TIMESTAMP(3);
