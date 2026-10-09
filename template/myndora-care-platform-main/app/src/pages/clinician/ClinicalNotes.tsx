// Clinician — Clinical Notes: visit observations recorded by CHWs for routed patients.
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Card, EmptyState } from '@/components/kit';
import { useClinicianScope } from './scope';

export default function ClinicianClinicalNotes() {
  const { patientIds, nameOf } = useClinicianScope();
  const visits = useStore((s) => s.visits);
  const chws = useStore((s) => s.chws);

  const notes = visits
    .filter((v) => patientIds.includes(v.patientId) && (v.chwObservation || v.chwNotes || v.patientReported))
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor));

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Clinical Notes</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Observations recorded by community health workers during verified visits to your assigned patients.
        </p>
      </section>

      {notes.length === 0 ? (
        <Card><EmptyState title="No clinical notes yet" hint="CHW observations from completed visits appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {notes.map((v) => {
            const chw = chws.find((c) => c.id === v.chwId);
            return (
              <Card key={v.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-slate-900">{nameOf(v.patientId)} · visit {v.id}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={v.status === 'completed' ? 'green' : v.status === 'disputed' ? 'red' : 'blue'}>{v.status.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-slate-400">{fmtDateTime(v.scheduledFor)}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-2">Recorded by {chw?.name ?? 'assigned CHW'} · {v.completedServices.join(', ') || 'visit services'}</p>
                {v.chwObservation && (
                  <div className="mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">CHW observation</p>
                    <p className="text-sm text-slate-700">{v.chwObservation}</p>
                  </div>
                )}
                {v.patientReported && (
                  <div className="mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Patient reported</p>
                    <p className="text-sm text-slate-700">{v.patientReported}</p>
                  </div>
                )}
                {v.chwNotes && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Visit notes</p>
                    <p className="text-sm text-slate-700">{v.chwNotes}</p>
                  </div>
                )}
                {v.followUpRequired && <Badge tone="amber">follow-up required</Badge>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
