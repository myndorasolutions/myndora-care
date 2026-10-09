// Sponsor — Payments: invoices, payment method, package billing (payment ≠ health access).
import { CreditCard } from 'lucide-react';
import { formatNaira } from '@/lib/pricing';
import { fmtDate } from '@/lib/format';
import { packageDef } from '@/lib/permissions';
import { useStore } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, KV, PageHeader } from '@/components/kit';

export default function SponsorPayments() {
  const payments = useStore((s) => s.payments);
  const patients = useStore((s) => s.patients);
  const subscriptions = useStore((s) => s.subscriptions);
  const payNow = useStore((s) => s.payNow);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const confirmPay = (id: string, label: string, amount: number) => {
    openModal({
      title: 'Confirm payment',
      body: (
        <div className="text-sm text-slate-600 space-y-2">
          <p>Pay <b>{formatNaira(amount)}</b> for <b>{label}</b> using <b>Visa •• 4412</b>?</p>
          <p className="text-xs text-slate-500">Simulated payment — no real charge is made in this demo.</p>
        </div>
      ),
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn onClick={() => { payNow(id); closeModal(); toast('Payment recorded'); }}>Pay {formatNaira(amount)}</Btn>
        </>
      ),
    });
  };

  return (
    <div>
      <PageHeader title="Payments" subtitle="Manage billing for the people you support. Paying for care never grants access to health records." />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card>
          <h3 className="mc-section-title">Payment method</h3>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5">
            <CreditCard size={22} className="text-slate-500" />
            <div>
              <p className="font-bold text-sm">Visa ending 4412</p>
              <p className="text-xs text-slate-500">Expires 09/27 · Default</p>
            </div>
          </div>
          <Btn variant="secondary" size="sm" className="mt-3" onClick={() => toast('Card update flow is simulated in this demo')}>Update card</Btn>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="mc-section-title">Active subscriptions you pay for</h3>
          {subscriptions.filter((s) => s.patientId !== 'pat-ibrahim').map((sub) => {
            const patient = patients.find((p) => p.id === sub.patientId)!;
            return (
              <KV key={sub.id} label={`${patient.name} — ${packageDef(sub.tier).name}`}>
                <span className="flex items-center gap-2">
                  <Badge tone={sub.status === 'active' ? 'green' : 'amber'}>{sub.status.replace('_', ' ')}</Badge>
                  <span className="text-xs text-slate-500">renews {fmtDate(sub.nextBillingDate)}</span>
                </span>
              </KV>
            );
          })}
        </Card>
      </div>

      <h2 className="mc-section-title">Invoices</h2>
      <Card className="overflow-x-auto">
        <table className="mc-table w-full min-w-[620px]">
          <thead>
            <tr><th>Invoice</th><th>Person</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold">{p.label}</td>
                <td>{patients.find((x) => x.id === p.patientId)?.name ?? '—'}</td>
                <td>{fmtDate(p.date)}</td>
                <td>{p.method}</td>
                <td className="font-bold">{formatNaira(p.amount)}</td>
                <td><Badge tone={p.status === 'paid' ? 'green' : p.status === 'due' ? 'amber' : 'red'}>{p.status}</Badge></td>
                <td className="text-right">
                  {p.status === 'due' && (
                    <Btn size="sm" onClick={() => confirmPay(p.id, p.label, p.amount)}>Pay now</Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
