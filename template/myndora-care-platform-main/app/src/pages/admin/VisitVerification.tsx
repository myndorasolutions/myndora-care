// Admin Visit Verification: the verification evidence behind every visit —
// geofence, OTP, patient confirmation, duration plausibility — plus linked DQ flags.
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader } from '@/components/kit';

function EvidenceBadge({ ok, label }: { ok: boolean; label: string }) {
  return <Badge tone={ok ? 'green' : 'red'}>{label}</Badge>;
}

export default function AdminVisitVerification() {
  const visits = useStore(useShallow((s) => [...s.visits].sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))));
  const patients = useStore((s) => s.patients);
  const chws = useStore((s) => s.chws);
  const dqFlags = useStore(useShallow((s) => s.dqFlags.filter((f) => f.status === 'open')));
  const reviewDqFlag = useStore((s) => s.reviewDqFlag);
  const { toast } = useToast();

  const name = (id: string) => patients.find((p) => p.id === id)?.name ?? id;
  const chwName = (id: string) => chws.find((c) => c.id === id)?.name ?? id;
  const flagsFor = (visitId: string) => dqFlags.filter((f) => f.visitId === visitId);

  return (
    <div>
      <PageHeader title="Visit Verification" subtitle="The evidence trail behind every visit. Flags are raised by automated checks — humans review and decide." />

      {dqFlags.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50/40">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-3">Open data-quality flags ({dqFlags.length})</p>
          <div className="space-y-2">
            {dqFlags.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-amber-200 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-slate-900">{f.kind.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500">{f.description}{f.chwId ? ` · ${chwName(f.chwId)}` : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  <Btn size="sm" variant="secondary" onClick={() => { reviewDqFlag(f.id, 'reviewed'); toast('Flag marked reviewed'); }}>Mark reviewed</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => { reviewDqFlag(f.id, 'dismissed'); toast('Flag dismissed'); }}>Dismiss</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {visits.length === 0 ? (
        <Card><EmptyState title="No visits yet" hint="Visit verification evidence appears once visits are recorded." /></Card>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => {
            const flags = flagsFor(v.id);
            return (
              <Card key={v.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-extrabold text-slate-900">{name(v.patientId)} · {chwName(v.chwId)}</p>
                    <p className="text-xs text-slate-500">{new Date(v.scheduledFor).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {v.status.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {v.disputed && <Badge tone="amber">disputed</Badge>}
                    {v.payoutFrozen && <Badge tone="red">payout frozen</Badge>}
                    {flags.map((f) => <Badge key={f.id} tone="amber">{f.kind.replace(/_/g, ' ')}</Badge>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <EvidenceBadge ok={!!v.evidence.geofenceCheckIn} label={v.evidence.geofenceCheckIn ? 'GPS check-in ✓' : 'No GPS check-in'} />
                  <EvidenceBadge ok={v.evidence.otpVerified} label={v.evidence.otpVerified ? 'OTP verified' : 'OTP not verified'} />
                  <EvidenceBadge ok={v.patientConfirmed} label={v.patientConfirmed ? 'Patient confirmed' : 'No patient confirmation'} />
                  <EvidenceBadge ok={v.evidence.plausibleDuration} label={v.evidence.plausibleDuration ? 'Plausible duration' : 'Duration anomaly'} />
                  {v.verificationMethod && <Badge tone="blue">{v.verificationMethod.replace(/_/g, ' ')}</Badge>}
                </div>
                {(v.evidence.serverCheckInTimestamp || v.evidence.serverCheckOutTimestamp) && (
                  <p className="text-xs text-slate-400 mt-2">
                    Server: in {v.evidence.serverCheckInTimestamp ? new Date(v.evidence.serverCheckInTimestamp).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    {' '}· out {v.evidence.serverCheckOutTimestamp ? new Date(v.evidence.serverCheckOutTimestamp).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
