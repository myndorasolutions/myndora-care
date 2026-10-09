// Clinician — Recommendations issued on reviewed cases.
import { Link } from 'react-router-dom';
import { fmtDateTime } from '@/lib/format';
import { Badge, Btn, Card, EmptyState } from '@/components/kit';
import { useClinicianScope } from './scope';

export default function ClinicianRecommendations() {
  const { cases, nameOf } = useClinicianScope();

  const issued = cases.filter((c) => c.recommendation);
  const pending = cases.filter((c) => !c.recommendation && c.status !== 'resolved');

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Recommendations</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Clinical recommendations you have issued. AI may flag anomalies, but every recommendation here is a
          human clinical decision recorded against a case.
        </p>
      </section>

      {pending.length > 0 && (
        <>
          <h2 className="mc-section-title">Cases still needing your recommendation</h2>
          <div className="space-y-3 mb-6">
            {pending.map((c) => (
              <Card key={c.id} className="!p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-slate-500">{nameOf(c.patientId)} · routed {fmtDateTime(c.createdAt)}</p>
                  </div>
                  <Link to={`/clinician/cases/${c.id}`}><Btn size="sm">Add recommendation</Btn></Link>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="mc-section-title">Issued recommendations</h2>
      {issued.length === 0 ? (
        <Card><EmptyState title="None issued yet" hint="Open a case from the review queue to record your recommendation." /></Card>
      ) : (
        <div className="space-y-3">
          {issued.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-slate-900">{c.title}</p>
                <Badge tone={c.status === 'resolved' ? 'green' : 'blue'}>{c.status.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="text-xs text-slate-500 mb-2">{nameOf(c.patientId)} · reviewed {c.reviewedAt ? fmtDateTime(c.reviewedAt) : fmtDateTime(c.createdAt)}</p>
              <p className="text-sm text-slate-700">{c.recommendation}</p>
              {c.patientSummary && <p className="text-xs text-slate-500 mt-2">Shared with patient: {c.patientSummary}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
