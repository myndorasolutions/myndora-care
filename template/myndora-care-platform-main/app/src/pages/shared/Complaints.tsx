// Complaints & service recovery — shared by sponsor and patient portals.
import type { ComplaintStage, Role } from '@/types';
import { COMPLAINT_TYPE_LABELS, fmtDateTime } from '@/lib/format';
import { useStore, useSelectedPatient } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Btn, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/kit';
import { useComplaintModal } from '@/components/modals';

const STAGE_LABELS: Record<ComplaintStage, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  severity_assigned: 'Severity assigned',
  evidence_preserved: 'Evidence preserved',
  owner_assigned: 'Owner assigned',
  chw_response_requested: 'CHW response requested',
  patient_contacted: 'Patient contacted',
  resolved: 'Resolved',
  appeal: 'Appeal',
};

export const STAGE_ORDER: ComplaintStage[] = [
  'submitted', 'acknowledged', 'severity_assigned', 'evidence_preserved', 'owner_assigned',
  'chw_response_requested', 'patient_contacted', 'resolved', 'appeal',
];

function stageTone(stage: ComplaintStage): BadgeTone {
  if (stage === 'resolved') return 'green';
  if (stage === 'appeal') return 'purple';
  return 'amber';
}

export default function ComplaintsPage({ role }: { role: Extract<Role, 'sponsor' | 'patient'> }) {
  const patient = useSelectedPatient();
  const complaints = useStore(useShallow((s) => s.complaints.filter((c) => c.patientId === s.selectedPatientId)));
  const chws = useStore((s) => s.chws);
  const openComplaint = useComplaintModal();
  const selectedChwId = useStore((s) => s.selectedChwByPatient[s.selectedPatientId]);

  return (
    <div>
      <PageHeader
        title="Complaints & Service Recovery"
        subtitle="Request a different CHW, report incomplete service, or raise a safety or privacy concern. Every complaint follows a tracked recovery workflow."
        actions={
          <Btn onClick={() => openComplaint({
            patientId: patient.id,
            chwId: selectedChwId,
            raisedByRole: role,
            raisedByName: role === 'sponsor' ? 'Tunde Adeyemi' : patient.name,
          })}>
            New complaint
          </Btn>
        }
      />

      {complaints.length === 0 ? (
        <Card><EmptyState title="No complaints yet" hint="Complaints you submit will appear here with their full recovery workflow." /></Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900">{COMPLAINT_TYPE_LABELS[c.type]}</h3>
                  <p className="text-xs text-slate-500">
                    Raised by {c.raisedByName} · {fmtDateTime(c.createdAt)}
                    {c.chwId && ` · about ${chws.find((x) => x.id === c.chwId)?.name ?? 'a CHW'}`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {c.severity && <Badge tone={c.severity === 'safety' ? 'red' : c.severity === 'high' ? 'red' : 'amber'}>{c.severity}</Badge>}
                  <Badge tone={stageTone(c.stage)}>{STAGE_LABELS[c.stage]}</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">{c.details}</p>
              {c.resolution && (
                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mb-3">
                  <b>Resolution:</b> {c.resolution}
                </p>
              )}
              <ol className="border-l-2 border-slate-200 pl-4 space-y-2">
                {c.history.map((h, i) => (
                  <li key={i} className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{STAGE_LABELS[h.stage]}</span> — {h.note}{' '}
                    <span className="text-slate-400">{fmtDateTime(h.at)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
