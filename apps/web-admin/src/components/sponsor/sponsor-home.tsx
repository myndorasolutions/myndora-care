"use client";

import { useEffect, useState } from "react";
import { CheckoutPanel } from "@/components/care/checkout-panel";
import { DirectiveCard } from "@/components/care/directive-card";
import { RiskBadge, fieldClass } from "@/components/care/fields";
import { createDispute, loadSponsorCare, type SponsorCare } from "@/lib/care-client";
import { REFILL_LABEL, type DemoConsultation, type DemoRefill } from "@/lib/demo-care";
import { loadLatestDirective, loadRefillsForPatient } from "@/lib/ops-client";

export function SponsorHome() {
  const [care, setCare] = useState<SponsorCare | null>(null);
  const [open, setOpen] = useState(false);
  const [visitId, setVisitId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refills, setRefills] = useState<DemoRefill[]>([]);
  const [directive, setDirective] = useState<DemoConsultation | null>(null);

  async function refresh() {
    const loaded = await loadSponsorCare();
    setCare(loaded);
    setVisitId(loaded.visits[0]?.id ?? "");
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

  const latest = care?.vitals[0];
  const visit = care?.visits[0];

  async function submitDispute(event: React.FormEvent) {
    event.preventDefault();
    if (!visitId || reason.trim().length < 8) {
      setMessage("Choose a visit and describe what happened.");
      return;
    }
    setBusy(true);
    const error = await createDispute(visitId, reason.trim());
    setBusy(false);
    setMessage(error ?? "Dispute sent for admin review.");
    if (!error) {
      setOpen(false);
      setReason("");
      await refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold">{care?.patient?.name ?? "Family sponsor"}</h1>
        <p className="text-sm text-muted">{care ? `${care.sponsorName} · ${care.patient?.city ?? ""}` : "Loading"}</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>

      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Latest reading</h2>
          {latest ? <RiskBadge level={latest.riskStatus} /> : null}
        </div>
        {latest ? (
          <p className="mt-2 text-sm">
            {latest.systolic ?? "—"}/{latest.diastolic ?? "—"}
            {latest.glucose != null ? ` · glucose ${latest.glucose} ${latest.glucoseType}` : ""} · {new Date(latest.readingAt).toLocaleString()}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">No reading yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Community health worker</h2>
        <p className="mt-2 font-semibold">{visit?.chwName ?? "Amina Bello"}</p>
        <p className="text-sm text-muted">Community Health Extension Worker · Ilorin</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(visit?.badges.length ? visit.badges : ["home_visit", "remote_check"]).map((badge) => (
            <span key={badge} className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{badge.replaceAll("_", " ")}</span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Completed visits</h2>
        {(care?.visits ?? []).map((item) => (
          <article key={item.id} className="rounded-2xl border border-line bg-card p-4 text-sm">
            <p className="font-semibold capitalize">{item.visitType.replaceAll("_", " ")}</p>
            <p className="mt-1 text-muted">{item.completedAt ? new Date(item.completedAt).toLocaleString() : "Time not recorded"}</p>
            <p className="mt-2">{item.gpsLat && item.gpsLng ? "GPS verified" : "GPS not recorded"} · {item.patientConfirmed ? "Patient confirmed" : "Not confirmed"} · Audio {item.audioLanguageUsed || "not set"}</p>
            <p className="mt-1 text-muted">{item.confirmationMethod}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Abnormal reading alerts</h2>
        {(care?.alerts ?? []).filter((alert) => alert.severity !== "green").map((alert) => (
          <article key={alert.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{alert.title}</p>
              <RiskBadge level={alert.severity} />
            </div>
            <p className="mt-2 text-sm leading-6">{alert.message}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Pharmacy refills</h2>
        {refills.length === 0 ? <p className="mt-2 text-sm text-muted">No refill requests.</p> : refills.map((refill) => (
          <p key={refill.id} className="mt-2 text-sm">{refill.medicationName} {refill.dosage}: {REFILL_LABEL[refill.status]}</p>
        ))}
      </section>

      <DirectiveCard directive={directive} />

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Package boundary</h2>
        <p className="mt-2 text-sm leading-6">{care?.planLabel}</p>
        {care?.patient ? (
          <CheckoutPanel
            patientId={care.patient.id}
            city={care.patient.city}
            email="tunde.adeyemi@demo.myndora.care"
            payerUserId="demo-sponsor"
            onChanged={() => void refresh()}
          />
        ) : null}
        <button type="button" onClick={() => setOpen(true)} className="mt-4 min-h-12 rounded-xl bg-ink px-4 text-sm font-semibold text-white">
          Dispute service
        </button>
      </section>

      {open ? (
        <form onSubmit={(event) => void submitDispute(event)} className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-semibold">Dispute a visit</h2>
          <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
            Visit
            <select className={fieldClass} value={visitId} onChange={(event) => setVisitId(event.target.value)}>
              {(care?.visits ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.visitType} · {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : item.id}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
            What should admin review?
            <textarea className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {message ? <p className="mt-3 text-sm">{message}</p> : null}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className="min-h-12 flex-1 rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60">
              {busy ? "Sending..." : "Send dispute"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold">
              Close
            </button>
          </div>
        </form>
      ) : null}
      {message && !open ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
