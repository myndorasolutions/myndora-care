// CHW — Active Visit: the full anti-fraud visit documentation workflow.
// assignment accepted → geofence check-in → server timestamp → patient verification
// → checklist → readings & notes → acknowledgment → check-out → duration validation.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Circle, Clock, Fingerprint, ListChecks,
  MapPin, PenLine, Play, Stethoscope, Users,
} from 'lucide-react';
import type { VerificationMethod } from '@/types';
import { VERIFICATION_LABELS, validateVital } from '@/lib/format';
import { fmtDateTime, fmtTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, Input, KV, PageHeader, Select, Textarea, Toggle } from '@/components/kit';


const VITAL_KINDS = [
  { id: 'blood_pressure', label: 'Blood pressure (mmHg)' },
  { id: 'blood_sugar', label: 'Blood sugar (mmol/L)' },
  { id: 'temperature', label: 'Temperature (°C)' },
  { id: 'pulse', label: 'Pulse (bpm)' },
  { id: 'weight', label: 'Weight (kg)' },
] as const;

const VERIFICATION_METHODS: VerificationMethod[] = ['patient_otp', 'caregiver_otp', 'digital_signature', 'voice_confirmation', 'assisted_call'];

function StepShell({ n, title, icon, done, locked, children }: {
  n: number; title: string; icon: React.ReactNode; done: boolean; locked?: boolean; children: React.ReactNode;
}) {
  return (
    <Card className={locked ? 'opacity-60' : ''}>
      <h3 className="mc-section-title">
        {done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-300" />}
        <span className="text-slate-400 font-bold">{n}.</span> {icon} {title}
        {locked && <Badge tone="gray">Complete previous steps</Badge>}
      </h3>
      {children}
    </Card>
  );
}

export default function ChwActiveVisit() {
  const ME = useStore((s) => s.identity.chwId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openModal, closeModal } = useModal();

  const draft = useStore((s) => s.activeVisit);
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.chwId === ME)));
  const patients = useStore((s) => s.patients);
  const startVisit = useStore((s) => s.startVisit);
  const checkInVisit = useStore((s) => s.checkInVisit);
  const verifyPatient = useStore((s) => s.verifyPatient);
  const toggleChecklistItem = useStore((s) => s.toggleChecklistItem);
  const addVitalDraft = useStore((s) => s.addVitalDraft);
  const markRepeatDone = useStore((s) => s.markRepeatDone);
  const setDraftField = useStore((s) => s.setDraftField);
  const addPresentPerson = useStore((s) => s.addPresentPerson);
  const raiseEscalation = useStore((s) => s.raiseEscalation);
  const checkOutVisit = useStore((s) => s.checkOutVisit);
  const submitActiveVisit = useStore((s) => s.submitActiveVisit);
  const cancelActiveVisit = useStore((s) => s.cancelActiveVisit);

  const [method, setMethod] = useState<VerificationMethod>('patient_otp');
  const [otp, setOtp] = useState('');
  const [vitalKind, setVitalKind] = useState<(typeof VITAL_KINDS)[number]['id']>('blood_pressure');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [single, setSingle] = useState('');
  const [vitalError, setVitalError] = useState('');
  const [repeatValue, setRepeatValue] = useState('');
  const [personName, setPersonName] = useState('');
  const [personRel, setPersonRel] = useState('Family member');
  const [personConsent, setPersonConsent] = useState(true);
  const [escalationReason, setEscalationReason] = useState('');

  const startable = visits.filter((v) => v.status === 'scheduled');

  // ---------------------------------------------------------- start picker
  if (!draft) {
    return (
      <div>
        <PageHeader title="Active Visit" subtitle="Start a scheduled visit to document evidence, readings and confirmation." />
        {startable.length === 0 ? (
          <Card><p className="text-sm text-slate-600">No scheduled visits to start. Accept an assignment first.</p></Card>
        ) : (
          <div className="space-y-4">
            {startable.map((v) => {
              const patient = patients.find((p) => p.id === v.patientId)!;
              return (
                <Card key={v.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{patient.name}</h3>
                      <p className="text-xs text-slate-500">{fmtDateTime(v.scheduledFor)} · {v.requestedServices.length} requested services</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {v.requestedServices.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}
                      </div>
                    </div>
                    <Btn onClick={() => { startVisit(v.id); toast('Visit started — proceed to geofence check-in'); }}>
                      <Play size={15} /> Start visit
                    </Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const visit = visits.find((v) => v.id === draft.visitId)!;
  const patient = patients.find((p) => p.id === visit.patientId)!;
  const checklistDone = Object.values(draft.checklist).filter(Boolean).length;
  const abnormalVital = draft.vitals.find((v) => v.abnormal && !v.repeated);
  const canSubmit = !!draft.checkedInAt && draft.otpVerified && checklistDone > 0 && !abnormalVital && !!draft.checkedOutAt;

  const addVital = () => {
    setVitalError('');
    if (vitalKind === 'blood_pressure') {
      const s = Number(sys); const d = Number(dia);
      const vs = validateVital('blood_pressure_sys', s);
      const vd = validateVital('blood_pressure_dia', d);
      if (!vs.valid) { setVitalError(`Systolic: ${vs.message}`); return; }
      if (!vd.valid) { setVitalError(`Diastolic: ${vd.message}`); return; }
      const abnormal = vs.abnormal || vd.abnormal;
      addVitalDraft({ kind: 'blood_pressure', label: 'Blood pressure', value: `${s}/${d}`, unit: 'mmHg', abnormal, repeated: false });
      if (abnormal) toast('Abnormal BP — repeat reading required before checkout');
    } else {
      const val = Number(single);
      const res = validateVital(vitalKind, val);
      if (!res.valid) { setVitalError(res.message ?? 'Invalid value'); return; }
      const unit = VITAL_KINDS.find((k) => k.id === vitalKind)!.label.match(/\((.+)\)/)?.[1] ?? '';
      addVitalDraft({ kind: vitalKind, label: VITAL_KINDS.find((k) => k.id === vitalKind)!.label, value: String(val), unit, abnormal: res.abnormal, repeated: false });
      if (res.abnormal) toast('Abnormal reading — repeat required before checkout');
    }
    setSys(''); setDia(''); setSingle('');
  };

  const doRepeat = () => {
    if (!abnormalVital) return;
    if (abnormalVital.kind === 'blood_pressure') {
      const s = Number(repeatValue.split('/')[0]); const d = Number(repeatValue.split('/')[1]);
      const vs = validateVital('blood_pressure_sys', s);
      const vd = validateVital('blood_pressure_dia', d);
      if (!vs.valid || !vd.valid) { setVitalError('Enter repeat BP as systolic/diastolic, e.g. 160/95'); return; }
      markRepeatDone('blood_pressure', `${s}/${d}`, vs.abnormal || vd.abnormal);
    } else {
      const val = Number(repeatValue);
      const res = validateVital(abnormalVital.kind, val);
      if (!res.valid) { setVitalError(res.message ?? 'Invalid value'); return; }
      markRepeatDone(abnormalVital.kind, String(val), res.abnormal);
    }
    setRepeatValue('');
    setVitalError('');
    toast('Repeat reading recorded');
  };

  const confirmCancel = () => {
    openModal({
      title: 'Abandon this visit?',
      body: <p className="text-sm text-slate-600">All draft documentation for this visit will be discarded and the visit returns to Scheduled.</p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Keep documenting</Btn>
          <Btn variant="danger" onClick={() => { cancelActiveVisit(); closeModal(); navigate('/chw'); toast('Visit abandoned'); }}>Abandon visit</Btn>
        </>
      ),
    });
  };

  const confirmSubmit = () => {
    openModal({
      title: 'Submit visit record?',
      body: (
        <div className="text-sm text-slate-600 space-y-2">
          <p>The record will be locked with server timestamps and sent for patient confirmation. Patient confirmation verifies <b>attendance and listed services</b> — not the clinical accuracy of every reading.</p>
          <p><b>{checklistDone}/{Object.keys(draft.checklist).length}</b> checklist services completed · <b>{draft.vitals.length}</b> reading(s) recorded.</p>
        </div>
      ),
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Review more</Btn>
          <Btn onClick={() => { submitActiveVisit(); closeModal(); navigate('/chw/records'); toast('Visit submitted for patient confirmation'); }}>Submit record</Btn>
        </>
      ),
    });
  };

  return (
    <div>
      <PageHeader
        title={`Active Visit — ${patient.name}`}
        subtitle={`Started ${fmtTime(draft.startedAt)} · ${patient.address}`}
        actions={<Btn variant="danger-soft" onClick={confirmCancel}>Abandon visit</Btn>}
      />

      <div className="space-y-4">
        <StepShell n={1} title="Geofence check-in" icon={<MapPin size={17} />} done={!!draft.checkedInAt}>
          {draft.checkedInAt ? (
            <p className="text-sm text-slate-600">Checked in at <b>{fmtTime(draft.checkedInAt)}</b> · server timestamp recorded · location within geofence <Badge tone="green">verified</Badge></p>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">Simulated GPS: you are 40 m from the patient's address (inside the 150 m geofence).</p>
              <Btn onClick={() => { checkInVisit(); toast('Checked in — timestamp recorded'); }}>Check in at location</Btn>
            </>
          )}
        </StepShell>

        <StepShell n={2} title="Verify the patient" icon={<Fingerprint size={17} />} done={draft.otpVerified} locked={!draft.checkedInAt}>
          {draft.otpVerified ? (
            <p className="text-sm text-slate-600">Patient verified via <b>{VERIFICATION_LABELS[draft.verificationMethod!]}</b> <Badge tone="green">verified</Badge></p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Confirmation method">
                  <Select value={method} onChange={(e) => setMethod(e.target.value as VerificationMethod)} aria-label="Confirmation method" disabled={!draft.checkedInAt}>
                    {VERIFICATION_METHODS.map((m) => <option key={m} value={m}>{VERIFICATION_LABELS[m]}</option>)}
                  </Select>
                </Field>
                {(method === 'patient_otp' || method === 'caregiver_otp') && (
                  <Field label="One-time code (demo code: 632174)">
                    <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" aria-label="One-time code" />
                  </Field>
                )}
              </div>
              <Btn
                disabled={!draft.checkedInAt || ((method === 'patient_otp' || method === 'caregiver_otp') && otp.length < 4)}
                onClick={() => { verifyPatient(method); toast('Patient identity verified'); }}
              >
                Verify patient
              </Btn>
            </div>
          )}
        </StepShell>

        <StepShell n={3} title="Service checklist" icon={<ListChecks size={17} />} done={checklistDone === Object.keys(draft.checklist).length && checklistDone > 0} locked={!draft.otpVerified}>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(draft.checklist).map(([svc, done]) => (
              <label key={svc} className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold cursor-pointer ${done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                <input type="checkbox" className="w-5 h-5 accent-[var(--accent)]" checked={done} disabled={!draft.otpVerified} onChange={() => toggleChecklistItem(svc)} aria-label={svc} />
                {svc}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">{checklistDone}/{Object.keys(draft.checklist).length} completed</p>
        </StepShell>

        <StepShell n={4} title="Record vitals" icon={<Stethoscope size={17} />} done={draft.vitals.length > 0 && !abnormalVital} locked={!draft.otpVerified}>
          <div className="grid gap-3 sm:grid-cols-3 items-end">
            <Field label="Measurement">
              <Select value={vitalKind} onChange={(e) => setVitalKind(e.target.value as (typeof VITAL_KINDS)[number]['id'])} aria-label="Measurement kind" disabled={!draft.otpVerified}>
                {VITAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </Select>
            </Field>
            {vitalKind === 'blood_pressure' ? (
              <>
                <Field label="Systolic (mmHg)"><Input value={sys} onChange={(e) => setSys(e.target.value)} inputMode="numeric" aria-label="Systolic" /></Field>
                <Field label="Diastolic (mmHg)"><Input value={dia} onChange={(e) => setDia(e.target.value)} inputMode="numeric" aria-label="Diastolic" /></Field>
              </>
            ) : (
              <Field label="Value"><Input value={single} onChange={(e) => setSingle(e.target.value)} inputMode="decimal" aria-label="Value" /></Field>
            )}
            <Btn onClick={addVital} disabled={!draft.otpVerified}>Add reading</Btn>
          </div>
          {vitalError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-2">{vitalError}</p>}
          <p className="text-xs text-slate-500 mt-2">Range validation and required units are enforced. System timestamp and device evidence are attached automatically — backdating is not possible.</p>

          {draft.vitals.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {draft.vitals.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 py-1.5">
                  <span>{v.label}: <b>{v.value} {v.unit}</b></span>
                  <span className="flex gap-1.5">
                    {v.abnormal && <Badge tone="red">Abnormal</Badge>}
                    {v.repeated && <Badge tone="blue">Repeat recorded</Badge>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {abnormalVital && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3">
              <p className="text-sm font-bold text-red-800 mb-2">Abnormal {abnormalVital.label} reading requires a repeat</p>
              <div className="flex flex-wrap gap-2 items-end">
                <Field label={abnormalVital.kind === 'blood_pressure' ? 'Repeat BP (e.g. 170/95)' : 'Repeat value'}>
                  <Input value={repeatValue} onChange={(e) => setRepeatValue(e.target.value)} aria-label="Repeat reading" />
                </Field>
                <Btn variant="danger" size="sm" onClick={doRepeat}>Record repeat</Btn>
              </div>
            </div>
          )}
        </StepShell>

        <StepShell n={5} title="Notes, symptoms & medication" icon={<PenLine size={17} />} done={!!(draft.patientReported || draft.chwObservation)} locked={!draft.otpVerified}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Patient-reported information (their words)">
              <Textarea value={draft.patientReported} onChange={(e) => setDraftField('patientReported', e.target.value)} aria-label="Patient-reported information" placeholder="What the patient told you…" />
            </Field>
            <Field label="CHW observation (your clinical observation)">
              <Textarea value={draft.chwObservation} onChange={(e) => setDraftField('chwObservation', e.target.value)} aria-label="CHW observation" placeholder="What you observed…" />
            </Field>
            <Field label="Action taken">
              <Input value={draft.actionTaken} onChange={(e) => setDraftField('actionTaken', e.target.value)} aria-label="Action taken" />
            </Field>
            <Field label="Symptoms (comma-separated)">
              <Input value={draft.symptoms} onChange={(e) => setDraftField('symptoms', e.target.value)} aria-label="Symptoms" placeholder="e.g. dizziness, headache" />
            </Field>
            <Field label="Medication reminder / wellbeing check">
              <Input value={draft.medicationReminder} onChange={(e) => setDraftField('medicationReminder', e.target.value)} aria-label="Medication reminder" placeholder="e.g. Amlodipine 5mg — taken" />
            </Field>
            <div className="flex items-center gap-3 pt-5">
              <Toggle checked={draft.followUpRequired} onChange={(v) => setDraftField('followUpRequired', v)} label="Follow-up required" />
              <span className="text-sm font-semibold">Follow-up required</span>
            </div>
          </div>
        </StepShell>

        <StepShell n={6} title="Who was present" icon={<Users size={17} />} done={draft.presentPersons.length > 0} locked={!draft.otpVerified}>
          {draft.presentPersons.map((p, i) => (
            <KV key={i} label={p.name}><span className="text-xs">{p.relationship} · patient consent {p.consented ? 'given' : 'NOT given'}</span></KV>
          ))}
          <div className="grid gap-3 sm:grid-cols-4 items-end mt-2">
            <Field label="Name"><Input value={personName} onChange={(e) => setPersonName(e.target.value)} aria-label="Person name" placeholder="No one else present" /></Field>
            <Field label="Relationship / role">
              <Select value={personRel} onChange={(e) => setPersonRel(e.target.value)} aria-label="Relationship">
                <option>Family member</option><option>Caregiver</option><option>Neighbour</option><option>Other</option>
              </Select>
            </Field>
            <div className="flex items-center gap-2 pb-2">
              <Toggle checked={personConsent} onChange={setPersonConsent} label="Patient consent" />
              <span className="text-xs font-semibold">Patient consented</span>
            </div>
            <Btn variant="secondary" size="sm" disabled={!personName.trim()} onClick={() => { addPresentPerson({ name: personName, relationship: personRel, consented: personConsent }); setPersonName(''); }}>Add person</Btn>
          </div>
        </StepShell>

        <StepShell n={7} title="Escalation" icon={<AlertTriangle size={17} />} done={draft.escalationRaised} locked={!draft.otpVerified}>
          {draft.escalationRaised ? (
            <p className="text-sm text-slate-600">Escalation raised and routed <Badge tone="red">open</Badge></p>
          ) : (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[220px]">
                <Field label="Reason (optional — only for urgent concerns)">
                  <Input value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} aria-label="Escalation reason" placeholder="e.g. Severe dizziness, BP remains critical" />
                </Field>
              </div>
              <Btn variant="danger" size="sm" disabled={!escalationReason.trim() || !draft.otpVerified} onClick={() => { raiseEscalation(escalationReason); toast('Escalation raised — coordination notified'); }}>
                Trigger escalation
              </Btn>
            </div>
          )}
        </StepShell>

        <StepShell n={8} title="Check out" icon={<Clock size={17} />} done={!!draft.checkedOutAt} locked={!draft.checkedInAt}>
          {draft.checkedOutAt ? (
            <p className="text-sm text-slate-600">Checked out at <b>{fmtTime(draft.checkedOutAt)}</b> · duration validated <Badge tone="green">recorded</Badge></p>
          ) : (
            <Btn variant="secondary" disabled={!draft.checkedInAt} onClick={() => { checkOutVisit(); toast('Checked out — duration validated'); }}>Check out of location</Btn>
          )}
        </StepShell>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Submit visit record</h3>
              <p className="text-xs text-slate-500 mt-1">
                Requires: check-in ✓ verification ✓ at least one checklist item ✓ no pending repeat readings ✓ check-out ✓
              </p>
            </div>
            <Btn size="lg" disabled={!canSubmit} onClick={confirmSubmit}>Submit visit</Btn>
          </div>
          {!canSubmit && (
            <ul className="text-xs text-slate-500 mt-3 list-disc pl-4 space-y-0.5">
              {!draft.checkedInAt && <li>Check in at the location first</li>}
              {!draft.otpVerified && <li>Verify the patient's identity</li>}
              {checklistDone === 0 && <li>Complete at least one checklist service</li>}
              {abnormalVital && <li>Record the required repeat reading</li>}
              {!draft.checkedOutAt && <li>Check out of the location</li>}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
