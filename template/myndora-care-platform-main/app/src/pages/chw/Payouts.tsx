// CHW — Payouts: expected payout and travel component per visit; frozen when disputed.
import { fmtDate } from '@/lib/format';
import { formatNaira } from '@/lib/pricing';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, KV, PageHeader, StatCard } from '@/components/kit';


export default function ChwPayouts() {
  const ME = useStore((s) => s.identity.chwId);
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.chwId === ME)));
  const assignments = useStore(useShallow((s) => s.assignments.filter((a) => a.chwId === ME)));
  const patients = useStore((s) => s.patients);

  const completed = visits.filter((v) => v.status === 'verified' || v.status === 'submitted' || v.status === 'disputed');
  const rows = completed.map((v) => {
    const asg = assignments.find((a) => a.id === v.assignmentId);
    const base = asg?.payoutEstimate ?? 4500;
    const travel = asg?.travelComponent ?? 0;
    return { v, base, travel, total: base + travel };
  });
  const frozen = rows.filter((r) => r.v.payoutFrozen);
  const payable = rows.filter((r) => !r.v.payoutFrozen && r.v.status === 'verified');
  const pendingVerification = rows.filter((r) => r.v.status === 'submitted');

  return (
    <div>
      <PageHeader title="Payouts" subtitle="Payouts release after visit verification. Disputed visits are frozen until the review closes." />
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <StatCard label="Available" value={formatNaira(payable.reduce((s, r) => s + r.total, 0))} hint={`${payable.length} verified visit(s)`} tone="green" />
        <StatCard label="In verification" value={formatNaira(pendingVerification.reduce((s, r) => s + r.total, 0))} hint="Awaiting patient confirmation" tone="amber" />
        <StatCard label="Frozen (disputed)" value={formatNaira(frozen.reduce((s, r) => s + r.total, 0))} hint={frozen.length ? 'Under review' : 'None'} tone={frozen.length ? 'red' : 'green'} />
      </div>

      <Card className="overflow-x-auto">
        <table className="mc-table w-full min-w-[600px]">
          <thead>
            <tr><th>Visit</th><th>Patient</th><th>Base payout</th><th>Travel</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map(({ v, base, travel, total }) => (
              <tr key={v.id}>
                <td>{fmtDate(v.scheduledFor)}</td>
                <td>{patients.find((p) => p.id === v.patientId)?.name}</td>
                <td>{formatNaira(base)}</td>
                <td>{travel > 0 ? formatNaira(travel) : '—'}</td>
                <td className="font-bold">{formatNaira(total)}</td>
                <td>
                  {v.payoutFrozen ? <Badge tone="red">Frozen — disputed</Badge>
                    : v.status === 'verified' ? <Badge tone="green">Payable</Badge>
                    : <Badge tone="amber">In verification</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <h3 className="mc-section-title">How payouts are computed</h3>
        <KV label="Customer total">CHW payout + travel/distance + approved add-ons + platform fee</KV>
        <KV label="Your payout">Base service charge from the approved city rate card</KV>
        <KV label="Travel component">Only beyond your base radius, per distance bands</KV>
      </Card>
    </div>
  );
}
