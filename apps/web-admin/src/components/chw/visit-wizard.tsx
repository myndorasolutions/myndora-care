"use client";

import { useEffect, useState } from "react";
import { uploadProof } from "@/lib/worker-client";
import { AUDIO_PROMPTS, playPrompt } from "@/lib/audio-prompts";
import { DirectiveCard } from "@/components/care/directive-card";
import { Field, RiskBadge, fieldClass } from "@/components/care/fields";
import { loadChwCare, saveVisit, type ChwCare, type VitalDraft } from "@/lib/care-client";
import { ILORIN_GPS, type DemoConsultation } from "@/lib/demo-care";
import { loadLatestDirective } from "@/lib/ops-client";
import { flagEnabled, loadFlags } from "@/lib/platform-state";
import { SYMPTOMS, type GlucoseType, type RiskResult, type SymptomId } from "@/lib/risk-engine";

const checkupPrompts = AUDIO_PROMPTS.filter((prompt) => prompt.id !== "save_checkup");

export function VisitWizard() {
  const [care, setCare] = useState<ChwCare | null>(null);
  const [step, setStep] = useState(1);
  const [patientId, setPatientId] = useState("");
  const [visitType, setVisitType] = useState<"remote_check" | "physical_visit">("remote_check");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number; simulated: boolean } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [audioLanguage, setAudioLanguage] = useState("yo");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [glucose, setGlucose] = useState("");
  const [glucoseType, setGlucoseType] = useState<GlucoseType>("none");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [medicationTaken, setMedicationTaken] = useState(true);
  const [symptoms, setSymptoms] = useState<SymptomId[]>([]);
  const [notes, setNotes] = useState("");
  const [proofType, setProofType] = useState<"otp" | "caregiver">("otp");
  const [proofValue, setProofValue] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [yoruba, setYoruba] = useState(true);
  const [directive, setDirective] = useState<DemoConsultation | null>(null);

  useEffect(() => {
    void loadChwCare().then((loaded) => {
      setCare(loaded);
      setPatientId(loaded.patients[0]?.id ?? "");
    });
    void loadFlags().then((flags) => {
      const enabled = flagEnabled(flags, "yoruba_audio_prompts");
      setYoruba(enabled);
      if (!enabled) setAudioLanguage("en");
    });
  }, []);

  useEffect(() => {
    if (!care || !patientId) return;
    void loadLatestDirective(patientId, care.mode).then(setDirective);
  }, [care, patientId]);

  function captureLocation() {
    if (!navigator.geolocation) {
      setGps({ ...ILORIN_GPS, simulated: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setGps({ lat: position.coords.latitude, lng: position.coords.longitude, simulated: false }),
      () => setGps({ ...ILORIN_GPS, simulated: true }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function startVisit() {
    if (!patientId) {
      setError("Choose a patient first.");
      return;
    }
    setError(null);
    setStartedAt(new Date().toISOString());
    captureLocation();
    setStep(2);
  }

  function checklistReady() {
    return checkupPrompts.every((prompt) => answers[prompt.id]?.trim());
  }

  function vitalsReady() {
    const sys = Number(systolic);
    const dia = Number(diastolic);
    return systolic !== "" && diastolic !== "" && sys >= 40 && sys <= 300 && dia >= 20 && dia <= 200;
  }

  function proofReady() {
    return attested && proofValue.trim().length >= 2 && checklistReady() && vitalsReady() && gps != null && startedAt != null;
  }

  async function submit() {
    if (!care || !proofReady() || !gps || !startedAt) {
      setError("Complete the checklist, vitals, confirmation, and attestation before verifying this visit.");
      return;
    }
    setBusy(true);
    setError(null);
    const visitId = crypto.randomUUID();
    let proofUrl: string | null = null;
    if (proofFile) {
      const uploaded = await uploadProof(visitId, proofFile);
      proofUrl = uploaded.proof_r2_url;
    }
    const draft: VitalDraft = {
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      glucose: glucose === "" ? null : Number(glucose),
      glucoseType,
      pulse: pulse === "" ? null : Number(pulse),
      temperature: temperature === "" ? null : Number(temperature),
      weight: weight === "" ? null : Number(weight),
      symptoms,
      medicationTaken,
      notes,
    };
    const saved = await saveVisit({
      patientId,
      providerId: care.providerId,
      visitType,
      startedAt,
      gpsLat: gps.lat,
      gpsLng: gps.lng,
      checklist: answers,
      audioLanguage,
      confirmationMethod: proofType === "otp" ? `otp:${proofValue.trim()}` : `caregiver:${proofValue.trim()}`,
      notes,
      draft,
      id: visitId,
      proofR2Url: proofUrl,
    });
    setResult(saved.result);
    setBusy(false);
    if (saved.saved.error) setError(saved.saved.error);
    setStep(5);
  }

  const patient = care?.patients.find((item) => item.id === patientId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold text-[var(--role-accent)]">Step {Math.min(step, 5)} of 5</p>
        <h1 className="text-3xl font-semibold">Field visit</h1>
        <p className="text-sm text-muted">{patient ? patient.name : "Assigned patients"}</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>

      <DirectiveCard directive={directive} />

      {step === 1 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Start visit and verify</h2>
          <div className="grid gap-2">
            {(care?.patients ?? []).map((item) => (
              <button key={item.id} type="button" onClick={() => setPatientId(item.id)} className={`min-h-14 rounded-2xl border px-4 text-left font-semibold ${patientId === item.id ? "border-primary bg-white" : "border-line bg-card"}`}>
                {item.name}
                <span className="mt-1 block text-sm font-normal text-muted">{item.city}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setVisitType("remote_check")} className={`min-h-14 rounded-2xl font-semibold ${visitType === "remote_check" ? "bg-primary text-white" : "border border-line bg-card"}`}>Remote check</button>
            <button type="button" onClick={() => setVisitType("physical_visit")} className={`min-h-14 rounded-2xl font-semibold ${visitType === "physical_visit" ? "bg-primary text-white" : "border border-line bg-card"}`}>Physical home visit</button>
          </div>
          <button type="button" onClick={startVisit} className="min-h-14 rounded-2xl bg-ink text-base font-semibold text-white">Start visit</button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Guided checkup</h2>
            {yoruba ? (
              <button type="button" className="text-sm font-semibold text-primary" onClick={() => setAudioLanguage(audioLanguage === "yo" ? "en" : "yo")}>
                {audioLanguage === "yo" ? "Yoruba / English" : "English"}
              </button>
            ) : null}
          </div>
          {checkupPrompts.map((prompt) => (
            <article key={prompt.id} className="rounded-2xl border border-line bg-card p-4">
              <p className="font-semibold">{prompt.english}</p>
              <button type="button" onClick={() => void playPrompt(prompt)} className="mt-3 min-h-12 rounded-xl border border-line px-4 text-sm font-semibold">
                {yoruba && prompt.yorubaSrc ? "Play Audio (Yoruba / English)" : "Play Audio (English)"}
              </button>
              <input className={`${fieldClass} mt-3`} placeholder="Answer" value={answers[prompt.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [prompt.id]: event.target.value })} />
            </article>
          ))}
          <button type="button" disabled={!checklistReady()} onClick={() => setStep(3)} className="min-h-14 rounded-2xl bg-ink font-semibold text-white disabled:opacity-50">Continue</button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Capture vitals and notes</h2>
          <p className="rounded-xl bg-warning/15 px-3 py-2 text-sm font-semibold">CHWs do not diagnose or prescribe.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">Blood Pressure (mmHg)</p>
            <Field label="Systolic (mmHg)" unit="mmHg"><input className={`${fieldClass} pr-16`} inputMode="numeric" value={systolic} onChange={(event) => setSystolic(event.target.value)} /></Field>
            <Field label="Diastolic (mmHg)" unit="mmHg"><input className={`${fieldClass} pr-16`} inputMode="numeric" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} /></Field>
            <Field label="Blood Glucose (mg/dL)" unit="mg/dL"><input className={`${fieldClass} pr-16`} inputMode="decimal" value={glucose} onChange={(event) => setGlucose(event.target.value)} /></Field>
            <Field label="Glucose type">
              <select className={fieldClass} value={glucoseType} onChange={(event) => setGlucoseType(event.target.value as GlucoseType)}>
                <option value="none">None</option>
                <option value="fasting">Fasting</option>
                <option value="random">Random</option>
              </select>
            </Field>
            <Field label="Pulse (bpm)" unit="bpm"><input className={`${fieldClass} pr-14`} inputMode="numeric" value={pulse} onChange={(event) => setPulse(event.target.value)} /></Field>
            <Field label="Temperature (°C)" unit="°C"><input className={`${fieldClass} pr-12`} inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} /></Field>
            <Field label="Weight (kg)" unit="kg"><input className={`${fieldClass} pr-12`} inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} /></Field>
          </div>
          <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={medicationTaken} onChange={(event) => setMedicationTaken(event.target.checked)} />
            Medication taken
          </label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((symptom) => (
              <button key={symptom.id} type="button" onClick={() => setSymptoms((current) => current.includes(symptom.id) ? current.filter((item) => item !== symptom.id) : [...current, symptom.id])} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${symptoms.includes(symptom.id) ? "bg-primary text-white" : "border border-line bg-white"}`}>
                {symptom.label}
              </button>
            ))}
          </div>
          <Field label="Field observations"><textarea className={fieldClass} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          <button type="button" disabled={!vitalsReady()} onClick={() => setStep(4)} className="min-h-14 rounded-2xl bg-ink font-semibold text-white disabled:opacity-50">Continue</button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Visit proof and attestation</h2>
          <p className="text-sm text-muted">
            Started {startedAt ? new Date(startedAt).toLocaleString() : ""}. GPS {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}${gps.simulated ? " (Ilorin test location)" : ""}` : "waiting"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setProofType("otp")} className={`min-h-12 rounded-xl font-semibold ${proofType === "otp" ? "bg-primary text-white" : "border border-line"}`}>Confirmation code</button>
            <button type="button" onClick={() => setProofType("caregiver")} className={`min-h-12 rounded-xl font-semibold ${proofType === "caregiver" ? "bg-primary text-white" : "border border-line"}`}>Caregiver sign-off</button>
          </div>
          <Field label={proofType === "otp" ? "Confirmation code" : "Caregiver name"}>
            <input className={fieldClass} value={proofValue} onChange={(event) => setProofValue(event.target.value)} />
          </Field>
          <Field label="Visit proof photo">
            <input className={fieldClass} type="file" accept="image/*,application/pdf" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} />
          </Field>
          <label className="flex items-start gap-3 text-sm font-semibold">
            <input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1" />
            I attest that this visit record is truthful and complete.
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="button" disabled={busy || !proofReady()} onClick={() => void submit()} className="min-h-14 rounded-2xl bg-ink font-semibold text-white disabled:opacity-50">
            {busy ? "Saving..." : "Submit visit"}
          </button>
        </section>
      ) : null}

      {step === 5 && result ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Visit saved</h2>
            <RiskBadge level={result.level} />
          </div>
          <p className="mt-3 text-sm leading-6">{result.explanation}</p>
          <p className="mt-2 text-sm">{result.level === "green" ? "No alert was created." : "A yellow or red alert was created for review."}</p>
          <button type="button" className="mt-4 min-h-12 text-sm font-semibold text-primary" onClick={() => void playPrompt(AUDIO_PROMPTS.find((prompt) => prompt.id === "save_checkup")!)}>
            {yoruba ? "Play Audio (Yoruba / English)" : "Play Audio (English)"}
          </button>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
