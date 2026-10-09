import { Link } from 'react-router-dom';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Btn, Card, EmptyState, KV, StatCard } from '@/components/kit';
import {
  ILORIN_CHW_PROFILES,
  TRUST_BADGES,
} from '@/lib/pilotData';
import {
  planDisplayName,
  useSponsorAlerts,
  useSponsorOnboarding,
  useSponsorSelectedPatient,
  useSponsorVitals,
  useSponsorVisits,
} from '@/lib/sponsorQueries';
import { formatZoneLabel, formatZoneShort } from '@/lib/zoneLabels';
import { useAuthStore } from '@/stores/authStore';

export function SponsorDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const onboardingQuery = useSponsorOnboarding();
  const {
    patients,
    patientsQuery,
    selectedPatient,
    selectedPatientId,
    setSelectedPatientId,
  } = useSponsorSelectedPatient();
  const vitalsQuery = useSponsorVitals(selectedPatientId, 14);
  const visitsQuery = useSponsorVisits(selectedPatientId);
  const alertsQuery = useSponsorAlerts();

  const activeSub = onboardingQuery.data?.activeSubscription;
  const zone =
    onboardingQuery.data?.pricingZone ??
    selectedPatient?.pricingZone ??
    'ZONE_B';
  const city =
    user?.city ??
    onboardingQuery.data?.sponsorCity ??
    selectedPatient?.city ??
    '—';
  const firstName = (user?.full_name ?? 'Sponsor').split(' ')[0];

  const vitals = vitalsQuery.data ?? [];
  const visits = visitsQuery.data ?? [];
  const chartData = vitals.map((v) => ({
    date: new Date(v.recorded_at).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
    }),
    systolic: v.systolic_bp,
    diastolic: v.diastolic_bp,
  }));

  const showError =
    patientsQuery.isError ||
    onboardingQuery.isError ||
    vitalsQuery.isError ||
    visitsQuery.isError ||
    alertsQuery.isError;

  const renewalLabel = activeSub?.renewalDate
    ? new Date(activeSub.renewalDate).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Welcome, {firstName}</h1>
        <p className="mt-1 mb-5 text-sm text-blue-100">
          You coordinate care for {patients.length} patient
          {patients.length === 1 ? '' : 's'} in {city} ({formatZoneShort(zone)}).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="People supported"
            value={patients.length}
            hint="Active profiles"
            tone="blue"
          />
          <StatCard
            label="Open alerts"
            value={alertsQuery.alerts.length}
            hint={alertsQuery.alerts.length ? 'Needs attention' : 'All clear'}
            tone={alertsQuery.alerts.length ? 'red' : 'green'}
          />
          <StatCard
            label="Recent visits"
            value={visits.length}
            hint="Selected patient"
            tone="indigo"
          />
          <StatCard
            label="Vitals readings"
            value={vitals.length}
            hint="Last 14 days"
            tone="green"
          />
        </div>
      </section>

      {showError && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Some live data could not be loaded. Check that the API is running and you
          are signed in.
        </p>
      )}

      {activeSub?.isActive && (
        <Card className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Active Plan</h2>
            <Badge tone="green">Active</Badge>
          </div>
          <KV label="Package">{planDisplayName(activeSub.planName)}</KV>
          <KV label="City / zone">
            {city} · {formatZoneLabel(zone)}
          </KV>
          <KV label="Renews">{renewalLabel}</KV>
          <KV label="Visits">
            {activeSub.usedVisits}/{activeSub.allocatedVisits} used
          </KV>
        </Card>
      )}

      <h2 className="mc-section-title">People I support</h2>
      {patientsQuery.isLoading ? (
        <p className="mb-6 text-sm text-slate-500">Loading patients…</p>
      ) : patients.length === 0 ? (
        <Card className="mb-6">
          <EmptyState
            title="No patients yet"
            hint="Add your first patient to see vitals and visits."
            action={
              <Link to="/sponsor/onboarding/add-patient">
                <Btn size="sm">Add patient</Btn>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {patients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            return (
              <Card key={p.id} className={isSelected ? 'ring-2 ring-[var(--role-accent,var(--blue))]' : ''}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{p.fullName}</h3>
                    <p className="text-xs text-slate-500">
                      {p.city ?? city} · {formatZoneShort(p.pricingZone ?? zone)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      p.consentStatus === true || String(p.consentStatus) === 'true'
                        ? 'green'
                        : 'amber'
                    }
                  >
                    {p.consentStatus === true || String(p.consentStatus) === 'true'
                      ? 'Consented'
                      : 'Consent pending'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn
                    size="sm"
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => setSelectedPatientId(p.id)}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </Btn>
                  <Link to={`/sponsor/visits?patientId=${p.id}`}>
                    <Btn size="sm" variant="secondary">
                      Visits
                    </Btn>
                  </Link>
                  <Link to={`/sponsor/alerts?patientId=${p.id}`}>
                    <Btn size="sm" variant="secondary">
                      Alerts
                    </Btn>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedPatient && (
        <>
          <h2 className="mc-section-title">
            Vitals trend — {selectedPatient.fullName}
          </h2>
          <Card className="mb-6 h-64">
            {vitalsQuery.isLoading ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-500">
                Loading vitals…
              </p>
            ) : chartData.length === 0 ? (
              <EmptyState title="No vitals recorded yet" hint="Readings appear after CHW visits." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="systolic" stroke="#0b4c94" strokeWidth={2} />
                  <Line type="monotone" dataKey="diastolic" stroke="#94a3b8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      <h2 className="mc-section-title">Suggested CHWs</h2>
      <p className="mb-3 text-sm text-slate-500">
        Local profiles for coordination (assignment API coming soon).
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {ILORIN_CHW_PROFILES.map((chw) => (
          <Card key={chw.id}>
            <p className="font-bold text-slate-900">{chw.name}</p>
            <p className="text-sm text-slate-500">
              {chw.area} · {chw.yearsExperience} yrs
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {chw.badges.map((badgeId) => {
                const badge = TRUST_BADGES.find((b) => b.id === badgeId);
                return badge ? (
                  <Badge key={badgeId} tone="green">
                    {badge.label}
                  </Badge>
                ) : null;
              })}
            </div>
            <Link to="/sponsor/team" className="mt-4 inline-block">
              <Btn size="sm" variant="secondary">
                View care team
              </Btn>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
