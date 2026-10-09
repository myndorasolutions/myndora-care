-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SPONSOR', 'PATIENT', 'CAREGIVER', 'CHW', 'ADMIN', 'CLINICIAN_REVIEWER');

-- CreateEnum
CREATE TYPE "ChwActivationLevel" AS ENUM ('PENDING_REVIEW', 'IDENTITY_VERIFIED', 'REMOTE_CHECK_APPROVED', 'HOME_VISIT_APPROVED', 'SENIOR_FIELD_LEAD', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('SCHEDULED', 'ATTEMPTED', 'CONNECTED', 'IN_PROGRESS', 'CHECKLIST_COMPLETED', 'PENDING_CONFIRMATION', 'COMPLETED_VERIFIED', 'COMPLETED_UNVERIFIED', 'FAILED_NO_ANSWER', 'NEEDS_REVIEW', 'ESCALATED', 'CLOSED', 'MISSED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('NORMAL', 'CAUTION', 'URGENT', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SPONSOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "notification_preference" TEXT NOT NULL DEFAULT 'ALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "preferred_language" TEXT NOT NULL DEFAULT 'English',
    "emergency_contact" JSONB NOT NULL,
    "caregiver_details" JSONB,
    "condition_tags" TEXT[],
    "consent_status" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chw_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "nin_status" BOOLEAN NOT NULL DEFAULT false,
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "references_checked" BOOLEAN NOT NULL DEFAULT false,
    "training_completed" BOOLEAN NOT NULL DEFAULT false,
    "activation_level" "ChwActivationLevel" NOT NULL DEFAULT 'PENDING_REVIEW',
    "service_areas" TEXT[],
    "languages_spoken" TEXT[],
    "rating_average" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "device_uid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chw_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remote_checks" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "chw_id" TEXT NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "call_method" TEXT NOT NULL DEFAULT 'IN_APP',
    "call_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "checklist_responses" JSONB NOT NULL,
    "medication_status_notes" TEXT,
    "chw_observation_notes" TEXT,
    "patient_confirmation_otp" TEXT,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_visits" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "chw_id" TEXT NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "status" "ServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sync_status" TEXT NOT NULL DEFAULT 'SYNCED',
    "local_offline_timestamp" TIMESTAMP(3),
    "gps_latitude" DOUBLE PRECISION,
    "gps_longitude" DOUBLE PRECISION,
    "patient_signature_url" TEXT,
    "consented_photo_url" TEXT,
    "verification_otp" TEXT,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "pulse_rate" INTEGER,
    "temperature_celsius" DOUBLE PRECISION,
    "blood_sugar_mg_dl" DOUBLE PRECISION,
    "oxygen_saturation_pct" DOUBLE PRECISION,
    "checklist_responses" JSONB NOT NULL,
    "chw_observation_notes" TEXT,
    "chw_attestation_signed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_cases" (
    "id" TEXT NOT NULL,
    "remote_check_id" TEXT,
    "physical_visit_id" TEXT,
    "trigger_reason" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'CAUTION',
    "assigned_reviewer_id" TEXT,
    "coordinator_notes" TEXT,
    "clinician_notes" TEXT,
    "resolution_outcome" TEXT,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allocated_visits" INTEGER NOT NULL,
    "used_visits" INTEGER NOT NULL DEFAULT 0,
    "renewal_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "remote_check_id" TEXT,
    "physical_visit_id" TEXT,
    "reason" TEXT NOT NULL,
    "evidence_notes" TEXT,
    "admin_resolution" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_prompts" (
    "id" TEXT NOT NULL,
    "prompt_key" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'Yoruba',
    "transcript_text" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_context" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "sponsors_user_id_key" ON "sponsors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chw_profiles_user_id_key" ON "chw_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chw_profiles" ADD CONSTRAINT "chw_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_checks" ADD CONSTRAINT "remote_checks_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_checks" ADD CONSTRAINT "remote_checks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_checks" ADD CONSTRAINT "remote_checks_chw_id_fkey" FOREIGN KEY ("chw_id") REFERENCES "chw_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_visits" ADD CONSTRAINT "physical_visits_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_visits" ADD CONSTRAINT "physical_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_visits" ADD CONSTRAINT "physical_visits_chw_id_fkey" FOREIGN KEY ("chw_id") REFERENCES "chw_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation_cases" ADD CONSTRAINT "escalation_cases_remote_check_id_fkey" FOREIGN KEY ("remote_check_id") REFERENCES "remote_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation_cases" ADD CONSTRAINT "escalation_cases_physical_visit_id_fkey" FOREIGN KEY ("physical_visit_id") REFERENCES "physical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_remote_check_id_fkey" FOREIGN KEY ("remote_check_id") REFERENCES "remote_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_physical_visit_id_fkey" FOREIGN KEY ("physical_visit_id") REFERENCES "physical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
