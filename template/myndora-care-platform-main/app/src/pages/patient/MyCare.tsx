// Patient — My Care dashboard (green/teal theme).
import { useNavigate } from 'react-router-dom';
import { CalendarClock, MapPin, ShieldCheck } from 'lucide-react';
import { accessLabel, packageDef } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, KV, StatCard } from '@/components/kit';


export default function PatientMyCare() {
  const ME = useStore((s) => s.identity.patientId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const patient = useStore((s) => s.patients.find((p) => p.id === ME))!;
  const sub = useStore((s) => s.subscriptions.find((x) => x.patientId === ME))!;
  const relationships = useStore(useShallow((s) => s.relationships.filter((r) => r.patientId === ME)));
  const supporters = useStore(useShallow((s) => s.supporters.filter((x) => x.patientId === ME)));
  const pendingConsents = useStore(useShallow((s) => s.consents.filter((c) => c.patientId === ME && c.status === 'pending')));
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.patientId === ME)));
  const alerts = useStore(useShallow((s) => s.alerts.filter((a) => a.patientId === ME && (a.status === 'open' || a.status === 'escalated'))));
  const chw = useStore((s) => s.chws.find((c) => c.id === s.selectedChwByPatient[ME]));
  const setLocationConsent = useStore((s) => s.setLocationConsent);

  const nextVisit = visits.filter((v) => v.status === 'scheduled' || v.status === 'in_progress')
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
  const accounts = useStore((s) => s.accounts);

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Hello, {patient.name.split(' ')[0]}</h1>
        <p className="text-sm text-emerald-100 mt-1 mb-5">Your health and care decisions stay under your control.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="My plan" value={<span className="text-lg">{packageDef(sub.tier).name}</span>} hint={patient.city} tone="green" />
          <StatCard label="My CHW" value={<span className="text-lg">{chw?.name ?? 'Not assigned'}</span>} hint={chw ? `Verified · ★ ${chw.rating}` : 'Choose one'} tone="blue" />
          <StatCard label="Next visit" value={<span className="text-lg">{nextVisit ? fmtDateTime(nextVisit.scheduledFor) : 'None'}</span>} hint={nextVisit ? nextVisit.status.replace('_', ' ') : 'Schedule one'} tone="blue" />
          <StatCard label="Open alerts" value={alerts.length} hint={alerts.length ? 'Needs review' : 'All clear'} tone={alerts.length ? 'red' : 'green'} />
        </div>
      </section>

      {pendingConsents.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm"><b>{pendingConsents.length} access request{pendingConsents.length > 1 ? 's' : ''}</b> waiting for your decision.</p>
          <Btn size="sm" onClick={() => navigate('/patient/permissions')}>Review requests</Btn>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mc-section-title"><ShieldCheck size={17} /> Who can see my information?</h3>
          {relationships.map((r) => {
            const acc = accounts.find((a) => a.id === r.sponsorAccountId);
            return (
              <KV key={r.id} label={`${acc?.name ?? 'Sponsor'} (pays)`}>
                <Badge tone={r.accessLevel === 'full_monitoring' ? 'green' : r.accessLevel === 'payment_only' ? 'gray' : 'blue'}>{accessLabel(r.accessLevel)}</Badge>
              </KV>
            );
          })}
          {supporters.map((x) => (
            <KV key={x.id} label={`${x.name} (${x.relationship})`}>
              <Badge tone="blue">{accessLabel(x.accessLevel)}</Badge>
            </KV>
          ))}
          <Btn variant="secondary" size="sm" className="mt-3 w-full" onClick={() => navigate('/patient/permissions')}>Manage permissions</Btn>
        </Card>

        <Card>
          <h3 className="mc-section-title"><MapPin size={17} /> My care location</h3>
          <KV label="City">{patient.city}</KV>
          <KV label="Area">{patient.neighbourhood}</KV>
          <KV label="Device location">
            <Badge tone={patient.locationConsentGiven ? 'green' : 'gray'}>{patient.locationConsentGiven ? 'Consent given' : 'Off'}</Badge>
          </KV>
          <div className="flex flex-wrap gap-2 mt-3">
            <Btn
              size="sm" variant="secondary"
              onClick={() => {
                setLocationConsent(ME, !patient.locationConsentGiven);
                toast(patient.locationConsentGiven ? 'Location permission revoked' : 'Location permission granted (simulated)');
              }}
            >
              {patient.locationConsentGiven ? 'Revoke device location' : 'Use device location'}
            </Btn>
            <Btn size="sm" variant="secondary" onClick={() => navigate('/patient/plan')}>Change manually</Btn>
          </div>
        </Card>

        <Card>
          <h3 className="mc-section-title"><CalendarClock size={17} /> My next visit</h3>
          {nextVisit ? (
            <>
              <KV label="When">{fmtDateTime(nextVisit.scheduledFor)}</KV>
              <KV label="CHW">{chw?.name ?? '—'}</KV>
              <KV label="Status"><Badge tone="blue">{nextVisit.status.replace('_', ' ')}</Badge></KV>
              <div className="flex flex-wrap gap-2 mt-3">
                <Btn size="sm" onClick={() => navigate('/patient/visits')}>View visits</Btn>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No visit scheduled.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mt-4">
        <Card>
          <h3 className="mc-section-title">My plan</h3>
          <p className="text-sm text-slate-600 mb-3">{packageDef(sub.tier).tagline}. Add-ons: {sub.addOns.length > 0 ? sub.addOns.join(', ').replaceAll('_', ' ') : 'none'}.</p>
          <Btn size="sm" onClick={() => navigate('/patient/plan')}>Manage plan & services</Btn>
        </Card>
        <Card>
          <h3 className="mc-section-title">My care team</h3>
          <p className="text-sm text-slate-600 mb-3">{chw ? `${chw.name} · ${chw.cadre} · ★ ${chw.rating}` : 'No CHW selected yet.'}</p>
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" onClick={() => navigate('/patient/find-chw')}>Find a CHW</Btn>
            <Btn size="sm" variant="secondary" onClick={() => navigate('/patient/team')}>Preferences</Btn>
          </div>
        </Card>
        <Card>
          <h3 className="mc-section-title">Need help?</h3>
          <p className="text-sm text-slate-600 mb-3">Report a service issue, a safety concern, or an incorrect record.</p>
          <Btn size="sm" variant="danger-soft" onClick={() => navigate('/patient/complaints')}>Submit a complaint</Btn>
        </Card>
      </div>
    </div>
  );
}
