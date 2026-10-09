// CHW Complaints & Disputes: complaints filed about the CHW and visits disputed by patients,
// with a response channel that feeds the admin review workflow.
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/store/auth';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader, Textarea } from '@/components/kit';

const STAGE_TONE: Record<string, 'amber' | 'blue' | 'green' | 'red' | 'gray'> = {
  submitted: 'amber', acknowledged: 'blue', severity_assigned: 'blue', evidence_preserved: 'blue',
  owner_assigned: 'blue', chw_response_requested: 'amber', patient_contacted: 'blue', resolved: 'green', appeal: 'red',
};

export default function ChwComplaints() {
  const session = useAuth((s) => s.session);
  const complaints = useStore(useShallow((s) => s.complaints.filter((c) => c.chwId === s.identity.chwId)));
  const disputedVisits = useStore(useShallow((s) => s.visits.filter((v) => v.chwId === s.identity.chwId && v.disputed)));
  const patients = useStore((s) => s.patients);
  const sendMessage = useStore((s) => s.sendMessage);
  const logAudit = useStore((s) => s.logAudit);
  const { toast } = useToast();
  const [responseFor, setResponseFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const patientName = (id: string) => patients.find((p) => p.id === id)?.name ?? 'Patient';
  const myName = session?.account.name ?? 'CHW';

  const sendResponse = (complaintId: string) => {
    if (!draft.trim()) return;
    sendMessage('chw', 'Operations — complaints & disputes', myName, `Response to ${complaintId}: ${draft.trim()}`);
    logAudit(myName, 'chw', 'complaint.chw_response', complaintId);
    setDraft(''); setResponseFor(null);
    toast('Response sent to operations');
  };

  return (
    <div>
      <PageHeader title="Complaints & Disputes" subtitle="Complaints involving you and visits a patient disputed. Fair process: you can respond to every case, and safety complaints pause direct matching until reviewed." />

      <Card className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Complaints about my service</p>
        {complaints.length === 0 ? (
          <EmptyState title="No complaints" hint="None filed. Keep confirming visits with patients and recording services carefully." />
        ) : (
          <div className="space-y-2.5">
            {complaints.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{c.type.replace(/_/g, ' ')} — {patientName(c.patientId)}</p>
                  <div className="flex gap-1.5">
                    {c.severity && <Badge tone={c.severity === 'safety' || c.severity === 'high' ? 'red' : c.severity === 'medium' ? 'amber' : 'gray'}>{c.severity}</Badge>}
                    <Badge tone={STAGE_TONE[c.stage] ?? 'gray'}>{c.stage.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-1.5">{c.details}</p>
                <p className="text-xs text-slate-400 mt-1">Raised by {c.raisedByName} · {new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                {c.resolution && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 mt-2"><b>Resolution:</b> {c.resolution}</p>}
                {c.stage !== 'resolved' && (
                  responseFor === c.id ? (
                    <div className="mt-3 space-y-2">
                      <Textarea aria-label="Your response" placeholder="Your side of what happened…" value={draft} onChange={(e) => setDraft(e.target.value)} />
                      <div className="flex gap-2">
                        <Btn size="sm" onClick={() => sendResponse(c.id)}>Send response</Btn>
                        <Btn size="sm" variant="secondary" onClick={() => { setResponseFor(null); setDraft(''); }}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    <Btn size="sm" variant="secondary" className="mt-2.5" onClick={() => setResponseFor(c.id)}>Respond to this complaint</Btn>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Disputed visits</p>
        {disputedVisits.length === 0 ? (
          <EmptyState title="No disputed visits" hint="Visits a patient disputes appear here with the reason they gave." />
        ) : (
          <div className="space-y-2.5">
            {disputedVisits.map((v) => (
              <div key={v.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{patientName(v.patientId)} · {new Date(v.scheduledFor).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                  <Badge tone="amber">disputed</Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1"><b>Patient&apos;s reason:</b> {v.disputeReason ?? '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Payout for this visit is {v.payoutFrozen ? 'frozen pending review' : 'under review'}.</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
