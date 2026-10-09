// Clinician — Lab Results routed for clinical review (simulated lab partners).
import { Link } from 'react-router-dom';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Btn, Card, EmptyState } from '@/components/kit';
import { useClinicianScope } from './scope';

export default function ClinicianLabResults() {
  const { cases, patientIds, nameOf } = useClinicianScope();
  const referrals = useStore((s) => s.referrals);
  const vitals = useStore((s) => s.vitals);

  const labCases = cases.filter((c) => c.title.toLowerCase().includes('lab'));
  const labReferrals = referrals.filter((r) => r.kind === 'lab' && patientIds.includes(r.patientId));
  const flaggedChem = vitals.filter((v) => patientIds.includes(v.patientId) && v.kind === 'blood_sugar');

  const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'gray'> = {
    awaiting_review: 'amber', more_info_requested: 'blue', resolved: 'green',
    requested: 'amber', booked: 'blue', in_progress: 'blue', completed: 'green', routed_to_clinician: 'purple',
  };

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Lab Results</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Results from partner laboratories are routed here for clinical review. Myndora Care is not itself a
          laboratory — results come from independent, verified lab partners (names simulated for this demo).
        </p>
      </section>

      <h2 className="mc-section-title">Results awaiting clinical review</h2>
      {labCases.length === 0 ? (
        <Card><EmptyState title="No lab results waiting" hint="Flagged lab results routed to you appear here." /></Card>
      ) : (
        <div className="space-y-3 mb-6">
          {labCases.map((c) => (
            <Card key={c.id} className="border-indigo-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-500">{nameOf(c.patientId)} · received {fmtDateTime(c.createdAt)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.measuredReadings.map((r, i) => (
                      <Badge key={i} tone={r.abnormal ? 'red' : 'green'}>{r.kind}: {r.value} {r.unit}</Badge>
                    ))}
                    <Badge tone={STATUS_TONE[c.status]}>{c.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  {c.recommendation && <p className="text-sm text-slate-600 mt-2">Recommendation: {c.recommendation}</p>}
                </div>
                {c.status !== 'resolved' && (
                  <Link to={`/clinician/cases/${c.id}`}><Btn size="sm">Review result</Btn></Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mc-section-title">Lab referrals in progress</h2>
      {labReferrals.length === 0 ? (
        <Card className="mb-6"><EmptyState title="No lab referrals" hint="Booked lab collections for your patients appear here." /></Card>
      ) : (
        <div className="space-y-3 mb-6">
          {labReferrals.map((r) => (
            <Card key={r.id} className="!p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{r.description}</p>
                  <p className="text-xs text-slate-500">{nameOf(r.patientId)} · {r.partner} · {fmtDateTime(r.createdAt)}</p>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{r.status.replace(/_/g, ' ')}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mc-section-title">Related blood-glucose readings</h2>
      {flaggedChem.length === 0 ? (
        <Card><EmptyState title="No glucose readings" hint="Blood-sugar readings for your patients appear here for context." /></Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2.5 font-semibold">Patient</th>
                <th className="px-4 py-2.5 font-semibold">Value</th>
                <th className="px-4 py-2.5 font-semibold">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {flaggedChem.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{nameOf(v.patientId)}</td>
                  <td className="px-4 py-2.5">
                    <span className={v.isAbnormal ? 'font-bold text-red-600' : 'text-slate-800'}>{v.value} {v.unit}</span>{' '}
                    <Badge tone={v.isAbnormal ? 'red' : 'green'}>{v.isAbnormal ? 'abnormal' : 'normal'}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{fmtDateTime(v.recordedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
