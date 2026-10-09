// Reset password: email + 6-digit code + new password.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import PublicShell from './PublicShell';
import { Btn, Card, Field, Input } from '@/components/kit';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resetPassword = useAuth((s) => s.resetPassword);
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await resetPassword(email, code, password);
      setDone(true);
      window.setTimeout(() => navigate(`/login?email=${encodeURIComponent(email)}`), 1200);
    } catch {
      setError('Invalid or expired reset code. Request a new one from the forgot-password page.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-md mx-auto px-4 py-10">
        <Card>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Reset password</h1>
          {done ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm" role="status">
              <p className="font-semibold text-emerald-800">Password updated.</p>
              <p className="text-xs text-slate-600 mt-0.5">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-5">Enter the 6-digit reset code and choose a new password.</p>
              <form onSubmit={submit} className="space-y-3.5">
                <Field label="Email">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
                </Field>
                <Field label="Reset code">
                  <Input required inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Reset code" placeholder="6-digit code" />
                </Field>
                <Field label="New password (at least 8 characters)">
                  <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="New password" autoComplete="new-password" />
                </Field>
                {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Updating…' : 'Reset password'}</Btn>
              </form>
              <p className="text-sm mt-3 text-slate-600">Need a code? <Link to="/forgot-password" className="underline">Forgot password</Link></p>
            </>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
