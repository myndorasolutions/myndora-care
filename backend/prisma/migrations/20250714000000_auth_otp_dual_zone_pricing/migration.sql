-- AlterEnum
CREATE TYPE "PricingZone" AS ENUM ('ZONE_A', 'ZONE_B');

-- AlterTable users: nullable identifiers + is_verified
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false;

-- Auth OTP challenges
CREATE TABLE IF NOT EXISTS "auth_otp_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auth_otp_challenges_user_id_idx" ON "auth_otp_challenges"("user_id");

ALTER TABLE "auth_otp_challenges"
  DROP CONSTRAINT IF EXISTS "auth_otp_challenges_user_id_fkey";
ALTER TABLE "auth_otp_challenges"
  ADD CONSTRAINT "auth_otp_challenges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sponsor city / zone
ALTER TABLE "sponsors" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "sponsors" ADD COLUMN IF NOT EXISTS "pricing_zone" "PricingZone";
ALTER TABLE "sponsors" ALTER COLUMN "country" SET DEFAULT 'Nigeria';

-- Patient city / zone
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "pricing_zone" "PricingZone";

-- Dual-zone pricing catalog
CREATE TABLE IF NOT EXISTS "service_cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricing_zone" "PricingZone" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_cities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "service_cities_name_key" ON "service_cities"("name");

CREATE TABLE IF NOT EXISTS "subscription_plan_catalog" (
    "id" TEXT NOT NULL,
    "plan_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "allocated_visits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_plan_catalog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_catalog_plan_key_key" ON "subscription_plan_catalog"("plan_key");

CREATE TABLE IF NOT EXISTS "plan_zone_prices" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "pricing_zone" "PricingZone" NOT NULL,
    "monthly_price_naira" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_zone_prices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "plan_zone_prices_plan_id_pricing_zone_key" ON "plan_zone_prices"("plan_id", "pricing_zone");

ALTER TABLE "plan_zone_prices"
  DROP CONSTRAINT IF EXISTS "plan_zone_prices_plan_id_fkey";
ALTER TABLE "plan_zone_prices"
  ADD CONSTRAINT "plan_zone_prices_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plan_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "visit_rates" (
    "id" TEXT NOT NULL,
    "pricing_zone" "PricingZone" NOT NULL,
    "base_visit_naira" INTEGER NOT NULL,
    "chw_payout_naira" INTEGER NOT NULL,
    "platform_fee_naira" INTEGER NOT NULL,
    "distance_surcharge_per_2km_naira" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "visit_rates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "visit_rates_pricing_zone_key" ON "visit_rates"("pricing_zone");
