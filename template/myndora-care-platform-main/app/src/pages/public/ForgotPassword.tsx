// Forgot password: request a simulated reset code, then continue to reset.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import PublicShell from './PublicShell';
import { Btn, Card, Field, Input } from '@/components/kit';

export default function ForgotPassword() {
  const forgotPassword = useAuth((s) => s.forgotPassword);
  const [email, setEmail] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await forgotPassword(email);
      setSimulatedCode(res.simulatedCode);
    } catch {
      // Deliberately generic: do not reveal whether an account exists.
      setError('If an account exists for this email, a reset code has been issued.');
      setSimulatedCode(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-md mx-auto px-4 py-10">
        <Card>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Forgot password</h1>
          <p className="text-sm text-slate-500 mb-5">Enter your account email and we will issue a 6-digit reset code.</p>
          <form onSubmit={submit} className="space-y-3.5">
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
            </Field>
            {error && <p className="text-sm text-slate-600" role="status">{error}</p>}
            <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset code'}</Btn>
          </form>
          {simulatedCode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm mt-4" data-testid="simulated-reset-code">
              <p className="font-semibold">UAT simulated email</p>
              <p className="text-xs text-slate-600 mt-0.5">No real email is sent in this test build. Your reset code is <b className="font-mono text-base">{simulatedCode}</b>.</p>
              <Link to={`/reset-password?email=${encodeURIComponent(email)}`} className="inline-block mt-2 underline font-semibold">Continue to reset password</Link>
            </div>
          )}
          <p className="text-sm mt-3 text-slate-600">Remembered it? <Link to="/sign-in" className="underline">Sign in</Link></p>
        </Card>
      </div>
    </PublicShell>
  );
}
