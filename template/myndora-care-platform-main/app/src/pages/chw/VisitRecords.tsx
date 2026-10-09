// CHW — Visit Records: structured, auditable records from completed visits.
import { fmtDateTime, VERIFICATION_LABELS } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, EmptyState, KV, PageHeader, type BadgeTone } from '@/components/kit';

const STATUS_TONE: Record<string, BadgeTone> = { verified: 'green', submitted: 'amber', disputed: 'red', in_progress: 'amber', scheduled: 'blue' };

export default function ChwVisitRecords() {
  const ME = useStore((s) => s.identity.chwId);
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.chwId === ME && v.status !== 'scheduled').sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))));
  const patients = useStore((s) => s.patients);
  const vitals = useStore((s) => s.vitals);

  return (
    <div>
      <PageHeader title="Visit Records" subtitle="Structured documentation with verification status. Patient statements and your observations are stored separately." />
      {visits.length === 0 ? (
        <Card><EmptyState title="No visit records yet" /></Card>
      ) : (
        <div className="space-y-4">
          {visits.map((v) => {
            const patient = patients.find((p) => p.id === v.patientId)!;
            const readings = vitals.filter((x) => v.vitalsIds.includes(x.id));
            return (
              <Card key={v.id}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{patient.name}</h3>
                    <p className="text-xs text-slate-500">{fmtDateTime(v.scheduledFor)}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge tone={STATUS_TONE[v.status]}>{v.status.replace('_', ' ')}</Badge>
                    {v.patientConfirmed && <Badge tone="green">Patient confirmed</Badge>}
                    {v.payoutFrozen && <Badge tone="red">Payout frozen</Badge>}
                    {v.escalationId && <Badge tone="red">Escalated</Badge>}
                  </div>
                </div>
                <div className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <KV label="Completed services">{v.completedServices.length}/{v.requestedServices.length}</KV>
                    <KV label="Verification">{v.verificationMethod ? VERIFICATION_LABELS[v.verificationMethod] : '—'}</KV>
                    <KV label="Geofence evidence">{v.evidence.geofenceCheckIn ? 'Recorded' : '—'}</KV>
                    <KV label="Plausible duration">{v.evidence.geofenceCheckOut ? (v.evidence.plausibleDuration ? 'Yes' : 'Flagged') : '—'}</KV>
                    {v.presentPersons.length > 0 && (
                      <KV label="Present">{v.presentPersons.map((p) => `${p.name} (${p.relationship})`).join(', ')}</KV>
                    )}
                  </div>
                  <div>
                    {readings.length > 0 && (
                      <KV label="Readings">{readings.map((r) => `${r.value} ${r.unit}`).join(' · ')}</KV>
                    )}
                    {v.patientReported && <KV label="Patient reported"><span className="text-xs font-normal">{v.patientReported}</span></KV>}
                    {v.chwObservation && <KV label="Your observation"><span className="text-xs font-normal">{v.chwObservation}</span></KV>}
                    {v.chwNotes && <KV label="Notes"><span className="text-xs font-normal">{v.chwNotes}</span></KV>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
