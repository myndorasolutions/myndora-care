import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/store/auth';
import type { AuthSession } from '@contracts/types';
import { DEMO_ACCOUNTS } from '@contracts/types';

// ---------------------------------------------------------------------------
// In-memory fake of the backend API (src/lib/api) — tests never hit the network.
// ---------------------------------------------------------------------------

interface FakeProfile { id: number; kind: string; status: string; refId: string | null }
interface FakeAccount {
  id: number; email: string; name: string; password: string;
  verified: boolean; isDemo: boolean; profiles: FakeProfile[];
  status: 'active' | 'suspended' | 'deactivated';
  phone: string | null; country: string | null;
  state: string | null;
}
interface FakeApplication {
  id: number; accountId: number | null; applicantName: string; city: string;
  stage: string; payload: string; updatedAt: Date;
}
interface FakeClinicianApplication {
  id: number; accountId: number | null; name: string; email: string;
  stage: string; payload: string; updatedAt: Date;
}

let seq = 100;
let accounts: FakeAccount[];
let applications: FakeApplication[];
let clinicianApplications: FakeClinicianApplication[];
let contactMessages: { id: number; name: string; email: string; topic: string; message: string }[];
let currentAccountId: number | null;
let verifyCodes: Record<string, string>;
let resetCodes: Record<string, string>;

const DEMO_PROFILES: Record<string, { kind: string; refId: string }[]> = {
  sponsor: [{ kind: 'sponsor', refId: 'acc-sponsor' }, { kind: 'patient', refId: 'pat-tunde' }],
  patient: [{ kind: 'patient', refId: 'pat-grace' }],
  chw: [{ kind: 'chw', refId: 'chw-amina' }],
  admin: [{ kind: 'admin', refId: 'acc-admin' }],
  clinician: [{ kind: 'clinician', refId: 'acc-clinician' }],
};

function resetFakes() {
  accounts = [];
  applications = [];
  clinicianApplications = [];
  contactMessages = [];
  verifyCodes = {};
  resetCodes = {};
  for (const [role, info] of Object.entries(DEMO_ACCOUNTS)) {
    accounts.push({
      id: ++seq, email: info.email, name: info.name, password: 'myndora-demo-2026',
      verified: true, isDemo: true, status: 'active', phone: null, country: null, state: null,
      profiles: DEMO_PROFILES[role].map((p) => ({ id: ++seq, kind: p.kind, status: 'active', refId: p.refId })),
    });
  }
  currentAccountId = null;
}

resetFakes();

function toSession(a: FakeAccount): AuthSession {
  return {
    account: {
      id: a.id, email: a.email, name: a.name, verified: a.verified, isDemo: a.isDemo,
      status: a.status, phone: a.phone, country: a.country,
      profiles: a.profiles.map((p) => ({ ...p })) as AuthSession['account']['profiles'],
    },
  };
}

