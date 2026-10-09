import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  KV,
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

const LEVEL_TONE: Record<string, BadgeTone> = {
  HOME_VISIT_APPROVED: 'green',
  SENIOR_FIELD_LEAD: 'green',
  REMOTE_CHECK_APPROVED: 'blue',
  IDENTITY_VERIFIED: 'amber',
  PENDING_REVIEW: 'amber',
  SUSPENDED: 'red',
};

export function AdminCHWsPage() {
  const queryClient = useQueryClient();
  const profilesQuery = useChwProfiles();
  const profiles = profilesQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: (body: {
      chwProfileId: string;
      activationLevel: ChwActivationLevel;
    }) => adminApi.updateChwActivation(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'chw-profiles'] });
    },
  });

  const errorMsg =
    profilesQuery.error instanceof ApiError
      ? profilesQuery.error.message
      : profilesQuery.isError
        ? 'Could not load CHW profiles.'
        : null;

  const setLevel = (p: ChwAdminProfile, activationLevel: ChwActivationLevel) => {
    mutation.mutate({
      chwProfileId: p.id,
      activationLevel,
      ...(activationLevel === 'HOME_VISIT_APPROVED'
        ? {
            ninStatus: true,
            identityVerified: true,
            referencesChecked: true,
            trainingCompleted: true,
            vettingScorecard: {
              identityDocument: 4,
              ninVerification: 4,
              referenceOne: 4,
              referenceTwo: 4,
              trainingCompetency: 4,
            },
          }
        : {}),
    });
  };

  return (
    <div>
      <PageHeader
        title="Community health workers"
        subtitle="Activation lifecycle for field workers. Changes are audit-logged."
      />
      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}
      {profilesQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading CHWs…</p>
        </Card>
      ) : profiles.length === 0 ? (
        <Card>
          <EmptyState title="No CHW profiles" />
        </Card>
      ) : (
        <div className="space-y-4">
          {profiles.map((c) => (
            <Card key={c.id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-slate-900">
                    {c.fullName}
                    {c.activationLevel === 'HOME_VISIT_APPROVED' ||
                    c.activationLevel === 'SENIOR_FIELD_LEAD' ? (
                      <BadgeCheck size={16} className="text-green-600" />
                    ) : c.activationLevel === 'SUSPENDED' ? (
                      <ShieldAlert size={16} className="text-red-600" />
                    ) : null}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {(c.serviceAreas ?? []).join(', ') || 'No service areas'} ·{' '}
                    {(c.languagesSpoken ?? []).join(', ') || '—'}
                  </p>
                </div>
                <Badge tone={LEVEL_TONE[c.activationLevel] ?? 'gray'}>
                  {c.activationLevel.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <KV label="NIN">{c.ninStatus ? 'Verified' : 'Pending'}</KV>
                <KV label="Identity">
                  {c.identityVerified ? 'Verified' : 'Pending'}
                </KV>
                <KV label="References">
                  {c.referencesChecked ? 'Checked' : 'Pending'}
                </KV>
                <KV label="Training">
                  {c.trainingCompleted ? 'Complete' : 'Pending'}
                </KV>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.activationLevel !== 'HOME_VISIT_APPROVED' &&
                  c.activationLevel !== 'SUSPENDED' && (
                    <Btn
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() =>
                        setLevel(
                          c,
                          c.activationLevel === 'PENDING_REVIEW'
                            ? 'IDENTITY_VERIFIED'
                            : c.activationLevel === 'IDENTITY_VERIFIED'
                              ? 'REMOTE_CHECK_APPROVED'
                              : 'HOME_VISIT_APPROVED',
                        )
                      }
                    >
                      Advance level
                    </Btn>
                  )}
                {c.activationLevel !== 'SUSPENDED' ? (
                  <Btn
                    size="sm"
                    variant="danger"
                    disabled={mutation.isPending}
                    onClick={() => setLevel(c, 'SUSPENDED')}
                  >
                    Suspend
                  </Btn>
                ) : (
                  <Btn
                    size="sm"
                    variant="secondary"
                    disabled={mutation.isPending}
                    onClick={() => setLevel(c, 'PENDING_REVIEW')}
                  >
                    Reactivate
                  </Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
