// Patient — Visits: confirm, dispute, rate (only after verified visit), reschedule.
import { useState } from 'react';
import { CalendarClock, Star } from 'lucide-react';
import { fmtDateTime, VERIFICATION_LABELS } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, Input, KV, PageHeader, Textarea, type BadgeTone } from '@/components/kit';

const STATUS_TONE: Record<string, BadgeTone> = {
  scheduled: 'blue', in_progress: 'amber', submitted: 'amber', verified: 'green', disputed: 'red', cancelled: 'gray',
};

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="p-1.5 rounded-lg hover:bg-slate-100"
        >
          <Star size={26} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
        </button>
      ))}
    </div>
  );
}

function DisputeForm({ visitId, onDone }: { visitId: string; onDone: () => void }) {
  const disputeVisit = useStore((s) => s.disputeVisit);
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  return (
    <form
      className="space-y-3 text-sm text-slate-600"
      onSubmit={(e) => {
        e.preventDefault();
        disputeVisit(visitId, reason);
        toast('Visit disputed — payout frozen pending review');
        onDone();
      }}
    >
      <p>Disputing freezes the CHW payout for this visit and opens a data-quality review. Please describe what went wrong.</p>
      <Field label="Reason for dispute">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason for dispute" placeholder="e.g. CHW did not complete the blood sugar check" />
      </Field>
      <div className="flex justify-end gap-2">
        <Btn type="button" variant="secondary" onClick={onDone}>Cancel</Btn>
        <Btn type="submit" variant="danger" disabled={!reason.trim()}>Submit dispute</Btn>
      </div>
    </form>
  );
}

function RatingForm({ visitId, onDone }: { visitId: string; onDone: () => void }) {
  const rateChw = useStore((s) => s.rateChw);
  const { toast } = useToast();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const ok = rateChw(visitId, stars, comment || 'No comment');
        toast(ok ? 'Thank you — rating recorded' : 'Rating not allowed for this visit');
        onDone();
      }}
    >
      <p className="text-sm text-slate-600">Ratings are only accepted for verified, confirmed visits — they feed the recommendation engine.</p>
      <Stars value={stars} onChange={setStars} />
      <Field label="Comment (optional)">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Rating comment" />
      </Field>
      <div className="flex justify-end gap-2">
        <Btn type="button" variant="secondary" onClick={onDone}>Cancel</Btn>
        <Btn type="submit">Submit rating</Btn>
      </div>
    </form>
  );
}

function RescheduleForm({ visitId, onDone }: { visitId: string; onDone: () => void }) {
  const rescheduleVisit = useStore((s) => s.rescheduleVisit);
  const { toast } = useToast();
  const [newTime, setNewTime] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        rescheduleVisit(visitId, new Date(newTime).toISOString());
        toast('Visit rescheduled');
        onDone();
      }}
    >
      <Field label="New date and time">
        <Input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="New date and time" />
      </Field>
      <div className="flex justify-end gap-2">
        <Btn type="button" variant="secondary" onClick={onDone}>Cancel</Btn>
        <Btn type="submit" disabled={!newTime}>Confirm</Btn>
      </div>
    </form>
  );
}

export default function PatientVisits() {
  const ME = useStore((s) => s.identity.patientId);
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.patientId === ME).sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))));
  const chws = useStore((s) => s.chws);
  const ratings = useStore((s) => s.ratings);
  const confirmVisit = useStore((s) => s.confirmVisit);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const openDispute = (visitId: string) => {
    openModal({ title: 'Dispute this visit', backdropDismiss: false, body: <DisputeForm visitId={visitId} onDone={closeModal} /> });
  };
  const openRating = (visitId: string, chwName: string) => {
    openModal({ title: `Rate ${chwName}`, backdropDismiss: false, body: <RatingForm visitId={visitId} onDone={closeModal} /> });
  };
  const openReschedule = (visitId: string) => {
    openModal({ title: 'Reschedule visit', backdropDismiss: false, body: <RescheduleForm visitId={visitId} onDone={closeModal} /> });
  };

  return (
    <div>
      <PageHeader title="My Visits" subtitle="Confirm completed visits, dispute anything that went wrong, and rate your CHW after verified visits." />
      <div className="space-y-4">
        {visits.map((v) => {
          const chw = chws.find((c) => c.id === v.chwId);
          const rated = ratings.some((r) => r.visitId === v.id);
          const canRate = v.status === 'verified' && v.patientConfirmed && !rated;
          return (
            <Card key={v.id}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 inline-flex items-center gap-2"><CalendarClock size={16} /> {fmtDateTime(v.scheduledFor)}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">CHW: {chw?.name ?? '—'}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Badge tone={STATUS_TONE[v.status]}>{v.status.replace('_', ' ')}</Badge>
                  {v.patientConfirmed && <Badge tone="green">You confirmed</Badge>}
                  {rated && <Badge tone="amber">Rated</Badge>}
                </div>
              </div>

              {v.patientSummary && <p className="text-sm text-slate-600 bg-emerald-50/60 border border-emerald-100 rounded-lg p-3 mb-3">{v.patientSummary}</p>}

              {v.completedServices.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {v.completedServices.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}
                </div>
              )}

              {(v.status === 'verified' || v.status === 'submitted') && (
                <div className="grid gap-x-8 sm:grid-cols-2 mb-2">
                  <KV label="Confirmation method">{v.verificationMethod ? VERIFICATION_LABELS[v.verificationMethod] : '—'}</KV>
                  <KV label="Attendance evidence">{v.evidence.geofenceCheckIn ? 'Geofence + timestamps recorded' : 'Pending'}</KV>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {v.status === 'submitted' && (
                  <Btn size="sm" onClick={() => { confirmVisit(v.id); toast('Visit confirmed — thank you'); }}>Confirm visit</Btn>
                )}
                {v.status === 'scheduled' && (
                  <Btn size="sm" variant="secondary" onClick={() => openReschedule(v.id)}>Reschedule</Btn>
                )}
                {canRate && (
                  <Btn size="sm" variant="secondary" onClick={() => openRating(v.id, chw?.name ?? 'CHW')}><Star size={14} /> Rate CHW</Btn>
                )}
                {(v.status === 'submitted' || v.status === 'verified') && !v.disputed && (
                  <Btn size="sm" variant="danger-soft" onClick={() => openDispute(v.id)}>Dispute visit</Btn>
                )}
              </div>
              {v.status === 'verified' && !canRate && !rated && !v.patientConfirmed && (
                <p className="text-xs text-slate-400 mt-2">Confirm the visit to enable rating.</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
