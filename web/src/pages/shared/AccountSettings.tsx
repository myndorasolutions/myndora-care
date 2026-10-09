import { useNavigate } from 'react-router-dom';
import { Btn, Card, KV, PageHeader } from '@/components/kit';
import type { UserRole } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

const ROLE_LABEL: Record<UserRole, string> = {
  patient: 'Patient',
  caregiver: 'Sponsor',
  sponsor: 'Sponsor',
  home_helper: 'Home helper',
  chw: 'Community Health Worker',
  pharmacy: 'Pharmacy',
  clinician: 'Clinician',
  lab: 'Lab',
  admin: 'Admin (staff)',
  super_admin: 'Super admin',
};

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <PageHeader
        title="Account Settings"
        subtitle="Your signed-in profile. Sessions time out on shared devices — sign out when you are done."
      />

      <Card className="mb-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Account</p>
        <div className="space-y-1">
          <KV label="Name">{user.full_name}</KV>
          <KV label="Email">{user.email}</KV>
          <KV label="Role">{ROLE_LABEL[user.role]}</KV>
          <KV label="Phone">{user.phone || '—'}</KV>
          <KV label="City">{user.city || '—'}</KV>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.role === 'chw' && (
            <Btn variant="secondary" size="sm" onClick={() => navigate('/applicant')}>
              Open applicant portal
            </Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Btn>
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Privacy and safety
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Only the minimum necessary information is shared with approved people.</li>
          <li>Every sensitive access and consent change is written to the audit log.</li>
          <li>Portal screens carry your name as a watermark; downloads and printing are restricted.</li>
          <li>Sessions time out automatically — sign out on shared devices.</li>
          <li>
            Screen-capture deterrence reduces casual sharing, but screenshots cannot be fully disabled
            on any device — share access carefully.
          </li>
        </ul>
      </Card>
    </div>
  );
}
