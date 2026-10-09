import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';
import { Badge, Btn, Card, EmptyState, KV, StatCard } from '@/components/kit';
import {
  readChwDraftFlag,
  useChwPatients,
  useChwVisitPartitions,
} from '@/lib/chwQueries';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

function greetingForHour(h: number) {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function ChwTodayPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.full_name ?? 'CHW').split(' ')[0];
  const { visitsQuery, scheduled, nextScheduled, needsReview, completed } =
    useChwVisitPartitions();
  const patientsQuery = useChwPatients();
  const draftId = readChwDraftFlag();

  const errorMsg =
    visitsQuery.error instanceof ApiError
      ? visitsQuery.error.message
      : visitsQuery.isError
        ? 'Could not load visits. Ensure CHW activation is complete and the API is reachable.'
        : patientsQuery.error instanceof ApiError
          ? patientsQuery.error.message
          : patientsQuery.isError
            ? 'Could not load patients.'
            : null;

  const nextPatient =
    nextScheduled?.patient ??
    patientsQuery.data?.find((p) => p.id === nextScheduled?.patientId);

  return (
    <div>
      <section className="mc-hero mb-5">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold">
            {greetingForHour(new Date().getHours())}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-amber-100">
            You have {scheduled.length} scheduled visit
            {scheduled.length === 1 ? '' : 's'} and {needsReview} needing review.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Scheduled today"
            value={scheduled.length}
            hint={nextScheduled ? 'Next open' : 'None queued'}
            tone="blue"
          />
          <StatCard
            label="Needs review"
            value={needsReview}
            hint={needsReview ? 'Follow up' : 'Clear'}
            tone={needsReview ? 'red' : 'green'}
          />
          <StatCard
            label="Completed"
            value={completed}
            hint="This period"
            tone="green"
          />
          <StatCard
            label="Assigned patients"
            value={patientsQuery.data?.length ?? '—'}
            hint="Consented roster"
            tone="amber"
          />
        </div>
      </section>

      {errorMsg && (
        <Card className="mb-5 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}

      {(draftId ||
        (nextScheduled &&
          (nextScheduled.status === 'ATTEMPTED' ||
            nextScheduled.status === 'CHECKLIST_COMPLETED'))) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            A visit is currently in progress.
          </p>
          <Btn
            size="sm"
            onClick={() =>
              navigate(
                `/chw/active-visit${draftId || nextScheduled?.id ? `?visitId=${draftId ?? nextScheduled?.id}` : ''}`,
              )
            }
          >
            Resume active visit
          </Btn>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title">Next scheduled visit</h3>
          {visitsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading schedule…</p>
          ) : nextScheduled ? (
            <>
              <KV label="Patient">{nextPatient?.fullName ?? nextScheduled.patientId}</KV>
              <KV label="When">
                {new Date(nextScheduled.scheduledTime).toLocaleString()}
              </KV>
              <KV label="Status">
                <Badge tone="blue">{nextScheduled.status.replace(/_/g, ' ')}</Badge>
              </KV>
              <KV label="Area">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  {nextPatient?.address || '—'}
                </span>
              </KV>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn
                  onClick={() =>
                    navigate(`/chw/active-visit?visitId=${nextScheduled.id}`)
                  }
                >
                  Start visit
                </Btn>
                <Btn variant="secondary" onClick={() => navigate('/chw/records')}>
                  Visit records
                </Btn>
              </div>
            </>
          ) : (
            <EmptyState
              title="No scheduled visits"
              hint="Start a new checkup from an assigned patient."
              action={
                <Btn onClick={() => navigate('/chw/active-visit')}>
                  Open active visit
                </Btn>
              }
            />
          )}
        </Card>

        <Card>
          <h3 className="mc-section-title">
            <AlertTriangle size={17} className="text-red-600" /> Quick links
          </h3>
          <p className="mb-3 text-sm text-slate-600">
            Manage your field day: continue checkups, review past visits, or update
            when you accept work.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn size="sm" onClick={() => navigate('/chw/active-visit')}>
              Active visit
            </Btn>
            <Btn size="sm" variant="secondary" onClick={() => navigate('/chw/records')}>
              Records
            </Btn>
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => navigate('/chw/availability')}
            >
              Availability
            </Btn>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Prefer the sidebar, or{' '}
            <Link className="underline" to="/chw/availability">
              set availability
            </Link>{' '}
            (saved on this device only).
          </p>
        </Card>
      </div>
    </div>
  );
}
