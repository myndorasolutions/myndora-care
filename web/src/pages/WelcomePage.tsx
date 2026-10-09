import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Lock,
  PhoneCall,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import { Card } from '@/components/kit';
import { PublicShell } from '@/pages/public/PublicShell';

const SERVICES = [
  { title: 'Personal health monitoring', text: 'Self-recorded vitals, medication reminders, and personal history.' },
  { title: 'Family care dashboards', text: 'Approved summaries, service-status updates, and alerts for sponsors.' },
  { title: 'Remote CHW checks', text: 'Scheduled remote checks by verified community health workers.' },
  { title: 'Scheduled home visits', text: 'In-person CHW visits where available in the patient’s city.' },
  { title: 'Medication and wellbeing follow-up', text: 'Structured follow-up with missed-check escalation.' },
  { title: 'Urgent care escalation', text: 'Abnormal readings escalate for urgent review and routing.' },
  { title: 'Clinician review for eligible flagged cases', text: 'Flagged cases routed to a reviewing clinician on eligible packages.' },
  { title: 'Lab, pharmacy, doctor, and hospital coordination', text: 'Partner-coordinated services. Myndora Care is not itself a laboratory, pharmacy, or hospital.' },
];

const NETWORK_ITEMS = [
  'CHW verified status',
  'Profile photo',
  'Qualifications',
  'Years of experience',
  'Languages',
  'Service area',
  'Verified customer rating',
  'Completed visits',
];

const VISIT_SAFETY = [
  'Identity verification',
  'Approved service assignment',
  'OTP or approved patient confirmation',
  'Location-aware check-in',
  'Structured visit records',
  'Patient confirmation',
  'Complaint and reassignment options',
];

const PRIVACY_ITEMS = [
  'Role-based access',
  'Minimum necessary information',
  'Patient consent',
  'Access logging',
  'Restricted sensitive records',
  'Profile verification',
  'Complaints and safety escalation',
];

const PACKAGES = [
  { name: 'Essentials', tagline: 'Remote monitoring and family updates' },
  { name: 'Standard', tagline: 'Remote checks plus scheduled home visits' },
  { name: 'Plus', tagline: 'Visit verification and clinician review on flagged cases' },
  { name: 'Comprehensive', tagline: 'Full coordination including partner lab and pharmacy follow-up' },
];

function RoleCard({
  icon: Icon,
  tint,
  title,
  desc,
  children,
}: {
  icon: typeof UserRound;
  tint: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <Icon size={22} className={`${tint} mb-2`} />
      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      <p className="mb-4 mt-1.5 text-sm text-slate-600">{desc}</p>
      <div className="mt-auto space-y-2">{children}</div>
    </Card>
  );
}

