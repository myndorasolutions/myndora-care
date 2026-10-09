-- Expand audit_logs for mutation before/after state tracking
ALTER TABLE "audit_logs" RENAME COLUMN "user_id" TO "actor_id";
ALTER TABLE "audit_logs" RENAME COLUMN "timestamp" TO "created_at";

ALTER TABLE "audit_logs" ADD COLUMN "entity_name" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "entity_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "before_state" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN "after_state" JSONB;

-- Preserve legacy entity_context payloads without fragile jsonb casts
UPDATE "audit_logs"
SET
  "entity_name" = COALESCE(NULLIF(TRIM("entity_context"), ''), 'legacy'),
  "after_state" = jsonb_build_object('legacyContext', "entity_context")
WHERE "entity_name" IS NULL;

ALTER TABLE "audit_logs" ALTER COLUMN "entity_name" SET NOT NULL;
ALTER TABLE "audit_logs" DROP COLUMN "entity_context";

CREATE INDEX "audit_logs_entity_name_entity_id_idx" ON "audit_logs"("entity_name", "entity_id");
