// Admin — Data Quality: review anomaly flags. AI flags; humans decide.
import { Database } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/kit';

const KIND_LABELS: Record<string, string> = {
  impossible_travel: 'Impossible travel',
  overlapping_visits: 'Overlapping visits',
  identical_readings: 'Identical repeated readings',
  copied_notes: 'Copied notes',
  abnormal_without_escalation: 'Abnormal result without escalation',
  entry_after_checkout: 'Data entered after checkout',
  implausibly_short_visit: 'Implausibly short visit',
  repeated_corrections: 'Repeated corrections',
  disputed_visit: 'Disputed visit',
};
const TONE: Record<string, BadgeTone> = { open: 'purple', reviewed: 'blue', dismissed: 'gray' };

export default function AdminDataQuality() {
  const flags = useStore((s) => s.dqFlags);
  const chws = useStore((s) => s.chws);
  const reviewDqFlag = useStore((s) => s.reviewDqFlag);
  const { toast } = useToast();

  const open = flags.filter((f) => f.status === 'open');
  const closed = flags.filter((f) => f.status !== 'open');

  return (
    <div>
      <PageHeader title="Data Quality" subtitle="Automated checks flag anomalies at entry and after submission. Authorized staff make the final decision." />
      {open.length === 0 ? (
        <Card className="mb-6"><EmptyState title="No open flags" hint="All anomalies have been reviewed." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          {open.map((f) => (
            <Card key={f.id} className="border-purple-300">
              <div className="flex items-start gap-3 mb-2">
                <Database size={17} className="text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900">{KIND_LABELS[f.kind]}</h3>
                  <p className="text-xs text-slate-500">{fmtDateTime(f.createdAt)}{f.chwId ? ` · ${chws.find((c) => c.id === f.chwId)?.name}` : ''}{f.visitId ? ` · visit ${f.visitId}` : ''}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">{f.description}</p>
              <div className="flex gap-2">
                <Btn size="sm" onClick={() => { reviewDqFlag(f.id, 'reviewed'); toast('Flag marked as reviewed'); }}>Mark reviewed</Btn>
                <Btn size="sm" variant="secondary" onClick={() => { reviewDqFlag(f.id, 'dismissed'); toast('Flag dismissed'); }}>Dismiss</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
      {closed.length > 0 && (
        <>
          <h2 className="mc-section-title">Closed flags</h2>
          <div className="space-y-2">
            {closed.map((f) => (
              <Card key={f.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm"><b>{KIND_LABELS[f.kind]}</b> — {f.description}</p>
                  <Badge tone={TONE[f.status]}>{f.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
