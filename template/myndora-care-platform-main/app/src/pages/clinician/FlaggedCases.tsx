// Clinician — Flagged Cases list (all statuses).
import { Link } from 'react-router-dom';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/kit';

const TONE: Record<string, BadgeTone> = { awaiting_review: 'amber', more_info_requested: 'blue', resolved: 'green' };

export default function ClinicianFlaggedCases() {
  const cases = useStore((s) => s.clinicianCases);
  const patients = useStore((s) => s.patients);

  return (
    <div>
      <PageHeader title="Flagged Cases" subtitle="All cases routed to you, across statuses." />
      {cases.length === 0 ? (
        <Card><EmptyState title="No cases" /></Card>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link key={c.id} to={`/clinician/cases/${c.id}`} className="block">
              <Card className="hover:border-indigo-300 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500">{patients.find((p) => p.id === c.patientId)?.name} · {fmtDateTime(c.createdAt)}</p>
                  </div>
                  <Badge tone={TONE[c.status]}>{c.status.replaceAll('_', ' ')}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
