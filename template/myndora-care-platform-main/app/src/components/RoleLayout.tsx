// Role portal shell: top bar with role switcher, sidebar nav, mobile nav, privacy watermark.
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  HeartPulse, LayoutDashboard, Users, Package, Stethoscope, CalendarDays, Bell,
  CreditCard, KeyRound, MessageSquareWarning, BarChart3, Home, Search, ShieldCheck,
  FileText, ClipboardList, Calendar, Activity, WifiOff, BadgeDollarSign, Award, Star,
  Wallet, UserCog, GitBranch, AlertTriangle, CheckSquare, Tag, Lock, Database,
  ScrollText, Plug, Clock, RotateCcw, MapPin, MessagesSquare, Settings, MapPinned,
  ShieldQuestion, FileCheck2, PackageCheck, UserCog2, LogOut,
} from 'lucide-react';
import type { Role } from '@/types';
import type { ProfileKind } from '@contracts/types';
import { ROLE_META } from '@/lib/permissions';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/store/auth';
import { saveNow } from '@/store/sync';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Btn } from '@/components/kit';
import DemoToolbar from '@/components/DemoToolbar';
import GuidedTour from '@/components/GuidedTour';

interface NavItem { label: string; to: string; icon: React.ComponentType<{ size?: number | string }>; end?: boolean }

