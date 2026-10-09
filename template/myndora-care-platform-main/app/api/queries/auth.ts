// Auth queries: password hashing, sessions, demo accounts, cookie helpers.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "./connection";
import { accounts, profiles, sessions, emailVerifications, passwordResets } from "@db/schema";
import type { AuthAccount, AuthProfile, DemoRole } from "@contracts/types";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, SESSION_COOKIE } from "@contracts/types";

const SESSION_DAYS = 30;
const CODE_MINUTES = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function makeCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function toAuthAccount(accountId: number): Promise<AuthAccount | null> {
  const db = getDb();
  const acc = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });
  if (!acc) return null;
  const rows = await db.query.profiles.findMany({ where: eq(profiles.accountId, accountId) });
  const profs: AuthProfile[] = rows.map((p) => ({ id: p.id, kind: p.kind, status: p.status, refId: p.refId }));
  return {
    id: acc.id, email: acc.email, name: acc.name, verified: acc.verified, isDemo: acc.isDemo,
    status: acc.status, phone: acc.phone ?? null, country: acc.country ?? null, profiles: profs,
  };
}

export async function findAccountByEmail(email: string) {
  return getDb().query.accounts.findFirst({ where: eq(accounts.email, email.toLowerCase().trim()) });
}

export async function createSession(accountId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await getDb().insert(sessions).values({ accountId, token, expiresAt });
  await getDb().update(accounts).set({ lastLoginAt: new Date() }).where(eq(accounts.id, accountId));
  return { token, expiresAt };
}

export async function accountForToken(token: string): Promise<number | null> {
  const row = await getDb().query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });
  return row?.accountId ?? null;
}

export async function destroySession(token: string) {
  await getDb().delete(sessions).where(eq(sessions.token, token));
}

export function readSessionCookie(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookieHeader(token: string, expiresAt: Date, persist = true): string {
  const base = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`;
  // "Remember me" unchecked → browser-session cookie (no Expires attribute).
  return persist ? `${base}; Expires=${expiresAt.toUTCString()}` : base;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(0).toUTCString()}`;
}

export async function createVerificationCode(accountId: number): Promise<string> {
  const code = makeCode();
  await getDb().insert(emailVerifications).values({
    accountId, code, expiresAt: new Date(Date.now() + CODE_MINUTES * 60000),
  });
  return code;
}

export async function consumeVerificationCode(accountId: number, code: string): Promise<boolean> {
  const db = getDb();
  const row = await db.query.emailVerifications.findFirst({
    where: and(
      eq(emailVerifications.accountId, accountId),
      eq(emailVerifications.code, code.trim()),
      eq(emailVerifications.consumed, false),
      gt(emailVerifications.expiresAt, new Date()),
    ),
  });
  if (!row) return false;
  await db.update(emailVerifications).set({ consumed: true }).where(eq(emailVerifications.id, row.id));
  return true;
}

export async function createResetCode(accountId: number): Promise<string> {
  const code = makeCode();
  await getDb().insert(passwordResets).values({
    accountId, code, expiresAt: new Date(Date.now() + CODE_MINUTES * 60000),
  });
  return code;
}

export async function consumeResetCode(accountId: number, code: string): Promise<boolean> {
  const db = getDb();
  const row = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.accountId, accountId),
      eq(passwordResets.code, code.trim()),
      eq(passwordResets.consumed, false),
      gt(passwordResets.expiresAt, new Date()),
    ),
  });
  if (!row) return false;
  await db.update(passwordResets).set({ consumed: true }).where(eq(passwordResets.id, row.id));
  return true;
}

// Demo accounts: profiles link into the seeded portal world via refId.
// Tunde Adeyemi deliberately carries TWO approved profiles (sponsor + patient)
// so testers can exercise profile switching.
const DEMO_PROFILES: Record<DemoRole, { kind: AuthProfile["kind"]; refId: string }[]> = {
  sponsor: [
    { kind: "sponsor", refId: "acc-sponsor" },
    { kind: "patient", refId: "pat-tunde" },
  ],
  patient: [{ kind: "patient", refId: "pat-grace" }],
  chw: [{ kind: "chw", refId: "chw-amina" }],
  admin: [{ kind: "admin", refId: "acc-admin" }],
  clinician: [{ kind: "clinician", refId: "acc-clinician" }],
};

export async function ensureDemoAccount(role: DemoRole): Promise<number> {
  const db = getDb();
  const spec = DEMO_ACCOUNTS[role];
  const existing = await findAccountByEmail(spec.email);
  if (existing) {
    // Keep seeded demo names in sync with the spec (e.g. renamed demo clinician).
    if (existing.name !== spec.name) {
      await db.update(accounts).set({ name: spec.name }).where(eq(accounts.id, existing.id));
    }
    return existing.id;
  }
  const [{ id }] = await db.insert(accounts).values({
    email: spec.email,
    name: spec.name,
    passwordHash: hashPassword(DEMO_PASSWORD),
    verified: true,
    isDemo: true,
  }).$returningId();
  for (const p of DEMO_PROFILES[role]) {
    await db.insert(profiles).values({ accountId: id, kind: p.kind, status: "active", refId: p.refId });
  }
  return id;
}
