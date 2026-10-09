// Admin — Complaints: investigate, advance the recovery workflow, resolve, freeze payouts.
import { useState } from 'react';
import type { ComplaintStage } from '@/types';
import { COMPLAINT_TYPE_LABELS, fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, PageHeader, Select, Textarea } from '@/components/kit';
import { STAGE_ORDER } from '@/pages/shared/Complaints';

const STAGE_LABELS: Record<ComplaintStage, string> = {
  submitted: 'Submitted', acknowledged: 'Acknowledged', severity_assigned: 'Severity assigned',
  evidence_preserved: 'Evidence preserved', owner_assigned: 'Owner assigned',
  chw_response_requested: 'CHW response requested', patient_contacted: 'Patient contacted',
  resolved: 'Resolved', appeal: 'Appeal',
};

function ResolveForm({ id, onDone }: { id: string; onDone: () => void }) {
  const resolveComplaint = useStore((s) => s.resolveComplaint);
  const { toast } = useToast();
  const [kind, setKind] = useState('credit');
  const [notes, setNotes] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        resolveComplaint(id, `${notes || 'Resolved'} (outcome: ${kind})`);
        toast('Complaint resolved');
        onDone();
      }}
    >
      <Field label="Resolution outcome">
        <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Resolution kind">
          <option value="credit">Service credit issued</option>
          <option value="refund">Refund processed</option>
          <option value="reassignment">Patient reassigned to new CHW</option>
          <option value="warning">Warning issued to CHW</option>
          <option value="suspension">CHW suspended</option>
          <option value="no_fault">No fault found — explained to complainant</option>
        </Select>
      </Field>
      <Field label="Resolution notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Resolution notes" />
      </Field>
      <div className="flex justify-end gap-2">
        <Btn type="submit">Record resolution</Btn>
      </div>
    </form>
  );
}

export default function AdminComplaints() {
  const complaints = useStore((s) => s.complaints);
  const patients = useStore((s) => s.patients);
  const chws = useStore((s) => s.chws);
  const advanceComplaint = useStore((s) => s.advanceComplaint);
  const setComplaintSeverity = useStore((s) => s.setComplaintSeverity);
  const visits = useStore((s) => s.visits);
  const freezePayout = useStore((s) => s.freezePayout);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const nextStage = (stage: ComplaintStage): ComplaintStage | null => {
    const i = STAGE_ORDER.indexOf(stage);
    return i >= 0 && i < STAGE_ORDER.length - 2 ? STAGE_ORDER[i + 1] : null;
  };

  const openResolve = (id: string) => {
    openModal({ title: 'Resolve complaint', backdropDismiss: false, body: <ResolveForm id={id} onDone={closeModal} /> });
  };

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Investigate and recover. Safety complaints suspend direct matching until reviewed and resolved." />
      <div className="space-y-4">
        {complaints.map((c) => {
          const patient = patients.find((p) => p.id === c.patientId);
          const chw = chws.find((x) => x.id === c.chwId);
          const next = nextStage(c.stage);
          const disputedVisit = visits.find((v) => v.patientId === c.patientId && v.disputed);
          return (
            <Card key={c.id} className={c.severity === 'safety' ? 'border-red-300' : ''}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900">{COMPLAINT_TYPE_LABELS[c.type]}</h3>
                  <p className="text-xs text-slate-500">
                    {patient?.name} · raised by {c.raisedByName} · {fmtDateTime(c.createdAt)}{chw ? ` · about ${chw.name}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone={c.stage === 'resolved' ? 'green' : 'amber'}>{STAGE_LABELS[c.stage]}</Badge>
                  {c.severity && <Badge tone={c.severity === 'safety' ? 'red' : 'amber'}>{c.severity}</Badge>}
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">{c.details}</p>
              {c.resolution && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mb-3"><b>Resolution:</b> {c.resolution}</p>}

              {c.stage !== 'resolved' && (
                <div className="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3">
                  {next && (
                    <Btn size="sm" variant="secondary" onClick={() => { advanceComplaint(c.id, next, `Advanced to ${STAGE_LABELS[next]}.`); toast(`Stage: ${STAGE_LABELS[next]}`); }}>
                      Advance → {STAGE_LABELS[next]}
                    </Btn>
                  )}
                  <Field label="Severity">
                    <Select
                      value={c.severity ?? 'low'}
                      onChange={(e) => { setComplaintSeverity(c.id, e.target.value as 'low' | 'medium' | 'high' | 'safety'); toast('Severity updated'); }}
                      aria-label="Complaint severity"
                    >
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="safety">Safety</option>
                    </Select>
                  </Field>
                  {disputedVisit && !disputedVisit.payoutFrozen && (
                    <Btn size="sm" variant="danger-soft" onClick={() => { freezePayout(disputedVisit.id, true); toast('Payout frozen for disputed visit'); }}>
                      Freeze payout
                    </Btn>
                  )}
                  {disputedVisit?.payoutFrozen && <Badge tone="red">Payout frozen</Badge>}
                  <Btn size="sm" onClick={() => openResolve(c.id)}>Resolve</Btn>
                </div>
              )}

              <ol className="border-l-2 border-slate-200 pl-4 space-y-1.5 mt-3">
                {c.history.map((h, i) => (
                  <li key={i} className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{STAGE_LABELS[h.stage]}</span> — {h.note} <span className="text-slate-400">{fmtDateTime(h.at)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
