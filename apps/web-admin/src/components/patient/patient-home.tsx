"use client";

import { useEffect, useState } from "react";
import { CheckoutPanel } from "@/components/care/checkout-panel";
import { DirectiveCard } from "@/components/care/directive-card";
import { Field, RiskBadge, fieldClass } from "@/components/care/fields";
import {
  loadPatientCare,
  markMedicationTaken,
  requestRefill,
  requestReview,
  saveVital,
  type PatientCare,
  type VitalDraft,
} from "@/lib/care-client";
import { REFILL_LABEL, type DemoConsultation, type DemoRefill } from "@/lib/demo-care";
import { loadLatestDirective, loadRefillsForPatient } from "@/lib/ops-client";
import { SYMPTOMS, type GlucoseType, type RiskResult, type SymptomId } from "@/lib/risk-engine";

const emptyDraft = {
  systolic: "",
  diastolic: "",
  glucose: "",
  glucoseType: "none" as GlucoseType,
  pulse: "",
  temperature: "",
  weight: "",
  symptoms: [] as SymptomId[],
  medicationTaken: true,
  notes: "",
};

export function PatientHome() {
  const [care, setCare] = useState<PatientCare | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const [busy, setBusy] = useState(false);
  const [refills, setRefills] = useState<DemoRefill[]>([]);
  const [directive, setDirective] = useState<DemoConsultation | null>(null);

  async function refresh() {
    const loaded = await loadPatientCare();
    setCare(loaded);
    if (!loaded.patient) return;
    const [nextRefills, nextDirective] = await Promise.all([
      loadRefillsForPatient(loaded.patient.id, loaded.mode),
      loadLatestDirective(loaded.patient.id, loaded.mode),
    ]);
    setRefills(nextRefills);
    setDirective(nextDirective);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function toggleSymptom(id: SymptomId) {
    setDraft((current) => ({
      ...current,
      symptoms: current.symptoms.includes(id)
        ? current.symptoms.filter((item) => item !== id)
        : [...current.symptoms, id],
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!care?.patient) return;
    const vital = toDraft(draft);
    if (vital.systolic == null || vital.diastolic == null) {
      setError("Enter both blood pressure numbers.");
      return;
    }
    if (!inRange(vital.systolic, 40, 300) || !inRange(vital.diastolic, 20, 200)) {
      setError("Blood pressure is outside the range this record can store.");
      return;
    }
    if (vital.pulse != null && !inRange(vital.pulse, 20, 250)) {
      setError("Pulse must be between 20 and 250.");
      return;
    }
    if (vital.glucoseType !== "none" && vital.glucose == null) {
      setError("Enter the blood sugar value, or choose None.");
      return;
    }
    setBusy(true);
    setError(null);
    const saved = await saveVital(care.patient.id, vital, "patient");
    setResult(saved.result);
    setBusy(false);
    if (saved.saved.error) setError(saved.saved.error);
    await refresh();
  }

  const history = (care?.vitals ?? []).filter((row) => {
    if (row.systolic == null && row.glucose == null) return false;
    const age = Date.now() - new Date(row.readingAt).getTime();
    return age <= windowDays * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">{care?.patient?.name ?? "Patient"}</h1>
        <p className="text-sm text-muted">{care?.patient ? `${care.patient.city}, ${care.patient.state}` : "Loading care record"}</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Log vitals</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Systolic">
            <input className={fieldClass} inputMode="numeric" value={draft.systolic} onChange={(event) => setDraft({ ...draft, systolic: event.target.value })} />
          </Field>
          <Field label="Diastolic">
            <input className={fieldClass} inputMode="numeric" value={draft.diastolic} onChange={(event) => setDraft({ ...draft, diastolic: event.target.value })} />
          </Field>
          <Field label="Glucose">
            <input className={fieldClass} inputMode="decimal" value={draft.glucose} onChange={(event) => setDraft({ ...draft, glucose: event.target.value })} />
          </Field>
          <Field label="Glucose type">
            <select className={fieldClass} value={draft.glucoseType} onChange={(event) => setDraft({ ...draft, glucoseType: event.target.value as GlucoseType })}>
              <option value="none">None</option>
              <option value="fasting">Fasting</option>
              <option value="random">Random</option>
            </select>
          </Field>
          <Field label="Pulse">
            <input className={fieldClass} inputMode="numeric" value={draft.pulse} onChange={(event) => setDraft({ ...draft, pulse: event.target.value })} />
          </Field>
          <Field label="Temperature">
            <input className={fieldClass} inputMode="decimal" value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: event.target.value })} />
          </Field>
          <Field label="Weight">
            <input className={fieldClass} inputMode="decimal" value={draft.weight} onChange={(event) => setDraft({ ...draft, weight: event.target.value })} />
          </Field>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Symptoms</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SYMPTOMS.map((symptom) => (
              <button
                key={symptom.id}
                type="button"
                onClick={() => toggleSymptom(symptom.id)}
                className={`min-h-11 rounded-full px-3 text-sm font-semibold ${draft.symptoms.includes(symptom.id) ? "bg-primary text-white" : "border border-line bg-white"}`}
              >
                {symptom.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={draft.medicationTaken} onChange={(event) => setDraft({ ...draft, medicationTaken: event.target.checked })} />
          Medication taken
        </label>
        <Field label="Notes">
          <textarea className={fieldClass} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button type="submit" disabled={busy || !care?.patient} className="min-h-12 rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Saving..." : "Save reading"}
        </button>
      </form>

      {result && care?.patient ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Reading result</h2>
            <RiskBadge level={result.level} />
          </div>
          <p className="mt-3 text-sm leading-6">{result.explanation}</p>
          <p className="mt-2 text-sm font-semibold">{result.nextStep}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold" onClick={() => setResult(null)}>
              Recheck later
            </button>
            <a className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold" href={care.chwPhone ? `tel:${care.chwPhone}` : "#chw"}>
              Contact CHW{care.chwName ? ` · ${care.chwName}` : ""}
            </a>
            <button
              type="button"
              className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold"
              onClick={() => void requestReview(care.patient!.id, result.explanation, result.level).then(() => refresh())}
            >
              Request clinician review
            </button>
            {care.patient.emergencyContactPhone ? (
              <a className="inline-flex min-h-12 items-center justify-center rounded-xl bg-danger px-4 text-sm font-semibold text-white" href={`tel:${care.patient.emergencyContactPhone}`}>
                Call emergency contact
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Vitals history</h2>
          <div className="flex gap-2">
            {[7, 30].map((days) => (
              <button key={days} type="button" onClick={() => setWindowDays(days as 7 | 30)} className={`min-h-10 rounded-full px-3 text-sm font-semibold ${windowDays === days ? "bg-ink text-white" : "border border-line"}`}>
                {days} days
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {history.length === 0 ? <p className="text-sm text-muted">No readings in this window.</p> : null}
          {history.map((row) => (
            <article key={row.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-card p-4">
              <div>
                <p className="font-semibold">{row.systolic ?? "—"}/{row.diastolic ?? "—"}</p>
                <p className="text-sm text-muted">{new Date(row.readingAt).toLocaleString()} · {row.glucoseType === "none" ? "No glucose" : `${row.glucose ?? "—"} ${row.glucoseType}`}</p>
              </div>
              <RiskBadge level={row.riskStatus} />
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Active medications</h2>
        <div className="mt-3 flex flex-col gap-3">
          {(care?.medications ?? []).length === 0 ? <p className="text-sm text-muted">No active medications.</p> : null}
          {(care?.medications ?? []).map((medication) => (
            <div key={medication.id} className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
              <p className="font-semibold">{medication.name}</p>
              <p className="text-sm text-muted">{medication.dosage} · {medication.frequency}</p>
              <p className="text-sm">Pharmacy: {(() => {
                const latest = refills.filter((row) => row.medicationId === medication.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
                return latest ? REFILL_LABEL[latest.status] : "No refill request";
              })()}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold" onClick={() => care?.patient && void markMedicationTaken(care.patient.id).then(() => refresh())}>
                  Mark taken
                </button>
                <button type="button" className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold" onClick={() => care?.patient && void requestRefill(care.patient.id, medication.id).then(() => refresh())}>
                  Request pharmacy refill
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DirectiveCard directive={directive} />

      {care?.patient?.isSelfSponsored ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-semibold">Self-sponsored billing and plan</h2>
          {care.plan ? (
            <p className="mt-2 text-sm leading-6">
              {care.plan.name} is {care.plan.status}. {care.plan.dailyLabel} or {care.plan.monthlyLabel}. You can open the sponsor view for this same record.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">No active package is attached yet. Plus is ₦500/day or ₦15,000/month.</p>
          )}
          <CheckoutPanel
            patientId={care.patient.id}
            city={care.patient.city}
            email="grace.adeyemi@demo.myndora.care"
            payerUserId="demo-patient"
            onChanged={() => void refresh()}
          />
        </section>
      ) : null}
    </div>
  );
}

function toDraft(draft: typeof emptyDraft): VitalDraft {
  return {
    systolic: numberOrNull(draft.systolic),
    diastolic: numberOrNull(draft.diastolic),
    glucose: numberOrNull(draft.glucose),
    glucoseType: draft.glucoseType,
    pulse: numberOrNull(draft.pulse),
    temperature: numberOrNull(draft.temperature),
    weight: numberOrNull(draft.weight),
    symptoms: draft.symptoms,
    medicationTaken: draft.medicationTaken,
    notes: draft.notes,
  };
}

function numberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}
