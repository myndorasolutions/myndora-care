import { Badge, Card, EmptyState, PageHeader } from '@/components/kit';
import { useSponsorAlerts, useSponsorSelectedPatient } from '@/lib/sponsorQueries';
import type { RiskStatus } from '@/lib/types';

function toneForRisk(status: RiskStatus): 'green' | 'amber' | 'red' {
  if (status === 'green') return 'green';
  if (status === 'yellow') return 'amber';
  return 'red';
}

function severityLabel(status: RiskStatus): string {
  if (status === 'green') return 'Normal';
  if (status === 'yellow') return 'Caution';
  return 'Urgent';
}

export function SponsorAlertsPage() {
  const { selectedPatient, patients, setSelectedPatientId, selectedPatientId } =
    useSponsorSelectedPatient();
  const { alerts, isLoading, isError } = useSponsorAlerts();

  const filtered = selectedPatient
    ? alerts.filter((a) => a.patient_name === selectedPatient.fullName)
    : alerts;

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Authorized clinical alerts for your sponsored patients"
        actions={
          patients.length > 1 ? (
            <select
              className="mc-input max-w-xs"
              value={selectedPatientId ?? ''}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading alerts…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No active alerts"
            hint="Escalations for your patients will show here when raised."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => (
            <li key={a.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{a.patient_name}</p>
                    <p className="mt-1 text-sm text-slate-600">{a.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(a.created_at).toLocaleString('en-NG')} ·{' '}
                      {severityLabel(a.risk_status)}
                    </p>
                  </div>
                  <Badge tone={toneForRisk(a.risk_status)}>
                    {severityLabel(a.risk_status)}
                  </Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <p className="mt-3 text-sm text-amber-800">Could not load alerts.</p>
      )}
    </div>
  );
}
