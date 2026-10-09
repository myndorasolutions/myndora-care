// Session orchestration: what happens right after any successful sign-in.
import type { AuthSession, ProfileKind } from '@contracts/types';
import { useStore, type Identity } from '@/store/useStore';
import { useAuth, portalFor } from '@/store/auth';
import { hydrateFromServer, startStateSync } from '@/store/sync';
import type { Role } from '@/types';

const KIND_TO_ROLE: Record<ProfileKind, Role> = {
  sponsor: 'sponsor', patient: 'patient', chw: 'chw', chw_applicant: 'chw', admin: 'admin', clinician: 'clinician',
};

export function identityPatchFromProfiles(session: AuthSession): Partial<Identity> {
  const patch: Partial<Identity> = {};
  for (const p of session.account.profiles) {
    if (!p.refId) continue;
    if (p.kind === 'sponsor') patch.sponsorAccountId = p.refId;
    if (p.kind === 'patient') patch.patientId = p.refId;
    if (p.kind === 'chw') patch.chwId = p.refId;
    if (p.kind === 'clinician') patch.clinicianAccountId = p.refId;
  }
  return patch;
}

/**
 * Apply a fresh session: restore the account's saved world from the server,
 * re-assert identity links, start persistence, then route to the right portal.
 */
export async function enterSession(session: AuthSession, navigate: (to: string) => void, opts?: { to?: string }) {
  const active = useAuth.getState().activeProfile ?? session.account.profiles[0]?.kind ?? null;

  await hydrateFromServer();
  useStore.getState().setIdentity(identityPatchFromProfiles(session));
  if (active && active !== 'chw_applicant') useStore.getState().switchRole(KIND_TO_ROLE[active]);
  startStateSync();

  if (opts?.to) {
    navigate(opts.to);
    return;
  }
  if (session.account.profiles.length === 0) {
    navigate('/onboarding/choose');
    return;
  }
  navigate(portalFor(active));
}
