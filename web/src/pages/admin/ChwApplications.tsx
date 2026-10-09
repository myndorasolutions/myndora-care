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
import {
  adminApi,
  type ChwActivationLevel,
  type ChwAdminProfile,
} from '@/lib/adminApi';
import { useChwProfiles } from '@/lib/adminQueries';

const PIPELINE: ChwActivationLevel[] = [
  'PENDING_REVIEW',
  'IDENTITY_VERIFIED',
  'REMOTE_CHECK_APPROVED',
  'HOME_VISIT_APPROVED',
];

const TONE: Record<string, BadgeTone> = {
  PENDING_REVIEW: 'gray',
  IDENTITY_VERIFIED: 'amber',
  REMOTE_CHECK_APPROVED: 'blue',
  HOME_VISIT_APPROVED: 'green',
  SENIOR_FIELD_LEAD: 'green',
  SUSPENDED: 'red',
};

const NEXT: Partial<Record<ChwActivationLevel, ChwActivationLevel>> = {
  PENDING_REVIEW: 'IDENTITY_VERIFIED',
  IDENTITY_VERIFIED: 'REMOTE_CHECK_APPROVED',
  REMOTE_CHECK_APPROVED: 'HOME_VISIT_APPROVED',
};

const DEFAULT_SCORECARD = {
  identityDocument: 4,
  ninVerification: 4,
  referenceOne: 4,
  referenceTwo: 4,
  trainingCompetency: 4,
};

export function AdminChwApplicationsPage() {
  const queryClient = useQueryClient();
  const profilesQuery = useChwProfiles();
  const apps = (profilesQuery.data ?? []).filter(
    (p) =>
      p.activationLevel !== 'HOME_VISIT_APPROVED' &&
      p.activationLevel !== 'SENIOR_FIELD_LEAD' &&
      p.activationLevel !== 'SUSPENDED',
  );

  const mutation = useMutation({
    mutationFn: (p: ChwAdminProfile) => {
      const next = NEXT[p.activationLevel];
      if (!next) throw new Error('No next stage');
      return adminApi.updateChwActivation({
        chwProfileId: p.id,
        activationLevel: next,
        ninStatus: next !== 'PENDING_REVIEW' ? true : p.ninStatus,
        identityVerified:
          next === 'IDENTITY_VERIFIED' ||
          next === 'REMOTE_CHECK_APPROVED' ||
          next === 'HOME_VISIT_APPROVED'
            ? true
            : p.identityVerified,
        referencesChecked:
          next === 'REMOTE_CHECK_APPROVED' || next === 'HOME_VISIT_APPROVED'
            ? true
            : p.referencesChecked,
        trainingCompleted:
          next === 'HOME_VISIT_APPROVED' ? true : p.trainingCompleted,
        ...(next === 'HOME_VISIT_APPROVED'
          ? { vettingScorecard: DEFAULT_SCORECARD }
          : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'chw-profiles'] });
    },
  });

  const errorMsg =
    profilesQuery.error instanceof ApiError
      ? profilesQuery.error.message
      : profilesQuery.isError
        ? 'Could not load applications.'
        : null;

  return (
    <div>
      <PageHeader
        title="CHW applications"
        subtitle="Move applicants through identity, remote-check, and home-visit approval stages."
      />
      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}
      {profilesQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading applications…</p>
        </Card>
      ) : apps.length === 0 ? (
        <Card>
          <EmptyState
            title="No open applications"
            hint="All CHWs are fully approved or suspended."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => {
            const stageIdx = PIPELINE.indexOf(a.activationLevel);
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{a.fullName}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Stage {Math.max(stageIdx + 1, 1)} of {PIPELINE.length}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {PIPELINE.map((s) => (
                        <Badge
                          key={s}
                          tone={
                            PIPELINE.indexOf(s) <= stageIdx
                              ? TONE[s]
                              : 'gray'
                          }
                        >
                          {s.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={TONE[a.activationLevel]}>
                      {a.activationLevel.replace(/_/g, ' ')}
                    </Badge>
                    {NEXT[a.activationLevel] && (
                      <Btn
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate(a)}
                      >
                        Advance to{' '}
                        {NEXT[a.activationLevel]!.replace(/_/g, ' ')}
                      </Btn>
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