function current(): FakeAccount {
  const a = accounts.find((x) => x.id === currentAccountId);
  if (!a) throw new Error('UNAUTHORIZED');
  return a;
}

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      me: { query: async () => (currentAccountId ? toSession(current()) : null) },
      register: { mutate: async (i: { name: string; email: string; password: string; phone?: string; country?: string }) => {
        if (accounts.some((a) => a.email === i.email)) throw new Error('Account already exists');
        accounts.push({
          id: ++seq, email: i.email, name: i.name, password: i.password,
          verified: false, isDemo: false, profiles: [], status: 'active',
          phone: i.phone ?? null, country: i.country ?? null, state: null,
        });
        verifyCodes[i.email] = '123456';
        return { ok: true, simulatedCode: '123456' };
      } },
      resendVerification: { mutate: async (i: { email: string }) => ({ ok: true, simulatedCode: verifyCodes[i.email] ?? '123456' }) },
      verifyEmail: { mutate: async (i: { email: string; code: string }) => {
        const a = accounts.find((x) => x.email === i.email);
        if (!a || verifyCodes[i.email] !== i.code) throw new Error('Invalid or expired code');
        a.verified = true;
        currentAccountId = a.id;
        return toSession(a);
      } },
      login: { mutate: async (i: { email: string; password: string; remember?: boolean }) => {
        const a = accounts.find((x) => x.email === i.email && x.password === i.password);
        if (!a) throw new Error('Invalid credentials');
        if (a.status === 'deactivated') throw new Error('This account has been deactivated. Contact Myndora Care support.');
        if (a.status === 'suspended') throw new Error('This account is currently suspended. Contact Myndora Care support.');
        if (!a.verified) throw new Error(`Email not verified||SIMULATED_CODE:${verifyCodes[i.email] ?? '123456'}`);
        currentAccountId = a.id;
        return toSession(a);
      } },
      logout: { mutate: async () => { currentAccountId = null; return { ok: true }; } },
      forgotPassword: { mutate: async (i: { email: string }) => {
        if (!accounts.some((a) => a.email === i.email)) throw new Error('No account');
        resetCodes[i.email] = '654321';
        return { ok: true, simulatedCode: '654321' };
      } },
      resetPassword: { mutate: async (i: { email: string; code: string; password: string }) => {
        const a = accounts.find((x) => x.email === i.email);
        if (!a || resetCodes[i.email] !== i.code) throw new Error('Invalid or expired code');
        a.password = i.password;
        return { ok: true };
      } },
      demoLogin: { mutate: async (i: { role: keyof typeof DEMO_ACCOUNTS }) => {
        const a = accounts.find((x) => x.email === DEMO_ACCOUNTS[i.role].email);
        if (!a) throw new Error('Demo unavailable');
        currentAccountId = a.id;
        return toSession(a);
      } },
    },
    onboarding: {
      addProfile: { mutate: async (i: { kind: string; refId: string | null }) => {
        const a = current();
        if (i.kind === 'admin') throw new Error('Admin profiles cannot be self-assigned');
        a.profiles.push({ id: ++seq, kind: i.kind, status: i.kind === 'chw_applicant' ? 'pending_review' : 'active', refId: i.refId });
        return { ok: true, profileId: seq, account: toSession(a).account };
      } },
      submitChwApplication: { mutate: async (i: { applicantName: string; city: string; payload: Record<string, unknown> }) => {
        const a = current();
        applications.push({ id: ++seq, accountId: a.id, applicantName: i.applicantName, city: i.city, stage: 'identity_review', payload: JSON.stringify(i.payload), updatedAt: new Date() });
        return { ok: true, applicationId: seq };
      } },
      myChwApplication: { query: async () => {
        const a = current();
        const app = applications.find((x) => x.accountId === a.id);
        return app ? { ...app, payload: JSON.parse(app.payload) } : null;
      } },
      updateChwApplication: { mutate: async (i: { payload: Record<string, unknown> }) => {
        const a = current();
        const app = applications.find((x) => x.accountId === a.id);
        if (!app) throw new Error('NOT_FOUND');
        if (['approved_remote', 'approved_home_visits', 'rejected'].includes(app.stage)) throw new Error('FORBIDDEN');
        app.payload = JSON.stringify({ ...JSON.parse(app.payload), ...i.payload });
        return { ok: true };
      } },
      submitClinicianApplication: { mutate: async (i: { name: string; email: string; payload: Record<string, unknown> }) => {
        const a = currentAccountId ? accounts.find((x) => x.id === currentAccountId) : null;
        clinicianApplications.push({
          id: ++seq, accountId: a?.id ?? null, name: i.name, email: i.email,
          stage: 'application_submitted', payload: JSON.stringify(i.payload), updatedAt: new Date(),
        });
        return { ok: true, applicationId: seq };
      } },
    },
    contact: {
      submit: { mutate: async (i: { name: string; email: string; topic: string; message: string }) => {
        contactMessages.push({ id: ++seq, ...i });
        return { ok: true };
      } },
    },
    state: {
      load: { query: async () => {
        const a = current();
        return a.state ? { payload: a.state, updatedAt: new Date() } : null;
      } },
      save: { mutate: async (i: { payload: string }) => { current().state = i.payload; return { ok: true }; } },
    },
    admin: {
      chwApplications: { query: async () => applications.map((a) => ({ ...a, payload: JSON.parse(a.payload), hasAccount: a.accountId != null })) },
      advanceChwApplication: { mutate: async (i: { id: number; stage: string }) => {
        const app = applications.find((x) => x.id === i.id);
        if (!app) throw new Error('NOT_FOUND');
        app.stage = i.stage;
        if (app.accountId && (i.stage === 'approved_remote' || i.stage === 'approved_home_visits')) {
          const a = accounts.find((x) => x.id === app.accountId)!;
          if (!a.profiles.some((p) => p.kind === 'chw')) a.profiles.push({ id: ++seq, kind: 'chw', status: 'active', refId: null });
        }
        return { ok: true };
      } },
      seedDemoChwApplication: { mutate: async () => {
        if (applications.length === 0) {
          applications.push({
            id: ++seq, accountId: null, applicantName: 'Chidi Nwosu', city: 'Ilorin',
            stage: 'references_pending', updatedAt: new Date(),
            payload: JSON.stringify({ phone: '+234 800 000 1122', nin: '30000000001', cadre: 'CHEW', qualification: 'CHEW Diploma', registration: 'CHW-IL-2026-014', yearsExperience: 4, languages: ['English', 'Yoruba'], serviceArea: 'Tanke, Fate, GRA', radiusKm: 8, availability: ['Mon'], requestedServices: ['Remote checks'], references: [{ name: 'Nurse Halima Yusuf', phone: '+234 800 000 2233' }, { name: 'Dr. Sola Adebayo', phone: '+234 800 000 3344' }], consentToChecks: true }),
          });
          return { ok: true, created: true };
        }
        return { ok: true, created: false };
      } },
      users: { query: async () => accounts.map((a) => ({ id: a.id, email: a.email, name: a.name, verified: a.verified, isDemo: a.isDemo, status: a.status, createdAt: new Date(), lastLoginAt: null, profiles: a.profiles.map((p) => ({ ...p })) })) },
      setProfileStatus: { mutate: async (i: { profileId: number; status: string }) => {
        for (const a of accounts) {
          const p = a.profiles.find((x) => x.id === i.profileId);
          if (p) { p.status = i.status; return { ok: true }; }
        }
        throw new Error('NOT_FOUND');
      } },
      setAccountStatus: { mutate: async (i: { accountId: number; status: 'active' | 'suspended' | 'deactivated' }) => {
        const a = accounts.find((x) => x.id === i.accountId);
        if (!a) throw new Error('NOT_FOUND');
        a.status = i.status;
        if (i.status === 'deactivated' && currentAccountId === a.id) currentAccountId = null;
        return { ok: true };
      } },
      clinicianApplications: { query: async () => clinicianApplications.map((a) => ({ ...a, payload: JSON.parse(a.payload), hasAccount: a.accountId != null })) },
      reviewClinicianApplication: { mutate: async (i: { id: number; stage: string }) => {
        const app = clinicianApplications.find((x) => x.id === i.id);
        if (!app) throw new Error('NOT_FOUND');
        app.stage = i.stage;
        if (app.accountId && i.stage === 'approved') {
          const a = accounts.find((x) => x.id === app.accountId)!;
          if (!a.profiles.some((p) => p.kind === 'clinician')) a.profiles.push({ id: ++seq, kind: 'clinician', status: 'active', refId: null });
        }
        if (app.accountId && (i.stage === 'suspended' || i.stage === 'rejected')) {
          const a = accounts.find((x) => x.id === app.accountId)!;
          for (const p of a.profiles.filter((p) => p.kind === 'clinician')) p.status = i.stage;
        }
        return { ok: true };
      } },
    },
  },
}));

// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  resetFakes();
  useStore.getState().resetDemo();
  useStore.getState().switchRole('sponsor');
  useAuth.setState({ session: null, bootstrapped: true, activeProfile: null, tourSeen: {} });
});
