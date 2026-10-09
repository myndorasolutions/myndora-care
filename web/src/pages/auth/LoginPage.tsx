import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { Btn, Card, Field, Input } from '@/components/kit';
import {
  authApi,
  authUserToProfile,
  type AuthBackendRole,
  type AuthFlowResponse,
  type AuthUserDto,
} from '@/lib/authApi';
import { mockApi } from '@/lib/mockApi';
import { getPilotHome, PILOT_ROLES, type PilotRole } from '@/lib/pilotData';
import { resolveSponsorHome, sponsorApi } from '@/lib/sponsorApi';
import { PublicShell } from '@/pages/public/PublicShell';
import { useAuthStore } from '@/stores/authStore';

function roleFromQuery(raw: string | null): PilotRole | 'patient' | null {
  switch ((raw ?? '').trim().toUpperCase()) {
    case 'SPONSOR':
      return 'sponsor';
    case 'CHW':
      return 'chw';
    case 'ADMIN':
    case 'COORDINATOR':
      return 'coordinator';
    case 'PATIENT':
      return 'patient';
    default:
      return null;
  }
}

function toBackendRole(role: PilotRole | 'patient'): AuthBackendRole {
  if (role === 'sponsor') return 'SPONSOR';
  if (role === 'chw') return 'CHW';
  if (role === 'patient') return 'PATIENT';
  return 'ADMIN';
}

function homeForRole(role: PilotRole | 'patient'): string {
  if (role === 'patient') return '/patient/dashboard';
  return getPilotHome(role);
}

