// Sponsor dashboard — deep navy theme. Payment-focused, multi-patient cards.
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CreditCard, KeyRound, MessageSquareWarning, Stethoscope } from 'lucide-react';
import { accessLabel, canSee, packageDef } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Btn, Card, KV, StatCard } from '@/components/kit';

export default function SponsorDashboard() {
  const SPONSOR_ID = useStore((s) => s.identity.sponsorAccountId);
  const navigate = useNavigate();
  const relationships = useStore(useShallow((s) => s.relationships.filter((r) => r.sponsorAccountId === SPONSOR_ID)));
  const patients = useStore((s) => s.patients);
  const subscriptions = useStore((s) => s.subscriptions);
  const payments = useStore((s) => s.payments);
  const alerts = useStore((s) => s.alerts);
  const visits = useStore((s) => s.visits);
  const chws = useStore((s) => s.chws);
  const selectedChwByPatient = useStore((s) => s.selectedChwByPatient);
  const selectPatient = useStore((s) => s.selectPatient);
  const consents = useStore((s) => s.consents);
  const sponsorName = useStore((s) => s.accounts.find((a) => a.id === s.identity.sponsorAccountId)?.name ?? 'Sponsor');

  const supported = relationships.map((rel) => {
    const patient = patients.find((p) => p.id === rel.patientId)!;
    const sub = subscriptions.find((x) => x.patientId === patient.id)!;
    const nextVisit = visits.filter((v) => v.patientId === patient.id && (v.status === 'scheduled' || v.status === 'in_progress'))
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
    const openAlerts = alerts.filter((a) => a.patientId === patient.id && (a.status === 'open' || a.status === 'escalated'));
    const chw = chws.find((c) => c.id === selectedChwByPatient[patient.id]);
    const due = payments.some((p) => p.patientId === patient.id && p.status === 'due');
    return { rel, patient, sub, nextVisit, openAlerts, chw, due };
  });

  const pendingRequests = consents.filter((c) => c.status === 'pending' && c.requesterAccountId === SPONSOR_ID).length;

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Good morning, {sponsorName.split(' ')[0]}</h1>
        <p className="text-sm text-blue-100 mt-1 mb-5">You manage payment and coordination for {supported.length} people. You only see health information each patient has approved.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="People supported" value={supported.length} hint="Active sponsorships" tone="blue" />
          <StatCard label="Payments due" value={supported.filter((s) => s.due).length} hint={supported.some((s) => s.due) ? 'Action needed' : 'All paid'} tone={supported.some((s) => s.due) ? 'amber' : 'green'} />
          <StatCard label="Open alerts (authorized)" value={supported.reduce((n, s) => n + (canSee(s.rel.accessLevel, 'alert_notification') ? s.openAlerts.length : 0), 0)} hint="Permission-based" tone="red" />
          <StatCard label="Pending access requests" value={pendingRequests} hint={pendingRequests > 0 ? 'Awaiting patient' : 'None'} tone={pendingRequests > 0 ? 'amber' : 'green'} />
        </div>
      </section>

      <h2 className="mc-section-title">People I support</h2>
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {supported.map(({ rel, patient, sub, nextVisit, openAlerts, chw, due }) => (
          <Card key={patient.id}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{patient.name}</h3>
                <p className="text-xs text-slate-500">{rel.paysFor ? `${patient.relationToSponsor} · ` : ''}{patient.age} years · {patient.city}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={sub.status === 'active' ? 'green' : 'amber'}>{packageDef(sub.tier).name}</Badge>
                <Badge tone={due ? 'amber' : 'green'}>{due ? 'Payment due' : 'Payments current'}</Badge>
              </div>
            </div>
            <KV label="Health access level">
              <Badge tone={rel.accessLevel === 'full_monitoring' ? 'green' : rel.accessLevel === 'payment_only' ? 'gray' : 'blue'}>
                {accessLabel(rel.accessLevel)}
              </Badge>
            </KV>
            <KV label="Next visit">
              {nextVisit ? (
                canSee(rel.accessLevel, 'visit_status')
                  ? <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} /> {fmtDateTime(nextVisit.scheduledFor)}</span>
                  : <span className="text-slate-400 text-xs">Restricted — service updates not shared</span>
              ) : 'None scheduled'}
            </KV>
            <KV label="Open alerts">
              {canSee(rel.accessLevel, 'alert_notification')
                ? <Badge tone={openAlerts.length > 0 ? 'red' : 'green'}>{openAlerts.length} open</Badge>
                : <span className="text-slate-400 text-xs">Not shared at this access level</span>}
            </KV>
            <KV label="Assigned CHW">
              {chw ? <span className="inline-flex items-center gap-1.5"><Stethoscope size={14} /> {chw.name} ({chw.cadre})</span> : 'Not assigned'}
            </KV>
            <div className="flex flex-wrap gap-2 mt-4">
              <Btn size="sm" onClick={() => { selectPatient(patient.id); navigate('/sponsor/plan'); }}>
                <CreditCard size={14} /> Manage plan
              </Btn>
              <Btn size="sm" variant="secondary" onClick={() => { selectPatient(patient.id); navigate('/sponsor/access'); }}>
                <KeyRound size={14} /> Access
              </Btn>
              <Btn size="sm" variant="secondary" onClick={() => { selectPatient(patient.id); navigate('/sponsor/visits'); }}>Visits</Btn>
              <Btn size="sm" variant="danger-soft" onClick={() => { selectPatient(patient.id); navigate('/sponsor/complaints'); }}>
                <MessageSquareWarning size={14} /> Report issue
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title">Your approved access — at a glance</h3>
          {supported.map(({ rel, patient }) => (
            <KV key={patient.id} label={patient.name}>
              <Badge tone={rel.accessLevel === 'full_monitoring' ? 'green' : 'blue'}>{accessLabel(rel.accessLevel)}</Badge>
            </KV>
          ))}
          <p className="text-xs text-slate-500 mt-3">Payment never creates health access. Each patient approves, reduces, or withdraws what you can see.</p>
          <Btn variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/sponsor/access')}>Request an access change</Btn>
        </Card>
        <Card>
          <h3 className="mc-section-title">Latest authorized update</h3>
          {supported.filter((s) => canSee(s.rel.accessLevel, 'alert_detail')).length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">Blood pressure concern — Grace Okafor</span>
                <Badge tone="red">Urgent</Badge>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                An urgent blood-pressure alert was raised and escalated for clinical review. Exact readings are visible because Grace approved full monitoring access.
              </p>
              <Btn variant="secondary" size="sm" onClick={() => navigate('/sponsor/alerts')}>View alert status</Btn>
            </>
          ) : (
            <p className="text-sm text-slate-500">No authorized health updates at your current access levels.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
