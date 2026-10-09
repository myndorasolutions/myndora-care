import { Badge, Card, EmptyState, KV, PageHeader, type BadgeTone } from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useChwVisitPartitions } from '@/lib/chwQueries';

const STATUS_TONE: Record<string, BadgeTone> = {
  COMPLETED_VERIFIED: 'green',
  PENDING_CONFIRMATION: 'amber',
  CHECKLIST_COMPLETED: 'amber',
  NEEDS_REVIEW: 'red',
  ESCALATED: 'red',
  ATTEMPTED: 'amber',
  CANCELLED: 'gray',
};

export function ChwVisitRecordsPage() {
  const { visitsQuery, records } = useChwVisitPartitions();

  const errorMsg =
    visitsQuery.error instanceof ApiError
      ? visitsQuery.error.message
      : visitsQuery.isError
        ? 'Could not load visit records.'
        : null;

  return (
    <div>
      <PageHeader
        title="Visit records"
        subtitle="Completed and in-progress visits from your field work, with status and vitals when recorded."
      />

      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}

      {visitsQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading records…</p>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <EmptyState
            title="No visit records yet"
            hint="Finished checkups will appear here after you submit from Active visit."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((v) => {
            const tone = STATUS_TONE[v.status] ?? 'gray';
            const bp =
              v.systolicBp != null && v.diastolicBp != null
                ? `${v.systolicBp}/${v.diastolicBp} mmHg`
                : null;
            return (
              <Card key={v.id}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {v.patient?.fullName ?? v.patientId}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {new Date(v.scheduledTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={tone}>{v.status.replace(/_/g, ' ')}</Badge>
                    {(v.escalations?.length ?? 0) > 0 && (
                      <Badge tone="red">Escalated</Badge>
                    )}
                  </div>
                </div>
                <div className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <KV label="Visit id">
                      <span className="font-mono text-xs">{v.id.slice(0, 8)}…</span>
                    </KV>
                    {bp && <KV label="Blood pressure">{bp}</KV>}
                    {v.pulseRate != null && (
                      <KV label="Pulse">{v.pulseRate} bpm</KV>
                    )}
                    {v.temperatureCelsius != null && (
                      <KV label="Temperature">{v.temperatureCelsius} °C</KV>
                    )}
                  </div>
                  <div>
                    {v.bloodSugarMgDl != null && (
                      <KV label="Blood sugar">{v.bloodSugarMgDl} mg/dL</KV>
                    )}
                    {v.chwObservationNotes && (
                      <KV label="Observation">
                        <span className="text-xs font-normal">
                          {v.chwObservationNotes}
                        </span>
                      </KV>
                    )}
                    {v.escalations?.[0] && (
                      <KV label="Escalation">
                        <span className="text-xs font-normal">
                          {v.escalations[0].severity}: {v.escalations[0].triggerReason}
                        </span>
                      </KV>
                    )}
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
