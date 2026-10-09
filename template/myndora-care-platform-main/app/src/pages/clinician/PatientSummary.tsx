// Clinician — Patient Summary: clinical overview of patients routed to this clinician.
import { Link } from 'react-router-dom';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Btn, Card, EmptyState } from '@/components/kit';
import { useClinicianScope } from './scope';

export default function ClinicianPatientSummary() {
  const { cases, patients, patientIds } = useClinicianScope();
  const alerts = useStore((s) => s.alerts);
  const vitals = useStore((s) => s.vitals);

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Patient Summary</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Clinical overview of patients whose care has been routed to you. Sponsor billing and payment
          information is never part of this view.
        </p>
      </section>

      {patients.length === 0 ? (
        <Card><EmptyState title="No patients in your scope" hint="Patients appear here when a case is assigned to you." /></Card>
      ) : (
        <div className="space-y-3">
          {patients.map((p) => {
            const pCases = cases.filter((c) => c.patientId === p.id);
            const openCase = pCases.find((c) => c.status !== 'resolved');
            const openAlerts = alerts.filter((a) => a.patientId === p.id && a.status !== 'resolved');
            const lastVital = vitals.filter((v) => v.patientId === p.id).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
            return (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.age} yrs · {p.neighbourhood}, {p.city}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.conditions.map((c) => <Badge key={c} tone="indigo">{c}</Badge>)}
                      {openAlerts.length > 0 && <Badge tone="red">{openAlerts.length} open alert{openAlerts.length > 1 ? 's' : ''}</Badge>}
                      {pCases.length > 0 && <Badge tone="blue">{pCases.length} case{pCases.length > 1 ? 's' : ''} routed</Badge>}
                    </div>
                    {lastVital && (
                      <p className="text-xs text-slate-500 mt-2">
                        Latest reading: <span className={lastVital.isAbnormal ? 'font-bold text-red-600' : 'font-semibold'}>{lastVital.kind.replace('_', ' ')} {lastVital.value} {lastVital.unit}</span> · {fmtDate(lastVital.recordedAt)}
                      </p>
                    )}
                  </div>
                  {openCase && (
                    <Link to={`/clinician/cases/${openCase.id}`}>
                      <Btn size="sm">Open active case</Btn>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Scope note: you can only view patients routed to you ({patientIds.length} currently). Unassigned patients
        are not accessible from this portal.
      </p>
    </div>
  );
}
