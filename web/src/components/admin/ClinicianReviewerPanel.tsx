import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { type FlaggedVitalReview, type ReviewStatus } from '@/lib/reviewQueue';
import { vitalsApi } from '@/lib/vitalsApi';

const statusLabel: Record<ReviewStatus, string> = {
  needs_review: 'Needs Review',
  reviewed: 'Reviewed',
  closed: 'Closed',
};

export function ClinicianReviewerPanel() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'review-queue'],
    queryFn: () => vitalsApi.getReviewQueue(),
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
      clinician_notes,
    }: {
      id: string;
      status: ReviewStatus;
      clinician_notes?: string;
    }) => vitalsApi.updateReview(id, { status, clinician_notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['sponsor', 'review-queue'] });
      setFeedback(
        variables.status === 'reviewed'
          ? 'Marked reviewed — saved to API.'
          : 'Marked closed — saved to API.',
      );
      window.setTimeout(() => setFeedback(null), 4000);
    },
  });

  const getNotes = (row: FlaggedVitalReview) =>
    draftNotes[row.id] ?? row.clinicianNotes;

  const setNotes = (id: string, notes: string) => {
    setDraftNotes((prev) => ({ ...prev, [id]: notes }));
  };

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-lg font-semibold">Clinician Reviewer</h2>
      <p className="mb-4 text-sm text-slate-500">
        Live review queue — yellow and red vitals from the API.
      </p>
      {isError && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Could not load review queue. Check API connectivity.
        </p>
      )}
      {feedback && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {feedback}
        </div>
      )}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading review queue…</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.patientName}</p>
                  <p className="text-sm text-slate-600">
                    BP {row.systolic}/{row.diastolic} mmHg
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(row.createdAt).toLocaleString('en-NG')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge status={row.riskStatus} />
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {statusLabel[row.status]}
                  </span>
                </div>
              </div>
              <textarea
                className="input min-h-[72px] w-full text-sm"
                placeholder="Clinician notes"
                value={getNotes(row)}
                onChange={(e) => setNotes(row.id, e.target.value)}
                disabled={row.status !== 'needs_review' || mutation.isPending}
              />
              {row.status === 'needs_review' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    data-testid={`clinician-reviewer-mark-reviewed-${row.id}`}
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        id: row.id,
                        status: 'reviewed',
                        clinician_notes:
                          getNotes(row) || 'Reviewed during pilot track.',
                      })
                    }
                  >
                    Mark Reviewed
                  </button>
                  <button
                    type="button"
                    className="btn-outline text-xs"
                    data-testid={`clinician-reviewer-mark-closed-${row.id}`}
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        id: row.id,
                        status: 'closed',
                        clinician_notes:
                          getNotes(row) || 'Closed — no further action.',
                      })
                    }
                  >
                    Mark Closed
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
