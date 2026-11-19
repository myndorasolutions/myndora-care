"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DispatchLog } from "@/components/care/dispatch-log";
import { Field, RiskBadge, fieldClass } from "@/components/care/fields";
import { Drawer, FilterPills, KpiStrip, Pager, SearchField, TabBar, TableFrame, usePagedRows } from "@/components/ops/compact-table";
import {
  CHW_CHECKS,
  homeVisitReady,
  type DemoProvider,
  type ProviderKind,
  type VerificationStatus,
} from "@/lib/demo-care";
import { loadAdminCare, resolveDispute, saveAssignment, updateChwVerification, type AdminCare } from "@/lib/ops-client";
import { ROLE_LABEL, isClearedVerification } from "@/lib/roles";

const STATUSES: VerificationStatus[] = ["pending", "remote_approved", "home_visit_approved", "verified", "suspended"];
const PARTNER_STATUSES: VerificationStatus[] = ["pending", "verified", "suspended"];
const STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: "Pending review",
  remote_approved: "Approved for remote checks",
  home_visit_approved: "Approved for home visits",
  verified: "Approved",
  suspended: "Suspended",
};
const STATUS_SHORT: Record<VerificationStatus, string> = {
  pending: "Pending",
  remote_approved: "Remote",
  home_visit_approved: "Home visits",
  verified: "Approved",
  suspended: "Suspended",
};

