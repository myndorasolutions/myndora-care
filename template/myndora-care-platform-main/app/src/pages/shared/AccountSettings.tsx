// Account Settings: account identity, profiles on the account, add/switch profile, sign out.
import { useNavigate } from 'react-router-dom';
import type { ProfileKind } from '@contracts/types';
import { useAuth, portalFor } from '@/store/auth';
import { useStore } from '@/store/useStore';
import { saveNow } from '@/store/sync';
import { Badge, Btn, Card, PageHeader, KV } from '@/components/kit';

const KIND_LABEL: Record<ProfileKind, string> = {
  sponsor: 'Sponsor', patient: 'Patient', chw: 'Community Health Worker',
  chw_applicant: 'CHW Applicant', admin: 'Admin (staff)', clinician: 'Clinician (staff)',
};

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  active: 'green', pending_review: 'amber', suspended: 'red', rejected: 'gray',
};

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const activeProfile = useAuth((s) => s.activeProfile);
  const setActiveProfile = useAuth((s) => s.setActiveProfile);
  const switchRole = useStore((s) => s.switchRole);

  if (!session) return null;
  const { account } = session;

  const activate = async (kind: ProfileKind) => {
    setActiveProfile(kind);
    if (kind === 'sponsor' || kind === 'patient' || kind === 'chw' || kind === 'admin' || kind === 'clinician') {
      switchRole(kind);
    }
    navigate(portalFor(kind));
  };

  const signOut = async () => {
    await saveNow();
    await logout();
    navigate('/sign-in');
  };

  const ADDABLE: { kind: 'sponsor' | 'patient' | 'chw_applicant'; label: string; to: string }[] = [
    { kind: 'patient', label: 'Manage care for myself (Patient)', to: '/onboarding/patient' },
    { kind: 'sponsor', label: 'Support someone\u2019s care (Sponsor)', to: '/onboarding/sponsor' },
    { kind: 'chw_applicant', label: 'Apply as a CHW', to: '/onboarding/chw' },
  ];
  const addable = ADDABLE.filter((a) => !account.profiles.some((p) => p.kind === a.kind || (a.kind === 'chw_applicant' && p.kind === 'chw')));

  return (
    <div>
      <PageHeader title="Account Settings" subtitle="One account, multiple approved profiles. Admin access is created internally and can never be self-assigned." />

      <Card className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Account</p>
        <div className="space-y-1">
          <KV label="Name">{account.name}</KV>
          <KV label="Email">{account.email}</KV>
          <KV label="Email verified">{account.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}</KV>
          <KV label="Account type">{account.isDemo ? <Badge tone="blue">UAT demo account</Badge> : <Badge tone="gray">Standard</Badge>}</KV>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Btn variant="secondary" size="sm" onClick={() => navigate('/forgot-password')}>Change password</Btn>
          <Btn variant="ghost" size="sm" onClick={signOut}>Sign out</Btn>
        </div>
      </Card>

      <Card className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Profiles on this account</p>
        {account.profiles.length === 0 ? (
          <p className="text-sm text-slate-500">No profiles yet — choose what you would like to do first.</p>
        ) : (
          <div className="space-y-2">
            {account.profiles.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-bold text-slate-900">{KIND_LABEL[p.kind]}</p>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status.replace('_', ' ')}</Badge>
                  {activeProfile === p.kind && <Badge tone="blue">current</Badge>}
                </div>
                {p.status === 'active' && activeProfile !== p.kind && (
                  <Btn variant="secondary" size="sm" onClick={() => activate(p.kind)}>Switch to this profile</Btn>
                )}
                {p.kind === 'chw_applicant' && (
                  <Btn variant="secondary" size="sm" onClick={() => navigate('/applicant')}>Open applicant portal</Btn>
                )}
              </div>
            ))}
          </div>
        )}
        {addable.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Add another profile</p>
            <div className="flex flex-wrap gap-2">
              {addable.map((a) => (
                <Btn key={a.kind} variant="secondary" size="sm" onClick={() => navigate(a.to)}>{a.label}</Btn>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Privacy and safety</p>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Only the minimum necessary information is shared with approved people.</li>
          <li>Every sensitive access and consent change is written to the audit log.</li>
          <li>Portal screens carry your name as a watermark; downloads and printing are restricted.</li>
          <li>Sessions time out automatically — sign out on shared devices.</li>
          <li>Screen-capture deterrence reduces casual sharing, but screenshots cannot be fully disabled on any device — share access carefully.</li>
        </ul>
      </Card>
    </div>
  );
}