const PORTAL_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  sponsor: {
    title: 'Sponsor Sign In',
    subtitle: 'You are routed to the sponsor portal after email or phone, password, and OTP if required.',
  },
  chw: {
    title: 'CHW Sign In',
    subtitle: 'You are routed to the CHW portal after email or phone, password, and OTP if required.',
  },
  patient: {
    title: 'Patient Sign In',
    subtitle: 'View care status and vitals after email or phone, password, and OTP if required.',
  },
  coordinator: {
    title: 'Staff sign-in',
    subtitle:
      'For authorized Myndora Care operations and clinical staff only. Staff accounts are created internally — there is no public staff or Admin registration.',
  },
};

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

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const selectedRole = roleFromQuery(searchParams.get('role'));

  const [identifierMode, setIdentifierMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [userId, setUserId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finishAuth = async (token: string, user: AuthUserDto) => {
    if (!selectedRole) return;
    setAuth(token, authUserToProfile(user));
    if (selectedRole === 'sponsor') {
      try {
        const status = await sponsorApi.getOnboarding();
        navigate(resolveSponsorHome(status));
        return;
      } catch {
        navigate('/sponsor/onboarding/add-patient');
        return;
      }
    }
    navigate(homeForRole(selectedRole));
  };

  const credentialLogin = useMutation({
    mutationFn: async (): Promise<AuthFlowResponse> => {
      setError(null);
      const body =
        identifierMode === 'email'
          ? { email, password }
          : { phoneNumber, password };
      return authApi.login(body);
    },
    onSuccess: (res) => {
      if ('requiresOtp' in res && res.requiresOtp) {
        setUserId(res.userId);
        setDevCode(res.devCode ?? null);
        setStep('otp');
        return;
      }
      if ('accessToken' in res) {
        setUserId(res.user.id);
        void finishAuth(res.accessToken, res.user);
      }
    },
    onError: () => setError('Sign in failed. Check credentials or try pilot continue.'),
  });

  const verifyOtp = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Missing user');
      return authApi.verifyOtp({ userId, code: otp });
    },
    onSuccess: (res) => {
      void finishAuth(res.accessToken, res.user);
    },
    onError: () => setError('Invalid or expired OTP.'),
  });

  const pilotLogin = useMutation({
    mutationFn: async () => {
      if (!selectedRole || selectedRole === 'patient') {
        throw new Error('Pilot continue is for Sponsor / CHW / Admin');
      }
      return mockApi.loginWithPilotRole(selectedRole);
    },
    onSuccess: async ({ token, user }) => {
      if (!selectedRole || selectedRole === 'patient') return;
      setAuth(token, user);
      if (selectedRole === 'sponsor') {
        try {
          const status = await sponsorApi.getOnboarding();
          navigate(resolveSponsorHome(status));
          return;
        } catch {
          navigate('/sponsor/onboarding/add-patient');
          return;
        }
      }
      navigate(getPilotHome(selectedRole));
    },
  });

  if (!selectedRole) {
    return <Navigate to="/" replace />;
  }

  const roleMeta =
    selectedRole === 'patient'
      ? { title: 'Patient', subtitle: 'View care status and vitals' }
      : PILOT_ROLES.find((r) => r.id === selectedRole)!;
  const heading = PORTAL_HEADINGS[selectedRole] ?? {
    title: 'Sign in',
    subtitle: `${roleMeta.title} — email or phone + password, then OTP if required`,
  };
  const isStaff = selectedRole === 'coordinator';

  const onSubmitCredentials = (e: FormEvent) => {
    e.preventDefault();
    credentialLogin.mutate();
  };

  const onSubmitOtp = (e: FormEvent) => {
    e.preventDefault();
    verifyOtp.mutate();
  };

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-10">
        <p className="mb-3">
          <Link to="/" className="text-sm font-medium text-slate-600 underline hover:text-slate-900">
            ← Back to Role Selection
          </Link>
        </p>
        <Card>
          {isStaff && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Restricted access
            </p>
          )}
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">
            {heading.title}
          </h1>
          <p className="mb-5 text-sm text-slate-500">{heading.subtitle}</p>

          {step === 'credentials' ? (
            <form className="space-y-3.5" onSubmit={onSubmitCredentials}>
              <IdentifierTabs mode={identifierMode} onChange={setIdentifierMode} />
              {identifierMode === 'email' ? (
                <Field label={isStaff ? 'Work email' : 'Email'}>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label={isStaff ? 'Work email' : 'Email'}
                    autoComplete="email"
                  />
                </Field>
              ) : (
                <Field label="Phone">
                  <Input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    aria-label="Phone"
                    autoComplete="tel"
                    placeholder="+234…"
                  />
                </Field>
              )}
              <Field label="Password">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Password"
                    autoComplete="current-password"
                    minLength={6}
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
              {(error || credentialLogin.isError) && (
                <p className="text-sm text-red-600" role="alert">
                  {error ?? 'Sign in failed'}
                </p>
              )}
              <Btn type="submit" className="w-full" disabled={credentialLogin.isPending}>
                {credentialLogin.isPending
                  ? 'Signing in…'
                  : isStaff
                    ? 'Sign in as staff'
                    : 'Sign in'}
              </Btn>
            </form>
          ) : (
            <form className="space-y-3.5" onSubmit={onSubmitOtp}>
              <p className="text-sm text-slate-600">
                Enter the 6-digit OTP sent to your {identifierMode}.
              </p>
              {devCode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold">Simulation OTP</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    No real message was sent. Use code{' '}
                    <b className="font-mono text-base">{devCode}</b>.
                  </p>
                </div>
              )}
              <Field label="Verification code">
                <input
                  className="mc-input tracking-widest"
                  inputMode="numeric"
                  pattern="[0-9]{4,6}"
                  maxLength={6}
                  placeholder="OTP"
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
                {verifyOtp.isPending ? 'Verifying…' : 'Verify OTP'}
              </Btn>
            </form>
          )}

          {selectedRole !== 'patient' && (
            <Btn
              variant="secondary"
              className="mt-4 w-full"
              disabled={pilotLogin.isPending}
              onClick={() => pilotLogin.mutate()}
            >
              {pilotLogin.isPending
                ? 'Continuing…'
                : `Pilot continue as ${roleMeta.title}`}
            </Btn>
          )}

          {!isStaff && (
            <p className="mt-4 text-sm text-slate-600">
              New here?{' '}
              <Link
                to={`/register?role=${toBackendRole(selectedRole)}`}
                className="underline"
              >
                Create an account
              </Link>
            </p>
          )}
          {isStaff && (
            <p className="mt-4 text-sm text-slate-600">
              Not staff?{' '}
              <Link to="/login?role=SPONSOR" className="underline">
                Main sign-in
              </Link>
            </p>
          )}
        </Card>
      </div>
      <FeedbackWidget />
    </PublicShell>
  );
}
