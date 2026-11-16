"use client";

import { useEffect, useState } from "react";
import { Field, RiskBadge, fieldClass } from "@/components/care/fields";
import { FOLLOW_UP_ACTIONS } from "@/lib/demo-care";
import { loadClinicianCare, saveDirective, type ClinicianCare } from "@/lib/ops-client";
import { summarizeVitals } from "@/lib/risk-engine";

export function ClinicianHome() {
  const [care, setCare] = useState<ClinicianCare | null>(null);
  const [alertId, setAlertId] = useState("");
  const [consultId, setConsultId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<string>(FOLLOW_UP_ACTIONS[0]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const loaded = await loadClinicianCare();
    setCare(loaded);
    setAlertId((current) => current || loaded.alerts[0]?.id || "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  const alert = care?.alerts.find((item) => item.id === alertId) ?? care?.alerts[0];
  const patient = care?.patients.find((item) => item.id === alert?.patientId);
  const medications = (care?.medications ?? []).filter((item) => item.patientId === patient?.id);
  const vitals = (care?.vitals ?? []).filter((item) => item.patientId === patient?.id);
  const fieldNotes = (care?.visits ?? []).filter((item) => item.patientId === patient?.id && item.notes);
  const actions = (FOLLOW_UP_ACTIONS as readonly string[]).includes(action) ? [...FOLLOW_UP_ACTIONS] : [action, ...FOLLOW_UP_ACTIONS];

  function choose(id: string) {
    setAlertId(id);
    const next = care?.alerts.find((item) => item.id === id);
    const consult = care?.consultations.find((item) => item.alertId === id) ?? care?.consultations.find((item) => item.patientId === next?.patientId);
    setConsultId(consult?.id ?? null);
    setNotes(consult?.recommendationNotes ?? "");
    setAction(consult?.followUpAction || FOLLOW_UP_ACTIONS[0]);
    setFollowUpDate(consult?.followUpDate ?? "");
    setMessage(null);
  }

  useEffect(() => {
    if (!care || !alertId) return;
    const consult = care.consultations.find((item) => item.alertId === alertId);
    if (!consult) return;
    setConsultId(consult.id);
    setNotes(consult.recommendationNotes);
    setAction(consult.followUpAction || FOLLOW_UP_ACTIONS[0]);
    setFollowUpDate(consult.followUpDate ?? "");
  }, [care, alertId]);

  async function save(outcome: "in_review" | "resolved") {
    if (!care?.clinicianId || !alert || !patient) return;
    if (!notes.trim() || !action || !followUpDate) {
      setMessage("Add a recommendation, a follow-up action, and a follow-up date.");
      return;
    }
    setBusy(true);
    const saved = await saveDirective({
      patientId: patient.id,
      alertId: alert.id,
      consultationId: consultId,
      clinicianProviderId: care.clinicianId,
      recommendationNotes: notes.trim(),
      followUpAction: action,
      followUpDate,
      outcome,
    });
    setBusy(false);
    setMessage(saved.ok ? "Directive saved for the care team." : saved.error);
    if (saved.ok) await refresh();
  }

  const week = summarizeVitals(vitals, 7);
  const month = summarizeVitals(vitals, 30);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-[var(--role-accent)]">Clinician</p>
        <h1 className="mt-1 text-3xl font-semibold">{care?.clinicianName ?? "Clinical review"}</h1>
        <p className="text-sm text-muted">Yellow and red alerts assigned for review.</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>
      {message ? <p className="rounded-xl bg-[var(--role-soft)] px-3 py-2 text-sm">{message}</p> : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Flagged and escalated queue</h2>
        {(care?.alerts ?? []).length === 0 ? <p className="text-sm text-muted">No open yellow or red alerts.</p> : null}
        {(care?.alerts ?? []).map((item) => (
          <button key={item.id} type="button" onClick={() => choose(item.id)} className={`rounded-2xl border p-4 text-left ${item.id === alert?.id ? "border-primary bg-white" : "border-line bg-card"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{care?.patients.find((patient) => patient.id === item.patientId)?.name ?? "Patient"}</p>
              <RiskBadge level={item.severity} />
            </div>
            <p className="mt-1 text-sm">{item.title}</p>
            <p className="mt-1 text-sm text-muted capitalize">{item.status.replaceAll("_", " ")}</p>
          </button>
        ))}
      </section>

      {patient ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-semibold">Clinical context</h2>
          <p className="text-sm leading-6">
            {patient.name} · {patient.city}{patient.age != null ? ` · ${patient.age}` : ""}{patient.gender ? ` · ${patient.gender}` : ""}
          </p>
          <p className="text-sm">{patient.conditions.length ? patient.conditions.join(", ") : "No chronic conditions recorded."}</p>
          <div>
            <p className="text-sm font-semibold">Active medications</p>
            {medications.length === 0 ? <p className="text-sm text-muted">None recorded.</p> : medications.map((item) => (
              <p key={item.id} className="text-sm">{item.name} {item.dosage} · {item.frequency}</p>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold">7-day trend</p>
            <p className="text-sm leading-6">{week.narrative}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">30-day trend</p>
            <p className="text-sm leading-6">{month.narrative}</p>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <p className="text-sm font-semibold">CHW field notes</p>
            <p className="mt-1 text-xs text-muted">Observations from the visit. These are separate from the clinical directive.</p>
            {fieldNotes.length === 0 ? <p className="mt-2 text-sm">No field notes.</p> : fieldNotes.map((item) => (
              <p key={item.id} className="mt-2 text-sm leading-6">{item.notes}</p>
            ))}
          </div>
        </section>
      ) : null}

      {alert && patient ? (
        <form className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4" onSubmit={(event) => event.preventDefault()}>
          <h2 className="text-lg font-semibold">Clinical directive</h2>
          <Field label="Recommendation notes">
            <textarea className={fieldClass} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          <Field label="Follow-up action">
            <select className={fieldClass} value={action} onChange={(event) => setAction(event.target.value)}>
              {actions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Follow-up date">
            <input className={fieldClass} type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => void save("in_review")} className="min-h-12 rounded-xl border border-line text-sm font-semibold disabled:opacity-50">Mark In Review</button>
            <button type="button" disabled={busy} onClick={() => void save("resolved")} className="min-h-12 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">Mark Resolved</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
