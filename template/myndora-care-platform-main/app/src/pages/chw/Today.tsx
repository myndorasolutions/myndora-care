// CHW — Today (orange/amber theme).
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { formatNaira } from '@/lib/pricing';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, KV, StatCard, Toggle } from '@/components/kit';


export default function ChwToday() {
  const ME = useStore((s) => s.identity.chwId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const chw = useStore((s) => s.chws.find((c) => c.id === ME))!;
  const assignments = useStore(useShallow((s) => s.assignments.filter((a) => a.chwId === ME && a.status !== 'declined' && a.status !== 'cancelled')));
  const visits = useStore((s) => s.visits);
  const patients = useStore((s) => s.patients);
  const escalations = useStore(useShallow((s) => s.escalations.filter((e) => e.status !== 'resolved')));
  const activeVisit = useStore((s) => s.activeVisit);
  const setAvailability = useStore((s) => s.setAvailability);

  const accepted = assignments.filter((a) => a.status === 'accepted');
  const offered = assignments.filter((a) => a.status === 'offered');
  const next = [...accepted].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
  const nextVisit = next ? visits.find((v) => v.assignmentId === next.id) : undefined;
  const verifiedCount = visits.filter((v) => v.chwId === ME && v.status === 'verified').length;

  return (
    <div>
      <section className="mc-hero mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold">Good afternoon, Amina</h1>
            <p className="text-sm text-amber-100 mt-1">You have {accepted.length + offered.length} open assignments and {escalations.length} urgent follow-up{escalations.length === 1 ? '' : 's'}.</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm font-bold">Available for assignments</span>
            <Toggle checked={chw.available} onChange={(v) => { setAvailability(ME, v); toast(v ? 'You are now visible for new assignments' : 'You are hidden from new assignments'); }} label="Availability" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open assignments" value={accepted.length + offered.length} hint={`${offered.length} awaiting response`} tone="blue" />
          <StatCard label="Urgent follow-ups" value={escalations.length} hint={escalations.length ? 'Review now' : 'None'} tone={escalations.length ? 'red' : 'green'} />
          <StatCard label="Verified visits" value={`${chw.reliabilityScore}%`} hint={`${verifiedCount} this period`} tone="green" />
          <StatCard label="Pending payout" value={formatNaira(9000)} hint="2 visits in verification" tone="amber" />
        </div>
      </section>

      {activeVisit && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">A visit is currently in progress.</p>
          <Btn size="sm" onClick={() => navigate('/chw/active-visit')}>Resume active visit</Btn>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title">Next assignment</h3>
          {next ? (
            <>
              <KV label="Patient">{patients.find((p) => p.id === next.patientId)?.name}</KV>
              <KV label="Service">{next.serviceType.replace('_', ' ')}</KV>
              <KV label="When">{fmtDateTime(next.scheduledFor)}</KV>
              <KV label="Area"><span className="inline-flex items-center gap-1"><MapPin size={13} /> {next.approximateArea}</span></KV>
              <KV label="Expected payout">{formatNaira(next.payoutEstimate)}{next.travelComponent > 0 ? ` + ${formatNaira(next.travelComponent)} travel` : ''}</KV>
              <KV label="Required proof">Geofence + patient verification + checklist</KV>
              <div className="flex flex-wrap gap-2 mt-4">
                {nextVisit && nextVisit.status === 'scheduled' && (
                  <Btn onClick={() => navigate('/chw/active-visit')}>Start visit</Btn>
                )}
                <Btn variant="secondary" onClick={() => navigate('/chw/assignments')}>All assignments</Btn>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No accepted assignments. Check offered assignments to accept work.</p>
          )}
        </Card>

        <Card>
          <h3 className="mc-section-title"><AlertTriangle size={17} className="text-red-600" /> Urgent follow-up</h3>
          {escalations.length > 0 ? (
            <>
              <p className="text-sm text-slate-600 mb-2">{escalations[0].reason}</p>
              <Badge tone="red">{escalations[0].status.replace('_', ' ')}</Badge>
              <div className="mt-3 flex gap-2">
                <Btn variant="danger" size="sm" onClick={() => navigate('/chw/escalations')}>Open escalations</Btn>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No open escalations.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
