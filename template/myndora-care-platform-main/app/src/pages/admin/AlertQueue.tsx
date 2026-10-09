// Admin — Alert Queue: triage escalated and open alerts.
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/kit';

const SEV: Record<string, BadgeTone> = { urgent: 'red', important: 'amber', info: 'blue' };
const ST: Record<string, BadgeTone> = { open: 'amber', acknowledged: 'blue', escalated: 'purple', resolved: 'green' };

export default function AdminAlertQueue() {
  const alerts = useStore((s) => s.alerts);
  const patients = useStore((s) => s.patients);
  const acknowledgeAlert = useStore((s) => s.acknowledgeAlert);
  const resolveAlert = useStore((s) => s.resolveAlert);
  const { toast } = useToast();

  const open = alerts.filter((a) => a.status !== 'resolved');
  const resolved = alerts.filter((a) => a.status === 'resolved');

  return (
    <div>
      <PageHeader title="Alert Queue" subtitle="Urgent and important alerts across patients, ordered by severity." />
      {open.length === 0 ? (
        <Card><EmptyState title="Queue clear" hint="All alerts have been resolved." /></Card>
      ) : (
        <div className="space-y-3 mb-8">
          {[...open].sort((a) => (a.severity === 'urgent' ? -1 : 1)).map((a) => (
            <Card key={a.id} className={a.severity === 'urgent' ? 'border-red-300' : ''}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{a.title}</h3>
                    <Badge tone={SEV[a.severity]}>{a.severity}</Badge>
                    <Badge tone={ST[a.status]}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{patients.find((p) => p.id === a.patientId)?.name} · {fmtDateTime(a.createdAt)}</p>
                  <p className="text-sm text-slate-600 mt-1.5">{a.detail}</p>
                </div>
                <div className="flex gap-2">
                  {a.status === 'open' && (
                    <Btn size="sm" variant="secondary" onClick={() => { acknowledgeAlert(a.id); toast('Alert acknowledged'); }}>Acknowledge</Btn>
                  )}
                  <Btn size="sm" onClick={() => { resolveAlert(a.id); toast('Alert resolved'); }}>Resolve</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {resolved.length > 0 && (
        <>
          <h2 className="mc-section-title">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((a) => (
              <Card key={a.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700">{a.title} — {patients.find((p) => p.id === a.patientId)?.name}</p>
                  <Badge tone="green">resolved</Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
