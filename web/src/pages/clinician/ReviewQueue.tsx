import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  StatCard,
} from '@/components/kit';
import { ApiError } from '@/lib/api';
import {
  partitionReviewQueue,
  useClinicianReviewQueue,
} from '@/lib/clinicianQueries';
import { severityDisplayLabel } from '@/lib/reviewQueue';
import { useAuthStore } from '@/stores/authStore';

export function ClinicianReviewQueuePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clinicianName = user?.full_name ?? 'Reviewing clinician';
  const queueQuery = useClinicianReviewQueue();
  const rows = queueQuery.data ?? [];
  const { awaiting, moreInfo, urgent } = partitionReviewQueue(rows);

  const errorMsg =
    queueQuery.error instanceof ApiError
      ? queueQuery.error.message
      : queueQuery.isError
        ? 'Could not load review queue.'
        : null;

  return (
    <div>
      <section className="mc-hero mb-5">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold">{clinicianName}</h1>
          <p className="mt-1 text-sm text-indigo-100">
            Flagged cases with NEEDS REVIEW or URGENT severity from live
            escalations.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Awaiting review"
            value={awaiting.length}
            hint={awaiting.length ? 'Action needed' : 'Clear'}
            tone={awaiting.length ? 'amber' : 'green'}
          />
          <StatCard
            label="Urgent"
            value={urgent.length}
            hint={urgent.length ? 'Priority' : 'None'}
            tone={urgent.length ? 'red' : 'green'}
          />
          <StatCard
            label="Acknowledged"
            value={moreInfo.length}
            hint="Reviewed, open"
            tone="blue"
          />
        </div>
      </section>

      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}

      <h2 className="mc-section-title">
        <ClipboardList size={17} /> Cases awaiting your review
      </h2>
      {queueQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading queue…</p>
        </Card>
      ) : awaiting.length === 0 ? (
        <Card>
          <EmptyState
            title="Queue clear"
            hint="New flagged cases appear when escalations are routed for clinical review."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {awaiting.map((c) => (
            <Card key={c.id} className="border-indigo-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    {c.triggerReason ?? 'Flagged vitals'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {c.patientName} · routed{' '}
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={c.severity === 'URGENT' ? 'red' : 'amber'}>
                      {severityDisplayLabel(c.severity)}
                    </Badge>
                    <Badge tone="red">
                      BP {c.systolic}/{c.diastolic}
                    </Badge>
                    {c.pulse != null && (
                      <Badge tone="gray">Pulse {c.pulse}</Badge>
                    )}
                    {c.bloodSugarMgDl != null && (
                      <Badge tone="gray">BS {c.bloodSugarMgDl}</Badge>
                    )}
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
          <h2 className="mc-section-title mt-6">Acknowledged / in progress</h2>
          <div className="space-y-3">
            {moreInfo.map((c) => (
              <Card key={c.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {c.patientName} — {c.triggerReason ?? 'Case'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">reviewed</Badge>
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/clinician/cases/${c.id}`)}
                    >
                      Re-open
                    </Btn>
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
