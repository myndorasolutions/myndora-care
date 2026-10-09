import { Badge, Card, EmptyState } from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useVisitProofs } from '@/lib/adminQueries';
import { useClinicianReviewQueue } from '@/lib/clinicianQueries';

export function ClinicianVitalsTrendsPage() {
  const queueQuery = useClinicianReviewQueue();
  const proofsQuery = useVisitProofs();
  const cases = queueQuery.data ?? [];
  const proofs = proofsQuery.data ?? [];

  const byPatient = new Map<
    string,
    {
      name: string;
      readings: Array<{
        id: string;
        at: string;
        label: string;
        abnormal?: boolean;
      }>;
    }
  >();

  for (const c of cases) {
    const key = c.patientId ?? c.patientName;
    const entry = byPatient.get(key) ?? {
      name: c.patientName,
      readings: [],
    };
    entry.readings.push({
      id: `esc-${c.id}`,
      at: c.createdAt,
      label: `BP ${c.systolic}/${c.diastolic}${c.pulse != null ? ` · pulse ${c.pulse}` : ''}${c.bloodSugarMgDl != null ? ` · BS ${c.bloodSugarMgDl}` : ''}`,
      abnormal: c.riskStatus !== 'green',
    });
    byPatient.set(key, entry);
  }

  for (const v of proofs) {
    const key = v.patient_name;
    const entry = byPatient.get(key) ?? {
      name: v.patient_name,
      readings: [],
    };
    entry.readings.push({
      id: `visit-${v.id}`,
      at: v.recorded_at,
      label: `BP ${v.systolic_bp}/${v.diastolic_bp}${v.pulse != null ? ` · pulse ${v.pulse}` : ''}`,
      abnormal: false,
    });
    byPatient.set(key, entry);
  }

  const patients = [...byPatient.values()].map((p) => ({
    ...p,
    readings: p.readings.sort((a, b) => b.at.localeCompare(a.at)),
  }));

  const errorMsg =
    queueQuery.error instanceof ApiError
      ? queueQuery.error.message
      : queueQuery.isError || proofsQuery.isError
        ? 'Could not load vitals trends.'
        : null;

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Vitals and trends</h1>
        <p className="mt-1 text-sm text-indigo-100">
          Readings from open escalations and recent visit proofs for patients in
          your review scope.
        </p>
      </section>

      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}

      {queueQuery.isLoading || proofsQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading vitals…</p>
        </Card>
      ) : patients.length === 0 ? (
        <Card>
          <EmptyState
            title="No readings yet"
            hint="Vitals from flagged cases and verified visits appear here."
          />
        </Card>
      ) : (
        patients.map((p) => (
          <div key={p.name} className="mb-5">
            <h2 className="mc-section-title">{p.name}</h2>
            <Card>
              <ul className="space-y-2">
                {p.readings.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {r.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {r.abnormal && <Badge tone="red">Flagged</Badge>}
                      <span className="text-xs text-slate-400">
                        {new Date(r.at).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
