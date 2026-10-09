// CHW — Offline Queue: records captured offline, synced when connectivity returns.
import { WifiOff } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader } from '@/components/kit';

export default function ChwOfflineQueue() {
  const queue = useStore((s) => s.offlineQueue);
  const syncOfflineQueue = useStore((s) => s.syncOfflineQueue);
  const { toast } = useToast();
  const pending = queue.filter((q) => !q.synced);

  return (
    <div>
      <PageHeader
        title="Offline Queue"
        subtitle="Documentation captured in poor-network areas is queued locally and uploaded when connectivity returns. Queued items keep their original capture timestamp."
        actions={pending.length > 0 ? <Btn onClick={() => { syncOfflineQueue(); toast('Queue synced to server'); }}>Sync now ({pending.length})</Btn> : undefined}
      />
      {queue.length === 0 ? (
        <Card><EmptyState title="Queue is empty" /></Card>
      ) : (
        <div className="space-y-3">
          {queue.map((q) => (
            <Card key={q.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <WifiOff size={17} className={q.synced ? 'text-slate-300' : 'text-amber-500'} />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{q.description}</p>
                    <p className="text-xs text-slate-500">{q.kind.replace('_', ' ')} · queued {fmtDateTime(q.queuedAt)}</p>
                  </div>
                </div>
                <Badge tone={q.synced ? 'green' : 'amber'}>{q.synced ? 'Synced' : 'Pending sync'}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
