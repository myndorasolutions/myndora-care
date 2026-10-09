// Auth router: email/password UAT auth with simulated verification codes.
// No real email is sent in UAT — the code is returned in the response and shown
// to the tester in the UI (clearly labelled as simulated).
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "./queries/connection";
import { accounts, profiles, chwApplications, clinicianApplications, contactMessages } from "@db/schema";
import {
  accountForToken, clearSessionCookieHeader, consumeResetCode, consumeVerificationCode,
  createResetCode, createSession, createVerificationCode, destroySession, ensureDemoAccount,
  findAccountByEmail, hashPassword, readSessionCookie, sessionCookieHeader, toAuthAccount, verifyPassword,
} from "./queries/auth";
import { DEMO_ACCOUNTS, type AuthSession, type DemoRole } from "@contracts/types";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

const authed = t.procedure.use(async ({ ctx, next }) => {
  const token = readSessionCookie(ctx.req);
  const accountId = token ? await accountForToken(token) : null;
  if (!token || !accountId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  return next({ ctx: { ...ctx, accountId, sessionToken: token } });
});

const adminOnly = authed.use(async ({ ctx, next }) => {
  const acc = await toAuthAccount(ctx.accountId);
  if (!acc?.profiles.some((p) => p.kind === "admin" && p.status === "active")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

async function sessionReply(ctx: TrpcContext, accountId: number, remember = true): Promise<AuthSession> {
  const { token, expiresAt } = await createSession(accountId);
  ctx.resHeaders.append("Set-Cookie", sessionCookieHeader(token, expiresAt, remember));
  const account = await toAuthAccount(accountId);
  if (!account) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return { account };
}

// Basic per-email rate limiting for failed sign-ins (per-process, UAT scope).
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILS = 5;
const loginFails = new Map<string, { fails: number; lockedUntil: number }>();

function checkLoginLock(email: string) {
  const rec = loginFails.get(email);
  if (rec && rec.lockedUntil > Date.now()) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many failed sign-in attempts — please try again later" });
  }
}

function recordLoginFail(email: string) {
  const rec = loginFails.get(email) ?? { fails: 0, lockedUntil: 0 };
  rec.fails += 1;
  if (rec.fails >= LOGIN_MAX_FAILS) { rec.lockedUntil = Date.now() + LOGIN_WINDOW_MS; rec.fails = 0; }
  loginFails.set(email, rec);
}

const creds = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const authRouter = t.router({
  register: t.procedure
    .input(creds.extend({
      name: z.string().min(2).max(255),
      phone: z.string().max(40).optional(),
      country: z.string().max(120).optional(),
    }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();
      const existing = await findAccountByEmail(email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
      const [{ id }] = await getDb().insert(accounts).values({
        email, name: input.name.trim(), passwordHash: hashPassword(input.password),
        phone: input.phone?.trim() || null, country: input.country ?? null,
      }).$returningId();
      const code = await createVerificationCode(id);
      return { ok: true as const, email, simulatedCode: code };
    }),

  resendVerification: t.procedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const acc = await findAccountByEmail(input.email);
      if (!acc) throw new TRPCError({ code: "NOT_FOUND", message: "No account with this email" });
      if (acc.verified) return { ok: true as const, alreadyVerified: true as const, simulatedCode: null };
      const code = await createVerificationCode(acc.id);
      return { ok: true as const, alreadyVerified: false as const, simulatedCode: code };
    }),

  verifyEmail: t.procedure
    .input(z.object({ email: z.string().email(), code: z.string().min(4).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const acc = await findAccountByEmail(input.email);
      if (!acc) throw new TRPCError({ code: "NOT_FOUND", message: "No account with this email" });
      if (!acc.verified) {
        const ok = await consumeVerificationCode(acc.id, input.code);
        if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification code" });
        await getDb().update(accounts).set({ verified: true }).where(eq(accounts.id, acc.id));
      }
      return sessionReply(ctx, acc.id);
    }),

  login: t.procedure.input(creds.extend({ remember: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const email = input.email.toLowerCase().trim();
    checkLoginLock(email);
    const acc = await findAccountByEmail(email);
    if (!acc || !verifyPassword(input.password, acc.passwordHash)) {
      recordLoginFail(email);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password" });
    }
    if (acc.status === "deactivated") {
      throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated. Contact Myndora Care support." });
    }
    if (acc.status === "suspended") {
      throw new TRPCError({ code: "FORBIDDEN", message: "This account is currently suspended. Contact Myndora Care support." });
    }
    loginFails.delete(email);
    if (!acc.verified) {
      const code = await createVerificationCode(acc.id);
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Email not verified||SIMULATED_CODE:${code}`,
      });
    }
    await getDb().update(accounts).set({ lastLoginAt: new Date() }).where(eq(accounts.id, acc.id));
    return sessionReply(ctx, acc.id, input.remember ?? true);
  }),

  logout: authed.mutation(async ({ ctx }) => {
    await destroySession(ctx.sessionToken);
    ctx.resHeaders.append("Set-Cookie", clearSessionCookieHeader());
    return { ok: true as const };
  }),

  me: t.procedure.query(async ({ ctx }): Promise<AuthSession | null> => {
    const token = readSessionCookie(ctx.req);
    const accountId = token ? await accountForToken(token) : null;
    if (!accountId) return null;
    const account = await toAuthAccount(accountId);
    return account ? { account } : null;
  }),

  forgotPassword: t.procedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const acc = await findAccountByEmail(input.email);
      // Do not reveal whether the account exists — but UAT needs the simulated code, so
      // return it only when an account exists and mark the response clearly.
      if (!acc) return { ok: true as const, simulatedCode: null };
      const code = await createResetCode(acc.id);
      return { ok: true as const, simulatedCode: code };
    }),

  resetPassword: t.procedure
    .input(z.object({ email: z.string().email(), code: z.string().min(4).max(12), password: z.string().min(8).max(200) }))
    .mutation(async ({ input }) => {
      const acc = await findAccountByEmail(input.email);
      if (!acc) throw new TRPCError({ code: "NOT_FOUND", message: "No account with this email" });
      const ok = await consumeResetCode(acc.id, input.code);
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset code" });
      await getDb().update(accounts).set({ passwordHash: hashPassword(input.password) }).where(eq(accounts.id, acc.id));
      return { ok: true as const };
    }),

  demoLogin: t.procedure
    .input(z.object({ role: z.enum(Object.keys(DEMO_ACCOUNTS) as [DemoRole, ...DemoRole[]]) }))
    .mutation(async ({ ctx, input }) => {
      const id = await ensureDemoAccount(input.role);
      return sessionReply(ctx, id);
    }),
});

export const onboardingRouter = t.router({
  // Creates a role profile on the signed-in account. Admin profiles are never
  // creatable here — they are seeded internally only.
  addProfile: authed
    .input(z.object({
      kind: z.enum(["sponsor", "patient", "chw_applicant"]),
      refId: z.string().max(64).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.profiles.findMany({ where: eq(profiles.accountId, ctx.accountId) });
      if (existing.some((p) => p.kind === input.kind || (input.kind === "chw_applicant" && p.kind === "chw"))) {
        throw new TRPCError({ code: "CONFLICT", message: "This profile already exists on the account" });
      }
      const [{ id }] = await db.insert(profiles).values({
        accountId: ctx.accountId,
        kind: input.kind,
        status: input.kind === "chw_applicant" ? "pending_review" : "active",
        refId: input.refId,
      }).$returningId();
      const account = await toAuthAccount(ctx.accountId);
      return { ok: true as const, profileId: id, account: account! };
    }),

  submitChwApplication: authed
    .input(z.object({
      applicantName: z.string().min(2).max(255),
      city: z.string().min(2).max(120),
      payload: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db.insert(chwApplications).values({
        accountId: ctx.accountId,
        applicantName: input.applicantName,
        city: input.city,
        stage: "identity_review",
        payload: JSON.stringify(input.payload),
      }).$returningId();
      return { ok: true as const, applicationId: id };
    }),

  // Clinician expression of interest — public, never creates an active clinician
  // profile. Verification and activation are internal (admin) steps.
  submitClinicianApplication: t.procedure
    .input(z.object({
      name: z.string().min(2).max(255),
      email: z.string().email().max(320),
      payload: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = readSessionCookie(ctx.req);
      const accountId = token ? await accountForToken(token) : null;
      const [{ id }] = await getDb().insert(clinicianApplications).values({
        accountId: accountId ?? null,
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        stage: "application_submitted",
        payload: JSON.stringify(input.payload),
      }).$returningId();
      return { ok: true as const, applicationId: id };
    }),

  myChwApplication: authed.query(async ({ ctx }) => {
    const row = await getDb().query.chwApplications.findFirst({
      where: eq(chwApplications.accountId, ctx.accountId),
    });
    if (!row) return null;
    return { ...row, payload: JSON.parse(row.payload) as Record<string, unknown> };
  }),

  // Applicants can amend their submission while it is still in review
  // (not after a final decision).
  updateChwApplication: authed
    .input(z.object({ payload: z.record(z.string(), z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.chwApplications.findFirst({
        where: eq(chwApplications.accountId, ctx.accountId),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No application found" });
      if (row.stage === "approved_remote" || row.stage === "approved_home_visits" || row.stage === "rejected") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This application can no longer be edited" });
      }
      const merged = { ...(JSON.parse(row.payload) as Record<string, unknown>), ...input.payload };
      await db.update(chwApplications)
        .set({ payload: JSON.stringify(merged), updatedAt: new Date() })
        .where(eq(chwApplications.id, row.id));
      return { ok: true as const };
    }),
});

export const contactRouter = t.router({
  submit: t.procedure
    .input(z.object({
      name: z.string().min(2).max(255),
      email: z.string().email().max(320),
      topic: z.string().min(2).max(120),
      message: z.string().min(10).max(4000),
    }))
    .mutation(async ({ input }) => {
      await getDb().insert(contactMessages).values({
        name: input.name.trim(), email: input.email.toLowerCase().trim(),
        topic: input.topic, message: input.message.trim(),
      });
      return { ok: true as const };
    }),
});

export const stateRouter = t.router({
  load: authed.query(async ({ ctx }) => {
    const row = await getDb().query.appStates.findFirst({
      where: (t2, { eq: e }) => e(t2.accountId, ctx.accountId),
    });
    return row ? { payload: row.payload, updatedAt: row.updatedAt } : null;
  }),

  save: authed
    .input(z.object({ payload: z.string().max(8 * 1024 * 1024) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { appStates } = await import("@db/schema");
      await db.insert(appStates)
        .values({ accountId: ctx.accountId, payload: input.payload, updatedAt: new Date() })
        .onDuplicateKeyUpdate({ set: { payload: input.payload, updatedAt: new Date() } });
      return { ok: true as const };
    }),
});

export const adminRouter = t.router({
  chwApplications: adminOnly.query(async () => {
    const rows = await getDb().query.chwApplications.findMany();
    return rows.map((r) => ({
      id: r.id, applicantName: r.applicantName, city: r.city, stage: r.stage,
      payload: JSON.parse(r.payload) as Record<string, unknown>,
      hasAccount: r.accountId != null, updatedAt: r.updatedAt,
    }));
  }),

  advanceChwApplication: adminOnly
    .input(z.object({
      id: z.number(),
      stage: z.enum(["identity_review", "qualification_review", "references_pending", "training_required", "approved_remote", "approved_home_visits", "suspended", "rejected"]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const row = await db.query.chwApplications.findFirst({ where: eq(chwApplications.id, input.id) });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(chwApplications).set({ stage: input.stage, updatedAt: new Date() }).where(eq(chwApplications.id, input.id));
      // Activation: once approved for remote checks, the applicant's account gets
      // an approved CHW profile and the applicant profile is marked complete.
      if (row.accountId && (input.stage === "approved_remote" || input.stage === "approved_home_visits")) {
        const profs = await db.query.profiles.findMany({ where: eq(profiles.accountId, row.accountId) });
        if (!profs.some((p) => p.kind === "chw")) {
          await db.insert(profiles).values({ accountId: row.accountId, kind: "chw", status: "active", refId: null });
        }
        await db.update(profiles).set({ status: "active" })
          .where(eq(profiles.id, profs.find((p) => p.kind === "chw_applicant")?.id ?? -1));
      }
      if (row.accountId && (input.stage === "suspended" || input.stage === "rejected")) {
        const profs = await db.query.profiles.findMany({ where: eq(profiles.accountId, row.accountId) });
        for (const p of profs.filter((p) => p.kind === "chw" || p.kind === "chw_applicant")) {
          await db.update(profiles).set({ status: input.stage === "suspended" ? "suspended" : "rejected" }).where(eq(profiles.id, p.id));
        }
      }
      return { ok: true as const };
    }),

  // UAT convenience: ensures one walk-in sample application exists so the admin
  // stage-advance flow is testable before any real applicant registers.
  seedDemoChwApplication: adminOnly.mutation(async () => {
    const db = getDb();
    const existing = await db.query.chwApplications.findMany();
    if (existing.length > 0) return { ok: true as const, created: false };
    await db.insert(chwApplications).values({
      accountId: null,
      applicantName: "Chidi Nwosu",
      city: "Ilorin",
      stage: "references_pending",
      payload: JSON.stringify({
        phone: "+234 800 000 1122", nin: "30000000001", serviceArea: "Tanke, Fate, GRA",
        qualification: "CHEW Diploma, Kwara State School of Health", cadre: "CHEW",
        registration: "CHW-IL-2026-014", yearsExperience: 4, languages: ["English", "Yoruba"],
        radiusKm: 8, availability: ["Mon", "Tue", "Thu", "Sat"],
        requestedServices: ["Remote checks", "Home visits", "Vitals recording"],
        references: [
          { name: "Nurse Halima Yusuf", phone: "+234 800 000 2233" },
          { name: "Dr. Sola Adebayo", phone: "+234 800 000 3344" },
        ],
        consentToChecks: true, walkIn: true,
      }),
    });
    return { ok: true as const, created: true };
  }),

  users: adminOnly.query(async () => {
    const db = getDb();
    const accs = await db.query.accounts.findMany();
    const profs = await db.query.profiles.findMany();
    return accs.map((a) => ({
      id: a.id, email: a.email, name: a.name, verified: a.verified, isDemo: a.isDemo,
      status: a.status, createdAt: a.createdAt, lastLoginAt: a.lastLoginAt,
      profiles: profs.filter((p) => p.accountId === a.id).map((p) => ({ id: p.id, kind: p.kind, status: p.status, refId: p.refId })),
    }));
  }),

  setAccountStatus: adminOnly
    .input(z.object({ accountId: z.number(), status: z.enum(["active", "suspended", "deactivated"]) }))
    .mutation(async ({ input }) => {
      await getDb().update(accounts).set({ status: input.status }).where(eq(accounts.id, input.accountId));
      // A deactivated account's sessions are revoked immediately.
      if (input.status === "deactivated") {
        const { sessions } = await import("@db/schema");
        await getDb().delete(sessions).where(eq(sessions.accountId, input.accountId));
      }
      return { ok: true as const };
    }),

  clinicianApplications: adminOnly.query(async () => {
    const rows = await getDb().query.clinicianApplications.findMany();
    return rows.map((r) => ({
      id: r.id, name: r.name, email: r.email, stage: r.stage,
      payload: JSON.parse(r.payload) as Record<string, unknown>,
      hasAccount: r.accountId != null, updatedAt: r.updatedAt,
    }));
  }),

  reviewClinicianApplication: adminOnly
    .input(z.object({
      id: z.number(),
      stage: z.enum(["verification_pending", "approved", "suspended", "rejected"]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const row = await db.query.clinicianApplications.findFirst({ where: eq(clinicianApplications.id, input.id) });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(clinicianApplications).set({ stage: input.stage, updatedAt: new Date() }).where(eq(clinicianApplications.id, row.id));
      // Approval activates a clinician profile only when the applicant holds an account.
      if (row.accountId && input.stage === "approved") {
        const profs = await db.query.profiles.findMany({ where: eq(profiles.accountId, row.accountId) });
        if (!profs.some((p) => p.kind === "clinician")) {
          await db.insert(profiles).values({ accountId: row.accountId, kind: "clinician", status: "active", refId: null });
        } else {
          await db.update(profiles).set({ status: "active" })
            .where(eq(profiles.id, profs.find((p) => p.kind === "clinician")!.id));
        }
      }
      if (row.accountId && (input.stage === "suspended" || input.stage === "rejected")) {
        const profs = await db.query.profiles.findMany({ where: eq(profiles.accountId, row.accountId) });
        for (const p of profs.filter((p) => p.kind === "clinician")) {
          await db.update(profiles).set({ status: input.stage === "suspended" ? "suspended" : "rejected" }).where(eq(profiles.id, p.id));
        }
      }
      return { ok: true as const };
    }),

  setProfileStatus: adminOnly
    .input(z.object({ profileId: z.number(), status: z.enum(["active", "pending_review", "suspended", "rejected"]) }))
    .mutation(async ({ input }) => {
      await getDb().update(profiles).set({ status: input.status }).where(eq(profiles.id, input.profileId));
      return { ok: true as const };
    }),
});
