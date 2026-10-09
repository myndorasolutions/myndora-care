import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Award,
  ClipboardList,
  FileText,
  GraduationCap,
  LogOut,
  Users,
} from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/kit';
import { useApplicantStore, type ApplicantStatus } from '@/lib/applicantStore';
import { useAuthStore } from '@/stores/authStore';

const NAV = [
  { label: 'Application Status', to: '/applicant/status', icon: ClipboardList, end: true },
  { label: 'Identity & Documents', to: '/applicant/identity', icon: FileText },
  { label: 'Qualifications', to: '/applicant/qualifications', icon: Award },
  { label: 'References', to: '/applicant/references', icon: Users },
  { label: 'Training', to: '/applicant/training', icon: GraduationCap },
];

const STATUS_TONE: Record<ApplicantStatus, BadgeTone> = {
  DRAFT: 'amber',
  UNDER_REVIEW: 'blue',
  APPROVED: 'green',
};

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
};

export function useApplication() {
  const identity = useApplicantStore((s) => s.identity);
  const qualifications = useApplicantStore((s) => s.qualifications);
  const references = useApplicantStore((s) => s.references);
  const training = useApplicantStore((s) => s.training);
  const status = useApplicantStore((s) => s.status);
  const applicantName = useApplicantStore((s) => s.applicantName);
  const city = useApplicantStore((s) => s.city);
  const updateStepData = useApplicantStore((s) => s.updateStepData);
  const submitApplication = useApplicantStore((s) => s.submitApplication);
  const resetApplication = useApplicantStore((s) => s.resetApplication);

  return {
    identity,
    qualifications,
    references,
    training,
    status,
    applicantName,
    city,
    updateStepData,
    submitApplication,
    resetApplication,
    editable: status === 'DRAFT',
  };
}

export function ApplicantLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const status = useApplicantStore((s) => s.status);
  const applicantName = useApplicantStore((s) => s.applicantName);
  const seedFromUser = useApplicantStore((s) => s.seedFromUser);

  useEffect(() => {
    if (!user) return;
    seedFromUser(user.full_name, user.city, user.phone);
  }, [user, seedFromUser]);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div data-theme="chw" className="mc-app min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-2.5 text-lg font-extrabold text-slate-900">
            <img
              src="/assets/myndora_care_logo5.jpeg"
              alt=""
              className="h-9 w-auto object-contain"
            />
            <span>
              Myndora Care{' '}
              <span className="hidden align-middle text-xs font-bold text-slate-400 sm:inline">
                CHW Applicant
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            <span className="hidden text-xs font-bold text-slate-700 sm:inline">
              {applicantName || user?.full_name}
            </span>
            <button
              type="button"
              aria-label="Sign out"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
              onClick={signOut}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-[1600px]">
        <aside className="mc-sidebar sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 md:block">
          <p className="px-3 pb-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--accent-ink)' }}>
            Applicant portal
          </p>
          <nav aria-label="Applicant navigation">
            {NAV.map((item) => (
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
          <p className="mt-6 px-3 text-xs text-slate-400">
            Applicants cannot access patient records or CHW work areas until approved.
          </p>
        </aside>

        <main className="mc-main-pad min-w-0 flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>

      <nav className="mc-mobilebar" aria-label="Mobile navigation">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
