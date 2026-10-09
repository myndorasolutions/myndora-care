// Patient — Permissions: approve / reduce / reject / withdraw sponsor access.
// The patient controls what sponsors may see. Payment does not create health access.
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AccessLevel } from '@/types';
import { ACCESS_LEVELS, accessLabel } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, KV, PageHeader, Select, type BadgeTone } from '@/components/kit';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'amber', approved: 'green', reduced: 'blue', rejected: 'red', withdrawn: 'gray',
};

/** Self-contained modal form — owns its own state so it isn't frozen at openModal() time. */
function ReduceForm({ consentId }: { consentId: string }) {
  const decideAccess = useStore((s) => s.decideAccess);
  const { closeModal } = useModal();
  const { toast } = useToast();
  const [level, setLevel] = useState<AccessLevel>('important_alerts');

  return (
    <div className="space-y-3 text-sm text-slate-600">
      <p>Grant less than what was requested. You can change or withdraw this at any time.</p>
      <Field label="Grant this level instead">
        <Select value={level} onChange={(e) => setLevel(e.target.value as AccessLevel)} aria-label="Reduced access level">
          {ACCESS_LEVELS.filter((l) => l.id !== 'full_monitoring').map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
        <Btn onClick={() => { decideAccess(consentId, 'reduced', level); closeModal(); toast(`Reduced access granted: ${accessLabel(level)}`); }}>Grant reduced access</Btn>
      </div>
    </div>
  );
}

export default function PatientPermissions() {
  const ME = useStore((s) => s.identity.patientId);
  const relationships = useStore(useShallow((s) => s.relationships.filter((r) => r.patientId === ME)));
  const supporters = useStore(useShallow((s) => s.supporters.filter((x) => x.patientId === ME)));
  const consents = useStore(useShallow((s) => s.consents.filter((c) => c.patientId === ME)));
  const accounts = useStore((s) => s.accounts);
  const decideAccess = useStore((s) => s.decideAccess);
  const withdrawAccess = useStore((s) => s.withdrawAccess);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const pending = consents.filter((c) => c.status === 'pending');
  const history = consents.filter((c) => c.status !== 'pending');

  const openReduce = (consentId: string) => {
    openModal({
      title: 'Approve a reduced level',
      backdropDismiss: false,
      body: <ReduceForm consentId={consentId} />,
    });
  };

  const openWithdraw = (accountId: string, name: string) => {
    openModal({
      title: `Withdraw ${name}'s access?`,
      body: <p className="text-sm text-slate-600">{name} will immediately drop to <b>Payment only</b> — they can keep paying for care but will no longer see any health information.</p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn variant="danger" onClick={() => { withdrawAccess(ME, accountId); closeModal(); toast('Access withdrawn'); }}>Withdraw access</Btn>
        </>
      ),
    });
  };

  return (
    <div>
      <PageHeader title="My Permissions" subtitle="You decide who sees your health information. Someone paying for your care does not automatically see it." />

      {pending.length > 0 && (
        <>
          <h2 className="mc-section-title">Requests waiting for your decision</h2>
          <div className="space-y-3 mb-8">
            {pending.map((c) => (
              <Card key={c.id} className="border-amber-300 bg-amber-50/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{c.requesterName}</p>
                    <p className="text-sm text-slate-600">requests <b>{accessLabel(c.requestedLevel)}</b> · {fmtDateTime(c.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn size="sm" onClick={() => { decideAccess(c.id, 'approved'); toast(`Approved: ${accessLabel(c.requestedLevel)}`); }}>Approve</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => openReduce(c.id)}>Reduce</Btn>
                    <Btn size="sm" variant="danger-soft" onClick={() => { decideAccess(c.id, 'rejected'); toast('Request rejected'); }}>Reject</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2 mb-8">
        <Card>
          <h3 className="mc-section-title"><ShieldCheck size={17} /> Current access</h3>
          {relationships.map((r) => {
            const acc = accounts.find((a) => a.id === r.sponsorAccountId);
            return (
              <div key={r.id} className="py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{acc?.name ?? 'Sponsor'} <span className="text-xs font-normal text-slate-500">(pays for your plan)</span></p>
                  </div>
                  <Badge tone={r.accessLevel === 'full_monitoring' ? 'green' : r.accessLevel === 'payment_only' ? 'gray' : 'blue'}>{accessLabel(r.accessLevel)}</Badge>
                </div>
                {r.accessLevel !== 'payment_only' && (
                  <Btn size="sm" variant="danger-soft" className="mt-2" onClick={() => openWithdraw(r.sponsorAccountId, acc?.name ?? 'Sponsor')}>
                    Withdraw access
                  </Btn>
                )}
              </div>
            );
          })}
          {supporters.map((x) => (
            <KV key={x.id} label={`${x.name} (${x.relationship})`}>
              <Badge tone="blue">{accessLabel(x.accessLevel)}</Badge>
            </KV>
          ))}
        </Card>

        <Card>
          <h3 className="mc-section-title">Permission packages explained</h3>
          {ACCESS_LEVELS.map((l) => (
            <KV key={l.id} label={l.label}><span className="text-xs font-normal text-slate-500 max-w-[240px] inline-block">{l.description}</span></KV>
          ))}
          <p className="text-xs text-slate-500 mt-3">These are the predefined packages you can grant. Nothing else is shared.</p>
        </Card>
      </div>

      <h2 className="mc-section-title">Decision history</h2>
      <div className="space-y-3">
        {history.length === 0 && <Card><p className="text-sm text-slate-500">No past decisions.</p></Card>}
        {history.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-slate-900">{c.requesterName} — {accessLabel(c.requestedLevel)}</p>
                <p className="text-xs text-slate-500">
                  {fmtDateTime(c.createdAt)}{c.decidedAt ? ` → ${fmtDateTime(c.decidedAt)}` : ''}
                  {c.status === 'reduced' && c.grantedLevel ? ` · granted ${accessLabel(c.grantedLevel)} instead` : ''}
                </p>
              </div>
              <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
