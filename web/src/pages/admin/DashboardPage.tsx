import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClinicianReviewerPanel } from '@/components/admin/ClinicianReviewerPanel';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { StatCard } from '@/components/ui/StatCard';
import { getApiBaseUrl } from '@/lib/api';
import { mockApi } from '@/lib/mockApi';
import type { AdminAlert } from '@/lib/types';

export function AdminDashboardPage() {
  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['admin', 'kpis'],
    queryFn: () => mockApi.getAdminKpis(),
  });
  const { data: sponsorProfiles = [] } = useQuery({
    queryKey: ['admin', 'sponsor-profiles'],
    queryFn: () => mockApi.getSponsorProfiles(),
  });
  const { data: remoteCheckStats = [] } = useQuery({
    queryKey: ['admin', 'remote-check-stats'],
    queryFn: () => mockApi.getRemoteCheckStats(),
  });
  const { data: remoteCheckRows = [] } = useQuery({
    queryKey: ['admin', 'remote-check-rows'],
    queryFn: () => mockApi.getRemoteCheckRows(),
  });
  const { data: visitProofRows = [] } = useQuery({
    queryKey: ['admin', 'visit-proofs'],
    queryFn: () => mockApi.getVisitProofRows(),
  });
  const { data: syncQueue = [] } = useQuery({
    queryKey: ['admin', 'sync-queue'],
    queryFn: () => mockApi.getSyncQueueRows(),
  });
  const { data: initialAlerts = [] } = useQuery({
    queryKey: ['admin', 'alerts'],
    queryFn: () => mockApi.getAdminAlerts(),
  });
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);

  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  useEffect(() => {
    const base = getApiBaseUrl();
    const es = new EventSource(`${base}/admin/alerts/stream`);
    es.onmessage = (ev) => {
      try {
        const alert = JSON.parse(ev.data) as AdminAlert;
        setAlerts((prev) => [alert, ...prev].slice(0, 20));
      } catch {
        /* mock stream may be unavailable */
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  return (
    <>
      <PageHeader
        title="Care coordinator overview"
        subtitle="Pilot data — API wiring next sprint for KPIs below; clinician review is live"
      />
      <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
        Sponsor profiles, remote checks, visit proofs, and sync queue use pilot mock data. The
        Clinician Reviewer panel below reads from the live vitals API.
      </p>
      {isLoading ? (
        <p className="text-slate-500">Loading KPIs…</p>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <StatCard key={k.label} label={k.label} value={k.value} hint={k.change} />
          ))}
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Sponsor profiles</h2>
        <DataTable
          keyField="id"
          data={sponsorProfiles}
          columns={[
            { key: 'sponsor_name', header: 'Sponsor' },
            { key: 'patient_name', header: 'Patient' },
            { key: 'country_location', header: 'Country' },
            { key: 'plan', header: 'Plan' },
            {
              key: 'payment_status',
              header: 'Payment',
              render: (row) => (
                <span className="capitalize rounded-full bg-slate-100 px-2 py-1 text-xs">
                  {row.payment_status}
                </span>
              ),
            },
          ]}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Remote check KPIs</h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {remoteCheckStats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
        <DataTable
          keyField="id"
          data={remoteCheckRows}
          columns={[
            { key: 'patient_name', header: 'Patient' },
            {
              key: 'medication_adherence',
              header: 'Meds',
              render: (row) => <span className="capitalize">{row.medication_adherence}</span>,
            },
            {
              key: 'symptom_check',
              header: 'Symptoms',
              render: (row) => <span className="capitalize">{row.symptom_check}</span>,
            },
            {
              key: 'short_call_warning',
              header: 'Short-call',
              render: (row) =>
                row.short_call_warning ? (
                  <span className="text-xs font-medium text-amber-700">Warning</span>
                ) : (
                  '—'
                ),
            },
            {
              key: 'status',
              header: 'Risk',
              render: (row) => <RiskBadge status={row.status} />,
            },
          ]}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Visit proof grid</h2>
        <DataTable
          keyField="id"
          data={visitProofRows}
          columns={[
            { key: 'patient_name', header: 'Patient' },
            { key: 'chw_name', header: 'CHW' },
            {
              key: 'bp',
              header: 'BP',
              render: (row) => `${row.systolic_bp}/${row.diastolic_bp}`,
            },
            { key: 'signature_state', header: 'Signature' },
            { key: 'otp_state', header: 'OTP' },
            { key: 'proof_status', header: 'Status' },
          ]}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Sync queue — unconfirmed / disputed</h2>
        <DataTable
          keyField="id"
          data={syncQueue}
          columns={[
            { key: 'patient_name', header: 'Patient' },
            {
              key: 'recorded_at',
              header: 'Recorded',
              render: (row) => new Date(row.recorded_at).toLocaleString('en-NG'),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <span className="capitalize rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                  {row.status}
                </span>
              ),
            },
            { key: 'detail', header: 'Detail' },
          ]}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Live alert feed</h2>
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="card flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{a.patient_name}</p>
                <p className="text-sm text-slate-600">{a.message}</p>
              </div>
              <RiskBadge status={a.risk_status} />
            </li>
          ))}
        </ul>
      </section>

      <ClinicianReviewerPanel />
    </>
  );
}
