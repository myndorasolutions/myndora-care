// Admin — Sponsors / Payers.
import { accessLabel } from '@/lib/permissions';
import { useStore } from '@/store/useStore';
import { Badge, Card, KV, PageHeader } from '@/components/kit';

export default function AdminSponsors() {
  const relationships = useStore((s) => s.relationships);
  const accounts = useStore((s) => s.accounts);
  const patients = useStore((s) => s.patients);
  const payments = useStore((s) => s.payments);

  return (
    <div>
      <PageHeader title="Sponsors / Payers" subtitle="Payment relationships and patient-approved access levels. Payment never implies health access." />
      <div className="space-y-4">
        {relationships.map((r) => {
          const sponsor = accounts.find((a) => a.id === r.sponsorAccountId);
          const patient = patients.find((p) => p.id === r.patientId);
          const relPayments = payments.filter((p) => p.patientId === r.patientId);
          return (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900">{sponsor?.name}</h3>
                  <p className="text-xs text-slate-500">{sponsor?.phone} · {sponsor?.city}</p>
                </div>
                <Badge tone="green">Active payer</Badge>
              </div>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <KV label="Pays for">{patient?.name}</KV>
                <KV label="Approved health access"><Badge tone={r.accessLevel === 'full_monitoring' ? 'green' : 'gray'}>{accessLabel(r.accessLevel)}</Badge></KV>
                <KV label="Invoices">{relPayments.length} · {relPayments.filter((p) => p.status === 'due').length} due</KV>
                <KV label="Relation">{patient?.relationToSponsor ?? '—'}</KV>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
