// Sponsor — Reports: patient-approved summaries and service-delivery records.
import { BarChart3, FileCheck2, ReceiptText } from 'lucide-react';
import { canSee } from '@/lib/permissions';
import { useStore, useSelectedPatient } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal } from '@/store/ui';
import { Badge, Btn, Card, KV, PageHeader } from '@/components/kit';
import { formatNaira } from '@/lib/pricing';
import { fmtDate, fmtDateTime } from '@/lib/format';

export default function SponsorReports() {
  const SPONSOR_ID = useStore((s) => s.identity.sponsorAccountId);
  const patient = useSelectedPatient();
  const rel = useStore((s) => s.relationships.find((r) => r.patientId === s.selectedPatientId && r.sponsorAccountId === SPONSOR_ID))!;
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.patientId === s.selectedPatientId)));
  const payments = useStore(useShallow((s) => s.payments.filter((p) => p.patientId === s.selectedPatientId)));
  const { openModal, closeModal } = useModal();

  const healthAllowed = canSee(rel.accessLevel, 'visit_summary');

  const openMonthly = () => {
    if (!healthAllowed) {
      openModal({
        title: 'Report restricted',
        body: <p className="text-sm text-slate-600">Monthly care summaries contain health information. {patient.name} has not approved sharing them at your current access level. You can request access from the Access Requests page — the patient decides.</p>,
        footer: <Btn variant="secondary" onClick={closeModal}>Close</Btn>,
      });
      return;
    }
    const completed = visits.filter((v) => v.status === 'verified').length;
    openModal({
      title: `Monthly care summary — ${patient.name}`,
      body: (
        <div>
          <KV label="Verified visits this period">{completed}</KV>
          <KV label="Escalations raised">{visits.filter((v) => v.escalationId).length}</KV>
          <KV label="Medication adherence">Reminders followed (self + CHW documented)</KV>
          <KV label="Clinical review">1 case routed to clinician, pending review</KV>
          <p className="text-xs text-slate-500 mt-3">Summaries are patient-approved. Downloading and printing are restricted in this demo.</p>
        </div>
      ),
      footer: <Btn variant="secondary" onClick={closeModal}>Close</Btn>,
    });
  };

  const openVerification = () => {
    const v = visits.find((x) => x.status === 'verified');
    openModal({
      title: 'Visit verification report',
      body: v ? (
        <div>
          <KV label="Visit">{fmtDateTime(v.scheduledFor)}</KV>
          <KV label="Geofence check-in">{v.evidence.geofenceCheckIn ? fmtDateTime(v.evidence.geofenceCheckIn) : '—'}</KV>
          <KV label="Server timestamp">{v.evidence.serverCheckInTimestamp ? fmtDateTime(v.evidence.serverCheckInTimestamp) : '—'}</KV>
          <KV label="Patient confirmation">{v.evidence.otpVerified ? 'OTP verified' : '—'}</KV>
          <KV label="Checklist">{v.completedServices.length}/{v.requestedServices.length} services completed</KV>
          <KV label="Plausible duration">{v.evidence.plausibleDuration ? 'Yes' : 'Flagged'}</KV>
          <p className="text-xs text-slate-500 mt-3">Evidence confirms attendance and listed services — not the clinical accuracy of every reading.</p>
        </div>
      ) : <p className="text-sm text-slate-500">No verified visits yet.</p>,
      footer: <Btn variant="secondary" onClick={closeModal}>Close</Btn>,
    });
  };

  const openBilling = () => {
    openModal({
      title: 'Billing history',
      body: (
        <div>
          {payments.map((p) => (
            <KV key={p.id} label={`${p.label} · ${fmtDate(p.date)}`}>
              <span className="flex items-center gap-2">{formatNaira(p.amount)} <Badge tone={p.status === 'paid' ? 'green' : 'amber'}>{p.status}</Badge></span>
            </KV>
          ))}
        </div>
      ),
      footer: <Btn variant="secondary" onClick={closeModal}>Close</Btn>,
    });
  };

  return (
    <div>
      <PageHeader title={`Reports — ${patient.name}`} subtitle="Reports respect the patient-approved access level. Billing reports are always available to you as the payer." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <BarChart3 size={22} className="text-[var(--accent)] mb-2" />
          <h3 className="font-bold text-slate-900 mb-1">Monthly care summary</h3>
          <p className="text-xs text-slate-500 mb-3">Visits, readings, reminders and escalations.</p>
          {healthAllowed ? <Badge tone="green">Authorized</Badge> : <Badge tone="gray">Restricted by patient</Badge>}
          <div className="mt-3"><Btn variant="secondary" size="sm" className="w-full" onClick={openMonthly}>Open report</Btn></div>
        </Card>
        <Card>
          <FileCheck2 size={22} className="text-[var(--accent)] mb-2" />
          <h3 className="font-bold text-slate-900 mb-1">Visit verification report</h3>
          <p className="text-xs text-slate-500 mb-3">OTP, geofence, checklist and confirmation evidence.</p>
          <Badge tone="blue">Service record</Badge>
          <div className="mt-3"><Btn variant="secondary" size="sm" className="w-full" onClick={openVerification}>Open report</Btn></div>
        </Card>
        <Card>
          <ReceiptText size={22} className="text-[var(--accent)] mb-2" />
          <h3 className="font-bold text-slate-900 mb-1">Billing history</h3>
          <p className="text-xs text-slate-500 mb-3">Package and add-on service activity.</p>
          <Badge tone="green">Payer access</Badge>
          <div className="mt-3"><Btn variant="secondary" size="sm" className="w-full" onClick={openBilling}>Open report</Btn></div>
        </Card>
      </div>
    </div>
  );
}
