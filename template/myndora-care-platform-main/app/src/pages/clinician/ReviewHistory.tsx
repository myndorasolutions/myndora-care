// Clinician — Review History.
import { useNavigate } from 'react-router-dom';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Btn, Card, EmptyState, PageHeader } from '@/components/kit';

export default function ClinicianReviewHistory() {
  const navigate = useNavigate();
  const cases = useStore(useShallow((s) => s.clinicianCases.filter((c) => c.status !== 'awaiting_review')));
  const patients = useStore((s) => s.patients);

  return (
    <div>
      <PageHeader title="Review History" subtitle="Cases you have completed or returned for more information." />
      {cases.length === 0 ? (
        <Card><EmptyState title="No completed reviews yet" hint="Resolved and returned cases appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-500">
                    {patients.find((p) => p.id === c.patientId)?.name} · reviewed {c.reviewedAt ? fmtDateTime(c.reviewedAt) : '—'}
                  </p>
                  {c.recommendation && <p className="text-sm text-slate-600 mt-1.5"><b>Recommendation:</b> {c.recommendation}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.status === 'resolved' ? 'green' : 'blue'}>{c.status.replaceAll('_', ' ')}</Badge>
                  <Btn size="sm" variant="secondary" onClick={() => navigate(`/clinician/cases/${c.id}`)}>Open</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
