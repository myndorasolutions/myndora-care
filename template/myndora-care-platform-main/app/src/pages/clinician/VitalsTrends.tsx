// Clinician — Vitals and Trends for patients routed to this clinician.
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Card, EmptyState } from '@/components/kit';
import { useClinicianScope } from './scope';

const KIND_LABEL: Record<string, string> = {
  blood_pressure: 'Blood pressure',
  blood_sugar: 'Blood sugar',
  weight: 'Weight',
  temperature: 'Temperature',
  pulse: 'Pulse',
};

export default function ClinicianVitalsTrends() {
  const { patients, patientIds } = useClinicianScope();
  const vitals = useStore((s) => s.vitals);

  const scoped = vitals
    .filter((v) => patientIds.includes(v.patientId))
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Vitals and Trends</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Every reading recorded for your assigned patients — measured and patient-reported, with source and device.
        </p>
      </section>

      {scoped.length === 0 ? (
        <Card><EmptyState title="No readings yet" hint="Vitals recorded during visits or reported by patients appear here." /></Card>
      ) : (
        patients.map((p) => {
          const rows = scoped.filter((v) => v.patientId === p.id);
          if (rows.length === 0) return null;
          return (
            <div key={p.id} className="mb-5">
              <h2 className="mc-section-title">{p.name}</h2>
              <Card className="!p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="px-4 py-2.5 font-semibold">Reading</th>
                      <th className="px-4 py-2.5 font-semibold">Value</th>
                      <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Source</th>
                      <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Device</th>
                      <th className="px-4 py-2.5 font-semibold">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((v) => (
                      <tr key={v.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-slate-700">
                          {KIND_LABEL[v.kind] ?? v.kind}
                          {v.repeatOf && <span className="text-xs text-slate-400 font-normal"> (repeat)</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={v.isAbnormal ? 'font-bold text-red-600' : 'text-slate-800'}>{v.value} {v.unit}</span>{' '}
                          <Badge tone={v.isAbnormal ? 'red' : 'green'}>{v.isAbnormal ? 'abnormal' : 'normal'}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{v.source === 'measured' ? `Measured by ${v.recordedBy.toUpperCase()}` : 'Patient reported'}</td>
                        <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">{v.deviceType}</td>
                        <td className="px-4 py-2.5 text-slate-500">{fmtDateTime(v.recordedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          );
        })
      )}

      {patients.length > 0 && (
        <p className="text-xs text-slate-400">
          Timestamps are system-recorded at capture time and cannot be backdated. Patient: {patients.map((p) => p.name).join(', ')}.
        </p>
      )}
      {patients.length === 0 && scoped.length === 0 && (
        <p className="text-xs text-slate-400 mt-3">No patients are currently routed to you — readings will appear once a case is assigned.</p>
      )}
    </div>
  );
}