const NAVS: Record<Role, NavItem[]> = {
  sponsor: [
    { label: 'Dashboard', to: '/sponsor', icon: LayoutDashboard, end: true },
    { label: 'People I Support', to: '/sponsor/people', icon: Users },
    { label: 'Plan & Services', to: '/sponsor/plan', icon: Package },
    { label: 'Care Team', to: '/sponsor/team', icon: Stethoscope },
    { label: 'Visits', to: '/sponsor/visits', icon: CalendarDays },
    { label: 'Alerts', to: '/sponsor/alerts', icon: Bell },
    { label: 'Payments', to: '/sponsor/payments', icon: CreditCard },
    { label: 'Access Requests', to: '/sponsor/access', icon: KeyRound },
    { label: 'Complaints', to: '/sponsor/complaints', icon: MessageSquareWarning },
    { label: 'Reports', to: '/sponsor/reports', icon: BarChart3 },
    { label: 'Messages', to: '/sponsor/messages', icon: MessagesSquare },
    { label: 'Account Settings', to: '/sponsor/settings', icon: Settings },
  ],
  patient: [
    { label: 'My Care', to: '/patient', icon: Home, end: true },
    { label: 'Plan & Services', to: '/patient/plan', icon: Package },
    { label: 'Find a CHW', to: '/patient/find-chw', icon: Search },
    { label: 'My Care Team', to: '/patient/team', icon: Stethoscope },
    { label: 'Visits', to: '/patient/visits', icon: CalendarDays },
    { label: 'Health Updates', to: '/patient/updates', icon: Activity },
    { label: 'Permissions', to: '/patient/permissions', icon: ShieldCheck },
    { label: 'Complaints', to: '/patient/complaints', icon: MessageSquareWarning },
    { label: 'Documents', to: '/patient/documents', icon: FileText },
    { label: 'Messages', to: '/patient/messages', icon: MessagesSquare },
    { label: 'Account Settings', to: '/patient/settings', icon: Settings },
  ],
  chw: [
    { label: 'Today', to: '/chw', icon: Clock, end: true },
    { label: 'Assignments', to: '/chw/assignments', icon: ClipboardList },
    { label: 'Calendar', to: '/chw/calendar', icon: Calendar },
    { label: 'Active Visit', to: '/chw/active-visit', icon: Activity },
    { label: 'Visit Records', to: '/chw/records', icon: FileText },
    { label: 'Escalations', to: '/chw/escalations', icon: AlertTriangle },
    { label: 'Offline Queue', to: '/chw/offline', icon: WifiOff },
    { label: 'Services & Rates', to: '/chw/services', icon: BadgeDollarSign },
    { label: 'Credentials', to: '/chw/credentials', icon: Award },
    { label: 'Ratings', to: '/chw/ratings', icon: Star },
    { label: 'Payouts', to: '/chw/payouts', icon: Wallet },
    { label: 'Availability', to: '/chw/availability', icon: CalendarDays },
    { label: 'Service Area', to: '/chw/service-area', icon: MapPinned },
    { label: 'Profile & Verification', to: '/chw/verification', icon: ShieldQuestion },
    { label: 'Complaints & Disputes', to: '/chw/complaints', icon: MessageSquareWarning },
    { label: 'Account Settings', to: '/chw/settings', icon: Settings },
  ],
  admin: [
    { label: 'Operations', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Patients', to: '/admin/patients', icon: Users },
    { label: 'Sponsors / Payers', to: '/admin/sponsors', icon: CreditCard },
    { label: 'CHWs', to: '/admin/chws', icon: Stethoscope },
    { label: 'Assignments', to: '/admin/assignments', icon: GitBranch },
    { label: 'Alert Queue', to: '/admin/alerts', icon: Bell },
    { label: 'Complaints', to: '/admin/complaints', icon: MessageSquareWarning },
    { label: 'Service Approvals', to: '/admin/approvals', icon: CheckSquare },
    { label: 'Rate Cards', to: '/admin/rate-cards', icon: Tag },
    { label: 'Consent & Access', to: '/admin/consent', icon: Lock },
    { label: 'Data Quality', to: '/admin/quality', icon: Database },
    { label: 'Audit Logs', to: '/admin/audit', icon: ScrollText },
    { label: 'Integrations', to: '/admin/integrations', icon: Plug },
    { label: 'CHW Applications', to: '/admin/chw-applications', icon: FileCheck2 },
    { label: 'Clinician Applications', to: '/admin/clinician-applications', icon: Stethoscope },
    { label: 'Credential Reviews', to: '/admin/credential-reviews', icon: ShieldQuestion },
    { label: 'Visit Verification', to: '/admin/visit-verification', icon: CheckSquare },
    { label: 'Package Availability', to: '/admin/package-availability', icon: PackageCheck },
    { label: 'User Administration', to: '/admin/users', icon: UserCog2 },
  ],
  clinician: [
    { label: 'Review Queue', to: '/clinician', icon: ClipboardList, end: true },
    { label: 'Flagged Cases', to: '/clinician/cases', icon: AlertTriangle },
    { label: 'Patient Summary', to: '/clinician/patients', icon: Users },
    { label: 'Vitals & Trends', to: '/clinician/vitals', icon: Activity },
    { label: 'Lab Results', to: '/clinician/labs', icon: FileText },
    { label: 'Clinical Notes', to: '/clinician/notes', icon: ScrollText },
    { label: 'Recommendations', to: '/clinician/recommendations', icon: CheckSquare },
    { label: 'Follow-up Actions', to: '/clinician/follow-ups', icon: RotateCcw },
    { label: 'Referrals', to: '/clinician/referrals', icon: GitBranch },
    { label: 'Review History', to: '/clinician/history', icon: Clock },
    { label: 'Availability', to: '/clinician/availability', icon: Calendar },
    { label: 'Messages', to: '/clinician/messages', icon: MessagesSquare },
    { label: 'Profile & Verification', to: '/clinician/profile', icon: UserCog },
    { label: 'Account Settings', to: '/clinician/settings', icon: Settings },
  ],
};

const ROLE_VIEWER: Record<Role, string> = {
  sponsor: 'Tunde Adeyemi',
  patient: 'Grace Okafor',
  chw: 'Amina Bello',
  admin: 'Adaeze Okonkwo',
  clinician: 'Dr. Olumide Ajayi',
};

/** Profile kinds that map onto a portal role tab (chw_applicant has its own portal). */
const KIND_TO_ROLE: Partial<Record<ProfileKind, Role>> = {
  sponsor: 'sponsor', patient: 'patient', chw: 'chw', admin: 'admin', clinician: 'clinician',
};

function Watermark({ viewer }: { viewer: string }) {
  const [ts, setTs] = useState(() => new Date().toLocaleString('en-NG'));
  useEffect(() => {
    const t = setInterval(() => setTs(new Date().toLocaleString('en-NG')), 30000);
    return () => clearInterval(t);
  }, []);
  const text = `${viewer} · Myndora demo · ${ts}`;
  return (
    <div className="mc-watermark" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => <span key={i}>{text}</span>)}
    </div>
  );
}

