// Access Denied: shown when a signed-in account lacks the role/relationship for a route,
// or when a protected route is opened without a session. Direct URL entry never bypasses
// authorization — and every denied attempt is written to the audit log.
import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth, portalFor } from '@/store/auth';
import { useStore } from '@/store/useStore';
import type { Role } from '@/types';
import PublicShell from './PublicShell';
import { Btn, Card } from '@/components/kit';

export default function Unauthorized() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const session = useAuth((s) => s.session);
  const activeProfile = useAuth((s) => s.activeProfile);
  const logAudit = useStore((s) => s.logAudit);

  // Record the denied attempt in the audit log (spec §11).
  useEffect(() => {
    logAudit(
      session?.account.name ?? 'Anonymous',
      ((activeProfile === 'chw_applicant' ? 'chw' : activeProfile) ?? 'patient') as Role,
      'security.unauthorized_access',
      params.get('from') ?? 'unknown route',
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PublicShell>
      <div className="max-w-md mx-auto px-4 py-14">
        <Card className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert size={22} aria-hidden />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Access Denied</h1>
          <p className="text-sm text-slate-500 mb-6">
            {session
              ? 'Your account does not have an approved profile for this area. Myndora Care uses role-based and relationship-based access — opening a link directly does not grant permission. This attempt has been recorded in the audit log.'
              : 'This area requires a signed-in account with the right approved profile. Sign in to continue.'}
          </p>
          <div className="flex flex-col gap-2">
            {session ? (
              <Btn onClick={() => navigate(portalFor(activeProfile ?? session.account.profiles[0]?.kind))}>Return to my dashboard</Btn>
            ) : (
              <Btn onClick={() => navigate('/login')}>Sign in</Btn>
            )}
            <Btn variant="secondary" onClick={() => navigate('/')}>Back to home</Btn>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Need another role? Approved profiles can be added from Account Settings. Admin access is created internally and can never be self-assigned. <Link to="/" className="underline">Learn more</Link>
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
