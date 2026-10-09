// Admin — Assignments: reassign CHWs.
import { useState } from 'react';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, PageHeader, Select, type BadgeTone } from '@/components/kit';

const TONE: Record<string, BadgeTone> = { offered: 'amber', accepted: 'green', declined: 'gray', completed: 'blue', cancelled: 'gray' };

function ReassignForm({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const patient = useStore((s) => s.patients.find((p) => p.id === patientId))!;
  const currentChwId = useStore((s) => s.selectedChwByPatient[patientId]);
  const options = useStore(useShallow((s) => s.chws.filter((c) => c.status === 'approved' && c.id !== currentChwId && c.city === patient.city && !c.matchingSuspended)));
  const reassignPatient = useStore((s) => s.reassignPatient);
  const { toast } = useToast();
  const [targetChw, setTargetChw] = useState(options[0]?.id ?? '');

  if (options.length === 0) {
    return <p className="text-sm text-amber-700">No eligible CHWs in {patient.city} right now.</p>;
  }
  return (
    <form
      className="space-y-3 text-sm text-slate-600"
      onSubmit={(e) => {
        e.preventDefault();
        reassignPatient(patientId, targetChw);
        toast('Patient reassigned');
        onDone();
      }}
    >
      <p>Open assignments and scheduled visits move to the new CHW. The patient is notified.</p>
      <Field label="New CHW">
        <Select value={targetChw} onChange={(e) => setTargetChw(e.target.value)} aria-label="New CHW">
          {options.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.cadre}, ★ {c.rating}</option>)}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Btn type="submit">Reassign</Btn>
      </div>
    </form>
  );
}

export default function AdminAssignments() {
  const assignments = useStore((s) => s.assignments);
  const patients = useStore((s) => s.patients);
  const allChws = useStore((s) => s.chws);
  const { openModal, closeModal } = useModal();

  const openReassign = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId)!;
    openModal({
      title: `Reassign ${patient.name}`,
      backdropDismiss: false,
      body: <ReassignForm patientId={patientId} onDone={closeModal} />,
    });
  };

  return (
    <div>
      <PageHeader title="Assignments" subtitle="All assignments across the platform with reassignment controls." />
      <Card className="overflow-x-auto">
        <table className="mc-table w-full min-w-[720px]">
          <thead>
            <tr><th>Patient</th><th>Service</th><th>Scheduled</th><th>CHW</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const patient = patients.find((p) => p.id === a.patientId)!;
              const chw = allChws.find((c) => c.id === a.chwId);
              return (
                <tr key={a.id}>
                  <td className="font-semibold">{patient.name}<div className="text-xs text-slate-400 font-normal">{patient.city}</div></td>
                  <td>{a.serviceType.replace('_', ' ')}</td>
                  <td>{fmtDateTime(a.scheduledFor)}</td>
                  <td>{chw?.name ?? '—'}</td>
                  <td><Badge tone={TONE[a.status]}>{a.status}</Badge></td>
                  <td className="text-right">
                    {(a.status === 'offered' || a.status === 'accepted') && (
                      <Btn size="sm" variant="secondary" onClick={() => openReassign(a.patientId)}>Reassign</Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
