import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/kit';
import { ApiError } from '@/lib/api';
import {
  chwApi,
  type AudioPrompt,
  type CheckupVitalsPayload,
  type ChwPatient,
  type ChwVisit,
} from '@/lib/chwApi';
import {
  saveChwDraftFlag,
  useAudioPrompts,
  useChwPatients,
  useChwVisits,
} from '@/lib/chwQueries';

type WizardStep = 'select' | 'form' | 'verify' | 'done';

const CHECKLIST_KEYS = [
  'WELL_BEING_CHECK',
  'MEDICATION_ADHERENCE',
  'NUTRITION_CHECK',
  'CARDIO_NEURO_CHECK',
  'URGENT_SCALATION_SCREEN',
] as const;

function speakPrompt(text: string, language: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = language.toLowerCase().startsWith('yo') ? 'yo-NG' : 'en-NG';
  window.speechSynthesis.speak(utter);
}

function randomOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function ChwActiveVisitPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitIdParam = searchParams.get('visitId');
  const queryClient = useQueryClient();

  const [selectedPatient, setSelectedPatient] = useState<ChwPatient | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<ChwVisit | null>(null);
  const [step, setStep] = useState<WizardStep>('select');
  const [audioLang, setAudioLang] = useState<'English' | 'Yoruba'>('Yoruba');
  const [otpExpected, setOtpExpected] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [verifyMode, setVerifyMode] = useState<'otp' | 'signature'>('otp');
  const [signed, setSigned] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hydratedVisit = useRef<string | null>(null);

  const [systolic, setSystolic] = useState('128');
  const [diastolic, setDiastolic] = useState('82');
  const [pulse, setPulse] = useState('72');
  const [temperature, setTemperature] = useState('36.6');
  const [bloodSugar, setBloodSugar] = useState('110');
  const [bloodSugarContext, setBloodSugarContext] = useState<'fasting' | 'random'>(
    'fasting',
  );
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, string>>(
    Object.fromEntries(CHECKLIST_KEYS.map((k) => [k, ''])),
  );

  const patientsQuery = useChwPatients();
  const visitsQuery = useChwVisits();
  const promptsQuery = useAudioPrompts();

  const scheduledVisits = useMemo(
    () =>
      (visitsQuery.data ?? []).filter(
        (v) => v.status === 'SCHEDULED' || v.status === 'ATTEMPTED',
      ),
    [visitsQuery.data],
  );

  const promptsForLang: AudioPrompt[] = useMemo(() => {
    const all = promptsQuery.data ?? [];
    return all.filter((p) => p.language === audioLang);
  }, [promptsQuery.data, audioLang]);

  const startForPatient = (patient: ChwPatient) => {
    setSelectedPatient(patient);
    setSelectedVisit(null);
    setStep('form');
    setResultMessage(null);
    setOtpInput('');
    setSigned(false);
    saveChwDraftFlag('new');
  };

  const startForVisit = (visit: ChwVisit) => {
    const patient =
      visit.patient ??
      patientsQuery.data?.find((p) => p.id === visit.patientId) ??
      null;
    if (!patient) return;
    setSelectedPatient(patient);
    setSelectedVisit(visit);
    setStep('form');
    setResultMessage(null);
    setOtpInput('');
    setSigned(false);
    saveChwDraftFlag(visit.id);
  };

  useEffect(() => {
    if (!visitIdParam || hydratedVisit.current === visitIdParam) return;
    if (!visitsQuery.data || !patientsQuery.data) return;
    const visit = visitsQuery.data.find((v) => v.id === visitIdParam);
    if (visit) {
      hydratedVisit.current = visitIdParam;
      startForVisit(visit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when data arrives
  }, [visitIdParam, visitsQuery.data, patientsQuery.data]);

  const buildPayload = (): CheckupVitalsPayload => {
    if (!selectedPatient) throw new Error('No patient selected');
    return {
      patientId: selectedPatient.id,
      sponsorId: selectedPatient.sponsorId,
      scheduledTime: selectedVisit?.scheduledTime ?? new Date().toISOString(),
      checklistResponses: { ...checklist },
      systolicBp: Number(systolic) || undefined,
      diastolicBp: Number(diastolic) || undefined,
      pulseRate: Number(pulse) || undefined,
      temperatureCelsius: Number(temperature) || undefined,
      bloodSugarMgDl: Number(bloodSugar) || undefined,
      bloodSugarContext,
      chwObservationNotes: notes || undefined,
    };
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const recorded = selectedVisit
        ? await chwApi.recordVisit(selectedVisit.id, payload)
        : await chwApi.createVisit(payload);

      const visitId = recorded.visit.id;
      const completed = await chwApi.completeVisit(visitId, {
        chwAttestationSigned: true,
        verificationOtp: verifyMode === 'otp' ? otpInput : undefined,
      });

      return { recorded, completed };
    },
    onSuccess: ({ recorded }) => {
      const esc = recorded.escalation;
      setResultMessage(
        esc
          ? `Checkup saved. Escalation opened (${esc.severity}): ${esc.triggerReason}`
          : 'Checkup saved and verified successfully.',
      );
      setStep('done');
      saveChwDraftFlag(null);
      void queryClient.invalidateQueries({ queryKey: ['chw', 'visits'] });
      void queryClient.invalidateQueries({ queryKey: ['chw', 'patients'] });
    },
  });

  const onFormContinue = (e: FormEvent) => {
    e.preventDefault();
    if (!systolic || !diastolic) return;
    setOtpExpected(randomOtp());
    setOtpInput('');
    setSigned(false);
    setStep('verify');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || step !== 'verify' || verifyMode !== 'signature') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const pos = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };

    const onDown = (ev: PointerEvent) => {
      drawing.current = true;
      const p = pos(ev);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      canvas.setPointerCapture(ev.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      if (!drawing.current) return;
      const p = pos(ev);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      setSigned(true);
    };
    const onUp = () => {
      drawing.current = false;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, [step, verifyMode]);

  const verifyReady =
    verifyMode === 'otp'
      ? otpInput.length === 4 && otpInput === otpExpected
      : signed;

  const listError =
    patientsQuery.error instanceof ApiError
      ? patientsQuery.error.message
      : patientsQuery.isError
        ? 'Could not load patients. Ensure you are signed in as an activated CHW and the API is reachable.'
        : null;

  const resetToSelect = () => {
    setStep('select');
    setSelectedPatient(null);
    setSelectedVisit(null);
    setResultMessage(null);
    saveChwDraftFlag(null);
  };

  return (
    <div>
      <PageHeader
        title="Active visit"
        subtitle="Select a patient or scheduled visit, capture vitals with guided audio, then verify with OTP or signature."
        actions={
          step !== 'select' && step !== 'done' ? (
            <Btn variant="secondary" size="sm" onClick={resetToSelect}>
              Change patient
            </Btn>
          ) : undefined
        }
      />

      {listError && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{listError}</p>
        </Card>
      )}

      {step === 'select' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Assigned patients
            </h2>
            {patientsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading patients…</p>
            ) : (patientsQuery.data ?? []).length === 0 ? (
              <EmptyState
                title="No patients assigned"
                hint="Patients appear here after sponsor onboarding and CHW assignment."
              />
            ) : (
              <ul className="space-y-3">
                {(patientsQuery.data ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{p.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {p.conditionTags?.join(', ') || 'No conditions'} ·{' '}
                        {p.preferredLanguage}
                        {!p.consentStatus ? ' · consent pending' : ''}
                      </p>
                      <p className="truncate text-xs text-slate-400">{p.address}</p>
                    </div>
                    <Btn
                      size="sm"
                      disabled={!p.consentStatus}
                      onClick={() => startForPatient(p)}
                    >
                      Start checkup
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Scheduled visits
            </h2>
            {visitsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading schedule…</p>
            ) : scheduledVisits.length === 0 ? (
              <EmptyState title="No scheduled visits" hint="You can still start a new checkup from a patient." />
            ) : (
              <ul className="space-y-3">
                {scheduledVisits.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {v.patient?.fullName ?? v.patientId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(v.scheduledTime).toLocaleString()} · {v.status}
                      </p>
                    </div>
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => startForVisit(v)}
                    >
                      Open checkup
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {step === 'form' && selectedPatient && (
        <form onSubmit={onFormContinue} className="mx-auto max-w-3xl space-y-6">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Guided checkup</h2>
              <p className="text-sm text-slate-500">
                {selectedPatient.fullName}
                {selectedVisit
                  ? ` · visit ${selectedVisit.id.slice(0, 8)}…`
                  : ' · new visit'}
              </p>
            </div>

            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-700">Audio prompts</p>
                <div className="flex gap-1">
                  {(['Yoruba', 'English'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`rounded-lg px-3 py-1 text-xs font-medium ${
                        audioLang === lang
                          ? 'bg-[var(--role-accent,var(--blue))] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                      onClick={() => setAudioLang(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {promptsForLang.map((p) => (
                  <Btn
                    key={p.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => speakPrompt(p.transcriptText, p.language)}
                    title={p.transcriptText}
                  >
                    ▶ {p.promptKey.replace(/_/g, ' ')}
                  </Btn>
                ))}
                {!promptsForLang.length && (
                  <p className="text-xs text-slate-500">
                    No prompts loaded for {audioLang}.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Systolic BP">
                <Input
                  type="number"
                  required
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                />
              </Field>
              <Field label="Diastolic BP">
                <Input
                  type="number"
                  required
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                />
              </Field>
              <Field label="Heart rate">
                <Input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                />
              </Field>
              <Field label="Temperature (°C)">
                <Input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </Field>
              <Field label="Blood sugar (mg/dL)">
                <Input
                  type="number"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                />
              </Field>
              <Field label="Blood sugar context">
                <Select
                  value={bloodSugarContext}
                  onChange={(e) =>
                    setBloodSugarContext(e.target.value as 'fasting' | 'random')
                  }
                >
                  <option value="fasting">Fasting</option>
                  <option value="random">Random</option>
                </Select>
              </Field>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-slate-700">Checklist answers</p>
              {CHECKLIST_KEYS.map((key) => (
                <Field key={key} label={key.replace(/_/g, ' ')}>
                  <Input
                    value={checklist[key] ?? ''}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder="Patient response"
                  />
                </Field>
              ))}
            </div>

            <div className="mt-6">
              <Field label="Observation notes">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-6">
              <Btn type="submit">Continue to verification</Btn>
            </div>
          </Card>
        </form>
      )}

      {step === 'verify' && selectedPatient && (
        <Card className="mx-auto max-w-xl space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Visit verification</h2>
          <p className="text-sm text-slate-500">
            Confirm with a patient OTP or CHW signature attestation before submit.
          </p>

          <div className="flex gap-2">
            {(['otp', 'signature'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  verifyMode === mode
                    ? 'bg-[var(--role-accent,var(--blue))] text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => setVerifyMode(mode)}
              >
                {mode === 'otp' ? 'OTP' : 'Signature'}
              </button>
            ))}
          </div>

          {verifyMode === 'otp' ? (
            <div className="space-y-3">
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-slate-900">
                {otpExpected}
              </p>
              <p className="text-center text-xs text-slate-500">
                Show this code to the patient, then re-enter it below to confirm.
              </p>
              <input
                className="mc-input text-center tracking-widest"
                inputMode="numeric"
                maxLength={4}
                value={otpInput}
                onChange={(e) =>
                  setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="Enter 4-digit OTP"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <canvas
                ref={canvasRef}
                width={480}
                height={160}
                className="w-full touch-none rounded-xl border border-slate-300 bg-white"
              />
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => {
                  const canvas = canvasRef.current;
                  const ctx = canvas?.getContext('2d');
                  if (canvas && ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                  }
                  setSigned(false);
                }}
              >
                Clear signature
              </Btn>
            </div>
          )}

          {submitMutation.isError && (
            <p className="text-sm text-red-600">
              {(submitMutation.error as Error)?.message || 'Submit failed'}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Btn
              variant="secondary"
              onClick={() => setStep('form')}
              disabled={submitMutation.isPending}
            >
              Back
            </Btn>
            <Btn
              disabled={!verifyReady || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit checkup'}
            </Btn>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card className="mx-auto max-w-xl space-y-4">
          <div className="flex items-center gap-2">
            <Badge tone="green">Complete</Badge>
            <h2 className="text-lg font-semibold text-slate-900">Checkup complete</h2>
          </div>
          <p className="text-sm text-slate-600">{resultMessage}</p>
          <div className="flex flex-wrap gap-2">
            <Btn
              onClick={() => {
                resetToSelect();
                navigate('/chw/today');
              }}
            >
              Back to Today
            </Btn>
            <Btn variant="secondary" onClick={resetToSelect}>
              Another checkup
            </Btn>
            <Link to="/chw/records" className="mc-btn mc-btn-secondary mc-btn-sm">
              View records
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
