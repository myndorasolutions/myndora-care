"use client";

import { useEffect, useState } from "react";
import { fieldClass } from "@/components/care/fields";
import { confirmAndStore, loadPayments, type PaymentRecord } from "@/lib/billing";
import type { DemoPlanRow } from "@/lib/demo-care";
import { loadCityCaps, loadPlanRows } from "@/lib/platform-state";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { initializePayment, type BillingCycle, type PaymentInit } from "@/lib/worker-client";

const CARE_CODES = ["basic_daily", "plus", "family_care"] as const;

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
          <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
            Plan
            <select className={fieldClass} value={planCode} onChange={(event) => setPlanCode(event.target.value as (typeof CARE_CODES)[number])}>
              {carePlans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name} · ₦{plan.priceDaily?.toLocaleString("en-NG")}/day or ₦{plan.priceMonthly?.toLocaleString("en-NG")}/month
                </option>
              ))}
            </select>
          </label>
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
