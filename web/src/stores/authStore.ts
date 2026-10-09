import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, UserRole } from '@/lib/types';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setAuth: (token: string, user: UserProfile) => void;
  mergeUser: (partial: Partial<UserProfile>) => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      mergeUser: (partial) =>
        set((state) =>
          state.user ? { user: { ...state.user, ...partial } } : state,
        ),
      logout: () => set({ token: null, user: null }),
      hasRole: (...roles) => {
        const role = get().user?.role;
        return role ? roles.includes(role) : false;
      },
    }),
    { name: 'myndora-care-auth' },
  ),
);
