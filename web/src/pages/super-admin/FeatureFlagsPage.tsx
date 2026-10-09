import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { mockApi } from '@/lib/mockApi';

export function FeatureFlagsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['super-admin', 'flags'],
    queryFn: () => mockApi.getFeatureFlags(),
  });

  return (
    <>
      <PageHeader title="Feature flags" subtitle="Toggle platform capabilities" />
      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {data.map((flag) => (
            <li
              key={flag.key}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-all font-mono text-sm font-semibold">{flag.key}</p>
                <p className="text-sm text-slate-500">{flag.description}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={flag.enabled} className="h-4 w-4 accent-primary" />
                {flag.enabled ? 'On' : 'Off'}
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
