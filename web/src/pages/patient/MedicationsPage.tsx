import { Badge, Card, PageHeader } from '@/components/kit';

const meds = [
  { name: 'Amlodipine 5mg', schedule: 'Once daily · morning', next_refill: '2026-05-22' },
  { name: 'Metformin 500mg', schedule: 'Twice daily · with meals', next_refill: '2026-05-20' },
];

export function PatientMedicationsPage() {
  return (
    <div data-theme="patient">
      <PageHeader title="Medications" subtitle="Active prescriptions (demo list)" />
      <ul className="space-y-3">
        {meds.map((m) => (
          <li key={m.name}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{m.name}</p>
                  <p className="text-sm text-slate-500">{m.schedule}</p>
                </div>
                <Badge tone="green">Active</Badge>
              </div>
              <p className="mt-3 text-xs font-semibold text-[var(--role-accent,var(--green))]">
                Next refill: {m.next_refill}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
