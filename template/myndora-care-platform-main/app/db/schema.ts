import {
  mysqlTable,
  mysqlEnum,
  serial,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/mysql-core";

// ── Auth: one account can hold several approved role profiles ────────────────
export const accounts = mysqlTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    verified: boolean("verified").notNull().default(false),
    isDemo: boolean("isDemo").notNull().default(false),
    phone: varchar("phone", { length: 40 }),
    country: varchar("country", { length: 120 }),
    status: mysqlEnum("status", ["active", "suspended", "deactivated"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastLoginAt: timestamp("lastLoginAt"),
  },
  (t) => ({ emailIdx: index("accounts_email_idx").on(t.email) }),
);

export const profiles = mysqlTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
    kind: mysqlEnum("kind", ["sponsor", "patient", "chw", "chw_applicant", "admin", "clinician"]).notNull(),
    status: mysqlEnum("status", ["active", "pending_review", "suspended", "rejected"]).notNull().default("active"),
    // Links the profile to an entity in the portal data world (e.g. 'acc-sponsor', 'pat-grace', 'chw-amina').
    refId: varchar("refId", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({ accountIdx: index("profiles_account_idx").on(t.accountId) }),
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
    token: varchar("token", { length: 96 }).notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
  },
  (t) => ({ accountIdx: index("sessions_account_idx").on(t.accountId) }),
);

export const emailVerifications = mysqlTable("email_verifications", {
  id: serial("id").primaryKey(),
  accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
  code: varchar("code", { length: 12 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumed: boolean("consumed").notNull().default(false),
});

export const passwordResets = mysqlTable("password_resets", {
  id: serial("id").primaryKey(),
  accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
  code: varchar("code", { length: 12 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumed: boolean("consumed").notNull().default(false),
});

// ── Per-account portal data snapshot (the tester's world) ────────────────────
export const appStates = mysqlTable(
  "app_states",
  {
    id: serial("id").primaryKey(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull().unique(),
    payload: text("payload").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
);

// ── CHW applications (identity → qualification → references → training → approval) ──
export const chwApplications = mysqlTable(
  "chw_applications",
  {
    id: serial("id").primaryKey(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }), // null for seeded demo applicants
    applicantName: varchar("applicantName", { length: 255 }).notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    stage: mysqlEnum("stage", [
      "application_started",
      "identity_review",
      "qualification_review",
      "references_pending",
      "training_required",
      "approved_remote",
      "approved_home_visits",
      "suspended",
      "rejected",
    ]).notNull().default("application_started"),
    payload: text("payload").notNull(), // JSON: full application form data
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({ accountIdx: index("chw_app_account_idx").on(t.accountId) }),
);

// Clinician expression-of-interest / verification applications (never self-approved).
export const clinicianApplications = mysqlTable(
  "clinician_applications",
  {
    id: serial("id").primaryKey(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }), // null until the clinician registers
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    stage: mysqlEnum("stage", [
      "invited",
      "application_submitted",
      "verification_pending",
      "approved",
      "suspended",
      "rejected",
    ]).notNull().default("application_submitted"),
    payload: text("payload").notNull(), // JSON: professional details for verification
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({ accountIdx: index("clin_app_account_idx").on(t.accountId) }),
);

// Public contact-form messages (UAT: stored so the form performs a real action).
export const contactMessages = mysqlTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  topic: varchar("topic", { length: 120 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ChwApplication = typeof chwApplications.$inferSelect;
export type ClinicianApplication = typeof clinicianApplications.$inferSelect;
