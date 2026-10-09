import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Btn, Card, PageHeader, StatCard } from '@/components/kit';
import { mockApi } from '@/lib/mockApi';

export function PatientDashboardPage() {
  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', 'p1'],
    queryFn: () => mockApi.getVitalsTrend('p1', 7),
  });
  const latest = vitals[vitals.length - 1];

  return (
    <div data-theme="patient">
      <PageHeader
        title="Your health"
        subtitle="Hypertension & diabetes care plan"
        actions={
          latest ? (
            <Badge
              tone={
                latest.risk_status === 'green'
                  ? 'green'
                  : latest.risk_status === 'yellow'
                    ? 'amber'
                    : 'red'
              }
            >
              {latest.risk_status === 'green'
                ? 'Stable'
                : latest.risk_status === 'yellow'
                  ? 'Caution'
                  : 'Urgent'}
            </Badge>
          ) : undefined
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Latest BP"
          value={latest ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '—'}
        />
        <StatCard label="Pulse" value={latest?.pulse ?? '—'} />
        <StatCard label="Glucose" value={latest?.glucose_fasting ?? '—'} />
      </div>
      <Card className="mb-4">
        <p className="text-sm text-slate-600">
          Demo vitals are shown until a patient-scoped live API is connected.
        </p>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Link to="/patient/vitals">
          <Btn>View trends</Btn>
        </Link>
        <Link to="/patient/medications">
          <Btn variant="secondary">Medications</Btn>
        </Link>
      </div>
    </div>
  );
}
