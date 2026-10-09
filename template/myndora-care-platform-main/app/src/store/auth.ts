// Authentication store: session, profiles, guided-tour state.
// Talks to the backend through src/lib/api (mockable in tests).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthAccount, AuthSession, DemoRole, ProfileKind } from '@contracts/types';
import { api } from '@/lib/api';

interface AuthData {
  session: AuthSession | null;
  bootstrapped: boolean;
  activeProfile: ProfileKind | null;
  tourSeen: Record<string, boolean>;
}

interface AuthActions {
  bootstrap: () => Promise<void>;
  register: (name: string, email: string, password: string, extra?: { phone?: string; country?: string }) => Promise<{ simulatedCode: string | null }>;
  resendVerification: (email: string) => Promise<{ simulatedCode: string | null }>;
  verifyEmail: (email: string, code: string) => Promise<AuthSession>;
  login: (email: string, password: string, remember?: boolean) => Promise<AuthSession>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ simulatedCode: string | null }>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  demoLogin: (role: DemoRole) => Promise<AuthSession>;
  addProfile: (kind: 'sponsor' | 'patient' | 'chw_applicant', refId: string | null) => Promise<AuthAccount>;
  setActiveProfile: (kind: ProfileKind) => void;
  setSession: (session: AuthSession | null) => void;
  markTourSeen: (key: string) => void;
  resetTour: (key: string) => void;
}

export type AuthStore = AuthData & AuthActions;

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      bootstrapped: false,
      activeProfile: null,
      tourSeen: {},

      bootstrap: async () => {
        try {
          const session = await api.auth.me.query();
          set({ session, bootstrapped: true, activeProfile: get().activeProfile ?? session?.account.profiles[0]?.kind ?? null });
        } catch {
          set({ session: null, bootstrapped: true });
        }
      },

      register: async (name, email, password, extra) => {
        const res = await api.auth.register.mutate({ name, email, password, phone: extra?.phone, country: extra?.country });
        return { simulatedCode: res.simulatedCode ?? null };
      },

      resendVerification: async (email) => {
        const res = await api.auth.resendVerification.mutate({ email });
        return { simulatedCode: res.simulatedCode ?? null };
      },

      verifyEmail: async (email, code) => {
        const session = await api.auth.verifyEmail.mutate({ email, code });
        set({ session, activeProfile: session.account.profiles[0]?.kind ?? null });
        return session;
      },

      login: async (email, password, remember = true) => {
        const session = await api.auth.login.mutate({ email, password, remember });
        set({ session, activeProfile: session.account.profiles[0]?.kind ?? null });
        return session;
      },

      logout: async () => {
        try { await api.auth.logout.mutate(); } catch { /* session may already be gone */ }
        set({ session: null, activeProfile: null });
      },

      forgotPassword: async (email) => {
        const res = await api.auth.forgotPassword.mutate({ email });
        return { simulatedCode: res.simulatedCode ?? null };
      },

      resetPassword: async (email, code, password) => {
        await api.auth.resetPassword.mutate({ email, code, password });
      },

      demoLogin: async (role) => {
        const session = await api.auth.demoLogin.mutate({ role });
        const first = session.account.profiles[0]?.kind ?? null;
        set({ session, activeProfile: first });
        return session;
      },

      addProfile: async (kind, refId) => {
        const res = await api.onboarding.addProfile.mutate({ kind, refId });
        set({ session: { account: res.account }, activeProfile: kind === 'chw_applicant' ? 'chw_applicant' : kind });
        return res.account;
      },

      setActiveProfile: (kind) => set({ activeProfile: kind }),
      setSession: (session) => set({ session }),
      markTourSeen: (key) => set((s) => ({ tourSeen: { ...s.tourSeen, [key]: true } })),
      resetTour: (key) => set((s) => ({ tourSeen: { ...s.tourSeen, [key]: false } })),
    }),
    {
      name: 'myndora-auth-v1',
      partialize: (s) => ({ session: s.session, activeProfile: s.activeProfile, tourSeen: s.tourSeen }),
    },
  ),
);

/** Portal path for a profile kind. */
export function portalFor(kind: ProfileKind | null | undefined): string {
  switch (kind) {
    case 'sponsor': return '/sponsor';
    case 'patient': return '/patient';
    case 'chw': return '/chw';
    case 'chw_applicant': return '/applicant';
    case 'admin': return '/admin';
    case 'clinician': return '/clinician';
    default: return '/onboarding/choose';
  }
}
