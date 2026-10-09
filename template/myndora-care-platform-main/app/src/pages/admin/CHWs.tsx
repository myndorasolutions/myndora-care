// Admin — CHWs: approve / reject / suspend / reactivate with full verification review.
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, KV, PageHeader, type BadgeTone } from '@/components/kit';

const STATUS_TONE: Record<string, BadgeTone> = { approved: 'green', pending: 'amber', suspended: 'red', rejected: 'gray' };

export default function AdminCHWs() {
  const chws = useStore((s) => s.chws);
  const setChwStatus = useStore((s) => s.setChwStatus);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const verificationRows = (c: (typeof chws)[number]) => [
    { label: 'NIN', value: c.verification.nin, done: true },
    { label: 'Identity', value: '', done: c.verification.identityChecked },
    { label: 'Qualifications', value: '', done: c.verification.qualificationsChecked },
    { label: 'References', value: '', done: c.verification.referencesChecked },
    { label: 'Background check', value: '', done: c.verification.backgroundChecked },
    { label: 'Training', value: '', done: c.verification.trainingCompleted },
    { label: 'Photo verification', value: '', done: c.photoVerified },
  ];

  const confirm = (id: string, action: 'approved' | 'rejected' | 'suspended', name: string) => {
    const labels = { approved: 'Approve', rejected: 'Reject', suspended: 'Suspend' } as const;
    openModal({
      title: `${labels[action]} ${name}?`,
      body: <p className="text-sm text-slate-600">
        {action === 'approved' && 'The CHW becomes visible for matching and can accept assignments.'}
        {action === 'rejected' && 'The application is rejected and the CHW is not listed.'}
        {action === 'suspended' && 'The CHW is immediately hidden from matching and cannot take new assignments.'}
      </p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn variant={action === 'approved' ? 'primary' : 'danger'} onClick={() => { setChwStatus(id, action); closeModal(); toast(`${name} ${action}`); }}>
            {labels[action]}
          </Btn>
        </>
      ),
    });
  };

  return (
    <div>
      <PageHeader title="Community Health Workers" subtitle="Verification review and lifecycle management. NIN and documents are admin-only." />
      <div className="space-y-4">
        {chws.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  {c.name}
                  {c.matchingSuspended && <Badge tone="red"><ShieldAlert size={12} /> Matching suspended</Badge>}
                </h3>
                <p className="text-xs text-slate-500">{c.cadre} · {c.yearsExperience} yrs · {c.city} · {c.completedVisits} visits · ★ {c.rating || '—'}</p>
              </div>
              <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
            </div>

            <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4 mb-3">
              {verificationRows(c).map((v) => (
                <KV key={v.label} label={v.label}>
                  {v.done
                    ? <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold"><BadgeCheck size={13} /> {v.value || 'Verified'}</span>
                    : <Badge tone="amber">Pending</Badge>}
                </KV>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {c.status === 'pending' && (
                <>
                  <Btn size="sm" onClick={() => confirm(c.id, 'approved', c.name)}>Approve</Btn>
                  <Btn size="sm" variant="danger-soft" onClick={() => confirm(c.id, 'rejected', c.name)}>Reject</Btn>
                </>
              )}
              {c.status === 'approved' && (
                <Btn size="sm" variant="danger-soft" onClick={() => confirm(c.id, 'suspended', c.name)}>Suspend</Btn>
              )}
              {(c.status === 'suspended' || c.status === 'rejected') && (
                <Btn size="sm" onClick={() => confirm(c.id, 'approved', c.name)}>Reactivate</Btn>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
