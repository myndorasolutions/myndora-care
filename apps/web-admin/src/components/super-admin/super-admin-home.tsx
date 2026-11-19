"use client";

import { useEffect, useState } from "react";
import { fieldClass } from "@/components/care/fields";
import { FilterPills, Pager, SearchField, TabBar, TableFrame, usePagedRows } from "@/components/ops/compact-table";
import type { DemoCityCap, DemoFlag, DemoPlanRow } from "@/lib/demo-care";
import { loadSuperCare, saveCityCap, saveFlag, savePlan, saveThresholds, type SuperCare } from "@/lib/ops-client";
import { DEFAULT_THRESHOLDS, type RiskThresholds } from "@/lib/risk-engine";

const THRESHOLD_FIELDS: { key: keyof RiskThresholds; label: string }[] = [
  { key: "yellowSystolic", label: "Yellow systolic" },
  { key: "redSystolic", label: "Red systolic" },
  { key: "yellowDiastolic", label: "Yellow diastolic" },
  { key: "redDiastolic", label: "Red diastolic" },
  { key: "yellowFastingGlucose", label: "Yellow fasting glucose" },
  { key: "redFastingGlucose", label: "Red fasting glucose" },
  { key: "yellowRandomGlucose", label: "Yellow random glucose" },
  { key: "redRandomGlucose", label: "Red random glucose" },
];

const FLAG_COPY: Record<string, string> = {
  yoruba_audio_prompts: "Plays Yoruba voice prompts during a visit.",
  self_sponsored_signup: "Lets a patient pay for their own care.",
  offline_sync_queue: "Keeps work on the device until the network returns.",
  sms_whatsapp_dispatch: "Sends SMS and WhatsApp alerts when this is on.",
};

const compactField = "h-9 w-28 rounded-lg border border-line bg-white px-2 text-sm";

