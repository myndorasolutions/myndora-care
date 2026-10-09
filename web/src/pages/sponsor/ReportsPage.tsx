import { useState } from 'react';
import { Badge, Btn, Card, EmptyState, KV, PageHeader } from '@/components/kit';
import {
  planDisplayName,
  useSponsorOnboarding,
  useSponsorSelectedPatient,
  useSponsorVisits,
} from '@/lib/sponsorQueries';
import { formatZoneLabel, formatZoneShort } from '@/lib/zoneLabels';
import { useAuthStore } from '@/stores/authStore';

type ReportKey = 'monthly' | 'verification' | 'billing' | null;

export function SponsorReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState<ReportKey>(null);
  const onboardingQuery = useSponsorOnboarding();
  const { selectedPatient, selectedPatientId } = useSponsorSelectedPatient();
  const visitsQuery = useSponsorVisits(selectedPatientId);

  const visits = visitsQuery.data ?? [];
  const sub = onboardingQuery.data?.activeSubscription;
  const zone =
    onboardingQuery.data?.pricingZone ??
    selectedPatient?.pricingZone ??
    'ZONE_B';
  const city =
    user?.city ??
    onboardingQuery.data?.sponsorCity ??
    selectedPatient?.city ??
    '—';

  const otpCount = visits.filter((v) => v.verification_method === 'OTP').length;
  const sigCount = visits.filter((v) => v.verification_method === 'Signature').length;

  const renewalLabel = sub?.renewalDate
    ? new Date(sub.renewalDate).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Care, verification, and billing summaries from live visit and subscription data"
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card>
          <h3 className="font-bold text-slate-900">Monthly care summary</h3>
          <p className="mt-1 text-sm text-slate-500">
            Visit counts for {selectedPatient?.fullName ?? 'your patient'}.
          </p>
          <Btn
            size="sm"
            className="mt-4"
            variant={open === 'monthly' ? 'primary' : 'secondary'}
            onClick={() => setOpen(open === 'monthly' ? null : 'monthly')}
          >
            {open === 'monthly' ? 'Hide' : 'View'}
          </Btn>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-900">Visit verification</h3>
          <p className="mt-1 text-sm text-slate-500">OTP vs signature verification mix.</p>
          <Btn
            size="sm"
            className="mt-4"
            variant={open === 'verification' ? 'primary' : 'secondary'}
            onClick={() => setOpen(open === 'verification' ? null : 'verification')}
          >
            {open === 'verification' ? 'Hide' : 'View'}
          </Btn>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-900">Billing snapshot</h3>
          <p className="mt-1 text-sm text-slate-500">Active plan and renewal for your zone.</p>
          <Btn
            size="sm"
            className="mt-4"
            variant={open === 'billing' ? 'primary' : 'secondary'}
            onClick={() => setOpen(open === 'billing' ? null : 'billing')}
          >
            {open === 'billing' ? 'Hide' : 'View'}
          </Btn>
        </Card>
      </div>

      {open === 'monthly' && (
        <Card className="mb-4">
          <h3 className="mb-2 font-bold">Monthly care summary</h3>
          {visitsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : visits.length === 0 ? (
            <EmptyState title="No visits this period" />
          ) : (
            <>
              <KV label="Patient">{selectedPatient?.fullName ?? '—'}</KV>
              <KV label="Completed visits">{visits.length}</KV>
              <ul className="mt-3 space-y-2 text-sm">
                {visits.slice(0, 8).map((v) => (
                  <li
                    key={v.id}
                    className="flex justify-between gap-2 border-b border-slate-100 py-2"
                  >
                    <span>{new Date(v.visit_date).toLocaleDateString('en-NG')}</span>
                    <span className="text-slate-500">{v.chw_name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {open === 'verification' && (
        <Card className="mb-4">
          <h3 className="mb-2 font-bold">Visit verification</h3>
          <KV label="OTP verified">
            <Badge tone="blue">{otpCount}</Badge>
          </KV>
          <KV label="Signature verified">
            <Badge tone="indigo">{sigCount}</Badge>
          </KV>
        </Card>
      )}

      {open === 'billing' && (
        <Card className="mb-4">
          <h3 className="mb-2 font-bold">Billing snapshot</h3>
          {sub?.isActive ? (
            <>
              <KV label="Plan">{planDisplayName(sub.planName)}</KV>
              <KV label="Status">
                <Badge tone="green">Active</Badge>
              </KV>
              <KV label="Zone">
                {city} · {formatZoneLabel(zone)} ({formatZoneShort(zone)})
              </KV>
              <KV label="Renews">{renewalLabel}</KV>
              <KV label="Visits">
                {sub.usedVisits}/{sub.allocatedVisits}
              </KV>
            </>
          ) : (
            <EmptyState
              title="No active subscription"
              hint="Complete checkout to activate a plan."
            />
          )}
        </Card>
      )}
    </div>
  );
}
