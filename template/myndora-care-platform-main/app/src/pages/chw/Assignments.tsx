// CHW — Assignments: accept/decline. Approximate area before acceptance;
// exact address only revealed after acceptance.
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { formatNaira } from '@/lib/pricing';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, KV, PageHeader, type BadgeTone } from '@/components/kit';

const STATUS_TONE: Record<string, BadgeTone> = { offered: 'amber', accepted: 'green', declined: 'gray', completed: 'blue', cancelled: 'gray' };

export default function ChwAssignments() {
  const ME = useStore((s) => s.identity.chwId);
  const assignments = useStore(useShallow((s) => s.assignments.filter((a) => a.chwId === ME).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))));
  const patients = useStore((s) => s.patients);
  const acceptAssignment = useStore((s) => s.acceptAssignment);
  const declineAssignment = useStore((s) => s.declineAssignment);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();
  const [acceptedId, setAcceptedId] = useState<string | null>(null);

  const confirmAccept = (id: string) => {
    openModal({
      title: 'Accept this assignment?',
      body: <p className="text-sm text-slate-600">After accepting, the patient's exact address and visit checklist become visible. Declining returns the assignment to coordination.</p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn onClick={() => { acceptAssignment(id); setAcceptedId(id); closeModal(); toast('Assignment accepted — exact address unlocked'); }}>Accept assignment</Btn>
        </>
      ),
    });
  };

  const confirmDecline = (id: string) => {
    openModal({
      title: 'Decline this assignment?',
      body: <p className="text-sm text-slate-600">The assignment returns to the coordination queue and another CHW may be offered it.</p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Keep it</Btn>
          <Btn variant="danger" onClick={() => { declineAssignment(id); closeModal(); toast('Assignment declined'); }}>Decline</Btn>
        </>
      ),
    });
  };

  return (
    <div>
      <PageHeader title="Assignments" subtitle="You see the approximate area and payout before accepting. The exact address unlocks only after acceptance." />
      {assignments.length === 0 ? (
        <Card><EmptyState title="No assignments" hint="New offers appear here when patients match your approved services and radius." /></Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const patient = patients.find((p) => p.id === a.patientId)!;
            const isAccepted = a.status === 'accepted' || a.status === 'completed' || acceptedId === a.id;
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{patient.name} — {a.serviceType.replace('_', ' ')}</h3>
                    <p className="text-xs text-slate-500">{fmtDateTime(a.scheduledFor)}</p>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                </div>
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <KV label="Location">
                    {isAccepted
                      ? <span className="inline-flex items-center gap-1"><MapPin size={13} /> {patient.address}</span>
                      : <span className="inline-flex items-center gap-1"><MapPin size={13} /> {a.approximateArea} <Badge tone="gray">approximate</Badge></span>}
                  </KV>
                  <KV label="Payout estimate">
                    {formatNaira(a.payoutEstimate)}{a.travelComponent > 0 ? ` + ${formatNaira(a.travelComponent)} travel` : ''}
                  </KV>
                </div>
                {!isAccepted && (
                  <p className="text-xs text-slate-500 mt-1">Exact address hidden until you accept.</p>
                )}
                {a.status === 'offered' && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Btn size="sm" onClick={() => confirmAccept(a.id)}>Accept</Btn>
                    <Btn size="sm" variant="danger-soft" onClick={() => confirmDecline(a.id)}>Decline</Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
