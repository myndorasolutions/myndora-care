// Create account: email + password, "what would you like to do first?", simulated verification.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { enterSession } from '@/store/session';
import PublicShell from './PublicShell';
import { Btn, Card, Field, Input } from '@/components/kit';

export type Intent = 'patient' | 'sponsor' | 'chw';

const INTENTS: { id: Intent; label: string; hint: string }[] = [
  { id: 'patient', label: 'Manage care for myself', hint: 'Create a Patient profile and choose a monitoring package' },
  { id: 'sponsor', label: 'Support or pay for someone\u2019s care', hint: 'Create a Sponsor profile and link patients' },
  { id: 'chw', label: 'Apply as a Community Health Worker', hint: 'Start a CHW application — activation after verification' },
];

export default function CreateAccount() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const register = useAuth((s) => s.register);
  const resend = useAuth((s) => s.resendVerification);
  const verifyEmail = useAuth((s) => s.verifyEmail);

  const presetIntent = (params.get('intent') as Intent | null) ?? null;
  const presetVerify = params.get('verify');

  const [step, setStep] = useState<'form' | 'verify'>(presetVerify ? 'verify' : 'form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(presetVerify ?? '');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(presetIntent);
  const [code, setCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const passwordRules = [
    { ok: password.length >= 8, label: 'At least 8 characters' },
    { ok: /[a-zA-Z]/.test(password) && /[0-9]/.test(password), label: 'Contains letters and numbers' },
    { ok: confirmPassword.length > 0 && password === confirmPassword, label: 'Passwords match' },
  ];

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent) { setError('Please choose what you would like to do first.'); return; }
    if (!passwordRules.every((r) => r.ok)) { setError('Please meet all password requirements.'); return; }
    if (!agreeTerms || !agreePrivacy) { setError('Please agree to the Terms and acknowledge the privacy notice.'); return; }
    setBusy(true); setError('');
    try {
      const res = await register(name, email, password, { phone, country });
      setSimulatedCode(res.simulatedCode);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error && err.message.includes('already exists')
        ? 'An account with this email already exists — sign in instead.'
        : 'Could not create the account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const session = await verifyEmail(email, code);
      await enterSession(session, navigate, { to: `/onboarding/${intent ?? 'choose'}` });
    } catch {
      setError('Invalid or expired verification code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-md mx-auto px-4 py-10">
        <Card>
          {step === 'form' ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Create account</h1>
              <p className="text-sm text-slate-500 mb-5">One account can hold several approved profiles over time. Admin access is never self-assigned.</p>
              <form onSubmit={submitForm} className="space-y-3.5">
                <Field label="Full name">
                  <Input required value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" autoComplete="name" />
                </Field>
                <Field label="Email">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
                </Field>
                <Field label="Phone number">
                  <Input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone number" autoComplete="tel" />
                </Field>
                <Field label="Country">
                  <select className="mc-input" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
                    {['Nigeria', 'Ghana', 'Kenya', 'Other'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Password">
                  <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" autoComplete="new-password" />
                </Field>
                <Field label="Confirm password">
                  <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} aria-label="Confirm password" autoComplete="new-password" />
                </Field>
                <ul className="text-xs space-y-1" aria-label="Password requirements">
                  {passwordRules.map((r) => (
                    <li key={r.label} className={r.ok ? 'text-emerald-600' : 'text-slate-400'}>{r.ok ? '✓' : '○'} {r.label}</li>
                  ))}
                </ul>
                <fieldset>
                  <legend className="mc-label">What would you like to do first?</legend>
                  <div className="space-y-2">
                    {INTENTS.map((i) => (
                      <label key={i.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${intent === i.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-slate-200'}`}>
                        <input type="radio" name="intent" className="mt-1" checked={intent === i.id} onChange={() => setIntent(i.id)} aria-label={i.label} />
                        <span>
                          <span className="block text-sm font-bold text-slate-900">{i.label}</span>
                          <span className="block text-xs text-slate-500">{i.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex items-start gap-2 text-sm text-slate-600 select-none">
                  <input type="checkbox" className="mt-1 accent-[var(--accent,var(--blue))]" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                  <span>I agree to the <Link to="/terms" className="underline">Terms of use</Link>.</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-600 select-none">
                  <input type="checkbox" className="mt-1 accent-[var(--accent,var(--blue))]" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
                  <span>I acknowledge the <Link to="/safety-and-privacy" className="underline">privacy notice</Link> — only the minimum necessary information is shared with approved people.</span>
                </label>
                {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Btn>
              </form>
              <p className="text-sm mt-3 text-slate-600">Already have an account? <Link to="/login" className="underline">Sign in</Link></p>
              <p className="text-xs mt-1.5 text-slate-400">Clinician? Accounts are activated only after verification — <Link to="/apply/clinician" className="underline">submit an expression of interest</Link>.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Verify your email</h1>
              <p className="text-sm text-slate-500 mb-4">We sent a 6-digit verification code to <b>{email}</b>.</p>
              {simulatedCode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm mb-4" data-testid="simulated-code">
                  <p className="font-semibold">UAT simulated email</p>
                  <p className="text-xs text-slate-600 mt-0.5">No real email is sent in this test build. Your code is <b className="font-mono text-base">{simulatedCode}</b>.</p>
                </div>
              )}
              <form onSubmit={submitVerify} className="space-y-3.5">
                <Field label="Verification code">
                  <Input required inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Verification code" placeholder="6-digit code" />
                </Field>
                {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}</Btn>
              </form>
              <Btn variant="ghost" size="sm" className="mt-2" onClick={async () => {
                const res = await resend(email);
                setSimulatedCode(res.simulatedCode);
              }}>Resend code</Btn>
            </>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
