// Sponsor — Alerts: permission-gated. Limited text when medical data is not authorized.
import { BellRing } from 'lucide-react';
import { canSee, maskedAlertText } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { useStore, useSelectedPatient } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/kit';

const SEV_TONE: Record<string, BadgeTone> = { urgent: 'red', important: 'amber', info: 'blue' };

export default function SponsorAlerts() {
  const SPONSOR_ID = useStore((s) => s.identity.sponsorAccountId);
  const patient = useSelectedPatient();
  const rel = useStore((s) => s.relationships.find((r) => r.patientId === s.selectedPatientId && r.sponsorAccountId === SPONSOR_ID))!;
  const alerts = useStore(useShallow((s) => s.alerts.filter((a) => a.patientId === s.selectedPatientId)));

  const canSeeNotifications = canSee(rel.accessLevel, 'alert_notification');
  const canSeeDetails = canSee(rel.accessLevel, 'alert_detail');

  return (
    <div>
      <PageHeader title={`Alerts — ${patient.name}`} subtitle="Alert visibility follows the patient-approved access level." />
      {!canSeeNotifications ? (
        <Card>
          <EmptyState title="Alerts are not shared at your access level" hint="The patient can approve 'Important alerts' or 'Full approved monitoring' from their Permissions page." />
        </Card>
      ) : alerts.length === 0 ? (
        <Card><EmptyState title="No alerts" hint="You're all caught up." /></Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 ${a.severity === 'urgent' ? 'text-red-600' : 'text-amber-500'}`}><BellRing size={18} /></span>
                  <div>
                    <h3 className="font-bold text-slate-900">{a.title}</h3>
                    <p className="text-xs text-slate-500">{fmtDateTime(a.createdAt)}</p>
                    <p className="text-sm text-slate-600 mt-1.5">
                      {canSeeDetails ? a.detail : maskedAlertText(patient.name, a.severity)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone={SEV_TONE[a.severity]}>{a.severity}</Badge>
                  <Badge tone={a.status === 'resolved' ? 'green' : a.status === 'escalated' ? 'purple' : 'amber'}>{a.status}</Badge>
                </div>
              </div>
              {!canSeeDetails && (
                <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">
                  Exact medical data is hidden because the patient has not approved full monitoring access.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
