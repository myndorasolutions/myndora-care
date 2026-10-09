import { Link } from 'react-router-dom';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  type BadgeTone,
} from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useClinicianReviewQueue } from '@/lib/clinicianQueries';
import { severityDisplayLabel } from '@/lib/reviewQueue';

const TONE: Record<string, BadgeTone> = {
  needs_review: 'amber',
  reviewed: 'blue',
  closed: 'green',
};

export function ClinicianFlaggedCasesPage() {
  const queueQuery = useClinicianReviewQueue();
  const cases = queueQuery.data ?? [];

  const errorMsg =
    queueQuery.error instanceof ApiError
      ? queueQuery.error.message
      : queueQuery.isError
        ? 'Could not load flagged cases.'
        : null;

  return (
    <div>
      <PageHeader
        title="Flagged cases"
        subtitle="All open escalations routed for clinical review, across statuses."
      />
      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}
      {queueQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading cases…</p>
        </Card>
      ) : cases.length === 0 ? (
        <Card>
          <EmptyState title="No cases" />
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link key={c.id} to={`/clinician/cases/${c.id}`} className="block">
              <Card className="transition-colors hover:border-indigo-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {c.triggerReason ?? 'Flagged vitals'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {c.patientName} · {severityDisplayLabel(c.severity)} ·{' '}
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge tone={TONE[c.status] ?? 'gray'}>
                    {c.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