export function WelcomePage() {
  return (
    <PublicShell>
      <section
        className="mc-hero mx-auto mt-6 max-w-[1200px] px-6 py-10 md:mt-10 md:px-10 md:py-14"
        style={{ borderRadius: 24 }}
        aria-labelledby="welcome-hero-heading"
      >
        <h1
          id="welcome-hero-heading"
          className="max-w-3xl text-3xl font-extrabold tracking-tight md:text-4xl"
        >
          Trusted home-care coordination for patients and families
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
          Manage monitoring, verified community health workers, visits, alerts, and family
          support while keeping the patient in control of their health information.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            to="/register?role=SPONSOR"
            className="mc-btn rounded-xl bg-white px-5 py-2.5 font-bold text-slate-900 hover:bg-slate-100"
          >
            Create an Account
          </Link>
          <Link
            to="/login?role=SPONSOR"
            className="mc-btn rounded-xl border border-white/60 px-5 py-2.5 font-bold text-white hover:bg-white/10"
          >
            Sign In
          </Link>
          <a
            href="#how-it-works"
            className="mc-btn rounded-xl px-4 py-2.5 font-semibold text-white/90 underline underline-offset-4 hover:bg-white/10"
          >
            See How It Works
          </a>
        </div>
      </section>

      <section
        className="mx-auto mt-12 max-w-[1200px] px-4 md:px-6"
        aria-label="Choose how to get started"
      >
        <h2 className="mc-section-title mb-4">Choose how you use Myndora Care</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RoleCard
            icon={Users}
            tint="text-blue-800"
            title="Family Sponsor / Subscriber"
            desc="Track vitals, receive alerts, and stay connected to home health from anywhere."
          >
            <Link
              to="/login?role=SPONSOR"
              className="mc-btn mc-btn-primary mc-btn-sm w-full"
              aria-label="Sponsor and monitor a loved one. Continue as Sponsor."
            >
              Continue as Sponsor
            </Link>
            <Link to="/register?role=SPONSOR" className="mc-btn mc-btn-secondary mc-btn-sm w-full">
              Create Sponsor Account
            </Link>
          </RoleCard>
          <RoleCard
            icon={Stethoscope}
            tint="text-amber-600"
            title="Community Health Worker"
            desc="Complete field checkups, verify visits, and support families in your community."
          >
            <Link
              to="/login?role=CHW"
              className="mc-btn mc-btn-primary mc-btn-sm w-full"
              aria-label="Join as a verified CHW. Continue as CHW."
            >
              Continue as CHW
            </Link>
            <Link to="/register?role=CHW" className="mc-btn mc-btn-secondary mc-btn-sm w-full">
              Create CHW Account
            </Link>
          </RoleCard>
          <RoleCard
            icon={UserRound}
            tint="text-emerald-700"
            title="Manage my care"
            desc="View care status, vitals, and medication reminders as a patient on an approved plan."
          >
            <Link to="/login?role=PATIENT" className="mc-btn mc-btn-primary mc-btn-sm w-full">
              Patient Sign In
            </Link>
            <Link to="/register?role=PATIENT" className="mc-btn mc-btn-secondary mc-btn-sm w-full">
              Create Patient Account
            </Link>
          </RoleCard>
        </div>
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock size={18} className="text-purple-700" />
            <div>
              <p className="text-sm font-extrabold text-slate-900">Admin &amp; Coordinator Access</p>
              <p className="text-xs text-slate-500">
                Restricted access for approved operational and clinical personnel. Staff accounts
                are provisioned internally — never self-assigned.
              </p>
            </div>
          </div>
          <Link to="/login?role=ADMIN" className="mc-btn mc-btn-secondary mc-btn-sm">
            Staff Sign In
          </Link>
        </Card>
      </section>

      <section id="how-it-works" className="mx-auto mt-12 max-w-[1200px] scroll-mt-24 px-4 md:px-6">
        <h2 className="mc-section-title mb-4">How Myndora Care works</h2>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { title: 'Create an account', text: 'Register, verify with OTP, and choose how you will use the platform.' },
            { title: 'Select a care plan', text: 'Pick a package based on the patient’s city and Zone A / Zone B rates.' },
            { title: 'Choose or receive a verified care worker', text: 'Compare verified CHWs or receive an assignment.' },
            { title: 'Complete and verify visits', text: 'Visits are checked in, recorded, and confirmed by the patient.' },
            { title: 'Review care updates and follow-up actions', text: 'Review updates, alerts, and follow-up within approved access.' },
          ].map((st, n) => (
            <Card key={st.title}>
              <span
                className="mb-2.5 grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold text-white"
                style={{ background: 'var(--role-accent, var(--blue))' }}
              >
                {n + 1}
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">{st.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{st.text}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section id="services" className="mx-auto mt-12 max-w-[1200px] scroll-mt-24 px-4 md:px-6">
        <h2 className="mc-section-title mb-4">Services</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((s) => (
            <Card key={s.title}>
              <h3 className="text-sm font-extrabold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="packages" className="mx-auto mt-12 max-w-[1200px] scroll-mt-24 px-4 md:px-6">
        <h2 className="mc-section-title mb-4">Packages</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PACKAGES.map((p) => (
            <Card key={p.name}>
              <h3 className="text-sm font-extrabold text-slate-900">{p.name}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{p.tagline}.</p>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Availability and pricing depend on the patient’s location (Zone A / Zone B) and selected
          services.
        </p>
      </section>

      <section className="mx-auto mt-12 grid max-w-[1200px] gap-4 px-4 md:px-6 lg:grid-cols-2">
        <Card>
          <h2 className="mc-section-title mb-3">Verified care network</h2>
          <p className="mb-3 text-sm text-slate-600">Patients can review before choosing a care worker:</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {NETWORK_ITEMS.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                {i}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mc-section-title mb-3">Patient-controlled access</h2>
          <p className="text-sm font-semibold text-slate-700">
            Paying for care does not automatically provide access to health information. The
            patient decides what each sponsor or supporter may see.
          </p>
          <h2 className="mc-section-title mb-3 mt-6">Visit safety and verification</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {VISIT_SAFETY.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                {i}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section
        id="privacy"
        className="mx-auto mt-12 grid max-w-[1200px] scroll-mt-24 gap-4 px-4 md:px-6 lg:grid-cols-2"
      >
        <Card>
          <h2 className="mc-section-title mb-3">Privacy and safety</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PRIVACY_ITEMS.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-blue-700" />
                {i}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-red-200 bg-red-50/60">
          <PhoneCall size={20} className="mb-2 text-red-600" />
          <h2 className="mc-section-title">Emergency disclaimer</h2>
          <p className="mt-1.5 text-sm text-slate-700">
            Myndora Care does not replace emergency medical services. For a life-threatening
            emergency, contact the appropriate emergency service or go to the nearest qualified
            medical facility.
          </p>
        </Card>
      </section>

      <section className="mx-auto my-12 max-w-[1200px] px-4 text-center md:px-6">
        <Link
          to="/register?role=SPONSOR"
          className="mc-btn mc-btn-primary mc-btn-lg inline-flex items-center gap-2"
        >
          Get started <ChevronRight size={16} />
        </Link>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ClipboardList size={14} /> Choose Sponsor, CHW, or Admin to continue to the matching
          sign-in.
        </p>
      </section>
    </PublicShell>
  );
}
