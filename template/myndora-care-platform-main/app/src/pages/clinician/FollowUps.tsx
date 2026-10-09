// Clinician — Follow-up Actions across routed patients.
import { Link } from 'react-router-dom';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Btn, Card, EmptyState } from '@/components/kit';
import { useClinicianScope } from './scope';

export default function ClinicianFollowUps() {
  const { cases, patientIds, nameOf } = useClinicianScope();
  const visits = useStore((s) => s.visits);
  const escalations = useStore((s) => s.escalations);

  const flaggedVisits = visits.filter((v) => patientIds.includes(v.patientId) && v.followUpRequired);
  const openEscalations = escalations.filter((e) => patientIds.includes(e.patientId) && e.status !== 'resolved');
  const moreInfo = cases.filter((c) => c.status === 'more_info_requested');
  const awaiting = cases.filter((c) => c.status === 'awaiting_review');

  const ESC_TONE: Record<string, 'red' | 'amber' | 'green'> = { open: 'red', routed_to_clinician: 'amber', resolved: 'green' };

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Follow-up Actions</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Outstanding follow-ups across your assigned patients: flagged visits, open escalations, and cases
          waiting on your review.
        </p>
      </section>

      <h2 className="mc-section-title">Cases awaiting your action</h2>
      {awaiting.length + moreInfo.length === 0 ? (
        <Card className="mb-6"><EmptyState title="No cases waiting" hint="Cases needing review or more information appear here." /></Card>
      ) : (
        <div className="space-y-3 mb-6">
          {[...awaiting, ...moreInfo].map((c) => (
            <Card key={c.id} className="!p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="text-xs text-slate-500">{nameOf(c.patientId)} · {fmtDateTime(c.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.status === 'awaiting_review' ? 'amber' : 'blue'}>{c.status.replace(/_/g, ' ')}</Badge>
                  <Link to={`/clinician/cases/${c.id}`}><Btn size="sm" variant="secondary">Open case</Btn></Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mc-section-title">Open escalations</h2>
      {openEscalations.length === 0 ? (
        <Card className="mb-6"><EmptyState title="No open escalations" hint="Escalations raised by CHWs for your patients appear here." /></Card>
      ) : (
        <div className="space-y-3 mb-6">
          {openEscalations.map((e) => (
            <Card key={e.id} className="!p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{nameOf(e.patientId)}</p>
                  <p className="text-xs text-slate-500">{e.reason}</p>
                  <p className="text-xs text-slate-400 mt-1">Raised by {e.raisedBy} · {fmtDateTime(e.createdAt)}</p>
                </div>
                <Badge tone={ESC_TONE[e.status]}>{e.status.replace(/_/g, ' ')}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mc-section-title">Visits flagged for follow-up</h2>
      {flaggedVisits.length === 0 ? (
        <Card><EmptyState title="No visits flagged" hint="When a CHW marks a visit as needing follow-up it appears here." /></Card>
      ) : (
        <div className="space-y-3">
          {flaggedVisits.map((v) => (
            <Card key={v.id} className="!p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{nameOf(v.patientId)} · visit {v.id}</p>
                  <p className="text-xs text-slate-500">{v.chwObservation || v.patientReported || 'Follow-up marked by CHW.'}</p>
                  <p className="text-xs text-slate-400 mt-1">{fmtDateTime(v.scheduledFor)}</p>
                </div>
                <Badge tone="amber">follow-up required</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
