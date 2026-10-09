// Clinician — Referrals for routed patients (simulated partner network).
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Card, EmptyState } from '@/components/kit';
import { useClinicianScope } from './scope';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'gray'> = {
  requested: 'amber', booked: 'blue', in_progress: 'blue', completed: 'green', routed_to_clinician: 'purple',
};

const KIND_LABEL: Record<string, string> = {
  lab: 'Laboratory', pharmacy: 'Pharmacy', doctor: 'Doctor', hospital: 'Hospital',
};

export default function ClinicianReferrals() {
  const { patientIds, nameOf } = useClinicianScope();
  const referrals = useStore((s) => s.referrals);

  const scoped = referrals
    .filter((r) => patientIds.includes(r.patientId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Referrals</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Referrals involving your assigned patients, coordinated with independent partner providers. Partner
          names are simulated in this demo; Myndora Care is not itself a laboratory, pharmacy, or hospital.
        </p>
      </section>

      {scoped.length === 0 ? (
        <Card><EmptyState title="No referrals yet" hint="Referrals for patients routed to you appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {scoped.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="indigo">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-2">{r.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{nameOf(r.patientId)} · {r.partner} · created {fmtDateTime(r.createdAt)}</p>
                </div>
                {r.status === 'routed_to_clinician' && (
                  <p className="text-xs font-semibold text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
                    Routed to you — open the related case to record your recommendation.
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
