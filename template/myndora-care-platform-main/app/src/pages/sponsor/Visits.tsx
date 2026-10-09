// Sponsor — Visits: authorized view of schedules and visit summaries.
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import { canSee } from '@/lib/permissions';
import { fmtDateTime, VERIFICATION_LABELS } from '@/lib/format';
import { useStore, useSelectedPatient } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Btn, Card, EmptyState, KV, PageHeader, type BadgeTone } from '@/components/kit';

const STATUS_TONE: Record<string, BadgeTone> = {
  scheduled: 'blue', in_progress: 'amber', submitted: 'amber', verified: 'green', disputed: 'red', cancelled: 'gray',
};

export default function SponsorVisits() {
  const SPONSOR_ID = useStore((s) => s.identity.sponsorAccountId);
  const navigate = useNavigate();
  const patient = useSelectedPatient();
  const rel = useStore((s) => s.relationships.find((r) => r.patientId === s.selectedPatientId && r.sponsorAccountId === SPONSOR_ID))!;
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.patientId === s.selectedPatientId).sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))));
  const chws = useStore((s) => s.chws);

  const level = rel.accessLevel;
  const canSeeStatus = canSee(level, 'visit_status');
  const canSeeSummary = canSee(level, 'visit_summary');

  return (
    <div>
      <PageHeader
        title={`Visits — ${patient.name}`}
        subtitle={`Shown under your patient-approved access level (${level.replace('_', ' ')}).`}
      />

      {!canSeeStatus ? (
        <Card>
          <EmptyState
            title="Visit information is restricted"
            hint="The patient has not approved sharing service updates with you. You can request a higher access level — the patient decides."
            action={<Btn onClick={() => navigate('/sponsor/access')}>Request access</Btn>}
          />
        </Card>
      ) : visits.length === 0 ? (
        <Card><EmptyState title="No visits yet" /></Card>
      ) : (
        <div className="space-y-4">
          {visits.map((v) => {
            const chw = chws.find((c) => c.id === v.chwId);
            return (
              <Card key={v.id}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 inline-flex items-center gap-2">
                      <CalendarClock size={16} /> {fmtDateTime(v.scheduledFor)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">CHW: {chw?.name ?? '—'} ({chw?.cadre ?? ''})</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge tone={STATUS_TONE[v.status]}>{v.status.replace('_', ' ')}</Badge>
                    {v.patientConfirmed && <Badge tone="green"><ShieldCheck size={12} /> Patient confirmed</Badge>}
                    {v.payoutFrozen && <Badge tone="red">Payout frozen</Badge>}
                  </div>
                </div>

                {canSeeSummary && (v.patientSummary || v.sponsorSummary) ? (
                  <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3">{v.sponsorSummary || v.patientSummary}</p>
                ) : v.status === 'verified' || v.status === 'submitted' ? (
                  <p className="text-xs text-slate-500 mb-3">A completed-visit summary exists, but the patient has not approved sharing visit summaries with you.</p>
                ) : null}

                {canSeeSummary && v.completedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {v.completedServices.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}
                  </div>
                )}

                {(v.status === 'verified' || v.status === 'submitted') && (
                  <div className="grid gap-x-8 sm:grid-cols-2">
                    <KV label="Confirmation method">{v.verificationMethod ? VERIFICATION_LABELS[v.verificationMethod] : '—'}</KV>
                    <KV label="Attendance evidence">
                      {v.evidence.geofenceCheckIn ? 'Geofence + server timestamps recorded' : 'Pending'}
                    </KV>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">Confirmation verifies attendance and listed services — not the clinical accuracy of every reading.</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
