"use client";

import { useEffect, useState } from "react";
import { DispatchLog } from "@/components/care/dispatch-log";
import { Field, RiskBadge, fieldClass } from "@/components/care/fields";
import {
  CHW_CHECKS,
  homeVisitReady,
  type DemoProvider,
  type ProviderKind,
  type VerificationStatus,
} from "@/lib/demo-care";
import { loadAdminCare, resolveDispute, saveAssignment, updateChwVerification, type AdminCare } from "@/lib/ops-client";

const STATUSES: VerificationStatus[] = ["pending", "remote_approved", "home_visit_approved", "verified", "suspended"];

export function AdminHome() {
  const [care, setCare] = useState<AdminCare | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: VerificationStatus; badges: string[] }>>({});
  const [patientId, setPatientId] = useState("");
  const [chwId, setChwId] = useState("");
  const [pharmacyId, setPharmacyId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const loaded = await loadAdminCare();
    setCare(loaded);
    const next: Record<string, { status: VerificationStatus; badges: string[] }> = {};
    for (const provider of loaded.providers.filter((item) => item.providerType === "chw")) {
      next[provider.id] = { status: provider.verificationStatus, badges: provider.badges };
    }
    setDrafts(next);
    const first = loaded.patients[0]?.id ?? "";
    setPatientId((current) => current || first);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!care || !patientId) return;
    const active = (type: ProviderKind) => care.assignments.find((row) => row.patientId === patientId && row.providerType === type && row.active)?.providerId ?? "";
    setChwId(active("chw"));
    setPharmacyId(active("pharmacy"));
    setClinicianId(active("clinician"));
  }, [care, patientId]);

  const chws = (care?.providers ?? []).filter((provider) => provider.providerType === "chw");
  const reviewVisits = (care?.visits ?? []).filter(
    (visit) => visit.status === "needs_review" || visit.status === "completed_unverified" || visit.syncStatus === "failed_sync",
  );

  function toggleCheck(providerId: string, key: string) {
    setDrafts((current) => {
      const draft = current[providerId];
      if (!draft) return current;
      const badges = draft.badges.includes(key) ? draft.badges.filter((item) => item !== key) : [...draft.badges, key];
      return { ...current, [providerId]: { ...draft, badges } };
    });
  }

  async function saveChw(provider: DemoProvider) {
    const draft = drafts[provider.id];
    if (!draft) return;
    setBusy(true);
    const saved = await updateChwVerification(provider.id, draft.status, draft.badges);
    setBusy(false);
    setMessage(saved.ok ? `${provider.name} updated.` : saved.error);
    if (saved.ok) await refresh();
  }

  async function saveMatrix() {
    if (!care || !patientId) return;
    setBusy(true);
    const jobs = [
      chwId ? saveAssignment(patientId, "chw", chwId, care.assignments) : null,
      pharmacyId ? saveAssignment(patientId, "pharmacy", pharmacyId, care.assignments) : null,
      clinicianId ? saveAssignment(patientId, "clinician", clinicianId, care.assignments) : null,
    ].filter((job) => job != null);
    const results = await Promise.all(jobs);
    setBusy(false);
    const error = results.find((result) => !result.ok)?.error;
    setMessage(error ?? "Assignments saved.");
    if (!error) await refresh();
  }

  async function decide(disputeId: string, action: "uphold" | "credit" | "flag") {
    const dispute = care?.disputes.find((item) => item.id === disputeId);
    if (!care || !dispute) return;
    if ((comments[disputeId] ?? "").trim().length < 4) {
      setMessage("Add a short resolution note.");
      return;
    }
    setBusy(true);
    const saved = await resolveDispute({ dispute, action, comment: comments[disputeId].trim(), providers: care.providers });
    setBusy(false);
    setMessage(saved.ok ? "Dispute updated." : saved.error);
    if (saved.ok) await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-[var(--role-accent)]">Admin</p>
        <h1 className="mt-1 text-3xl font-semibold">Care coordinator</h1>
        <p className="text-sm text-muted">CHW verification, assignments, and the quality queue.</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>
      {message ? <p className="rounded-xl bg-[var(--role-soft)] px-3 py-2 text-sm">{message}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">CHW vetting</h2>
        {chws.map((provider) => {
          const draft = drafts[provider.id] ?? { status: provider.verificationStatus, badges: provider.badges };
          const ready = homeVisitReady(draft.badges);
          return (
            <article key={provider.id} className="rounded-2xl border border-line bg-card p-4">
              <p className="font-semibold">{provider.name}</p>
              <p className="text-sm text-muted">{provider.cadre} · {provider.city}</p>
              <div className="mt-3 grid gap-2">
                {CHW_CHECKS.map((check) => (
                  <label key={check.key} className="flex items-center gap-3 text-sm font-semibold">
                    <input type="checkbox" checked={draft.badges.includes(check.key)} onChange={() => toggleCheck(provider.id, check.key)} />
                    {check.label}
                  </label>
                ))}
              </div>
              <Field label="Status">
                <select className={`${fieldClass} mt-2`} value={draft.status} onChange={(event) => setDrafts({ ...drafts, [provider.id]: { ...draft, status: event.target.value as VerificationStatus } })}>
                  {STATUSES.map((status) => (
                    <option key={status} value={status} disabled={!ready && (status === "home_visit_approved" || status === "verified")}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="mt-2 text-sm text-muted">{ready ? "Home visits can be approved." : "Home visit approval stays locked until every check is complete."}</p>
              <button type="button" disabled={busy} onClick={() => void saveChw(provider)} className="mt-3 min-h-12 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">Save CHW</button>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Patient assignments</h2>
        <div className="mt-3 grid gap-3">
          <Field label="Patient">
            <select className={fieldClass} value={patientId} onChange={(event) => setPatientId(event.target.value)}>
              {(care?.patients ?? []).map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
            </select>
          </Field>
          <Field label="CHW">
            <select className={fieldClass} value={chwId} onChange={(event) => setChwId(event.target.value)}>
              <option value="">Unassigned</option>
              {chws.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
          </Field>
          <Field label="Pharmacy hub">
            <select className={fieldClass} value={pharmacyId} onChange={(event) => setPharmacyId(event.target.value)}>
              <option value="">Unassigned</option>
              {(care?.providers ?? []).filter((provider) => provider.providerType === "pharmacy").map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
          </Field>
          <Field label="Clinician">
            <select className={fieldClass} value={clinicianId} onChange={(event) => setClinicianId(event.target.value)}>
              <option value="">Unassigned</option>
              {(care?.providers ?? []).filter((provider) => provider.providerType === "clinician").map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
          </Field>
        </div>
        <button type="button" disabled={busy || (!chwId && !pharmacyId && !clinicianId)} onClick={() => void saveMatrix()} className="mt-4 min-h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Save assignments</button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Quality, sync, and disputes</h2>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Disputes</h3>
        {(care?.disputes ?? []).filter((dispute) => dispute.status === "open" || dispute.status === "under_review").map((dispute) => (
          <article key={dispute.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-semibold">{dispute.patientName}</p>
            <p className="mt-1 text-sm leading-6">{dispute.reason}</p>
            <p className="mt-1 text-xs font-semibold uppercase text-muted">{dispute.status.replaceAll("_", " ")}</p>
            <textarea className={`${fieldClass} mt-3`} placeholder="Resolution note" value={comments[dispute.id] ?? ""} onChange={(event) => setComments({ ...comments, [dispute.id]: event.target.value })} />
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button type="button" disabled={busy} onClick={() => void decide(dispute.id, "uphold")} className="min-h-12 rounded-xl border border-line text-sm font-semibold disabled:opacity-50">Uphold Visit</button>
              <button type="button" disabled={busy} onClick={() => void decide(dispute.id, "credit")} className="min-h-12 rounded-xl border border-line text-sm font-semibold disabled:opacity-50">Issue Service Credit/Reschedule</button>
              <button type="button" disabled={busy} onClick={() => void decide(dispute.id, "flag")} className="min-h-12 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">Flag CHW</button>
            </div>
          </article>
        ))}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Visits needing review</h3>
        {reviewVisits.length === 0 ? <p className="text-sm text-muted">No visits are waiting.</p> : reviewVisits.map((visit) => (
          <article key={visit.id} className="rounded-2xl border border-line bg-card p-4 text-sm">
            <p className="font-semibold">{visit.patientName}</p>
            <p className="mt-1 text-muted">{visit.status.replaceAll("_", " ")} · {visit.syncStatus.replaceAll("_", " ")}</p>
            <p className="mt-2">{visit.notes}</p>
          </article>
        ))}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Open alerts</h3>
        {(care?.alerts ?? []).map((alert) => (
          <article key={alert.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-card p-4">
            <div>
              <p className="font-semibold">{care?.patients.find((patient) => patient.id === alert.patientId)?.name ?? "Patient"}</p>
              <p className="text-sm">{alert.title}</p>
            </div>
            <RiskBadge level={alert.severity} />
          </article>
        ))}
      </section>
      <DispatchLog />
    </div>
  );
}
