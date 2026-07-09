-- CreateEnum
CREATE TYPE "ClinicalReviewStatus" AS ENUM ('needs_review', 'reviewed', 'closed');

-- AlterTable
ALTER TABLE "vitals" ADD COLUMN "clinical_review_status" "ClinicalReviewStatus" NOT NULL DEFAULT 'needs_review';
ALTER TABLE "vitals" ADD COLUMN "clinician_notes" TEXT;
