import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Btn, Card, EmptyState, PageHeader } from '@/components/kit';
import { ApiError } from '@/lib/api';
import { adminApi, type ChwAdminProfile } from '@/lib/adminApi';
import { useChwProfiles } from '@/lib/adminQueries';

const CHECKS: {
  key: keyof Pick<
    ChwAdminProfile,
    'ninStatus' | 'identityVerified' | 'referencesChecked' | 'trainingCompleted'
  >;
  label: string;
  patchKey:
    | 'ninStatus'
    | 'identityVerified'
    | 'referencesChecked'
    | 'trainingCompleted';
}[] = [
  { key: 'ninStatus', label: 'NIN verification', patchKey: 'ninStatus' },
  {
    key: 'identityVerified',
    label: 'Identity check',
    patchKey: 'identityVerified',
  },
  {
    key: 'referencesChecked',
    label: 'References',
    patchKey: 'referencesChecked',
  },
  {
    key: 'trainingCompleted',
    label: 'Required training',
    patchKey: 'trainingCompleted',
  },
];

export function AdminCredentialReviewsPage() {
  const queryClient = useQueryClient();
  const profilesQuery = useChwProfiles();
  const profiles = profilesQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: (args: {
      profile: ChwAdminProfile;
      patchKey: (typeof CHECKS)[number]['patchKey'];
      value: boolean;
    }) =>
      adminApi.updateChwActivation({
        chwProfileId: args.profile.id,
        activationLevel: args.profile.activationLevel,
        [args.patchKey]: args.value,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'chw-profiles'] });
    },
  });

  const errorMsg =
    profilesQuery.error instanceof ApiError
      ? profilesQuery.error.message
      : profilesQuery.isError
        ? 'Could not load credentials.'
        : null;

  return (
    <div>
      <PageHeader
        title="Credential reviews"
        subtitle="Verification artefacts for every CHW. Changes are audit-logged and never visible to patients or sponsors."
      />
      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}
      {profilesQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading credentials…</p>
        </Card>
      ) : profiles.length === 0 ? (
        <Card>
          <EmptyState title="No CHW profiles" />
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((c) => {
            const done = CHECKS.filter((k) => c[k.key]).length;
            return (
              <Card key={c.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-extrabold text-slate-900">
                      {c.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.activationLevel.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <Badge tone={done === CHECKS.length ? 'green' : 'amber'}>
                    {done}/{CHECKS.length} checks
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {CHECKS.map((k) => (
                    <div
                      key={k.key}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {k.label}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {c[k.key] ? (
                          <Badge tone="green">Verified</Badge>
                        ) : (
                          <Badge tone="amber">Pending</Badge>
                        )}
                        <Btn
                          size="sm"
                          variant={c[k.key] ? 'ghost' : 'secondary'}
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              profile: c,
                              patchKey: k.patchKey,
                              value: !c[k.key],
                            })
                          }
                        >
                          {c[k.key] ? 'Reopen' : 'Verify'}
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
