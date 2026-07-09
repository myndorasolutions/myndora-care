import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import {
  ILORIN_CHW_PROFILES,
  PRICING_TIERS,
  TRUST_BADGES,
  type SubscriptionPlanId,
} from '@/lib/pilotData';
import {
  PLAYTEST_PATIENT_ID,
  reviewQueueToAlerts,
  vitalsApi,
} from '@/lib/vitalsApi';

export function SponsorDashboardPage() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('family_care');
  const [selectedChw, setSelectedChw] = useState<string | null>('chw-amina');

  const {
    data: vitals = [],
    isLoading: vitalsLoading,
    isError: vitalsError,
  } = useQuery({
    queryKey: ['sponsor', 'vitals', PLAYTEST_PATIENT_ID],
    queryFn: () => vitalsApi.getTrend(PLAYTEST_PATIENT_ID, 14),
  });

  const {
    data: reviewQueue = [],
    isLoading: alertsLoading,
    isError: alertsError,
  } = useQuery({
    queryKey: ['sponsor', 'review-queue'],
    queryFn: () => vitalsApi.getReviewQueue(),
  });

  const {
    data: visits = [],
    isLoading: visitsLoading,
    isError: visitsError,
  } = useQuery({
    queryKey: ['sponsor', 'visits', PLAYTEST_PATIENT_ID],
    queryFn: () => vitalsApi.getVisitHistory(PLAYTEST_PATIENT_ID),
  });

  const alerts = reviewQueueToAlerts(reviewQueue, 'Grace Okafor');

  const chartData = vitals.map((v) => ({
    date: new Date(v.recorded_at).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
    }),
    systolic: v.systolic_bp,
    diastolic: v.diastolic_bp,
  }));

  const severityLabel = (status: string) => {
    if (status === 'green') return 'Normal';
    if (status === 'yellow') return 'Caution';
    return 'Urgent';
  };

  return (
    <>
      <PageHeader
        title="Family sponsor dashboard"
        subtitle="Grace Okafor — Ilorin home monitoring pilot"
      />

      {(vitalsError || alertsError || visitsError) && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Some live data could not be loaded. Check that the API is running and you are signed in.
        </p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Pricing packages</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedPlan(tier.id)}
              className={`card text-left transition ${
                selectedPlan === tier.id
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-primary/40'
              }`}
            >
              <p className="font-semibold">{tier.name}</p>
              <p className="mt-1 text-sm text-slate-500">{tier.description}</p>
              <p className="mt-3 text-lg font-bold text-primary">
                ₦{tier.priceMinNaira.toLocaleString()}–₦
                {tier.priceMaxNaira.toLocaleString()}/mo
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Assign a CHW — Ilorin</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ILORIN_CHW_PROFILES.map((chw) => (
            <button
              key={chw.id}
              type="button"
              onClick={() => setSelectedChw(chw.id)}
              className={`card text-left transition ${
                selectedChw === chw.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className="font-semibold">{chw.name}</p>
              <p className="text-sm text-slate-500">
                {chw.area} · {chw.yearsExperience} yrs
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {chw.badges.map((badgeId) => {
                  const badge = TRUST_BADGES.find((b) => b.id === badgeId);
                  return badge ? (
                    <span
                      key={badgeId}
                      className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                    >
                      {badge.label}
                    </span>
                  ) : null;
                })}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Vitals trend</h2>
        <div className="card h-64">
          {vitalsLoading ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              Loading vitals…
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="systolic" stroke="#0D6E6E" strokeWidth={2} />
                <Line type="monotone" dataKey="diastolic" stroke="#94a3b8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Visit history</h2>
          {visitsLoading ? (
            <p className="text-sm text-slate-500">Loading visits…</p>
          ) : (
            <ul className="space-y-2">
              {visits.map((v) => (
                <li key={v.id} className="card py-3 text-sm">
                  <p className="font-medium">{v.patient_name}</p>
                  <p className="text-slate-500">
                    {v.chw_name} · {new Date(v.visit_date).toLocaleString('en-NG')}
                  </p>
                  <p className="text-xs text-slate-400">{v.verification_method}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Active alerts</h2>
          {alertsLoading ? (
            <p className="text-sm text-slate-500">Loading alerts…</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="card flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{a.patient_name}</p>
                    <p className="text-sm text-slate-600">{a.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Severity: {severityLabel(a.risk_status)}
                    </p>
                  </div>
                  <RiskBadge status={a.risk_status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
