import { PageHeader } from '@/components/ui/PageHeader';

const thresholds = [
  { metric: 'Systolic BP', red: '≥ 160', yellow: '140–159' },
  { metric: 'Diastolic BP', red: '≥ 100', yellow: '90–99' },
  { metric: 'Fasting glucose', red: '≥ 200', yellow: '126–199' },
];

export function ClinicalSafetyPage() {
  return (
    <>
      <PageHeader title="Clinical safety" subtitle="Risk thresholds and escalation" />
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left">Metric</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-danger">Red</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-warning">Yellow</th>
            </tr>
          </thead>
          <tbody>
            {thresholds.map((t) => (
              <tr key={t.metric} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{t.metric}</td>
                <td className="px-4 py-3">{t.red}</td>
                <td className="px-4 py-3">{t.yellow}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
