-- AlterTable
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "medications" TEXT[] DEFAULT ARRAY[]::TEXT[];
