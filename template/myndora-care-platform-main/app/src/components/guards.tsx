// Route guards: session requirement + profile-kind authorization.
// Direct URL entry never bypasses these checks — every protected route mounts one.
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { ProfileKind } from '@contracts/types';
import { useAuth } from '@/store/auth';

/** Requires a signed-in account; otherwise redirects to sign-in with a return path. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  const bootstrapped = useAuth((s) => s.bootstrapped);
  const location = useLocation();
  if (!bootstrapped) return null;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

/**
 * Requires an ACTIVE profile of one of the given kinds on the signed-in account.
 * Also asserts the active profile so portals and profile switching stay in sync.
 */
export function RequireProfile({ kinds, children }: { kinds: ProfileKind[]; children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  const bootstrapped = useAuth((s) => s.bootstrapped);
  const activeProfile = useAuth((s) => s.activeProfile);
  const setActiveProfile = useAuth((s) => s.setActiveProfile);
  const location = useLocation();

  // CHW applicants hold a `pending_review` profile until staff approve them — that
  // status is exactly what the applicant portal is for, so it counts as authorized there.
  const profile = session?.account.profiles.find(
    (p) => kinds.includes(p.kind) && (p.status === 'active' || (p.kind === 'chw_applicant' && p.status === 'pending_review')),
  ) ?? null;

  useEffect(() => {
    if (profile && activeProfile !== profile.kind) setActiveProfile(profile.kind);
  }, [profile, activeProfile, setActiveProfile]);

  if (!bootstrapped) return null;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!profile) return <Navigate to={`/unauthorized?from=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}
