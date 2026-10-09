// CHW applicant portal shell — own layout, same design system, chw theme.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  HeartPulse, ClipboardList, FileText, Award, Users, GraduationCap, MapPinned, Settings, LogOut,
} from 'lucide-react';
import type { ChwApplicationSummary } from '@contracts/types';
import { CHW_STAGE_LABELS } from '@contracts/types';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { saveNow } from '@/store/sync';
import { createContext, useContext } from 'react';
import { Badge } from '@/components/kit';
import DemoToolbar from '@/components/DemoToolbar';

const NAV = [
  { label: 'Application Status', to: '/applicant', icon: ClipboardList, end: true },
  { label: 'Identity & Documents', to: '/applicant/identity', icon: FileText },
  { label: 'Qualifications', to: '/applicant/qualifications', icon: Award },
  { label: 'References', to: '/applicant/references', icon: Users },
  { label: 'Training', to: '/applicant/training', icon: GraduationCap },
  { label: 'Service Area', to: '/applicant/service-area', icon: MapPinned },
  { label: 'Account Settings', to: '/applicant/settings', icon: Settings },
];

const STAGE_TONE: Record<string, 'amber' | 'blue' | 'green' | 'red' | 'gray'> = {
  application_started: 'gray', identity_review: 'amber', qualification_review: 'amber',
  references_pending: 'amber', training_required: 'blue', approved_remote: 'green',
  approved_home_visits: 'green', suspended: 'red', rejected: 'red',
};

interface ApplicantCtx {
  app: ChwApplicationSummary | null;
  loading: boolean;
  reload: () => Promise<void>;
}
const Ctx = createContext<ApplicantCtx>({ app: null, loading: true, reload: async () => {} });
export const useApplication = () => useContext(Ctx);

export default function ApplicantLayout() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const [app, setApp] = useState<ChwApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      setApp(await api.onboarding.myChwApplication.query() as ChwApplicationSummary | null);
    } catch {
      setApp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const signOut = async () => { await saveNow(); await logout(); navigate('/sign-in'); };

  return (
    <div data-theme="chw" className="mc-app min-h-screen">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-16 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2.5 font-extrabold text-lg text-slate-900">
            <span className="w-9 h-9 rounded-xl grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#1687ff,#19c6b2)' }}>
              <HeartPulse size={20} />
            </span>
            <span>Myndora Care <span className="hidden sm:inline text-xs font-bold text-slate-400 align-middle">CHW Applicant</span></span>
          </div>
          <div className="flex items-center gap-3">
            {app && <Badge tone={STAGE_TONE[app.stage] ?? 'gray'}>{CHW_STAGE_LABELS[app.stage]}</Badge>}
            <span className="hidden sm:inline text-xs font-bold text-slate-700">{session?.account.name}</span>
            <button type="button" aria-label="Sign out" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={signOut}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto relative z-10">
        <aside className="mc-sidebar w-60 shrink-0 border-r border-slate-200 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          <p className="px-3 pb-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--accent-ink)' }}>Applicant portal</p>
          <nav aria-label="Applicant navigation">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `mc-nav ${isActive ? 'active' : ''}`}>
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <p className="text-xs text-slate-400 mt-6 px-3">Applicants cannot access patient records or CHW work areas until approved.</p>
        </aside>

        <main className="mc-main-pad flex-1 min-w-0 px-4 md:px-6 py-6">
          <Ctx.Provider value={{ app, loading, reload }}>
            <Outlet />
          </Ctx.Provider>
        </main>
      </div>

      <nav className="mc-mobilebar" aria-label="Mobile navigation">
        {NAV.slice(0, 5).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <DemoToolbar role="chw" />
    </div>
  );
}
