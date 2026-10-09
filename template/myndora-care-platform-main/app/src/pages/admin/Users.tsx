// Admin User Administration: every registered account and its profiles,
// with activate / suspend / reject controls. Admin profiles are visible here
// but can only be created internally (never via self-registration).
import { useCallback, useEffect, useState } from 'react';
import type { AuthProfile, ProfileStatus } from '@contracts/types';
import { api } from '@/lib/api';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader } from '@/components/kit';

type AdminUser = {
  id: number; email: string; name: string; verified: boolean; isDemo: boolean;
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: Date; lastLoginAt: Date | null; profiles: AuthProfile[];
};

const STATUS_TONE: Record<ProfileStatus, 'green' | 'amber' | 'red' | 'gray'> = {
  active: 'green', pending_review: 'amber', suspended: 'red', rejected: 'gray',
};

const ACCOUNT_TONE: Record<AdminUser['status'], 'green' | 'amber' | 'red'> = {
  active: 'green', suspended: 'amber', deactivated: 'red',
};

const KIND_LABEL: Record<string, string> = {
  sponsor: 'Sponsor', patient: 'Patient', chw: 'CHW', chw_applicant: 'CHW applicant', admin: 'Admin', clinician: 'Clinician',
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api.admin.users.query() as AdminUser[]);
      setError('');
    } catch {
      setError('Could not load users from the server.');
      setUsers([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (profileId: number, status: ProfileStatus) => {
    setBusy(profileId);
    try {
      await api.admin.setProfileStatus.mutate({ profileId, status });
      await load();
      toast(`Profile ${status.replace('_', ' ')}`);
    } catch {
      toast('Could not update the profile');
    } finally {
      setBusy(null);
    }
  };

  const setAccountStatus = async (accountId: number, status: AdminUser['status']) => {
    setBusy(accountId * 1000);
    try {
      await api.admin.setAccountStatus.mutate({ accountId, status });
      await load();
      toast(`Account ${status}`);
    } catch {
      toast('Could not update the account');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="User Administration" subtitle="All registered accounts and their role profiles. Suspending a profile blocks that portal immediately. Deactivating an account revokes its sessions and blocks sign-in." />
      {error && <p className="text-sm text-red-600 mb-3" role="alert">{error}</p>}
      {users === null ? (
        <Card><p className="text-sm text-slate-500">Loading users…</p></Card>
      ) : users.length === 0 ? (
        <Card><EmptyState title="No accounts yet" hint="Registered UAT accounts appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div>
                  <p className="text-base font-extrabold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email} · joined {new Date(u.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}{u.lastLoginAt ? ` · last sign-in ${new Date(u.lastLoginAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  {u.isDemo && <Badge tone="blue">demo</Badge>}
                  {u.verified ? <Badge tone="green">verified</Badge> : <Badge tone="amber">unverified</Badge>}
                  <Badge tone={ACCOUNT_TONE[u.status ?? 'active']}>account {(u.status ?? 'active')}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {(u.status ?? 'active') !== 'active' && (
                  <Btn size="sm" variant="secondary" disabled={busy === u.id * 1000} onClick={() => setAccountStatus(u.id, 'active')}>Reactivate account</Btn>
                )}
                {(u.status ?? 'active') === 'active' && (
                  <Btn size="sm" variant="danger-soft" disabled={busy === u.id * 1000} onClick={() => setAccountStatus(u.id, 'suspended')}>Suspend account</Btn>
                )}
                {(u.status ?? 'active') !== 'deactivated' && (
                  <Btn size="sm" variant="danger" disabled={busy === u.id * 1000} onClick={() => setAccountStatus(u.id, 'deactivated')}>Deactivate account</Btn>
                )}
              </div>
              {u.profiles.length === 0 ? (
                <p className="text-sm text-slate-500">No role profiles yet (account created, onboarding not completed).</p>
              ) : (
                <div className="space-y-2">
                  {u.profiles.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{KIND_LABEL[p.kind] ?? p.kind}</p>
                        <Badge tone={STATUS_TONE[p.status]}>{p.status.replace('_', ' ')}</Badge>
                        {p.refId && <span className="text-xs text-slate-400 font-mono">{p.refId}</span>}
                      </div>
                      <div className="flex gap-1.5">
                        {p.status !== 'active' && <Btn size="sm" variant="secondary" disabled={busy === p.id} onClick={() => setStatus(p.id, 'active')}>Activate</Btn>}
                        {p.status === 'active' && <Btn size="sm" variant="danger-soft" disabled={busy === p.id} onClick={() => setStatus(p.id, 'suspended')}>Suspend</Btn>}
                        {p.status === 'suspended' && <Btn size="sm" variant="danger" disabled={busy === p.id} onClick={() => setStatus(p.id, 'rejected')}>Reject</Btn>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
