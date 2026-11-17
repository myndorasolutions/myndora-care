export type BillingCycle = "daily" | "monthly" | "one_time";
export type NotifyChannel = "sms" | "whatsapp";
export type NotifyTemplate = "abnormal_alert" | "visit_completed" | "refill_ready" | "payment_confirmed";

export type PaymentInit = {
  ok: boolean;
  mode: "mock" | "live";
  fallback: boolean;
  error?: string;
  authorization_url?: string | null;
  reference?: string;
  amount_ngn?: number;
  currency?: string;
  email?: string;
  payer_user_id?: string;
  patient_id?: string;
  plan_id?: string;
  plan_code?: string;
  plan_name?: string;
  billing_cycle?: BillingCycle;
};

const TEST_TOKEN = "myndora-test";

const LIVE_WORKER_API_URL = "https://myndora-workers.myndorasolutions-afb.workers.dev";

function workerBase() {
  const configured = process.env.NEXT_PUBLIC_WORKER_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? LIVE_WORKER_API_URL : "http://localhost:8787";
}

async function workerPost(path: string, body: BodyInit, headers?: HeadersInit) {
  const response = await fetch(`${workerBase()}${path}`, {
    method: "POST",
    body,
    headers,
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || data.ok === false) {
    throw new Error(typeof data.error === "string" ? data.error : "Worker request failed.");
  }
  return data;
}

export async function initializePayment(input: {
  payerUserId: string;
  patientId: string;
  planId: string;
  planCode: string;
  billingCycle: BillingCycle;
  email: string;
  amountNgn?: number | null;
}): Promise<PaymentInit> {
  const payload = {
    payer_user_id: input.payerUserId,
    patient_id: input.patientId,
    plan_id: input.planId,
    plan_code: input.planCode,
    billing_cycle: input.billingCycle,
    email: input.email,
    amount_ngn: input.amountNgn ?? null,
  };
  try {
    const data = await workerPost("/api/payments/initialize", JSON.stringify(payload), { "Content-Type": "application/json" });
    return { ...(data as Omit<PaymentInit, "fallback">), ok: true, fallback: false };
  } catch {
    return localPayment(payload);
  }
}

export async function confirmPayment(payment: PaymentInit) {
  const body = JSON.stringify({
    reference: payment.reference,
    amount_ngn: payment.amount_ngn,
    email: payment.email,
    payer_user_id: payment.payer_user_id,
    patient_id: payment.patient_id,
    plan_id: payment.plan_id,
    plan_code: payment.plan_code,
    plan_name: payment.plan_name,
    billing_cycle: payment.billing_cycle,
  });
  if (payment.fallback || payment.mode !== "live") {
    try {
      const data = await workerPost("/api/payments/webhook", body, {
        "Content-Type": "application/json",
        "x-myndora-test-token": TEST_TOKEN,
      });
      return { ok: true, fallback: payment.fallback, payment: (data.payment as Record<string, unknown>) ?? payment };
    } catch {
      return { ok: true, fallback: true, payment };
    }
  }
  return { ok: true, fallback: false, payment };
}

export async function dispatchNotification(input: {
  recipientPhone: string;
  channel: NotifyChannel;
  templateType: NotifyTemplate;
  message: string;
}) {
  const payload = {
    recipient_phone: input.recipientPhone,
    channel: input.channel,
    template_type: input.templateType,
    message: input.message,
  };
  try {
    const data = await workerPost("/api/notifications/dispatch", JSON.stringify(payload), { "Content-Type": "application/json" });
    return {
      ok: true,
      fallback: false,
      mode: data.mode === "live" ? "live" as const : "mock" as const,
      delivery: String(data.delivery ?? (data.mode === "live" ? "Live API" : "Test Sandbox")),
    };
  } catch {
    return { ok: true, fallback: true, mode: "mock" as const, delivery: "Test Sandbox" };
  }
}

export async function uploadProof(visitId: string, file: File) {
  const form = new FormData();
  form.set("visit_id", visitId);
  form.set("file", file);
  try {
    const data = await workerPost("/api/proofs/upload", form);
    return { ok: true, proof_r2_url: String(data.proof_r2_url ?? ""), fallback: false };
  } catch {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    return {
      ok: true,
      fallback: true,
      proof_r2_url: `https://mock.local/proofs/${encodeURIComponent(visitId)}/${encodeURIComponent(safeName)}`,
    };
  }
}

function localPayment(input: {
  payer_user_id: string;
  patient_id: string;
  plan_id: string;
  plan_code: string;
  billing_cycle: BillingCycle;
  email: string;
  amount_ngn: number | null;
}): PaymentInit {
  const prices: Record<string, { daily: number; monthly: number; name: string }> = {
    basic_daily: { daily: 300, monthly: 9000, name: "Basic Daily" },
    plus: { daily: 500, monthly: 15000, name: "Plus" },
    family_care: { daily: 1000, monthly: 30000, name: "Family Care" },
    physical_visit: { daily: 0, monthly: 0, name: "Physical Visit Add-on" },
  };
  const known = prices[input.plan_code];
  const amount = input.billing_cycle === "one_time"
    ? input.amount_ngn
    : input.billing_cycle === "daily"
      ? known?.daily
      : known?.monthly;
  if (!known || amount == null || amount <= 0) {
    return { ok: false, mode: "mock", fallback: true, error: "Operations has not set a price for this Physical Visit Add-on yet." };
  }
  return {
    ok: true,
    mode: "mock",
    fallback: true,
    authorization_url: null,
    reference: `myndora_local_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
    amount_ngn: amount,
    currency: "NGN",
    email: input.email,
    payer_user_id: input.payer_user_id,
    patient_id: input.patient_id,
    plan_id: input.plan_id,
    plan_code: input.plan_code,
    plan_name: known.name,
    billing_cycle: input.billing_cycle,
  };
}
