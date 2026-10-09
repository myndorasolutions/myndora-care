// Sign in (/login): email + password, show/hide password, remember me,
// portal-intent headings (?portal=), demo quick access, recovery links.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import type { DemoRole, ProfileKind } from '@contracts/types';
import { useAuth } from '@/store/auth';
import { enterSession } from '@/store/session';
import PublicShell from './PublicShell';
import { Btn, Card, Field, Input } from '@/components/kit';

const PORTAL_HEADINGS: Record<string, string> = {
  patient: 'Patient Sign In',
  sponsor: 'Sponsor Sign In',
  chw: 'CHW Sign In',
  clinician: 'Clinician Sign In',
};

const DEMO_LABEL: Record<DemoRole, string> = { sponsor: 'Sponsor', patient: 'Patient', chw: 'CHW', clinician: 'Clinician', admin: 'Admin' };

export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuth((s) => s.login);
  const demoLogin = useAuth((s) => s.demoLogin);
  const setActiveProfile = useAuth((s) => s.setActiveProfile);
  const portal = params.get('portal');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [unverifiedCode, setUnverifiedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const heading = (portal && PORTAL_HEADINGS[portal]) || 'Sign in';

  const routeIn = async (session: Awaited<ReturnType<typeof login>>) => {
    // The account is the source of truth: if the account actually holds the
    // requested portal profile, activate it; otherwise the user is routed only
    // to their own authorized portal.
    if (portal) {
      const match = session.account.profiles.find((p) => p.kind === portal && p.status === 'active');
      if (match) setActiveProfile(match.kind as ProfileKind);
    }
    setSuccess(true);
    await new Promise((r) => setTimeout(r, 500));
    await enterSession(session, navigate, params.get('next') ? { to: params.get('next')! } : undefined);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true); setError(''); setUnverifiedCode(null);
    try {
      const session = await login(email, password, remember);
      await routeIn(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      if (msg.includes('Email not verified')) {
        const code = msg.split('SIMULATED_CODE:')[1] ?? null;
        setUnverifiedCode(code);
        setError('Your email is not verified yet. Enter the verification code below to continue.');
      } else if (msg.includes('suspended') || msg.includes('deactivated')) {
        setError(msg);
      } else if (msg.includes('Too many')) {
        setError('Too many failed sign-in attempts — please try again later.');
      } else {
        setError('Incorrect email or password.');
      }
    } finally {
      setBusy(false);
    }
  };

  const explore = async (role: DemoRole) => {
    setBusy(true); setError('');
    try {
      const session = await demoLogin(role);
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 400));
      await enterSession(session, navigate);
    } catch {
      setError('Demo sign-in is unavailable right now. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-md mx-auto px-4 py-10">
        <Card>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">{heading}</h1>
          <p className="text-sm text-slate-500 mb-5">You are routed straight to your authorized portal — the email account determines your role, not the button you chose.</p>
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 font-semibold text-center" role="status">
              Signed in — opening your portal…
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3.5">
              <Field label="Email">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={(e) => setPassword(e.target.value)} aria-label="Password" autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[var(--accent,var(--blue))]" />
                Remember me on this device
              </label>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              {unverifiedCode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold">UAT simulated verification</p>
                  <p className="text-xs text-slate-600 mt-0.5">No real email was sent. Use code <b className="font-mono">{unverifiedCode}</b> on the <Link to={`/register?verify=${encodeURIComponent(email)}`} className="underline">verification step</Link>.</p>
                </div>
              )}
              <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Btn>
            </form>
          )}
          <div className="flex justify-between mt-3 text-sm">
            <Link to="/forgot-password" className="underline text-slate-600">Forgot password?</Link>
            <Link to="/register" className="underline text-slate-600">Create account</Link>
          </div>
        </Card>

        <Card className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2.5">UAT quick demo access</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DEMO_LABEL) as DemoRole[]).map((r) => (
              <Btn key={r} variant="secondary" size="sm" disabled={busy} onClick={() => explore(r)}>
                Explore as {DEMO_LABEL[r]}
              </Btn>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">One-click sign-in to pre-populated fictional accounts. Staff roles: <Link to="/staff-login" className="underline">staff sign-in</Link>.</p>
        </Card>
      </div>
    </PublicShell>
  );
}
