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
    { to: '/clinician/queue', label: 'Queue', end: true },
    { to: '/clinician/patient/p1/chart', label: 'Patient chart' },
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
    { to: '/admin/patients', label: 'Patients' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/providers', label: 'Providers' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/compliance', label: 'Compliance' },
  ],
  super_admin: [
    { to: '/super-admin/feature-flags', label: 'Feature flags', end: true },
    { to: '/super-admin/pricing-rules', label: 'Pricing rules' },
    { to: '/super-admin/clinical-safety', label: 'Clinical safety' },
    { to: '/super-admin/system-config', label: 'System config' },
  ],
  caregiver: [{ to: '/sponsor/dashboard', label: 'Sponsor home', end: true }],
  patient: [
    { to: '/patient/dashboard', label: 'Home', end: true },
    { to: '/patient/vitals', label: 'My vitals' },
  ],
  home_helper: [
    { to: '/caregiver/dashboard', label: 'Dashboard', end: true },
    { to: '/caregiver/patients', label: 'Patients' },
    { to: '/caregiver/vitals', label: 'Vitals entry' },
  ],
  chw: [{ to: '/chw/checkup', label: 'Field checkup', end: true }],
};

const roleHome: Record<UserRole, string> = {
  pharmacy: '/pharmacy/dashboard',
  clinician: '/clinician/queue',
  lab: '/lab/orders',
  admin: '/admin/dashboard',
  super_admin: '/super-admin/feature-flags',
  caregiver: '/sponsor/dashboard',
  patient: '/patient/dashboard',
  home_helper: '/caregiver/dashboard',
  chw: '/chw/checkup',
};

export function getRoleHome(role: UserRole): string {
  return roleHome[role];
}

export function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const items = user ? navByRole[user.role] ?? [] : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
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
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
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
