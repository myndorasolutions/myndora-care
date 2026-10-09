// Admin Credential Reviews: per-CHW verification artefacts with verify/unverify actions.
// These artefacts are never shown to patients or sponsors.
import { useShallow } from 'zustand/react/shallow';
import type { CHWProfile } from '@/types';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, PageHeader } from '@/components/kit';

const CHECKS: { key: keyof CHWProfile['verification']; label: string }[] = [
  { key: 'identityChecked', label: 'Identity check' },
  { key: 'qualificationsChecked', label: 'Qualification review' },
  { key: 'referencesChecked', label: 'References' },
  { key: 'backgroundChecked', label: 'Background check' },
  { key: 'trainingCompleted', label: 'Required training' },
];

export default function AdminCredentialReviews() {
  const chws = useStore(useShallow((s) => s.chws));
  const setChwVerification = useStore((s) => s.setChwVerification);
  const { toast } = useToast();

  return (
    <div>
      <PageHeader title="Credential Reviews" subtitle="Verification artefacts for every CHW. Changes are audit-logged and never visible to patients or sponsors." />
      <div className="space-y-3">
        {chws.map((c) => {
          const done = CHECKS.filter((k) => c.verification[k.key]).length;
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-base font-extrabold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.cadre} · {c.city} · NIN {c.verification.nin === 'verified' ? 'verified' : c.verification.nin}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone={done === CHECKS.length ? 'green' : 'amber'}>{done}/{CHECKS.length} checks</Badge>
                  <Badge tone={c.status === 'approved' ? 'green' : c.status === 'suspended' ? 'red' : 'amber'}>{c.status}</Badge>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CHECKS.map((k) => (
                  <div key={k.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800">{k.label}</p>
                    <div className="flex items-center gap-1.5">
                      {c.verification[k.key] ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}
                      <Btn size="sm" variant={c.verification[k.key] ? 'ghost' : 'secondary'}
                        onClick={() => { setChwVerification(c.id, k.key, !c.verification[k.key]); toast(`${k.label} ${c.verification[k.key] ? 'reopened' : 'verified'} for ${c.name}`); }}>
                        {c.verification[k.key] ? 'Reopen' : 'Verify'}
                      </Btn>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">Photo verified</p>
                  {c.photoVerified ? <Badge tone="green">Yes</Badge> : <Badge tone="amber">Pending</Badge>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
