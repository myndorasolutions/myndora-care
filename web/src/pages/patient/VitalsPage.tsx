import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, PageHeader } from '@/components/kit';
import { VitalsChart } from '@/components/ui/VitalsChart';
import { mockApi } from '@/lib/mockApi';

export function PatientVitalsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['vitals', 'p1', 30],
    queryFn: () => mockApi.getVitalsTrend('p1', 30),
  });

  return (
    <div data-theme="patient">
      <PageHeader title="My vitals" subtitle="30-day trends (demo data)" />
      {isLoading ? (
        <p className="text-slate-500">Loading chart…</p>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState title="No vitals yet" />
        </Card>
      ) : (
        <Card className="overflow-hidden p-2">
          <VitalsChart data={data} />
        </Card>
      )}
    </div>
  );
}
