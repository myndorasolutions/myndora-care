"use client";

import { useEffect, useState } from "react";
import { DispatchLog } from "@/components/care/dispatch-log";
import { fieldClass } from "@/components/care/fields";
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

export function SuperAdminHome() {
  const [care, setCare] = useState<SuperCare | null>(null);
  const [thresholds, setThresholds] = useState<RiskThresholds>(DEFAULT_THRESHOLDS);
  const [plans, setPlans] = useState<DemoPlanRow[]>([]);
  const [caps, setCaps] = useState<DemoCityCap[]>([]);
  const [newCity, setNewCity] = useState("");
  const [query, setQuery] = useState("");
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

  const audits = (care?.audits ?? []).filter((row) => {
    const haystack = `${row.actorName} ${row.action} ${row.entityType} ${JSON.stringify(row.metadata)}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const subscriptionPlans = plans.filter((plan) => plan.code !== "physical_visit");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-[var(--role-accent)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold">Platform controls</h1>
        <p className="text-sm text-muted">Thresholds, plan prices, feature flags, and the audit log.</p>
        {care?.notice ? <p className="mt-2 text-sm text-muted">{care.notice}</p> : null}
      </div>
      {message ? <p className="rounded-xl bg-[var(--role-soft)] px-3 py-2 text-sm">{message}</p> : null}

      <form onSubmit={(event) => void saveLimits(event)} className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Clinical risk thresholds</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {THRESHOLD_FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm font-semibold">
              {field.label}
              <input className={fieldClass} inputMode="decimal" value={thresholds[field.key]} onChange={(event) => setThresholds({ ...thresholds, [field.key]: Number(event.target.value) })} />
            </label>
          ))}
        </div>
        <button type="submit" disabled={busy} className="mt-4 min-h-12 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">Save thresholds</button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Subscription pricing</h2>
        {subscriptionPlans.map((plan) => (
          <article key={plan.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-semibold">{plan.name}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold">Daily ₦<input className={`${fieldClass} mt-1`} inputMode="decimal" value={plan.priceDaily ?? ""} onChange={(event) => setPlans(plans.map((item) => item.id === plan.id ? { ...item, priceDaily: event.target.value === "" ? null : Number(event.target.value) } : item))} /></label>
              <label className="text-sm font-semibold">Monthly ₦<input className={`${fieldClass} mt-1`} inputMode="decimal" value={plan.priceMonthly ?? ""} onChange={(event) => setPlans(plans.map((item) => item.id === plan.id ? { ...item, priceMonthly: event.target.value === "" ? null : Number(event.target.value) } : item))} /></label>
              <label className="text-sm font-semibold">Included services<input className={`${fieldClass} mt-1`} inputMode="numeric" value={plan.includedServiceCount} onChange={(event) => setPlans(plans.map((item) => item.id === plan.id ? { ...item, includedServiceCount: Number(event.target.value) } : item))} /></label>
            </div>
            <button type="button" disabled={busy} onClick={() => void savePrices(plan)} className="mt-3 min-h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Save {plan.name}</button>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Physical visit city caps</h2>
        <div className="mt-3 flex flex-col gap-3">
          {caps.map((cap) => (
            <div key={cap.city} className="grid gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-center">
              <p className="font-semibold">{cap.city}</p>
              <input className={fieldClass} inputMode="decimal" placeholder="Unset" value={cap.capNgn ?? ""} onChange={(event) => setCaps(caps.map((item) => item.city === cap.city ? { ...item, capNgn: event.target.value === "" ? null : Number(event.target.value) } : item))} />
              <button type="button" disabled={busy} onClick={() => void saveCap(cap.city, cap.capNgn)} className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50">Save cap</button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input className={fieldClass} placeholder="Add a city" value={newCity} onChange={(event) => setNewCity(event.target.value)} />
            <button type="button" disabled={busy || !newCity.trim()} onClick={() => { setCaps([...caps, { city: newCity.trim(), capNgn: null }]); setNewCity(""); }} className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50">Add city</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Feature flags</h2>
        <div className="mt-3 flex flex-col gap-2">
          {(care?.flags ?? []).map((flag) => (
            <div key={flag.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3">
              <div>
                <p className="font-semibold">{flag.label}</p>
                <p className="text-sm text-muted">{flag.enabled ? "On" : "Off"}</p>
              </div>
              <button type="button" disabled={busy} onClick={() => void toggleFlag(flag)} className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{flag.enabled ? "Turn off" : "Turn on"}</button>
            </div>
          ))}
        </div>
      </section>

      <DispatchLog />

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <input className={`${fieldClass} mt-3`} placeholder="Search actor, action, or entity" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">When</th>
                <th className="py-2 pr-3 font-semibold">Actor</th>
                <th className="py-2 pr-3 font-semibold">Action</th>
                <th className="py-2 pr-3 font-semibold">Entity</th>
                <th className="py-2 font-semibold">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="py-3 pr-3">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="py-3 pr-3">{row.actorName}</td>
                  <td className="py-3 pr-3">{row.action}</td>
                  <td className="py-3 pr-3">{row.entityType}</td>
                  <td className="py-3">{JSON.stringify(row.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
