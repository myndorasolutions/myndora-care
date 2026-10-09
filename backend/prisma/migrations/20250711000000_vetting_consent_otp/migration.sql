-- AlterTable
ALTER TABLE "chw_profiles" ADD COLUMN "vetting_scorecard" JSONB;

-- CreateTable
CREATE TABLE "patient_consent_challenges" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_consent_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_consent_challenges_patient_id_idx" ON "patient_consent_challenges"("patient_id");

-- AddForeignKey
ALTER TABLE "patient_consent_challenges" ADD CONSTRAINT "patient_consent_challenges_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
