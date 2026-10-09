// Staff sign-in: restricted entry for authorized Myndora Care staff (Admin / Clinician).
// No public staff registration exists; staff accounts are created internally.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DemoRole } from '@contracts/types';
import { DEMO_ACCOUNTS } from '@contracts/types';
import { useAuth } from '@/store/auth';
import { enterSession } from '@/store/session';
import PublicShell from './PublicShell';
import { Btn, Card, Field, Input } from '@/components/kit';

export default function StaffSignIn() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const demoLogin = useAuth((s) => s.demoLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const session = await login(email, password);
      const staffKinds = ['admin', 'clinician'] as const;
      const staff = session.account.profiles.find((p) => staffKinds.includes(p.kind as (typeof staffKinds)[number]) && p.status === 'active');
      if (!staff) {
        setError('This account does not have an active staff profile. Use the main sign-in for patient, sponsor, or CHW access.');
        return;
      }
      await enterSession(session, navigate);
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setBusy(false);
    }
  };

  const explore = async (role: DemoRole) => {
    setBusy(true); setError('');
    try {
      const session = await demoLogin(role);
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
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Restricted access</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Staff sign-in</h1>
          <p className="text-sm text-slate-500 mb-5">For authorized Myndora Care operations and clinical staff only. Staff accounts are created internally — there is no public staff or Admin registration.</p>
          <form onSubmit={submit} className="space-y-3.5">
            <Field label="Work email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Work email" autoComplete="email" />
            </Field>
            <Field label="Password">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" autoComplete="current-password" />
            </Field>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in as staff'}</Btn>
          </form>
          <div className="flex justify-between mt-3 text-sm">
            <Link to="/forgot-password" className="underline text-slate-600">Forgot password?</Link>
            <Link to="/sign-in" className="underline text-slate-600">Main sign-in</Link>
          </div>
        </Card>

        <Card className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2.5">UAT demo staff access</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="secondary" size="sm" disabled={busy} onClick={() => explore('admin')}>
              Explore as Admin
            </Btn>
            <Btn variant="secondary" size="sm" disabled={busy} onClick={() => explore('clinician')}>
              Explore as Clinician
            </Btn>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Demo staff: {DEMO_ACCOUNTS.admin.name} ({DEMO_ACCOUNTS.admin.email}) · {DEMO_ACCOUNTS.clinician.name} ({DEMO_ACCOUNTS.clinician.email})
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
