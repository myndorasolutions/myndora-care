// Clinician — Review Queue (clinical indigo theme).
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/store/auth';
import { Badge, Btn, Card, EmptyState, StatCard, Toggle } from '@/components/kit';

export default function ClinicianReviewQueue() {
  const navigate = useNavigate();
  const clinicianName = useAuth((s) => s.session?.account.name) ?? 'Reviewing clinician';
  const cases = useStore((s) => s.clinicianCases);
  const patients = useStore((s) => s.patients);
  const available = useStore((s) => s.clinicianAvailable);
  const setClinicianAvailable = useStore((s) => s.setClinicianAvailable);

  const awaiting = cases.filter((c) => c.status === 'awaiting_review');
  const moreInfo = cases.filter((c) => c.status === 'more_info_requested');
  const resolved = cases.filter((c) => c.status === 'resolved');

  return (
    <div>
      <section className="mc-hero mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold">{clinicianName}</h1>
            <p className="text-sm text-indigo-100 mt-1">Flagged cases routed within your professional scope.</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm font-bold">Accepting cases</span>
            <Toggle checked={available} onChange={setClinicianAvailable} label="Accepting cases" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Awaiting review" value={awaiting.length} hint={awaiting.length ? 'Action needed' : 'Clear'} tone={awaiting.length ? 'amber' : 'green'} />
          <StatCard label="More info requested" value={moreInfo.length} hint="With coordination" tone="blue" />
          <StatCard label="Resolved" value={resolved.length} hint="All time" tone="green" />
        </div>
      </section>

      <h2 className="mc-section-title"><ClipboardList size={17} /> Cases awaiting your review</h2>
      {awaiting.length === 0 ? (
        <Card><EmptyState title="Queue clear" hint="New flagged cases appear here when escalations or lab results are routed to you." /></Card>
      ) : (
        <div className="space-y-3">
          {awaiting.map((c) => (
            <Card key={c.id} className="border-indigo-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-500">{patients.find((p) => p.id === c.patientId)?.name} · routed {fmtDateTime(c.createdAt)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.measuredReadings.map((r, i) => (
                      <Badge key={i} tone={r.abnormal ? 'red' : 'green'}>{r.kind}: {r.value} {r.unit}</Badge>
                    ))}
                  </div>
                </div>
                <Link to={`/clinician/cases/${c.id}`}>
                  <Btn size="sm">Review case</Btn>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {moreInfo.length > 0 && (
        <>
          <h2 className="mc-section-title mt-6">Waiting for more information</h2>
          <div className="space-y-3">
            {moreInfo.map((c) => (
              <Card key={c.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <div className="flex gap-2 items-center">
                    <Badge tone="blue">more info requested</Badge>
                    <Btn size="sm" variant="secondary" onClick={() => navigate(`/clinician/cases/${c.id}`)}>Re-open</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
