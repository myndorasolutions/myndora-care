// CHW — Escalations: open and routed escalations.
import { AlertTriangle } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/kit';

const TONE: Record<string, BadgeTone> = { open: 'red', routed_to_clinician: 'purple', resolved: 'green' };

export default function ChwEscalations() {
  const escalations = useStore((s) => s.escalations);
  const patients = useStore((s) => s.patients);

  return (
    <div>
      <PageHeader title="Escalations" subtitle="Urgent concerns you raised. Escalations route to coordination and, where needed, a reviewing clinician." />
      {escalations.length === 0 ? (
        <Card><EmptyState title="No escalations" hint="Trigger an escalation from an active visit when a patient needs urgent review." /></Card>
      ) : (
        <div className="space-y-3">
          {escalations.map((e) => (
            <Card key={e.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-900">{patients.find((p) => p.id === e.patientId)?.name}</h3>
                    <p className="text-xs text-slate-500">Raised by {e.raisedBy} · {fmtDateTime(e.createdAt)}</p>
                    <p className="text-sm text-slate-600 mt-1">{e.reason}</p>
                  </div>
                </div>
                <Badge tone={TONE[e.status]}>{e.status.replaceAll('_', ' ')}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
