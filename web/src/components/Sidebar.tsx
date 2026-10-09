import { NavLink, useNavigate } from 'react-router-dom';
import type { UserRole } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const navByRole: Record<UserRole, NavItem[]> = {
  pharmacy: [
    { to: '/pharmacy/dashboard', label: 'Dashboard', end: true },
    { to: '/pharmacy/refills', label: 'Refill queue' },
    { to: '/pharmacy/fulfillment', label: 'Fulfillment' },
    { to: '/pharmacy/earnings', label: 'Earnings' },
    { to: '/pharmacy/walk-in', label: 'Walk-in check' },
  ],
  clinician: [
    { to: '/clinician/review', label: 'Review queue', end: true },
    { to: '/clinician/flagged', label: 'Flagged cases' },
    { to: '/clinician/vitals-trends', label: 'Vitals trends' },
    { to: '/clinician/consultation', label: 'Consultation note' },
    { to: '/clinician/prescriptions', label: 'Prescriptions' },
    { to: '/clinician/earnings', label: 'Earnings' },
  ],
  lab: [
    { to: '/lab/orders', label: 'Order queue', end: true },
    { to: '/lab/scheduler', label: 'Scheduler' },
    { to: '/lab/upload', label: 'Result upload' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Pilot dashboard', end: true },
    { to: '/admin/alerts', label: 'Alert queue' },
    { to: '/admin/visit-verification', label: 'Visit verification' },
    { to: '/admin/chws', label: 'CHWs' },
    { to: '/admin/chw-applications', label: 'CHW applications' },
    { to: '/admin/credentials', label: 'Credentials' },
    { to: '/admin/rate-cards', label: 'Rate cards' },
    { to: '/admin/audit-logs', label: 'Audit logs' },
    { to: '/admin/patients', label: 'Patients' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/providers', label: 'Providers' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/compliance', label: 'Compliance' },
    { to: '/settings', label: 'Settings' },
    { to: '/messages', label: 'Messages' },
    { to: '/complaints', label: 'Complaints' },
  ],
  super_admin: [
    { to: '/super-admin/feature-flags', label: 'Feature flags', end: true },
    { to: '/super-admin/pricing-rules', label: 'Pricing rules' },
    { to: '/super-admin/clinical-safety', label: 'Clinical safety' },
    { to: '/super-admin/system-config', label: 'System config' },
  ],
  caregiver: [
    { to: '/sponsor/dashboard', label: 'Dashboard', end: true },
    { to: '/sponsor/visits', label: 'Visits' },
    { to: '/sponsor/alerts', label: 'Alerts' },
    { to: '/sponsor/reports', label: 'Reports' },
    { to: '/sponsor/team', label: 'Care Team' },
    { to: '/settings', label: 'Settings' },
    { to: '/messages', label: 'Messages' },
    { to: '/complaints', label: 'Complaints' },
  ],
  sponsor: [
    { to: '/sponsor/dashboard', label: 'Dashboard', end: true },
    { to: '/sponsor/visits', label: 'Visits' },
    { to: '/sponsor/alerts', label: 'Alerts' },
    { to: '/sponsor/reports', label: 'Reports' },
    { to: '/sponsor/team', label: 'Care Team' },
    { to: '/settings', label: 'Settings' },
    { to: '/messages', label: 'Messages' },
    { to: '/complaints', label: 'Complaints' },
  ],
  patient: [
    { to: '/patient/dashboard', label: 'Home', end: true },
    { to: '/patient/vitals', label: 'My vitals' },
    { to: '/patient/medications', label: 'Medications' },
  ],
  home_helper: [
    { to: '/caregiver/dashboard', label: 'Dashboard', end: true },
    { to: '/caregiver/patients', label: 'Patients' },
    { to: '/caregiver/vitals', label: 'Vitals entry' },
  ],
  chw: [
    { to: '/chw/today', label: 'Today', end: true },
    { to: '/chw/active-visit', label: 'Active visit' },
    { to: '/chw/records', label: 'Visit records' },
    { to: '/chw/availability', label: 'Availability' },
    { to: '/applicant', label: 'Application' },
    { to: '/settings', label: 'Settings' },
    { to: '/messages', label: 'Messages' },
    { to: '/complaints', label: 'Complaints' },
  ],
};

const roleHome: Record<UserRole, string> = {
  pharmacy: '/pharmacy/dashboard',
  clinician: '/clinician/review',
  lab: '/lab/orders',
  admin: '/admin/dashboard',
  super_admin: '/super-admin/feature-flags',
  caregiver: '/sponsor/dashboard',
  sponsor: '/sponsor/dashboard',
  patient: '/patient/dashboard',
  home_helper: '/caregiver/dashboard',
  chw: '/chw/today',
};

export function getRoleHome(role: UserRole): string {
  return roleHome[role];
}

interface SidebarProps {
  id?: string;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ id, open = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const items = user ? navByRole[user.role] ?? [] : [];

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate('/login');
  };

  return (
    <aside
      id={id}
      className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out md:static md:z-auto md:max-w-none md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${open ? 'flex' : 'hidden md:flex'}`}
    >
      <div className="border-b border-slate-200 p-4">
        <img
          src="/assets/myndora_care_logo5.jpeg"
          alt="Myndora Care"
          className="mx-auto h-14 w-auto max-w-full object-contain"
        />
        <h1 className="mt-3 text-center text-sm font-bold text-slate-900">Myndora Care</h1>
        <p className="text-center text-xs text-slate-500">
          Family-sponsored home health monitoring
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-primary">
          {user?.role.replace('_', ' ')}
        </p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-medium">{user?.full_name}</p>
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="btn-primary mt-3 w-full text-sm font-semibold"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
