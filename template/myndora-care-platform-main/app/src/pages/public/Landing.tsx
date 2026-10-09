// Public landing page: hero, role cards, how it works, services, packages,
// verified network, patient-controlled access, visit safety, partners,
// privacy, emergency disclaimer — per the product specification.
import { Link, useNavigate } from 'react-router-dom';
import {
  UserRound, Users, Stethoscope, Lock, ShieldCheck, PhoneCall, ChevronRight,
  CheckCircle2, ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import type { DemoRole } from '@contracts/types';
import { useAuth } from '@/store/auth';
import { enterSession } from '@/store/session';
import PublicShell from './PublicShell';
import { Btn, Card } from '@/components/kit';
import { PACKAGES } from '@/lib/permissions';

const DEMO_LABEL: Record<DemoRole, string> = { sponsor: 'Sponsor', patient: 'Patient', chw: 'CHW', clinician: 'Clinician', admin: 'Admin' };

const SERVICES = [
  { title: 'Personal health monitoring', text: 'Self-recorded vitals, medication reminders, and personal history.' },
  { title: 'Family care dashboards', text: 'Approved summaries, service-status updates, and alerts for sponsors.' },
  { title: 'Remote CHW checks', text: 'Scheduled remote checks by verified community health workers.' },
  { title: 'Scheduled home visits', text: 'In-person CHW visits where available in the patient\u2019s city.' },
  { title: 'Medication and wellbeing follow-up', text: 'Structured follow-up with missed-check escalation.' },
  { title: 'Urgent care escalation', text: 'Abnormal readings escalate for urgent review and routing.' },
  { title: 'Clinician review for eligible flagged cases', text: 'Flagged cases routed to a reviewing clinician on eligible packages.' },
  { title: 'Lab, pharmacy, doctor, and hospital coordination', text: 'Partner-coordinated services. Myndora Care is not itself a laboratory, pharmacy, or hospital.' },
];

const NETWORK_ITEMS = [
  'CHW verified status', 'Profile photo', 'Qualifications', 'Years of experience',
  'Languages', 'Service area', 'Verified customer rating', 'Completed visits',
];

const VISIT_SAFETY = [
  'Identity verification', 'Approved service assignment', 'OTP or approved patient confirmation',
  'Location-aware check-in', 'Structured visit records', 'Patient confirmation',
  'Complaint and reassignment options',
];

const PRIVACY_ITEMS = [
  'Role-based access', 'Minimum necessary information', 'Patient consent', 'Access logging',
  'Restricted sensitive records', 'Profile verification', 'Complaints and safety escalation',
];

const PARTNERS = [
  { title: 'Labs', badge: 'Current', text: 'Home sample collection with partner laboratories where they operate.' },
  { title: 'Doctors', badge: 'Current', text: 'Flagged results routed to a reviewing clinician on eligible packages.' },
  { title: 'Pharmacies', badge: 'Current', text: 'Medication delivery via verified partner pharmacies.' },
  { title: 'Hospitals', badge: 'Planned', text: 'Referral coordination for escalated care.' },
  { title: 'HMOs or insurers', badge: 'Planned', text: 'Coverage and claims coordination.' },
];

function RoleCard({ icon: Icon, tint, title, desc, children }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  tint: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <Icon size={22} className={`${tint} mb-2`} />
      <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
      <p className="text-sm text-slate-600 mt-1.5 mb-4">{desc}</p>
      <div className="mt-auto space-y-2">{children}</div>
    </Card>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const demoLogin = useAuth((s) => s.demoLogin);
  const session = useAuth((s) => s.session);
  const [busy, setBusy] = useState<DemoRole | null>(null);
  const [error, setError] = useState('');

  const explore = async (role: DemoRole) => {
    setBusy(role); setError('');
    try {
      const s = await demoLogin(role);
      await enterSession(s, navigate);
    } catch {
      setError('Demo sign-in is unavailable right now — the backend may still be starting. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <PublicShell>
      {/* Hero */}
      <section className="mc-hero max-w-[1200px] mx-auto mt-6 md:mt-10 px-6 md:px-10 py-10 md:py-14" style={{ borderRadius: 24 }}>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight max-w-3xl">Trusted home-care coordination for patients and families</h1>
        <p className="mt-3 text-white/85 max-w-2xl text-sm md:text-base">
          Manage monitoring, verified community health workers, visits, alerts, and family support while keeping the patient in control of their health information.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link to="/register" className="mc-btn bg-white text-slate-900 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-100">Create an Account</Link>
          <Link to="/login" className="mc-btn border border-white/60 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-white/10">Sign In</Link>
          <Link to="/how-it-works" className="mc-btn text-white/90 font-semibold px-4 py-2.5 rounded-xl hover:bg-white/10 underline underline-offset-4">See How It Works</Link>
        </div>
        {/* UAT quick demo access */}
        <div className="mt-8 rounded-2xl bg-white/10 border border-white/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-white/80 mb-2.5">UAT quick demo access — pre-populated fictional accounts</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DEMO_LABEL) as DemoRole[]).map((r) => (
              <Btn key={r} variant="secondary" size="sm" disabled={busy !== null} onClick={() => explore(r)}>
                {busy === r ? 'Opening…' : `Explore as ${DEMO_LABEL[r]}`}
              </Btn>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-amber-200">{error}</p>}
          {session && <p className="mt-2 text-xs text-white/70">Signed in as {session.account.name} — <Link className="underline" to={session.account.profiles[0] ? '/login' : '/onboarding/choose'}>continue</Link></p>}
        </div>
      </section>

      {/* Role cards */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-12">
        <h2 className="mc-section-title mb-4">Choose how you use Myndora Care</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RoleCard icon={UserRound} tint="text-emerald-700" title="Manage my care"
            desc="Choose a care plan, find verified community health workers, manage visits, review updates, control family access, and raise concerns.">
            <Link to="/register?intent=patient" className="mc-btn mc-btn-primary mc-btn-sm w-full">Create Patient Account</Link>
            <Link to="/login?portal=patient" className="mc-btn mc-btn-secondary mc-btn-sm w-full">Patient Sign In</Link>
          </RoleCard>
          <RoleCard icon={Users} tint="text-blue-800" title="Support someone’s care"
            desc="Pay for and coordinate care for one or more people while each patient controls what health information you may see.">
            <Link to="/register?intent=sponsor" className="mc-btn mc-btn-primary mc-btn-sm w-full">Create Sponsor Account</Link>
            <Link to="/login?portal=sponsor" className="mc-btn mc-btn-secondary mc-btn-sm w-full">Sponsor Sign In</Link>
          </RoleCard>
          <RoleCard icon={Stethoscope} tint="text-amber-600" title="Provide community health services"
            desc="Apply to provide approved home visits and remote checks. Identity, qualifications, references, training, and service eligibility must be verified before activation.">
            <Link to="/apply/chw" className="mc-btn mc-btn-primary mc-btn-sm w-full">Apply as a CHW</Link>
            <Link to="/login?portal=chw" className="mc-btn mc-btn-secondary mc-btn-sm w-full">CHW Sign In</Link>
          </RoleCard>
          <RoleCard icon={ClipboardList} tint="text-teal-700" title="Review referred care cases"
            desc="Access assigned or referred patient cases, review flagged health information, provide clinical guidance, and document follow-up within your approved professional scope.">
            <Link to="/login?portal=clinician" className="mc-btn mc-btn-primary mc-btn-sm w-full">Clinician Sign In</Link>
            <Link to="/apply/clinician" className="mc-btn mc-btn-secondary mc-btn-sm w-full">Request verification</Link>
          </RoleCard>
        </div>
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock size={18} className="text-purple-700" />
            <div>
              <p className="font-extrabold text-slate-900 text-sm">Authorized Myndora Care staff</p>
              <p className="text-xs text-slate-500">Restricted access for approved operational and clinical personnel. Staff accounts are provisioned internally — never self-assigned.</p>
            </div>
          </div>
          <Link to="/staff-login" className="mc-btn mc-btn-secondary mc-btn-sm">Staff Sign In</Link>
        </Card>
      </section>

      {/* How Myndora Care works — five steps */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-12">
        <h2 className="mc-section-title mb-4">How Myndora Care works</h2>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { title: 'Create an account', text: 'Register, verify your email, and choose what you would like to do first.' },
            { title: 'Select a care plan', text: 'Pick a package based on the patient\u2019s city and available services.' },
            { title: 'Choose or receive a verified care worker', text: 'Compare verified CHWs or receive an assignment.' },
            { title: 'Complete and verify visits', text: 'Visits are checked in, recorded, and confirmed by the patient.' },
            { title: 'Review care updates and follow-up actions', text: 'Review updates, alerts, and follow-up within approved access.' },
          ].map((st, n) => (
            <Card key={st.title}>
              <span className="w-8 h-8 rounded-full grid place-items-center text-sm font-extrabold text-white mb-2.5" style={{ background: 'var(--accent, var(--blue))' }}>{n + 1}</span>
              <h3 className="font-extrabold text-slate-900 text-sm">{st.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{st.text}</p>
            </Card>
          ))}
        </ol>
      </section>

      {/* Services */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-12">
        <h2 className="mc-section-title mb-4">Services</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((s) => (
            <Card key={s.title}>
              <h3 className="font-extrabold text-slate-900 text-sm">{s.title}</h3>
              <p className="text-sm text-slate-600 mt-1.5">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Packages — no fixed prices */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-12">
        <h2 className="mc-section-title mb-4">Packages</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PACKAGES.map((p) => (
            <Card key={p.id}>
              <h3 className="font-extrabold text-slate-900 text-sm">{p.name}</h3>
              <p className="text-sm text-slate-600 mt-1.5">{p.tagline}. Includes: {p.features.slice(0, 4).join('; ')}.</p>
            </Card>
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-3">Availability and pricing depend on the patient’s location and selected services.</p>
      </section>

      {/* Verified care network + patient-controlled access */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-12 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mc-section-title mb-3">Verified care network</h2>
          <p className="text-sm text-slate-600 mb-3">Patients can review before choosing a care worker:</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {NETWORK_ITEMS.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />{i}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mc-section-title mb-3">Patient-controlled access</h2>
          <p className="text-sm text-slate-700 font-semibold">Paying for care does not automatically provide access to health information. The patient decides what each sponsor or supporter may see.</p>
          <h2 className="mc-section-title mb-3 mt-6">Visit safety and verification</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {VISIT_SAFETY.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />{i}</li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Partner ecosystem */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-12">
        <h2 className="mc-section-title mb-4">Partner ecosystem</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {PARTNERS.map((p) => (
            <Card key={p.title}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">{p.title}</h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${p.badge === 'Current' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.badge}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1.5">{p.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Privacy and safety + emergency */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mt-12 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mc-section-title mb-3">Privacy and safety</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PRIVACY_ITEMS.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><ShieldCheck size={15} className="text-blue-700 mt-0.5 shrink-0" />{i}</li>
            ))}
          </ul>
          <Link to="/safety-and-privacy" className="mc-btn mc-btn-secondary mc-btn-sm mt-4">Read the full summary</Link>
        </Card>
        <Card className="border-red-200 bg-red-50/60">
          <PhoneCall size={20} className="text-red-600 mb-2" />
          <h2 className="mc-section-title">Emergency disclaimer</h2>
          <p className="text-sm text-slate-700 mt-1.5">
            Myndora Care does not replace emergency medical services. For a life-threatening emergency, contact the appropriate emergency service or go to the nearest qualified medical facility.
          </p>
        </Card>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 md:px-6 my-12 text-center">
        <Link to="/register" className="mc-btn mc-btn-primary mc-btn-lg inline-flex items-center gap-2">
          Get started <ChevronRight size={16} />
        </Link>
        <p className="text-xs text-slate-500 mt-3 flex items-center justify-center gap-1.5"><ShieldCheck size={14} /> Fictional UAT data only — no real personal information.</p>
      </section>
    </PublicShell>
  );
}
