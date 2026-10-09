import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { Btn, Card, Field, Input, Select } from '@/components/kit';
import {
  authApi,
  authUserToProfile,
  pricingApi,
  type AuthBackendRole,
} from '@/lib/authApi';
import { getPilotHome } from '@/lib/pilotData';
import { resolveSponsorHome, sponsorApi } from '@/lib/sponsorApi';
import { formatZoneLabel } from '@/lib/zoneLabels';
import { PublicShell } from '@/pages/public/PublicShell';
import { useAuthStore } from '@/stores/authStore';

const REGISTER_ROLES: AuthBackendRole[] = ['SPONSOR', 'CHW', 'PATIENT', 'ADMIN'];

function roleFromQuery(raw: string | null): AuthBackendRole | null {
  const v = (raw ?? '').trim().toUpperCase();
  if (REGISTER_ROLES.includes(v as AuthBackendRole)) return v as AuthBackendRole;
  return null;
}

function homeForBackendRole(role: AuthBackendRole): string {
  if (role === 'SPONSOR') return getPilotHome('sponsor');
  if (role === 'CHW') return getPilotHome('chw');
  if (role === 'ADMIN') return getPilotHome('coordinator');
  return '/patient/dashboard';
}

function IdentifierTabs({
  mode,
  onChange,
}: {
  mode: 'email' | 'phone';
  onChange: (mode: 'email' | 'phone') => void;
}) {
  return (
    <div className="flex gap-2 text-sm">
      <button
        type="button"
        className={`rounded-lg px-3 py-1.5 ${mode === 'email' ? 'bg-teal-700 font-semibold text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        onClick={() => onChange('email')}
      >
        Email
      </button>
      <button
        type="button"
        className={`rounded-lg px-3 py-1.5 ${mode === 'phone' ? 'bg-teal-700 font-semibold text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        onClick={() => onChange('phone')}
      >
        Phone
      </button>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const role = roleFromQuery(searchParams.get('role')) ?? 'SPONSOR';

  const [identifierMode, setIdentifierMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('Ilorin');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [userId, setUserId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const zonesQuery = useQuery({
    queryKey: ['pricing', 'zones'],
    queryFn: () => pricingApi.getZones(),
  });

  const plansQuery = useQuery({
    queryKey: ['pricing', 'plans', city],
    queryFn: () => pricingApi.getPlans({ city }),
    enabled: role === 'SPONSOR' || role === 'PATIENT',
  });

  useEffect(() => {
    const cities = zonesQuery.data?.cities ?? [];
    if (cities.length && !cities.some((c) => c.name === city)) {
      setCity(cities[0].name);
    }
  }, [zonesQuery.data, city]);

  const passwordRules = [
    { ok: password.length >= 6, label: 'At least 6 characters' },
  ];

  const register = useMutation({
    mutationFn: async () => {
      setError(null);
      return authApi.register({
        email: identifierMode === 'email' ? email : undefined,
        phoneNumber: identifierMode === 'phone' ? phoneNumber : undefined,
        password,
        role,
        fullName: fullName || undefined,
        city: city || undefined,
        country: 'Nigeria',
      });
    },
    onSuccess: (res) => {
      setUserId(res.userId);
      setDevCode(res.devCode ?? null);
      setStep('otp');
    },
    onError: () => setError('Registration failed. Email/phone may already be in use.'),
  });

  const verifyOtp = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Missing user');
      return authApi.verifyOtp({ userId, code: otp });
    },
    onSuccess: async (res) => {
      setAuth(res.accessToken, {
        ...authUserToProfile(res.user),
        full_name:
          res.user.fullName?.trim() ||
          fullName.trim() ||
          authUserToProfile(res.user).full_name,
      });
      if (role === 'SPONSOR') {
        try {
          const status = await sponsorApi.getOnboarding();
          navigate(resolveSponsorHome(status));
          return;
        } catch {
          navigate('/sponsor/onboarding/add-patient');
          return;
        }
      }
      navigate(homeForBackendRole(role));
    },
    onError: () => setError('Invalid or expired OTP.'),
  });

  if (!roleFromQuery(searchParams.get('role')) && searchParams.get('role')) {
    return <Navigate to="/" replace />;
  }

  const onSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    register.mutate();
  };

  const onSubmitOtp = (e: FormEvent) => {
    e.preventDefault();
    verifyOtp.mutate();
  };

  const cities = zonesQuery.data?.cities ?? [
    { id: 'ilorin', name: 'Ilorin', pricingZone: 'ZONE_B' },
  ];

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-10">
        <Card>
          {step === 'form' ? (
            <>
              <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">
                Create account
              </h1>
              <p className="mb-5 text-sm text-slate-500">
                Role: {role}. Verify with OTP before full access.
              </p>
              <form className="space-y-3.5" onSubmit={onSubmitForm}>
                <Field label="Full name">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    aria-label="Full name"
                    autoComplete="name"
                  />
                </Field>
                <IdentifierTabs mode={identifierMode} onChange={setIdentifierMode} />
                {identifierMode === 'email' ? (
                  <Field label="Email">
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Email"
                      autoComplete="email"
                    />
                  </Field>
                ) : (
                  <Field label="Phone number">
                    <Input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      aria-label="Phone number"
                      autoComplete="tel"
                      placeholder="+234…"
                    />
                  </Field>
                )}
                <Field label="Password">
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Password"
                    autoComplete="new-password"
                  />
                </Field>
                <ul className="space-y-1 text-xs" aria-label="Password requirements">
                  {passwordRules.map((r) => (
                    <li key={r.label} className={r.ok ? 'text-emerald-600' : 'text-slate-400'}>
                      {r.ok ? '✓' : '○'} {r.label}
                    </li>
                  ))}
                </ul>
                {(role === 'SPONSOR' || role === 'PATIENT' || role === 'CHW') && (
                  <Field label="City / pricing zone">
                    <Select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      aria-label="City / pricing zone"
                    >
                      {cities.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({formatZoneLabel(c.pricingZone)})
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                {(role === 'SPONSOR' || role === 'PATIENT') && plansQuery.data && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-800">
                      {formatZoneLabel(plansQuery.data.pricingZone)}
                    </p>
                    <ul className="mt-2 space-y-1 text-slate-600">
                      {plansQuery.data.plans.map((p) => (
                        <li key={p.planKey}>
                          {p.displayName}: ₦
                          {(p.monthlyPriceNaira ?? 0).toLocaleString()}/mo
                        </li>
                      ))}
                    </ul>
                    {plansQuery.data.visitRate && (
                      <p className="mt-2 text-xs text-slate-500">
                        Physical CHW visit: ₦
                        {plansQuery.data.visitRate.baseVisitNaira.toLocaleString()}{' '}
                        (CHW ₦
                        {plansQuery.data.visitRate.chwPayoutNaira.toLocaleString()} / Platform ₦
                        {plansQuery.data.visitRate.platformFeeNaira.toLocaleString()}
                        ); +₦
                        {plansQuery.data.visitRate.distanceSurchargePer2kmNaira.toLocaleString()}{' '}
                        / extra 2km
                      </p>
                    )}
                  </div>
                )}
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
                <Btn type="submit" className="w-full" disabled={register.isPending}>
                  {register.isPending ? 'Creating…' : 'Register & send OTP'}
                </Btn>
              </form>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">
                Verify your {identifierMode}
              </h1>
              <p className="mb-4 text-sm text-slate-500">
                We sent a 6-digit verification code to your {identifierMode}.
              </p>
              {devCode && (
                <div
                  className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
                  data-testid="simulated-code"
                >
                  <p className="font-semibold">Simulation OTP</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    No real message is sent in this test build. Your code is{' '}
                    <b className="font-mono text-base">{devCode}</b>.
                  </p>
                </div>
              )}
              <form className="space-y-3.5" onSubmit={onSubmitOtp}>
                <Field label="Verification code">
                  <input
                    className="mc-input tracking-widest"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    aria-label="Verification code"
                  />
                </Field>
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
                <Btn type="submit" className="w-full" disabled={verifyOtp.isPending}>
                  {verifyOtp.isPending ? 'Verifying…' : 'Verify and continue'}
                </Btn>
              </form>
            </>
          )}

          <p className="mt-4 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to={`/login?role=${role}`} className="underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
      <FeedbackWidget />
    </PublicShell>
  );
}
