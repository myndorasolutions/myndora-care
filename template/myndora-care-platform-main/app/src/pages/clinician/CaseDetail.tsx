// Clinician — Case detail: review evidence (separated by source), add recommendation,
// write patient-facing and sponsor-visible summaries, resolve or request more info.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, MessageSquareQuote, Stethoscope } from 'lucide-react';
import { accessLabel, canSee } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, KV, PageHeader, Textarea } from '@/components/kit';

export default function ClinicianCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const kase = useStore((s) => s.clinicianCases.find((c) => c.id === id));
  const patient = useStore((s) => s.patients.find((p) => p.id === kase?.patientId));
  const rel = useStore((s) => s.relationships.find((r) => r.patientId === kase?.patientId && r.paysFor));
  const reviewCase = useStore((s) => s.reviewCase);

  const [recommendation, setRecommendation] = useState(kase?.recommendation ?? '');
  const [patientSummary, setPatientSummary] = useState(kase?.patientSummary ?? '');
  const [sponsorSummary, setSponsorSummary] = useState(kase?.sponsorSummary ?? '');

  if (!kase || !patient) {
    return (
      <div>
        <PageHeader title="Case not found" />
        <Btn variant="secondary" onClick={() => navigate('/clinician')}>Back to queue</Btn>
      </div>
    );
  }

  const sponsorLevel = rel?.accessLevel ?? 'payment_only';
  const sponsorCanSeeHealth = canSee(sponsorLevel, 'visit_summary');

  const submit = (outcome: 'resolved' | 'more_info') => {
    reviewCase(kase.id, { recommendation, patientSummary, sponsorSummary, outcome });
    toast(outcome === 'resolved' ? 'Case resolved — alert & escalation closed' : 'More information requested from coordination');
    navigate('/clinician');
  };

  return (
    <div>
      <PageHeader
        title={kase.title}
        subtitle={`${patient.name} · ${patient.age} yrs · ${patient.city} · routed ${fmtDateTime(kase.createdAt)}`}
        actions={<Btn variant="secondary" onClick={() => navigate('/clinician')}>Back to queue</Btn>}
      />

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Card>
          <h3 className="mc-section-title">Evidence — separated by source</h3>
          <div className="space-y-3">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
              <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5 mb-1"><Activity size={13} /> Measured readings</p>
              {kase.measuredReadings.map((r, i) => (
                <KV key={i} label={r.kind}>
                  <span className="flex items-center gap-2">{r.value} {r.unit} {r.abnormal && <Badge tone="red">Abnormal</Badge>}</span>
                </KV>
              ))}
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1"><MessageSquareQuote size={13} /> Patient statement</p>
              <p className="text-sm text-slate-700">{kase.patientStatement || 'None recorded.'}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1"><Stethoscope size={13} /> CHW observation</p>
              <p className="text-sm text-slate-700">{kase.chwObservation}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Patient conditions: {patient.conditions.join(', ')}</p>
        </Card>

        <Card>
          <h3 className="mc-section-title">Your clinical review</h3>
          <div className="space-y-3">
            <Field label="Clinical recommendation">
              <Textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} aria-label="Clinical recommendation" placeholder="e.g. Review antihypertensive dose; repeat BP twice daily for 3 days; escalate to physician if systolic stays above 170." />
            </Field>
            <Field label="Patient-facing summary">
              <Textarea value={patientSummary} onChange={(e) => setPatientSummary(e.target.value)} aria-label="Patient-facing summary" placeholder="Written for the patient, plain language…" />
            </Field>
            <Field label={`Sponsor-visible summary (sponsor currently has: ${accessLabel(sponsorLevel)})`}>
              <Textarea value={sponsorSummary} onChange={(e) => setSponsorSummary(e.target.value)} aria-label="Sponsor-visible summary" placeholder={sponsorCanSeeHealth ? 'Summary visible to the sponsor under approved access…' : 'Sponsor has no health access — keep this to service-status language only.'} />
            </Field>
            {!sponsorCanSeeHealth && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                The sponsor's current access is <b>{accessLabel(sponsorLevel)}</b> — they will only see this summary if the patient upgrades their access.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {kase.status === 'resolved'
              ? 'This case is resolved.'
              : 'Submitting as resolved closes the linked alert and escalation. Requesting more information returns the case to coordination.'}
          </p>
          <div className="flex gap-2">
            {kase.status !== 'resolved' && (
              <>
                <Btn variant="secondary" disabled={!recommendation.trim()} onClick={() => submit('more_info')}>Request more information</Btn>
                <Btn disabled={!recommendation.trim() || !patientSummary.trim()} onClick={() => submit('resolved')}>Submit review & resolve</Btn>
              </>
            )}
            {kase.status === 'resolved' && <Badge tone="green">Resolved {kase.reviewedAt ? fmtDateTime(kase.reviewedAt) : ''}</Badge>}
          </div>
        </div>
      </Card>
    </div>
  );
}
