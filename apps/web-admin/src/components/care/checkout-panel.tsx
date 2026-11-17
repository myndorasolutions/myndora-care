"use client";

import { useEffect, useState } from "react";
import { confirmAndStore, loadPayments, type PaymentRecord } from "@/lib/billing";
import type { DemoPlanRow } from "@/lib/demo-care";
import { loadCityCaps, loadPlanRows } from "@/lib/platform-state";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { initializePayment, type BillingCycle, type PaymentInit } from "@/lib/worker-client";

const CARE_CODES = ["basic_daily", "plus", "family_care"] as const;

const PLAN_FALLBACKS: Record<(typeof CARE_CODES)[number], { name: string; daily: number; monthly: number }> = {
  basic_daily: { name: "Basic Daily", daily: 300, monthly: 9000 },
  plus: { name: "Plus", daily: 500, monthly: 15000 },
  family_care: { name: "Family Care", daily: 1000, monthly: 30000 },
};

export function CheckoutPanel({
  patientId,
  city,
  email,
  payerUserId,
  onChanged,
}: {
  patientId: string;
  city: string;
  email: string;
  payerUserId: string;
  onChanged: () => void;
}) {
  const [plans, setPlans] = useState<DemoPlanRow[]>([]);
  const [cap, setCap] = useState<number | null>(null);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [open, setOpen] = useState<"plan" | "visit" | null>(null);
  const [payer, setPayer] = useState(payerUserId);
  const [checkoutEmail, setCheckoutEmail] = useState(email);
  const [planCode, setPlanCode] = useState<(typeof CARE_CODES)[number]>("plus");
  const [cycle, setCycle] = useState<Exclude<BillingCycle, "one_time">>("daily");
  const [pending, setPending] = useState<PaymentInit | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshHistory() {
    setHistory(await loadPayments(patientId));
  }

  useEffect(() => {
    void Promise.all([loadPlanRows(), loadCityCaps(), loadPayments(patientId)]).then(([nextPlans, caps, payments]) => {
      setPlans(nextPlans);
      setCap(caps.find((row) => row.city === city)?.capNgn ?? null);
      setHistory(payments);
    });
  }, [patientId, city]);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setPayer(data.user.id);
      if (data.user?.email) setCheckoutEmail(data.user.email);
    });
  }, []);

  const visit = plans.find((plan) => plan.code === "physical_visit");
  const visitPrice = visit?.priceOneTime ?? cap;
  const carePlans = plans.filter((plan) => CARE_CODES.includes(plan.code as (typeof CARE_CODES)[number]));
  const planCards = CARE_CODES.map((code) => {
    const live = carePlans.find((plan) => plan.code === code);
    const fallback = PLAN_FALLBACKS[code];
    return {
      code,
      name: live?.name ?? fallback.name,
      daily: live?.priceDaily ?? fallback.daily,
      monthly: live?.priceMonthly ?? fallback.monthly,
    };
  });

  async function startPlan() {
    const plan = carePlans.find((item) => item.code === planCode);
    if (!plan) return;
    setBusy(true);
    setMessage(null);
    const started = await initializePayment({
      payerUserId: payer,
      patientId,
      planId: plan.id,
      planCode: plan.code,
      billingCycle: cycle,
      email: checkoutEmail,
    });
    setBusy(false);
    if (!started.ok) {
      setMessage(started.error ?? "Payment could not start.");
      return;
    }
    if (started.mode === "live" && started.authorization_url) {
      window.open(started.authorization_url, "_blank", "noopener,noreferrer");
      setMessage("Paystack checkout is open. The subscription updates when Paystack confirms payment.");
      setOpen(null);
      return;
    }
    setPending(started);
  }

  async function startVisit() {
    if (visitPrice == null || !visit) return;
    setBusy(true);
    setMessage(null);
    const started = await initializePayment({
      payerUserId: payer,
      patientId,
      planId: visit.id,
      planCode: visit.code,
      billingCycle: "one_time",
      email: checkoutEmail,
      amountNgn: visitPrice,
    });
    setBusy(false);
    if (!started.ok) {
      setMessage(started.error ?? "Payment could not start.");
      return;
    }
    if (started.mode === "live" && started.authorization_url) {
      window.open(started.authorization_url, "_blank", "noopener,noreferrer");
      setMessage("Paystack checkout is open for the physical visit.");
      setOpen(null);
      return;
    }
    setPending(started);
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    const saved = await confirmAndStore(pending);
    setBusy(false);
    if (!saved.ok) {
      setMessage(saved.error);
      return;
    }
    setPending(null);
    setOpen(null);
    setMessage("Payment confirmed. The active plan is updated.");
    await refreshHistory();
    onChanged();
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => { setOpen("plan"); setPending(null); }} className="min-h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-white">
          Subscribe / Change Plan
        </button>
        <button
          type="button"
          disabled={visitPrice == null}
          onClick={() => { setOpen("visit"); setPending(null); }}
          className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50"
        >
          Book Physical Visit Add-On
        </button>
      </div>
      {visitPrice == null ? <p className="mt-2 text-sm text-muted">Operations has not set a home-visit price for {city || "this city"} yet.</p> : null}
      {message ? <p className="mt-3 text-sm">{message}</p> : null}

      {open === "plan" && !pending ? (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <h3 className="font-semibold">Choose a plan</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {planCards.map((plan) => {
              const selected = plan.code === planCode;
              return (
                <button
                  key={plan.code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPlanCode(plan.code)}
                  className={`min-h-28 rounded-2xl border p-4 text-left ${selected ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-line bg-white"}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{plan.name}</span>
                    {selected ? <span aria-hidden="true" className="text-lg leading-none text-primary">✓</span> : null}
                  </span>
                  {selected ? <span className="mt-2 inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">Selected</span> : null}
                  <span className="mt-2 block text-sm">₦{plan.daily.toLocaleString("en-NG")} / day</span>
                  <span className="block text-sm text-muted">₦{plan.monthly.toLocaleString("en-NG")} / month</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCycle("daily")} className={`min-h-12 rounded-xl text-sm font-semibold ${cycle === "daily" ? "bg-ink text-white" : "border border-line"}`}>Daily</button>
            <button type="button" onClick={() => setCycle("monthly")} className={`min-h-12 rounded-xl text-sm font-semibold ${cycle === "monthly" ? "bg-ink text-white" : "border border-line"}`}>Monthly</button>
          </div>
          <button type="button" disabled={busy} onClick={() => void startPlan()} className="mt-4 min-h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Starting..." : "Continue to checkout"}
          </button>
        </div>
      ) : null}

      {open === "visit" && !pending ? (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <h3 className="font-semibold">Physical Visit Add-on</h3>
          <p className="mt-2 text-sm">One home visit in {city || "the patient city"} for ₦{visitPrice?.toLocaleString("en-NG")}.</p>
          <button type="button" disabled={busy || visitPrice == null} onClick={() => void startVisit()} className="mt-4 min-h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Starting..." : "Continue to checkout"}
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Paystack test checkout</h3>
          <p className="mt-2 text-sm leading-6">
            {pending.plan_name} · ₦{pending.amount_ngn?.toLocaleString("en-NG")} · {pending.billing_cycle?.replaceAll("_", " ")}
          </p>
          <p className="mt-1 text-sm text-muted">Reference {pending.reference}. {pending.fallback ? "The worker is unreachable, so this confirmation stays on this device." : "Test Sandbox. No card is charged."}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void confirm()} className="min-h-12 flex-1 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-60">
              {busy ? "Confirming..." : "Confirm payment"}
            </button>
            <button type="button" onClick={() => setPending(null)} className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold">Back</button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <h3 className="text-sm font-semibold">Payment history</h3>
        {history.length === 0 ? <p className="mt-2 text-sm text-muted">No payments yet.</p> : history.map((row) => (
          <p key={row.id} className="mt-2 text-sm">
            {row.planName} · ₦{row.amountNgn.toLocaleString("en-NG")} · {row.billingCycle.replaceAll("_", " ")} · {row.status}
          </p>
        ))}
      </div>
    </div>
  );
}