export function SuperAdminHome() {
  const [care, setCare] = useState<SuperCare | null>(null);
  const [thresholds, setThresholds] = useState<RiskThresholds>(DEFAULT_THRESHOLDS);
  const [plans, setPlans] = useState<DemoPlanRow[]>([]);
  const [caps, setCaps] = useState<DemoCityCap[]>([]);
  const [newCity, setNewCity] = useState("");
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [tab, setTab] = useState("thresholds");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const loaded = await loadSuperCare();
    setCare(loaded);
    setThresholds(loaded.thresholds);
    setPlans(loaded.plans);
    setCaps(loaded.caps);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function saveLimits(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const saved = await saveThresholds(thresholds);
    setBusy(false);
    setMessage(saved.ok ? "Risk thresholds saved." : saved.error);
    if (saved.ok) await refresh();
  }

  async function savePrices(plan: DemoPlanRow) {
    setBusy(true);
    const saved = await savePlan(plan);
    setBusy(false);
    setMessage(saved.ok ? `${plan.name} saved.` : saved.error);
    if (saved.ok) await refresh();
  }

  async function saveCap(city: string, capNgn: number | null) {
    setBusy(true);
    const saved = await saveCityCap(city, capNgn);
    setBusy(false);
    setMessage(saved.ok ? `${city} cap saved.` : saved.error);
    if (saved.ok) await refresh();
  }

  async function toggleFlag(flag: DemoFlag) {
    setBusy(true);
    const saved = await saveFlag({ ...flag, enabled: !flag.enabled });
    setBusy(false);
    setMessage(saved.ok ? `${flag.label} ${flag.enabled ? "off" : "on"}.` : saved.error);
    if (saved.ok) await refresh();
  }

  const actions = [...new Set((care?.audits ?? []).map((row) => row.action))].sort();
  const audits = (care?.audits ?? []).filter((row) => {
    if (actionFilter !== "all" && row.action !== actionFilter) return false;
    const haystack = `${row.actorName} ${row.actorRole ?? ""} ${row.action} ${row.entityType} ${row.entityId ?? ""} ${JSON.stringify(row.metadata)}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const auditPage = usePagedRows(audits, `${query}|${actionFilter}`);
  const visitPlan = plans.find((plan) => plan.code === "physical_visit");
  const subscriptionPlans = plans.filter((plan) => plan.code !== "physical_visit");

  function updatePlan(id: string, patch: Partial<DemoPlanRow>) {
    setPlans(plans.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Platform controls</h1>
        <p className="text-sm text-muted">Risk limits, prices, feature switches, and the audit log.</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>
      {message ? <p className="rounded-xl bg-[var(--role-soft)] px-3 py-2 text-sm">{message}</p> : null}
      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "thresholds", label: "Clinical Risk Thresholds" },
          { id: "pricing", label: "Pricing & Visit Caps" },
          { id: "flags", label: "Feature Flags" },
          { id: "audits", label: "Audit Logs" },
        ]}
      />

      {tab === "thresholds" ? (
        <form onSubmit={(event) => void saveLimits(event)} className="flex flex-col gap-3">
          <TableFrame>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-semibold">Limit</th>
                <th className="px-3 py-2 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {THRESHOLD_FIELDS.map((field) => (
                <tr key={field.key} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 font-semibold">{field.label}</td>
                  <td className="px-3 py-2">
                    <input className={compactField} inputMode="decimal" value={thresholds[field.key]} onChange={(event) => setThresholds({ ...thresholds, [field.key]: Number(event.target.value) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
          <button type="submit" disabled={busy} className="h-10 w-fit rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">Save thresholds</button>
        </form>
      ) : null}

      {tab === "pricing" ? (
        <div className="flex flex-col gap-4">
          <TableFrame>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-semibold">Plan</th>
                <th className="px-3 py-2 font-semibold">Daily ₦</th>
                <th className="px-3 py-2 font-semibold">Monthly ₦</th>
                <th className="px-3 py-2 font-semibold">Included services</th>
                <th className="px-3 py-2 font-semibold">One-time ₦</th>
                <th className="px-3 py-2 font-semibold">Save</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionPlans.map((plan) => (
                <tr key={plan.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 font-semibold">{plan.name}</td>
                  <td className="px-3 py-2"><input className={compactField} inputMode="decimal" value={plan.priceDaily ?? ""} onChange={(event) => updatePlan(plan.id, { priceDaily: event.target.value === "" ? null : Number(event.target.value) })} /></td>
                  <td className="px-3 py-2"><input className={compactField} inputMode="decimal" value={plan.priceMonthly ?? ""} onChange={(event) => updatePlan(plan.id, { priceMonthly: event.target.value === "" ? null : Number(event.target.value) })} /></td>
                  <td className="px-3 py-2"><input className={compactField} inputMode="numeric" value={plan.includedServiceCount} onChange={(event) => updatePlan(plan.id, { includedServiceCount: Number(event.target.value) })} /></td>
                  <td className="px-3 py-2 text-muted">—</td>
                  <td className="px-3 py-2"><button type="button" disabled={busy} onClick={() => void savePrices(plan)} className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50">Save</button></td>
                </tr>
              ))}
              {visitPlan ? (
                <tr>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{visitPlan.name}</p>
                    <p className="text-xs text-muted">Uses the city cap when the one-time price is empty.</p>
                  </td>
                  <td className="px-3 py-2 text-muted">—</td>
                  <td className="px-3 py-2 text-muted">—</td>
                  <td className="px-3 py-2">{visitPlan.includedServiceCount}</td>
                  <td className="px-3 py-2"><input className={compactField} inputMode="decimal" placeholder="City cap" value={visitPlan.priceOneTime ?? ""} onChange={(event) => updatePlan(visitPlan.id, { priceOneTime: event.target.value === "" ? null : Number(event.target.value) })} /></td>
                  <td className="px-3 py-2"><button type="button" disabled={busy} onClick={() => void savePrices(visitPlan)} className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50">Save</button></td>
                </tr>
              ) : null}
            </tbody>
          </TableFrame>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">City visit caps</h2>
            <TableFrame>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">City</th>
                  <th className="px-3 py-2 font-semibold">Cap ₦</th>
                  <th className="px-3 py-2 font-semibold">Save</th>
                </tr>
              </thead>
              <tbody>
                {caps.map((cap) => (
                  <tr key={cap.city} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 font-semibold">{cap.city}</td>
                    <td className="px-3 py-2">
                      <input className={compactField} inputMode="decimal" placeholder="Unset" value={cap.capNgn ?? ""} onChange={(event) => setCaps(caps.map((item) => item.city === cap.city ? { ...item, capNgn: event.target.value === "" ? null : Number(event.target.value) } : item))} />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" disabled={busy} onClick={() => void saveCap(cap.city, cap.capNgn)} className="h-8 rounded-lg border border-line px-3 text-xs font-semibold disabled:opacity-50">Save cap</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
            <div className="flex flex-wrap gap-2">
              <input className={`${fieldClass} h-10 max-w-xs`} placeholder="Add a city" value={newCity} onChange={(event) => setNewCity(event.target.value)} />
              <button type="button" disabled={busy || !newCity.trim()} onClick={() => { setCaps([...caps, { city: newCity.trim(), capNgn: null }]); setNewCity(""); }} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50">Add city</button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "flags" ? (
        <TableFrame>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">Flag</th>
              <th className="px-3 py-2 font-semibold">What it does</th>
              <th className="px-3 py-2 font-semibold">On</th>
            </tr>
          </thead>
          <tbody>
            {(care?.flags ?? []).map((flag) => (
              <tr key={flag.key} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 font-semibold">{flag.label}</td>
                <td className="px-3 py-2 text-muted">{FLAG_COPY[flag.key] ?? flag.label}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flag.enabled}
                    aria-label={flag.label}
                    disabled={busy}
                    onClick={() => void toggleFlag(flag)}
                    className={`relative h-6 w-11 rounded-full disabled:opacity-50 ${flag.enabled ? "bg-primary" : "bg-line"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white ${flag.enabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
      ) : null}

      {tab === "audits" ? (
        <section className="flex flex-col gap-3">
          <SearchField value={query} onChange={setQuery} placeholder="Search person, action, or details" />
          <FilterPills
            value={actionFilter}
            onChange={setActionFilter}
            options={[{ id: "all", label: "All actions" }, ...actions.map((action) => ({ id: action, label: action }))]}
          />
          <TableFrame>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-semibold">Timestamp</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Target</th>
                <th className="px-3 py-2 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditPage.slice.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-4 text-muted">No log entries match this view.</td></tr>
              ) : auditPage.slice.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.actorName}</td>
                  <td className="px-3 py-2">{row.actorRole || "Staff"}</td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2">{[row.entityType, row.entityId].filter(Boolean).join(" · ")}</td>
                  <td className="max-w-xs truncate px-3 py-2" title={JSON.stringify(row.metadata)}>{JSON.stringify(row.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
          <Pager page={auditPage.page} pageSize={auditPage.pageSize} total={auditPage.total} onPage={auditPage.setPage} />
        </section>
      ) : null}
    </div>
  );
}
