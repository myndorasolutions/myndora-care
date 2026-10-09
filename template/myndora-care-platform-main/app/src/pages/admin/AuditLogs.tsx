// Admin — Audit Logs: every sensitive action, newest first, with search.
import { useState } from 'react';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Badge, Card, Field, Input, PageHeader, type BadgeTone } from '@/components/kit';

const ROLE_TONE: Record<string, BadgeTone> = { sponsor: 'blue', patient: 'green', chw: 'amber', admin: 'purple', clinician: 'indigo' };

export default function AdminAuditLogs() {
  const events = useStore((s) => s.auditEvents);
  const [q, setQ] = useState('');

  const filtered = events.filter((e) =>
    !q || `${e.actor} ${e.action} ${e.target}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable record of sensitive actions: consent decisions, plan changes, visit evidence, approvals and access attempts."
        actions={<Field label="Search logs"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="actor, action or target…" aria-label="Search audit logs" /></Field>}
      />
      <Card className="overflow-x-auto">
        <table className="mc-table w-full min-w-[680px]">
          <thead>
            <tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{fmtDateTime(e.at)}</td>
                <td className="font-semibold">{e.actor}</td>
                <td><Badge tone={ROLE_TONE[e.actorRole] ?? 'gray'}>{e.actorRole}</Badge></td>
                <td><code className="text-xs bg-slate-100 rounded px-1.5 py-0.5">{e.action}</code></td>
                <td className="text-slate-500">{e.target}</td>
                <td>{e.flaggedUnusual && <Badge tone="red">Unusual</Badge>}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-6">No events match “{q}”.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
