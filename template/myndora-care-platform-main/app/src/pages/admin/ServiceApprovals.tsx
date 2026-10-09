// Admin — Service Approvals: approve/reject CHW service, rate, radius and add-on requests.
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/kit';

const KIND_LABELS: Record<string, string> = {
  new_service: 'New service', rate_change: 'Rate change', radius_change: 'Radius change', add_on: 'Add-on',
};
const TONE: Record<string, BadgeTone> = { pending: 'amber', approved: 'green', rejected: 'red' };

export default function AdminServiceApprovals() {
  const requests = useStore((s) => s.serviceRequests);
  const chws = useStore((s) => s.chws);
  const decideServiceRequest = useStore((s) => s.decideServiceRequest);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const confirm = (id: string, approve: boolean, label: string) => {
    openModal({
      title: approve ? `Approve ${label}?` : `Reject ${label}?`,
      body: <p className="text-sm text-slate-600">
        {approve
          ? 'Approval takes effect immediately and is recorded in the audit log.'
          : 'The CHW is notified with the rejection reason. Nothing is published.'}
      </p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn variant={approve ? 'primary' : 'danger'} onClick={() => { decideServiceRequest(id, approve); closeModal(); toast(approve ? 'Request approved' : 'Request rejected'); }}>
            {approve ? 'Approve' : 'Reject'}
          </Btn>
        </>
      ),
    });
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  return (
    <div>
      <PageHeader title="Service Approvals" subtitle="CHWs request changes — they can never publish services, rates, radii or add-ons themselves." />
      {pending.length === 0 ? (
        <Card className="mb-6"><EmptyState title="No pending requests" /></Card>
      ) : (
        <div className="space-y-3 mb-8">
          {pending.map((r) => {
            const chw = chws.find((c) => c.id === r.chwId);
            return (
              <Card key={r.id} className="border-amber-300">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{KIND_LABELS[r.kind]}</h3>
                      <Badge tone="amber">Pending</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{chw?.name} ({chw?.cadre}, {chw?.city}) · {fmtDateTime(r.createdAt)}</p>
                    <p className="text-sm text-slate-600 mt-1.5">{r.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" onClick={() => confirm(r.id, true, KIND_LABELS[r.kind])}>Approve</Btn>
                    <Btn size="sm" variant="danger-soft" onClick={() => confirm(r.id, false, KIND_LABELS[r.kind])}>Reject</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mc-section-title">Decided</h2>
      <div className="space-y-3">
        {decided.map((r) => (
          <Card key={r.id} className="!p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm"><b>{KIND_LABELS[r.kind]}</b> — {r.description} <span className="text-slate-400">({chws.find((c) => c.id === r.chwId)?.name})</span></p>
              <Badge tone={TONE[r.status]}>{r.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