type Panel =
  | { kind: "provider"; id: string }
  | { kind: "patient"; id: string }
  | { kind: "dispute"; id: string }
  | null;

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
  const [tab, setTab] = useState("partners");
  const [panel, setPanel] = useState<Panel>(null);
  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerRole, setPartnerRole] = useState("all");
  const [partnerStatus, setPartnerStatus] = useState("all");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientRisk, setPatientRisk] = useState("all");
  const [queueQuery, setQueueQuery] = useState("");
  const [queueKind, setQueueKind] = useState("disputes");

  async function refresh() {
    const loaded = await loadAdminCare();
    setCare(loaded);
    const next: Record<string, { status: VerificationStatus; badges: string[] }> = {};
    for (const provider of loaded.providers) {
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
    const active = (type: ProviderKind) => {
      const providerId = care.assignments.find((row) => row.patientId === patientId && row.providerType === type && row.active)?.providerId ?? "";
      const provider = care.providers.find((item) => item.id === providerId);
      return provider && isClearedVerification(provider.verificationStatus) ? providerId : "";
    };
    setChwId(active("chw"));
    setPharmacyId(active("pharmacy"));
    setClinicianId(active("clinician"));
  }, [care, patientId]);

  const providers = [...(care?.providers ?? [])].sort((left, right) => {
    const rank = (status: VerificationStatus) => (status === "pending" ? 0 : status === "suspended" ? 1 : 2);
    return rank(left.verificationStatus) - rank(right.verificationStatus) || left.name.localeCompare(right.name);
  });
  const cleared = (type: ProviderKind) =>
    (care?.providers ?? []).filter((provider) => provider.providerType === type && isClearedVerification(provider.verificationStatus));

  const partnerRows = providers.filter((provider) => {
    if (partnerRole !== "all" && provider.providerType !== partnerRole) return false;
    if (partnerStatus !== "all" && provider.verificationStatus !== partnerStatus) return false;
    const haystack = `${provider.name} ${provider.email ?? ""} ${provider.serviceArea ?? ""} ${provider.city} ${provider.cadre}`.toLowerCase();
    return haystack.includes(partnerQuery.trim().toLowerCase());
  });
  const partnerPage = usePagedRows(partnerRows, `${partnerQuery}|${partnerRole}|${partnerStatus}`);

  const patientRows = [...(care?.patients ?? [])]
    .sort((left, right) => left.name.localeCompare(right.name))
    .filter((patient) => {
      if (patientRisk !== "all" && patient.riskStatus !== patientRisk) return false;
      const haystack = `${patient.name} ${patient.email ?? ""} ${patient.city} ${patient.planName ?? ""}`.toLowerCase();
      return haystack.includes(patientQuery.trim().toLowerCase());
    });
  const patientPage = usePagedRows(patientRows, `${patientQuery}|${patientRisk}`);

  const openDisputes = (care?.disputes ?? []).filter((dispute) => dispute.status === "open" || dispute.status === "under_review");
  const reviewVisits = (care?.visits ?? []).filter(
    (visit) => visit.status === "needs_review" || visit.status === "completed_unverified" || visit.syncStatus === "failed_sync",
  );
  const disputeRows = openDisputes.filter((dispute) => `${dispute.patientName} ${dispute.reason}`.toLowerCase().includes(queueQuery.trim().toLowerCase()));
  const visitRows = reviewVisits.filter((visit) => `${visit.patientName} ${visit.notes} ${visit.status}`.toLowerCase().includes(queueQuery.trim().toLowerCase()));
  const alertRows = (care?.alerts ?? []).filter((alert) => {
    const name = care?.patients.find((patient) => patient.id === alert.patientId)?.name ?? "";
    return `${name} ${alert.title} ${alert.message}`.toLowerCase().includes(queueQuery.trim().toLowerCase());
  });
  const disputePage = usePagedRows(disputeRows, `${queueQuery}|disputes`);
  const visitPage = usePagedRows(visitRows, `${queueQuery}|visits`);
  const alertPage = usePagedRows(alertRows, `${queueQuery}|alerts`);
  const activeQueue = queueKind === "visits" ? visitPage : queueKind === "alerts" ? alertPage : disputePage;

  function toggleCheck(providerId: string, key: string) {
    setDrafts((current) => {
      const draft = current[providerId];
      if (!draft) return current;
      const badges = draft.badges.includes(key) ? draft.badges.filter((item) => item !== key) : [...draft.badges, key];
      return { ...current, [providerId]: { ...draft, badges } };
    });
  }

  async function saveProvider(provider: DemoProvider, status?: VerificationStatus) {
    const draft = drafts[provider.id] ?? { status: provider.verificationStatus, badges: provider.badges };
    const nextStatus = status ?? draft.status;
    setBusy(true);
    const saved = await updateChwVerification(provider.id, nextStatus, draft.badges, provider.providerType === "chw");
    setBusy(false);
    setMessage(saved.ok ? `${provider.name} updated.` : saved.error);
    if (saved.ok) {
      setPanel(null);
      await refresh();
    }
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
    if (!error) {
      setPanel(null);
      await refresh();
    }
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
    if (saved.ok) {
      setPanel(null);
      await refresh();
    }
  }

  function assignedName(id: string, type: ProviderKind) {
    const providerId = care?.assignments.find((row) => row.patientId === id && row.providerType === type && row.active)?.providerId;
    return care?.providers.find((provider) => provider.id === providerId)?.name ?? "Unassigned";
  }

  const selectedProvider = providers.find((provider) => provider.id === (panel?.kind === "provider" ? panel.id : ""));
  const selectedPatient = care?.patients.find((patient) => patient.id === (panel?.kind === "patient" ? panel.id : ""));
  const selectedDispute = openDisputes.find((dispute) => dispute.id === (panel?.kind === "dispute" ? panel.id : ""));
  const providerDraft = selectedProvider ? drafts[selectedProvider.id] ?? { status: selectedProvider.verificationStatus, badges: selectedProvider.badges } : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Care coordinator</h1>
        <p className="text-sm text-muted">Care partners, patients, disputes, and message logs.</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>
      {message ? <p className="rounded-xl bg-[var(--role-soft)] px-3 py-2 text-sm">{message}</p> : null}
      <KpiStrip
        items={[
          { label: "Total patients", value: care?.patients.length ?? 0 },
          { label: "Pending applications", value: providers.filter((provider) => provider.verificationStatus === "pending").length },
          { label: "Active Care Partners", value: providers.filter((provider) => isClearedVerification(provider.verificationStatus)).length },
          { label: "Open disputes / alerts", value: openDisputes.length + (care?.alerts.length ?? 0) },
        ]}
      />
      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "partners", label: "Care Partner Queue" },
          { id: "patients", label: "Patients & Assignments" },
          { id: "queue", label: "Disputes & Sync Queue" },
          { id: "messages", label: "SMS / WhatsApp" },
        ]}
      />

      {tab === "partners" ? (
        <section className="flex flex-col gap-3">
          <SearchField value={partnerQuery} onChange={setPartnerQuery} placeholder="Search name, email, or ward / facility" />
          <FilterPills
            value={partnerRole}
            onChange={setPartnerRole}
            options={[
              { id: "all", label: "All roles" },
              { id: "chw", label: "CHW" },
              { id: "pharmacy", label: "Pharmacy" },
              { id: "clinician", label: "Clinician" },
            ]}
          />
          <FilterPills
            value={partnerStatus}
            onChange={setPartnerStatus}
            options={[{ id: "all", label: "All statuses" }, ...STATUSES.map((status) => ({ id: status, label: STATUS_SHORT[status] }))]}
          />
          <TableFrame>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-semibold">Name & email</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Ward / facility / qualification</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Access</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partnerPage.slice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted">No Care Partners match this view.</td>
                </tr>
              ) : partnerPage.slice.map((provider) => (
                <tr key={provider.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2">
                    <p className="font-semibold">{provider.name}</p>
                    <p className="text-xs text-muted">{provider.email || "No email"}</p>
                  </td>
                  <td className="px-3 py-2">{ROLE_LABEL[provider.providerType]}</td>
                  <td className="px-3 py-2">{[provider.serviceArea, provider.city, provider.cadre].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-2"><StatusPill status={provider.verificationStatus} /></td>
                  <td className="px-3 py-2">{accessLabel(provider)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <RowButton onClick={() => setPanel({ kind: "provider", id: provider.id })}>Review</RowButton>
                      <RowButton
                        disabled={busy || !canApprove(provider)}
                        onClick={() => void saveProvider(provider, provider.providerType === "chw" ? "remote_approved" : "verified")}
                      >
                        Approve
                      </RowButton>
                      <RowButton disabled={busy || provider.verificationStatus === "suspended"} onClick={() => void saveProvider(provider, "suspended")}>
                        Suspend
                      </RowButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
          <Pager page={partnerPage.page} pageSize={partnerPage.pageSize} total={partnerPage.total} onPage={partnerPage.setPage} />
        </section>
      ) : null}

      {tab === "patients" ? (
        <section className="flex flex-col gap-3">
          <SearchField value={patientQuery} onChange={setPatientQuery} placeholder="Search name, email, or city" />
          <FilterPills
            value={patientRisk}
            onChange={setPatientRisk}
            options={[
              { id: "all", label: "All risk" },
              { id: "green", label: "Green" },
              { id: "yellow", label: "Yellow" },
              { id: "red", label: "Red" },
            ]}
          />
          <TableFrame>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-semibold">Patient</th>
                <th className="px-3 py-2 font-semibold">Plan</th>
                <th className="px-3 py-2 font-semibold">Risk</th>
                <th className="px-3 py-2 font-semibold">Assigned CHW / pharmacy</th>
                <th className="px-3 py-2 font-semibold">Sponsor</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patientPage.slice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted">No patients match this view.</td>
                </tr>
              ) : patientPage.slice.map((patient) => (
                <tr key={patient.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 font-semibold">{patient.name}</td>
                  <td className="px-3 py-2">{patient.planName || "No plan"}</td>
                  <td className="px-3 py-2"><RiskBadge level={patient.riskStatus} /></td>
                  <td className="px-3 py-2">{assignedName(patient.id, "chw")} / {assignedName(patient.id, "pharmacy")}</td>
                  <td className="px-3 py-2">{patient.isSelfSponsored ? "Self-sponsored" : "Sponsored"}</td>
                  <td className="px-3 py-2">
                    <RowButton onClick={() => { setPatientId(patient.id); setPanel({ kind: "patient", id: patient.id }); }}>Manage</RowButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
          <Pager page={patientPage.page} pageSize={patientPage.pageSize} total={patientPage.total} onPage={patientPage.setPage} />
        </section>
      ) : null}

      {tab === "queue" ? (
        <section className="flex flex-col gap-3">
          <SearchField value={queueQuery} onChange={setQueueQuery} placeholder="Search patient or note" />
          <FilterPills
            value={queueKind}
            onChange={setQueueKind}
            options={[
              { id: "disputes", label: `Disputes (${openDisputes.length})` },
              { id: "visits", label: `Visits (${reviewVisits.length})` },
              { id: "alerts", label: `Alerts (${care?.alerts.length ?? 0})` },
            ]}
          />
          {queueKind === "disputes" ? (
            <TableFrame>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Patient</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputePage.slice.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-muted">No disputes match this view.</td></tr>
                ) : disputePage.slice.map((dispute) => (
                  <tr key={dispute.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 font-semibold">{dispute.patientName}</td>
                    <td className="max-w-xs truncate px-3 py-2">{dispute.reason}</td>
                    <td className="px-3 py-2 capitalize">{dispute.status.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2"><RowButton onClick={() => setPanel({ kind: "dispute", id: dispute.id })}>Review</RowButton></td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          ) : null}
          {queueKind === "visits" ? (
            <TableFrame>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Patient</th>
                  <th className="px-3 py-2 font-semibold">Visit status</th>
                  <th className="px-3 py-2 font-semibold">Sync</th>
                  <th className="px-3 py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {visitPage.slice.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-muted">No visits are waiting.</td></tr>
                ) : visitPage.slice.map((visit) => (
                  <tr key={visit.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 font-semibold">{visit.patientName}</td>
                    <td className="px-3 py-2 capitalize">{visit.status.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2 capitalize">{visit.syncStatus.replaceAll("_", " ")}</td>
                    <td className="max-w-xs truncate px-3 py-2">{visit.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          ) : null}
          {queueKind === "alerts" ? (
            <TableFrame>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Patient</th>
                  <th className="px-3 py-2 font-semibold">Alert</th>
                  <th className="px-3 py-2 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {alertPage.slice.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-4 text-muted">No open alerts.</td></tr>
                ) : alertPage.slice.map((alert) => (
                  <tr key={alert.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 font-semibold">{care?.patients.find((patient) => patient.id === alert.patientId)?.name ?? "Patient"}</td>
                    <td className="px-3 py-2">{alert.title}</td>
                    <td className="px-3 py-2"><RiskBadge level={alert.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          ) : null}
          <Pager page={activeQueue.page} pageSize={activeQueue.pageSize} total={activeQueue.total} onPage={activeQueue.setPage} />
        </section>
      ) : null}

      {tab === "messages" ? <DispatchLog /> : null}

      <Drawer title={selectedProvider ? selectedProvider.name : "Review"} open={panel?.kind === "provider" && Boolean(selectedProvider && providerDraft)} onClose={() => setPanel(null)}>
        {selectedProvider && providerDraft ? (
          <>
            <p className="text-sm text-muted">{ROLE_LABEL[selectedProvider.providerType]} · {selectedProvider.email || "No email"}</p>
            <p className="text-sm">{[selectedProvider.serviceArea, selectedProvider.city, selectedProvider.cadre].filter(Boolean).join(" · ")}</p>
            {selectedProvider.providerType === "chw" ? (
              <div className="grid gap-2">
                {CHW_CHECKS.map((check) => (
                  <label key={check.key} className="flex items-center gap-3 text-sm font-semibold">
                    <input type="checkbox" checked={providerDraft.badges.includes(check.key)} onChange={() => toggleCheck(selectedProvider.id, check.key)} />
                    {check.label}
                  </label>
                ))}
                <p className="text-sm text-muted">
                  {homeVisitReady(providerDraft.badges) ? "Home visits can be approved." : "Home visit approval stays locked until every check is complete."}
                </p>
              </div>
            ) : null}
            <Field label="Status">
              <select
                className={fieldClass}
                value={providerDraft.status}
                onChange={(event) => setDrafts({ ...drafts, [selectedProvider.id]: { ...providerDraft, status: event.target.value as VerificationStatus } })}
              >
                {statusOptions(selectedProvider, providerDraft.status).map((status) => (
                  <option key={status} value={status} disabled={selectedProvider.providerType === "chw" && !homeVisitReady(providerDraft.badges) && (status === "home_visit_approved" || status === "verified")}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" disabled={busy} onClick={() => void saveProvider(selectedProvider)} className="min-h-12 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">
              Save application
            </button>
          </>
        ) : null}
      </Drawer>

      <Drawer title={selectedPatient ? selectedPatient.name : "Assignments"} open={panel?.kind === "patient" && Boolean(selectedPatient)} onClose={() => setPanel(null)}>
        {selectedPatient ? (
          <>
            <p className="text-sm text-muted">{selectedPatient.planName || "No plan"} · {selectedPatient.isSelfSponsored ? "Self-sponsored" : "Sponsored"}</p>
            <Field label="CHW">
              <select className={fieldClass} value={chwId} onChange={(event) => setChwId(event.target.value)}>
                <option value="">Unassigned</option>
                {cleared("chw").map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
              </select>
            </Field>
            <Field label="Pharmacy hub">
              <select className={fieldClass} value={pharmacyId} onChange={(event) => setPharmacyId(event.target.value)}>
                <option value="">Unassigned</option>
                {cleared("pharmacy").map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
              </select>
            </Field>
            <Field label="Clinician">
              <select className={fieldClass} value={clinicianId} onChange={(event) => setClinicianId(event.target.value)}>
                <option value="">Unassigned</option>
                {cleared("clinician").map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
              </select>
            </Field>
            <button type="button" disabled={busy || (!chwId && !pharmacyId && !clinicianId)} onClick={() => void saveMatrix()} className="min-h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">
              Save assignments
            </button>
          </>
        ) : null}
      </Drawer>

      <Drawer title={selectedDispute ? selectedDispute.patientName : "Dispute"} open={panel?.kind === "dispute" && Boolean(selectedDispute)} onClose={() => setPanel(null)}>
        {selectedDispute ? (
          <>
            <p className="text-sm leading-6">{selectedDispute.reason}</p>
            <p className="text-xs font-semibold uppercase text-muted">{selectedDispute.status.replaceAll("_", " ")}</p>
            <textarea className={fieldClass} placeholder="Resolution note" value={comments[selectedDispute.id] ?? ""} onChange={(event) => setComments({ ...comments, [selectedDispute.id]: event.target.value })} />
            <div className="grid gap-2">
              <button type="button" disabled={busy} onClick={() => void decide(selectedDispute.id, "uphold")} className="min-h-12 rounded-xl border border-line text-sm font-semibold disabled:opacity-50">Uphold Visit</button>
              <button type="button" disabled={busy} onClick={() => void decide(selectedDispute.id, "credit")} className="min-h-12 rounded-xl border border-line text-sm font-semibold disabled:opacity-50">Issue Service Credit/Reschedule</button>
              <button type="button" disabled={busy} onClick={() => void decide(selectedDispute.id, "flag")} className="min-h-12 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-50">Flag CHW</button>
            </div>
          </>
        ) : null}
      </Drawer>
    </div>
  );
}

function statusOptions(provider: DemoProvider, status: VerificationStatus) {
  const isChw = provider.providerType === "chw";
  if (isChw || PARTNER_STATUSES.includes(status)) return isChw ? STATUSES : PARTNER_STATUSES;
  return [status, ...PARTNER_STATUSES];
}

function canApprove(provider: DemoProvider) {
  if (provider.verificationStatus === "pending" || provider.verificationStatus === "suspended") return true;
  return false;
}

function accessLabel(provider: DemoProvider) {
  if (provider.providerType !== "chw") return "Facility";
  if (provider.verificationStatus === "home_visit_approved" || provider.verificationStatus === "verified") return "Home visits";
  if (provider.verificationStatus === "remote_approved") return "Remote";
  return "Not approved";
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const tone = status === "suspended" ? "bg-danger text-white" : status === "pending" ? "bg-warning text-white" : "bg-success text-white";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{STATUS_SHORT[status]}</span>;
}

function RowButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="h-8 rounded-lg border border-line px-2 text-xs font-semibold disabled:opacity-40">
      {children}
    </button>
  );
}
