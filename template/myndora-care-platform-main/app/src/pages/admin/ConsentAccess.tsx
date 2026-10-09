// Admin — Consent & Access: review consent records and unauthorized-access attempts.
import { ShieldAlert } from 'lucide-react';
import { accessLabel } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, PageHeader, type BadgeTone } from '@/components/kit';

const TONE: Record<string, BadgeTone> = { pending: 'amber', approved: 'green', reduced: 'blue', rejected: 'red', withdrawn: 'gray' };

export default function AdminConsentAccess() {
  const consents = useStore((s) => s.consents);
  const patients = useStore((s) => s.patients);
  const relationships = useStore((s) => s.relationships);
  const unusual = useStore(useShallow((s) => s.auditEvents.filter((e) => e.flaggedUnusual)));

  return (
    <div>
      <PageHeader title="Consent & Access" subtitle="Every grant, reduction, rejection and withdrawal of health-information access — plus unusual access attempts." />

      {unusual.length > 0 && (
        <Card className="mb-6 border-red-300">
          <h3 className="mc-section-title"><ShieldAlert size={17} className="text-red-600" /> Unusual access attempts</h3>
          {unusual.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">{e.action.replaceAll('.', ' → ')}</p>
                <p className="text-xs text-slate-500">{e.actor} · target: {e.target} · {fmtDateTime(e.at)}</p>
              </div>
              <Badge tone="red">Flagged</Badge>
            </div>
          ))}
          <p className="text-xs text-slate-500 mt-2">Attempts are blocked automatically and preserved here for review.</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title">Consent records</h3>
          {consents.map((c) => (
            <div key={c.id} className="py-2.5 border-b border-slate-100 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{c.requesterName} → {patients.find((p) => p.id === c.patientId)?.name}</p>
                <Badge tone={TONE[c.status]}>{c.status}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Requested {accessLabel(c.requestedLevel)}
                {c.grantedLevel ? ` · granted ${accessLabel(c.grantedLevel)}` : ''}
                {' '}· {fmtDateTime(c.createdAt)}{c.decidedAt ? ` → ${fmtDateTime(c.decidedAt)}` : ''}
              </p>
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="mc-section-title">Active access grants</h3>
          {relationships.map((r) => (
            <div key={r.id} className="py-2.5 border-b border-slate-100 last:border-0 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Sponsor → {patients.find((p) => p.id === r.patientId)?.name}
                <span className="block text-xs font-normal text-slate-500">pays: {r.paysFor ? 'yes' : 'no'}</span>
              </p>
              <Badge tone={r.accessLevel === 'full_monitoring' ? 'green' : 'blue'}>{accessLabel(r.accessLevel)}</Badge>
            </div>
          ))}
          <p className="text-xs text-slate-500 mt-3">Payment status and health access are independent by design.</p>
        </Card>
      </div>
    </div>
  );
}
