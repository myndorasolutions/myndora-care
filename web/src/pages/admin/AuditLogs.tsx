import { useState } from 'react';
import { Badge, Card, EmptyState, Field, Input, PageHeader } from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useAuditLogs } from '@/lib/adminQueries';

function previewJson(value: unknown): string {
  if (value == null) return '—';
  try {
    const s = JSON.stringify(value);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return String(value);
  }
}

export function AdminAuditLogsPage() {
  const logsQuery = useAuditLogs(150);
  const [q, setQ] = useState('');
  const rows = logsQuery.data ?? [];

  const filtered = rows.filter((e) => {
    if (!q) return true;
    const hay = `${e.actorId} ${e.action} ${e.entityName} ${e.entityId ?? ''} ${previewJson(e.beforeState)} ${previewJson(e.afterState)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const errorMsg =
    logsQuery.error instanceof ApiError
      ? logsQuery.error.message
      : logsQuery.isError
        ? 'Could not load audit logs.'
        : null;

  return (
    <div>
      <PageHeader
        title="Audit logs"
        subtitle="Immutable record of sensitive actions from the live audit_logs table."
        actions={
          <Field label="Search logs">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="actor_id, action, entity…"
              aria-label="Search audit logs"
            />
          </Field>
        }
      />

      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}

      {logsQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading audit logs…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={q ? `No events match “${q}”` : 'No audit events yet'}
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="mc-table w-full min-w-[880px]">
            <thead>
              <tr>
                <th>Time</th>
                <th>actor_id</th>
                <th>action</th>
                <th>Entity</th>
                <th>before_state</th>
                <th>after_state</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-xs">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <code className="text-xs">{e.actorId.slice(0, 8)}…</code>
                    {e.actorEmail && (
                      <p className="text-[10px] text-slate-400">{e.actorEmail}</p>
                    )}
                  </td>
                  <td>
                    <Badge tone="purple">
                      <code className="text-xs">{e.action}</code>
                    </Badge>
                  </td>
                  <td className="text-xs text-slate-500">
                    {e.entityName}
                    {e.entityId ? ` / ${e.entityId.slice(0, 8)}…` : ''}
                  </td>
                  <td>
                    <code className="block max-w-[200px] truncate text-[10px] text-slate-600">
                      {previewJson(e.beforeState)}
                    </code>
                  </td>
                  <td>
                    <code className="block max-w-[200px] truncate text-[10px] text-slate-600">
                      {previewJson(e.afterState)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
