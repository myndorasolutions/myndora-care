// Sponsor — Access Requests: request (never self-grant) health access; track patient decisions.
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { AccessLevel } from '@/types';
import { ACCESS_LEVELS, accessLabel } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { useStore, useSelectedPatient } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, KV, PageHeader, Select, type BadgeTone } from '@/components/kit';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'amber', approved: 'green', reduced: 'blue', rejected: 'red', withdrawn: 'gray',
};

function RequestAccessForm({ patientId, patientName, onDone }: { patientId: string; patientName: string; onDone: () => void }) {
  const requestAccess = useStore((s) => s.requestAccess);
  const { toast } = useToast();
  const [level, setLevel] = useState<AccessLevel>('service_updates');
  return (
    <form
      className="space-y-3 text-sm text-slate-600"
      onSubmit={(e) => {
        e.preventDefault();
        requestAccess(patientId, level);
        toast('Access request sent to patient');
        onDone();
      }}
    >
      <p>You are <b>requesting</b> access — you cannot grant it to yourself. {patientName} can approve, reduce, reject, or later withdraw it.</p>
      <Field label="Requested access level">
        <Select value={level} onChange={(e) => setLevel(e.target.value as AccessLevel)} aria-label="Requested access level">
          {ACCESS_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </Select>
      </Field>
      <p className="text-xs text-slate-500">{ACCESS_LEVELS.find((l) => l.id === level)?.description}</p>
      <div className="flex justify-end gap-2 pt-1">
        <Btn type="submit">Send request</Btn>
      </div>
    </form>
  );
}

export default function SponsorAccessRequests() {
  const SPONSOR_ID = useStore((s) => s.identity.sponsorAccountId);
  const patient = useSelectedPatient();
  const rel = useStore((s) => s.relationships.find((r) => r.patientId === s.selectedPatientId && r.sponsorAccountId === SPONSOR_ID))!;
  const consents = useStore(useShallow((s) => s.consents.filter((c) => c.patientId === s.selectedPatientId && c.requesterAccountId === SPONSOR_ID)));
  const { openModal, closeModal } = useModal();

  const pending = consents.find((c) => c.status === 'pending');

  const openRequest = () => {
    openModal({
      title: `Request access — ${patient.name}`,
      backdropDismiss: false,
      body: <RequestAccessForm patientId={patient.id} patientName={patient.name} onDone={closeModal} />,
    });
  };

  return (
    <div>
      <PageHeader
        title="Access Requests"
        subtitle="Payment permission and health-information permission are separate. Only the patient can approve health access."
        actions={<Btn onClick={openRequest} disabled={!!pending}><KeyRound size={15} /> Request access</Btn>}
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card>
          <h3 className="mc-section-title">Current access — {patient.name}</h3>
          <KV label="Approved level"><Badge tone={rel.accessLevel === 'full_monitoring' ? 'green' : 'blue'}>{accessLabel(rel.accessLevel)}</Badge></KV>
          <KV label="You pay for care"><Badge tone="green">Yes</Badge></KV>
          <p className="text-xs text-slate-500 mt-3">These are independent: paying for the plan does not change what you can see.</p>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="mc-section-title">What each level includes</h3>
          {ACCESS_LEVELS.map((l) => (
            <KV key={l.id} label={l.label}><span className="text-xs font-normal text-slate-500">{l.description}</span></KV>
          ))}
        </Card>
      </div>

      {pending && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm">
          <b>Pending patient approval:</b> you requested <b>{accessLabel(pending.requestedLevel)}</b> on {fmtDateTime(pending.createdAt)}. {patient.name} has been notified and will decide.
        </div>
      )}

      <h2 className="mc-section-title">Request history</h2>
      <div className="space-y-3">
        {consents.length === 0 && <Card><p className="text-sm text-slate-500">No requests yet.</p></Card>}
        {consents.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-slate-900">{accessLabel(c.requestedLevel)}</p>
                <p className="text-xs text-slate-500">Requested {fmtDateTime(c.createdAt)}{c.decidedAt ? ` · decided ${fmtDateTime(c.decidedAt)}` : ''}</p>
                {c.grantedLevel && c.status === 'reduced' && (
                  <p className="text-xs text-blue-700 mt-1">Patient granted a reduced level: <b>{accessLabel(c.grantedLevel)}</b></p>
                )}
                {c.note && <p className="text-xs text-slate-400 mt-1">{c.note}</p>}
              </div>
              <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
