import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  PageHeader,
  type BadgeTone,
} from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useAdminReviewQueue } from '@/lib/adminQueries';
import {
  severityDisplayLabel,
  type FlaggedVitalReview,
  type ReviewStatus,
} from '@/lib/reviewQueue';
import { vitalsApi } from '@/lib/vitalsApi';

const SEV: Record<string, BadgeTone> = {
  URGENT: 'red',
  NEEDS_REVIEW: 'amber',
  CAUTION: 'amber',
  NORMAL: 'blue',
};
const ST: Record<ReviewStatus, BadgeTone> = {
  needs_review: 'amber',
  reviewed: 'blue',
  closed: 'green',
};

export function AdminAlertQueuePage() {
  const queryClient = useQueryClient();
  const queueQuery = useAdminReviewQueue();
  const rows = queueQuery.data ?? [];
  const open = rows.filter((r) => r.status === 'needs_review');
  const acknowledged = rows.filter((r) => r.status === 'reviewed');

  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: ReviewStatus;
    }) => vitalsApi.updateReview(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'review-queue'] });
    },
  });

  const errorMsg =
    queueQuery.error instanceof ApiError
      ? queueQuery.error.message
      : queueQuery.isError
        ? 'Could not load alert queue.'
        : null;

  const renderCard = (a: FlaggedVitalReview) => (
    <Card
      key={a.id}
      className={a.severity === 'URGENT' ? 'border-red-300' : ''}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">{a.patientName}</h3>
            <Badge tone={SEV[a.severity ?? 'CAUTION'] ?? 'amber'}>
              {severityDisplayLabel(a.severity)}
            </Badge>
            <Badge tone={ST[a.status]}>{a.status.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            BP {a.systolic}/{a.diastolic} ·{' '}
            {new Date(a.createdAt).toLocaleString()}
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            {a.triggerReason ?? 'Vital threshold breach'}
          </p>
        </div>
        <div className="flex gap-2">
          {a.status === 'needs_review' && (
            <Btn
              size="sm"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ id: a.id, status: 'reviewed' })
              }
            >
              Acknowledge
            </Btn>
          )}
          {a.status !== 'closed' && (
            <Btn
              size="sm"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ id: a.id, status: 'closed' })}
            >
              Resolve
            </Btn>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Alert queue"
        subtitle="Urgent and needs-review escalations across patients, ordered by severity."
      />
      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}
      {queueQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading alerts…</p>
        </Card>
      ) : open.length === 0 && acknowledged.length === 0 ? (
        <Card>
          <EmptyState title="Queue clear" hint="All alerts have been resolved." />
        </Card>
      ) : (
        <>
          <div className="mb-8 space-y-3">{open.map(renderCard)}</div>
          {acknowledged.length > 0 && (
            <>
              <h2 className="mc-section-title">Acknowledged</h2>
              <div className="space-y-3">{acknowledged.map(renderCard)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