/** Simulated session-timeout countdown (privacy posture). */
function SessionTimer() {
  const [secs, setSecs] = useState(15 * 60);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s <= 1 ? 15 * 60 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500" title="Session timeout (concept) — the session re-locks when it reaches zero">
      <Clock size={14} /> Session {mm}:{ss}
    </span>
  );
}

export default function RoleLayout({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openModal, closeModal } = useModal();
  const currentRole = useStore((s) => s.currentRole);
  const switchRole = useStore((s) => s.switchRole);
  const resetDemo = useStore((s) => s.resetDemo);
  const openAlerts = useStore(useShallow((s) => s.alerts.filter((a) => a.status === 'open' || a.status === 'escalated').length));
  const selectedPatient = useStore((s) => s.patients.find((p) => p.id === s.selectedPatientId));
  const sponsorHasPatients = useStore((s) => s.relationships.some((r) => r.sponsorAccountId === s.identity.sponsorAccountId));
  const chwKnown = useStore((s) => s.chws.some((c) => c.id === s.identity.chwId));
  const ensureChwIdentity = useStore((s) => s.ensureChwIdentity);
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const setActiveProfile = useAuth((s) => s.setActiveProfile);

  useEffect(() => {
    if (currentRole !== role) switchRole(role);
  }, [role, currentRole, switchRole]);

  // New approved CHW accounts get their own world CHW entity on first visit.
  useEffect(() => {
    if (role === 'chw' && !chwKnown && session) ensureChwIdentity(session.account.name);
  }, [role, chwKnown, session, ensureChwIdentity]);

  // Sponsors with no linked patients are routed to People I Support (real empty state there).
  useEffect(() => {
    if (role === 'sponsor' && !sponsorHasPatients && window.location.pathname === '/sponsor') {
      navigate('/sponsor/people', { replace: true });
    }
  }, [role, sponsorHasPatients, navigate]);

  const nav = NAVS[role];
  const viewer = session?.account.name ?? ROLE_VIEWER[role];
  const mobileNav = useMemo(() => nav.slice(0, 5), [nav]);

  // Profile tabs: only roles the signed-in account is approved for. No session (legacy
  // demo/tests) keeps all five tabs. Users never see roles they are not assigned.
  const visibleRoles = useMemo(() => {
    const all = Object.keys(ROLE_META) as Role[];
    if (!session) return all;
    const mine = new Set(
      session.account.profiles
        .filter((p) => p.status === 'active' && KIND_TO_ROLE[p.kind])
        .map((p) => KIND_TO_ROLE[p.kind]!),
    );
    return all.filter((r) => mine.has(r));
  }, [session]);

  const otherProfiles = session?.account.profiles.filter((p) => p.status === 'active' && KIND_TO_ROLE[p.kind] && KIND_TO_ROLE[p.kind] !== role) ?? [];

  const switchProfile = (kind: ProfileKind) => {
    const r = KIND_TO_ROLE[kind];
    if (!r) return;
    setActiveProfile(kind);
    switchRole(r);
    navigate(ROLE_META[r].portal);
  };

  const signOut = async () => {
    await saveNow();
    await logout();
    navigate('/sign-in');
  };

  const confirmReset = () => {
    openModal({
      title: 'Reset demo data?',
      body: <p className="text-sm text-slate-600">All changes made during this demo session will be discarded and the original seeded data restored.</p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn variant="danger" onClick={async () => { resetDemo(); await saveNow(); closeModal(); navigate(ROLE_META[role].portal); toast('Demo data restored'); }}>Reset demo</Btn>
        </>
      ),
    });
  };

  return (
    <div data-theme={role} className="mc-app min-h-screen">
      <Watermark viewer={viewer} />
      <div className="mc-print-block">
        <h1>Printing is restricted</h1>
        <p>This care record belongs to a patient. Downloading and printing are restricted in the Myndora demo.</p>
      </div>

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-16 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2.5 font-extrabold text-lg text-slate-900">
            <span className="w-9 h-9 rounded-xl grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#1687ff,#19c6b2)' }}>
              <HeartPulse size={20} />
            </span>
            <span>Myndora Care <span className="hidden sm:inline text-xs font-bold text-slate-400 align-middle">v2.0 Demo</span></span>
          </div>

          <nav aria-label="Switch role" className="flex items-center gap-1.5 overflow-x-auto">
            {visibleRoles.map((r) => (
              <button
                key={r}
                type="button"
                className={`mc-role-tab ${r === role ? 'active' : ''}`}
                onClick={() => {
                  const kind = (Object.keys(KIND_TO_ROLE) as ProfileKind[]).find((k) => KIND_TO_ROLE[k] === r);
                  if (session && kind) { switchProfile(kind); } else { switchRole(r); navigate(ROLE_META[r].portal); }
                }}
              >
                <span className="capitalize">{r === 'chw' ? 'CHW' : r}</span>
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <SessionTimer />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <MapPin size={14} /> {selectedPatient ? `${selectedPatient.city}` : '—'}
            </span>
            <span className="relative inline-flex items-center text-slate-500" aria-label={`${openAlerts} open alerts`}>
              <Bell size={18} />
              {openAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-4 h-4 grid place-items-center px-0.5">{openAlerts}</span>
              )}
            </span>
            {session && otherProfiles.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Switch profile:</span>
                {otherProfiles.map((p) => (
                  <button key={p.id} type="button" className="mc-role-tab" onClick={() => switchProfile(p.kind)}>
                    {p.kind === 'chw' ? 'CHW' : p.kind[0].toUpperCase() + p.kind.slice(1)}
                  </button>
                ))}
              </span>
            )}
            <span className="text-xs font-bold text-slate-700">{viewer}</span>
            {session && (
              <button type="button" aria-label="Sign out" title="Sign out"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                onClick={signOut}>
                <LogOut size={15} /> Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto relative z-10">
        <aside className="mc-sidebar w-60 shrink-0 border-r border-slate-200 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          <p className="px-3 pb-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--accent-ink)' }}>
            {ROLE_META[role].label} portal
          </p>
          <nav aria-label={`${ROLE_META[role].label} navigation`}>
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `mc-nav ${isActive ? 'active' : ''}`}
              >
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 border-t border-slate-100 pt-4 px-1">
            <p className="text-xs text-slate-500 mb-2 px-2">Demo mode — test all features with sample data</p>
            <Btn variant="secondary" size="sm" className="w-full" onClick={confirmReset}>
              <RotateCcw size={14} /> Reset demo data
            </Btn>
            {session && (
              <Btn variant="ghost" size="sm" className="w-full mt-2" onClick={signOut}>
                <LogOut size={14} /> Sign out
              </Btn>
            )}
          </div>
        </aside>

        <main className="mc-main-pad flex-1 min-w-0 px-4 md:px-6 py-6">
          <Outlet />
        </main>
      </div>

      <GuidedTour role={role} />
      <DemoToolbar role={role} />

      <nav className="mc-mobilebar" aria-label="Mobile navigation">
        {mobileNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
