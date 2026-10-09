// Admin — Integrations: simulated partner ecosystem (labs, doctors, pharmacies, hospitals).
// Myndora is not itself a lab, pharmacy or hospital.
import { useState } from 'react';
import { Building2, FlaskConical, Pill, Stethoscope } from 'lucide-react';
import type { ReferralKind } from '@/types';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, Input, PageHeader, Select, type BadgeTone } from '@/components/kit';

const PARTNERS: { kind: ReferralKind; icon: React.ReactNode; name: string; blurb: string; actions: string[] }[] = [
  { kind: 'lab', icon: <FlaskConical size={20} />, name: 'MediLab Diagnostics', blurb: 'Book lab tests, request home sample collection where available, view result status.', actions: ['Book a lab test', 'Request home sample collection'] },
  { kind: 'doctor', icon: <Stethoscope size={20} />, name: 'Verified Doctors Network', blurb: 'Find a verified doctor and schedule a consultation.', actions: ['Schedule consultation'] },
  { kind: 'pharmacy', icon: <Pill size={20} />, name: 'CarePoint Pharmacy', blurb: 'Send prescriptions to a verified pharmacy and request medication delivery.', actions: ['Send prescription', 'Request medication delivery'] },
  { kind: 'hospital', icon: <Building2 size={20} />, name: 'Harmony Specialist Hospital', blurb: 'Hospital referral with structured handoff notes.', actions: ['Create hospital referral'] },
];

const STATUS_TONE: Record<string, BadgeTone> = {
  requested: 'amber', booked: 'blue', in_progress: 'amber', completed: 'green', routed_to_clinician: 'purple',
};

function BookingForm({ kind, partner, onDone }: { kind: ReferralKind; partner: string; onDone: () => void }) {
  const patients = useStore((s) => s.patients);
  const bookReferral = useStore((s) => s.bookReferral);
  const { toast } = useToast();
  const [patientId, setPatientId] = useState('pat-grace');
  const [description, setDescription] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        bookReferral(patientId, kind, `${partner} (simulated)`, description);
        toast('Booked with partner (simulated)');
        onDone();
      }}
    >
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
        This is a simulated integration. Myndora coordinates with independent partners — it is not itself a laboratory, pharmacy or hospital.
      </p>
      <Field label="Patient">
        <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} aria-label="Patient">
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
        </Select>
      </Field>
      <Field label="Details">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Referral details" placeholder="e.g. HbA1c + lipid panel" />
      </Field>
      <div className="flex justify-end gap-2">
        <Btn type="submit" disabled={!description.trim()}>Confirm booking</Btn>
      </div>
    </form>
  );
}

export default function AdminIntegrations() {
  const referrals = useStore((s) => s.referrals);
  const patients = useStore((s) => s.patients);
  const routeReferralToClinician = useStore((s) => s.routeReferralToClinician);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const openBooking = (kind: ReferralKind, partner: string, actionLabel: string) => {
    openModal({
      title: `${actionLabel} — ${partner} (simulated)`,
      backdropDismiss: false,
      body: <BookingForm kind={kind} partner={partner} onDone={closeModal} />,
    });
  };

  return (
    <div>
      <PageHeader title="Integrations" subtitle="Simulated partner ecosystem. All partner names are fictional." />

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {PARTNERS.map((p) => (
          <Card key={p.kind}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-[var(--accent)]">{p.icon}</span>
              <Badge tone="blue">Simulated</Badge>
            </div>
            <h3 className="font-bold text-slate-900">{p.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">{p.blurb}</p>
            <div className="flex flex-wrap gap-2">
              {p.actions.map((a) => (
                <Btn key={a} size="sm" variant="secondary" onClick={() => openBooking(p.kind, p.name, a)}>{a}</Btn>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mc-section-title">Referrals & bookings</h2>
      <div className="space-y-3">
        {referrals.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-slate-900">{r.description}</p>
                <p className="text-xs text-slate-500">
                  {r.partner} · {patients.find((p) => p.id === r.patientId)?.name} · {fmtDateTime(r.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[r.status]}>{r.status.replaceAll('_', ' ')}</Badge>
                {r.kind === 'lab' && r.status === 'completed' && (
                  <Btn size="sm" variant="secondary" onClick={() => { routeReferralToClinician(r.id); toast('Flagged result routed to clinician review queue'); }}>
                    Route flagged result to clinician
                  </Btn>
                )}
                {r.kind === 'lab' && r.status === 'booked' && (
                  <Btn size="sm" variant="ghost" onClick={() => { routeReferralToClinician(r.id); toast('Result flagged & routed to clinician (simulated)'); }}>
                    Simulate flagged result
                  </Btn>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
