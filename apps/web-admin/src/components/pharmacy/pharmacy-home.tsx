"use client";

import { useEffect, useState } from "react";
import { Field, RiskBadge, fieldClass } from "@/components/care/fields";
import { maybeNotify } from "@/lib/billing";
import { REFILL_LABEL, type RefillStatus } from "@/lib/demo-care";
import { loadPharmacyCare, recordHubVitals, updateRefill, type PharmacyCare } from "@/lib/ops-client";
import type { GlucoseType, RiskResult, SymptomId } from "@/lib/risk-engine";

export function PharmacyHome() {
  const [care, setCare] = useState<PharmacyCare | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [patientId, setPatientId] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [glucose, setGlucose] = useState("");
  const [glucoseType, setGlucoseType] = useState<GlucoseType>("random");
  const [result, setResult] = useState<RiskResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const loaded = await loadPharmacyCare();
    setCare(loaded);
    setPatientId((current) => current || loaded.patients[0]?.id || "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function setStatus(id: string, status: RefillStatus) {
    if (status === "unavailable" && !(notes[id] ?? "").trim()) {
      setMessage("Add an availability note before marking a refill unavailable.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const saved = await updateRefill(id, status, status === "unavailable" ? notes[id].trim() : null);
    const refill = care?.refills.find((row) => row.id === id);
    if (saved.ok && status === "ready_for_pickup" && refill) {
      await maybeNotify({
        patientId: refill.patientId,
        templateType: "refill_ready",
        message: `${refill.medicationName} ${refill.dosage} is ready for pickup or delivery.`,
      });
    }
    setBusy(false);
    setMessage(saved.ok ? "Refill status saved." : saved.error);
    if (saved.ok) await refresh();
  }

  async function saveReading(event: React.FormEvent) {
    event.preventDefault();
    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (!patientId || systolic === "" || diastolic === "" || sys < 40 || sys > 300 || dia < 20 || dia > 200) {
      setMessage("Choose a patient and enter a blood pressure reading in range.");
      return;
    }
    if (glucoseType !== "none" && glucose === "") {
      setMessage("Enter the blood sugar value, or choose None.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const saved = await recordHubVitals(patientId, {
      systolic: sys,
      diastolic: dia,
      glucose: glucose === "" ? null : Number(glucose),
      glucoseType,
      pulse: null,
      temperature: null,
      weight: null,
      symptoms: [] as SymptomId[],
      medicationTaken: null,
      notes: "Walk-in hub check",
    });
    setResult(saved.result);
    setBusy(false);
    setMessage(saved.result.level === "green" ? "Reading saved. No alert was created." : "A yellow or red alert was sent for clinical review.");
    setSystolic("");
    setDiastolic("");
    setGlucose("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-[var(--role-accent)]">Pharmacy</p>
        <h1 className="mt-1 text-3xl font-semibold">{care?.pharmacyName ?? "Pharmacy hub"}</h1>
        <p className="text-sm text-muted">Refill queue and walk-in blood pressure or glucose checks.</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>

      {message ? <p className="rounded-xl bg-[var(--role-soft)] px-3 py-2 text-sm">{message}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Refill queue</h2>
        {(care?.refills ?? []).length === 0 ? <p className="text-sm text-muted">No refill requests.</p> : null}
        {(care?.refills ?? []).map((refill) => (
          <article key={refill.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{refill.patientName}</p>
                <p className="text-sm text-muted">{refill.medicationName} {refill.dosage}</p>
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{REFILL_LABEL[refill.status]}</span>
            </div>
            {refill.notes ? <p className="mt-2 text-sm leading-6">{refill.notes}</p> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button type="button" disabled={busy} onClick={() => void setStatus(refill.id, "ready_for_pickup")} className="min-h-12 rounded-xl bg-primary px-3 text-sm font-semibold text-white disabled:opacity-50">Ready for Pickup/Delivery</button>
              <button type="button" disabled={busy} onClick={() => void setStatus(refill.id, "fulfilled")} className="min-h-12 rounded-xl border border-line px-3 text-sm font-semibold disabled:opacity-50">Fulfilled</button>
              <button type="button" disabled={busy} onClick={() => void setStatus(refill.id, "unavailable")} className="min-h-12 rounded-xl border border-line px-3 text-sm font-semibold disabled:opacity-50">Mark Unavailable</button>
            </div>
            <textarea className={`${fieldClass} mt-3`} placeholder="Availability note" value={notes[refill.id] ?? ""} onChange={(event) => setNotes({ ...notes, [refill.id]: event.target.value })} />
          </article>
        ))}
      </section>

      <form onSubmit={(event) => void saveReading(event)} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Record Hub BP / Glucose Check</h2>
        <Field label="Patient">
          <select className={fieldClass} value={patientId} onChange={(event) => setPatientId(event.target.value)}>
            {(care?.patients ?? []).map((patient) => (
              <option key={patient.id} value={patient.id}>{patient.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <p className="text-sm font-semibold sm:col-span-2">Blood Pressure (mmHg)</p>
          <Field label="Systolic (mmHg)" unit="mmHg"><input className={`${fieldClass} pr-16`} inputMode="numeric" value={systolic} onChange={(event) => setSystolic(event.target.value)} /></Field>
          <Field label="Diastolic (mmHg)" unit="mmHg"><input className={`${fieldClass} pr-16`} inputMode="numeric" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} /></Field>
          <Field label="Blood Glucose (mg/dL)" unit="mg/dL"><input className={`${fieldClass} pr-16`} inputMode="decimal" value={glucose} onChange={(event) => setGlucose(event.target.value)} /></Field>
          <Field label="Glucose type">
            <select className={fieldClass} value={glucoseType} onChange={(event) => setGlucoseType(event.target.value as GlucoseType)}>
              <option value="random">Random</option>
              <option value="fasting">Fasting</option>
              <option value="none">None</option>
            </select>
          </Field>
        </div>
        <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save hub reading"}</button>
        {result ? (
          <div className="flex items-start gap-3">
            <RiskBadge level={result.level} />
            <p className="text-sm leading-6">{result.explanation}</p>
          </div>
        ) : null}
      </form>
    </div>
  );
}
