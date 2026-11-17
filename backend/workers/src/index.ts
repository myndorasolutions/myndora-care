export interface Env {
  R2_BUCKET?: R2Bucket;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  AFRICAS_TALKING_API_KEY?: string;
  AFRICAS_TALKING_USERNAME?: string;
  AFRICAS_TALKING_SENDER_ID?: string;
}

type BillingCycle = "daily" | "monthly" | "one_time";
type PlanCode = "basic_daily" | "plus" | "family_care" | "physical_visit";

const TEST_TOKEN = "myndora-test";

const PLAN_PRICES: Record<PlanCode, { daily: number; monthly: number; name: string }> = {
  basic_daily: { daily: 300, monthly: 9000, name: "Basic Daily" },
  plus: { daily: 500, monthly: 15000, name: "Plus" },
  family_care: { daily: 1000, monthly: 30000, name: "Family Care" },
  physical_visit: { daily: 0, monthly: 0, name: "Physical Visit Add-on" },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json(request, health(env));
      }
      if (request.method === "POST" && url.pathname === "/api/payments/initialize") {
        return json(request, await initializePayment(request, env));
      }
      if (request.method === "POST" && url.pathname === "/api/payments/webhook") {
        return json(request, await paymentWebhook(request, env));
      }
      if (request.method === "POST" && url.pathname === "/api/notifications/dispatch") {
        return json(request, await dispatchNotification(request, env));
      }
      if (request.method === "POST" && url.pathname === "/api/proofs/upload") {
        return json(request, await uploadProof(request, env));
      }
      return json(request, { ok: false, error: "Not found." }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      return json(request, { ok: false, error: message }, 400);
    }
  },
};

function health(env: Env) {
  return {
    ok: true,
    service: "myndora-workers",
    paystack: env.PAYSTACK_SECRET_KEY ? "live" : "mock",
    notifications: env.AFRICAS_TALKING_API_KEY && env.AFRICAS_TALKING_USERNAME ? "live" : "mock",
    r2: env.R2_BUCKET ? "binding" : "mock",
  };
}

async function initializePayment(request: Request, env: Env) {
  const body = (await request.json()) as Record<string, unknown>;
  const payerUserId = text(body.payer_user_id);
  const patientId = text(body.patient_id);
  const planId = text(body.plan_id);
  const email = text(body.email);
  const cycle = text(body.billing_cycle) as BillingCycle;
  if (!payerUserId || !patientId || !planId || !email || !["daily", "monthly", "one_time"].includes(cycle)) {
    return { ok: false, error: "payer_user_id, patient_id, plan_id, billing_cycle, and email are required." };
  }
  const code = resolvePlanCode(planId, text(body.plan_code));
  if (!code) return { ok: false, error: "Unknown plan." };
  if (code === "physical_visit" && cycle !== "one_time") {
    return { ok: false, error: "Physical Visit Add-on uses a one-time charge." };
  }
  if (code !== "physical_visit" && cycle === "one_time") {
    return { ok: false, error: "Choose daily or monthly for this plan." };
  }

  const catalog = await lookupPlan(env, planId, code);
  const clientAmount = numberOrNull(body.amount_ngn);
  const amount = amountFor(cycle, catalog, clientAmount);
  if (amount == null) {
    return { ok: false, error: "Operations has not set a price for this Physical Visit Add-on yet." };
  }

  const reference = `myndora_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const payment = {
    reference,
    amount_ngn: amount,
    currency: "NGN",
    email,
    payer_user_id: payerUserId,
    patient_id: patientId,
    plan_id: catalog.id ?? planId,
    plan_code: code,
    plan_name: catalog.name,
    billing_cycle: cycle,
  };

  if (!env.PAYSTACK_SECRET_KEY) {
    return { ok: true, mode: "mock", authorization_url: null, ...payment };
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      currency: "NGN",
      reference,
      metadata: payment,
    }),
  });
  const payload = (await response.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
  if (!response.ok || !payload.status || !payload.data?.authorization_url) {
    return { ok: false, error: payload.message || "Paystack could not start this payment." };
  }
  return {
    ok: true,
    mode: "live",
    authorization_url: payload.data.authorization_url,
    ...payment,
    reference: payload.data.reference || reference,
  };
}

async function paymentWebhook(request: Request, env: Env) {
  const raw = await request.text();
  const testToken = request.headers.get("x-myndora-test-token");
  const signature = request.headers.get("x-paystack-signature");
  if (env.PAYSTACK_SECRET_KEY) {
    if (!signature || signature !== (await hmacSha512Hex(env.PAYSTACK_SECRET_KEY, raw))) {
      return { ok: false, error: "Paystack signature did not match." };
    }
  } else if (testToken !== TEST_TOKEN) {
    return { ok: false, error: "Test token did not match." };
  }

  const body = JSON.parse(raw) as Record<string, unknown>;
  const data = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;
  if (typeof body.event === "string" && body.event !== "charge.success") {
    return { ok: true, ignored: true };
  }
  const metadata = (data.metadata && typeof data.metadata === "object" ? data.metadata : data) as Record<string, unknown>;
  const cycle = text(metadata.billing_cycle) as BillingCycle;
  const planCode = resolvePlanCode(text(metadata.plan_id), text(metadata.plan_code));
  const amount = numberOrNull(metadata.amount_ngn) ?? (numberOrNull(data.amount) != null ? Number(data.amount) / 100 : null);
  const reference = text(data.reference) || text(metadata.reference);
  const patientId = text(metadata.patient_id);
  const payerUserId = text(metadata.payer_user_id);
  const planId = text(metadata.plan_id);
  if (!reference || !patientId || !payerUserId || !planId || !planCode || !cycle || amount == null) {
    return { ok: false, error: "Payment details are incomplete." };
  }

  const persisted = await recordSubscription(env, {
    reference,
    amount,
    cycle,
    planCode,
    planId,
    patientId,
    payerUserId,
    mode: env.PAYSTACK_SECRET_KEY ? "live" : "mock",
  });

  return {
    ok: true,
    persisted: persisted.persisted,
    payment: {
      reference,
      amount_ngn: amount,
      billing_cycle: cycle,
      plan_code: planCode,
      plan_name: PLAN_PRICES[planCode].name,
      status: "confirmed",
      mode: env.PAYSTACK_SECRET_KEY ? "live" : "mock",
      patient_id: patientId,
      payer_user_id: payerUserId,
      plan_id: planId,
    },
  };
}

async function dispatchNotification(request: Request, env: Env) {
  const body = (await request.json()) as Record<string, unknown>;
  const recipient = text(body.recipient_phone);
  const channel = text(body.channel);
  const template = text(body.template_type);
  const message = text(body.message);
  if (!recipient || (channel !== "sms" && channel !== "whatsapp") || !template || !message) {
    return { ok: false, error: "recipient_phone, channel, template_type, and message are required." };
  }
  const live = Boolean(env.AFRICAS_TALKING_API_KEY && env.AFRICAS_TALKING_USERNAME);
  if (!live) {
    return {
      ok: true,
      mode: "mock",
      delivery: "Test Sandbox",
      recipient_phone: recipient,
      channel,
      template_type: template,
      message,
    };
  }

  const username = env.AFRICAS_TALKING_USERNAME!;
  const apiKey = env.AFRICAS_TALKING_API_KEY!;
  const response = channel === "sms"
    ? await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username,
          to: recipient,
          message,
          ...(env.AFRICAS_TALKING_SENDER_ID ? { from: env.AFRICAS_TALKING_SENDER_ID } : {}),
        }),
      })
    : await fetch("https://chat.africastalking.com/whatsapp/message/send", {
        method: "POST",
        headers: { apiKey, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          phoneNumber: recipient,
          body: { message },
        }),
      });
  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, error: detail || "Africa's Talking rejected the message." };
  }
  return {
    ok: true,
    mode: "live",
    delivery: "Live API",
    recipient_phone: recipient,
    channel,
    template_type: template,
    message,
  };
}

async function uploadProof(request: Request, env: Env) {
  const contentType = request.headers.get("content-type") ?? "";
  let visitId = "";
  let filename = "proof.bin";
  let type = "application/octet-stream";
  let bytes: Uint8Array | null = null;

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    visitId = text(body.visit_id);
    filename = text(body.filename) || filename;
    type = text(body.content_type) || type;
    const encoded = text(body.data_base64);
    if (encoded) bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  } else {
    const form = await request.formData();
    visitId = String(form.get("visit_id") ?? "");
    const file = form.get("file");
    if (file instanceof File) {
      filename = file.name || filename;
      type = file.type || type;
      bytes = new Uint8Array(await file.arrayBuffer());
    }
  }
  if (!visitId || !bytes) return { ok: false, error: "visit_id and a file are required." };

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `visits/${visitId}/${safeName}`;
  let proofUrl = `https://mock.local/proofs/${encodeURIComponent(visitId)}/${encodeURIComponent(safeName)}`;
  let mode: "binding" | "mock" = "mock";
  if (env.R2_BUCKET) {
    await env.R2_BUCKET.put(key, bytes, { httpMetadata: { contentType: type } });
    proofUrl = `r2://myndora-visit-proofs/${key}`;
    mode = "binding";
  }
  const persisted = await updateVisitProof(env, visitId, proofUrl);
  return { ok: true, mode, proof_r2_url: proofUrl, persisted, visit_id: visitId };
}

async function lookupPlan(env: Env, planId: string, code: PlanCode) {
  const fallback = { id: isUuid(planId) ? planId : null, name: PLAN_PRICES[code].name, oneTime: null as number | null, daily: PLAN_PRICES[code].daily, monthly: PLAN_PRICES[code].monthly };
  if (!supabaseReady(env)) return fallback;
  const filter = isUuid(planId) ? `id=eq.${planId}` : `code=eq.${code}`;
  const response = await supabaseFetch(env, `plans?${filter}&select=id,code,name,price_daily_ngn,price_monthly_ngn,price_one_time_ngn`);
  if (!response.ok) return fallback;
  const rows = (await response.json()) as { id: string; name: string; price_daily_ngn: number | null; price_monthly_ngn: number | null; price_one_time_ngn: number | null }[];
  const row = rows[0];
  if (!row) return fallback;
  return {
    id: row.id,
    name: row.name,
    oneTime: row.price_one_time_ngn == null ? null : Number(row.price_one_time_ngn),
    daily: row.price_daily_ngn == null ? fallback.daily : Number(row.price_daily_ngn),
    monthly: row.price_monthly_ngn == null ? fallback.monthly : Number(row.price_monthly_ngn),
  };
}

function amountFor(
  cycle: BillingCycle,
  catalog: { daily: number; monthly: number; oneTime: number | null },
  clientAmount: number | null,
) {
  if (cycle === "daily") return catalog.daily > 0 ? catalog.daily : null;
  if (cycle === "monthly") return catalog.monthly > 0 ? catalog.monthly : null;
  const price = catalog.oneTime ?? clientAmount;
  return price != null && price > 0 ? price : null;
}

async function recordSubscription(env: Env, input: {
  reference: string;
  amount: number;
  cycle: BillingCycle;
  planCode: PlanCode;
  planId: string;
  patientId: string;
  payerUserId: string;
  mode: "live" | "mock";
}) {
  if (!supabaseReady(env) || !isUuid(input.patientId) || !isUuid(input.payerUserId) || !isUuid(input.planId)) {
    return { persisted: false, subscriptionId: null as string | null };
  }
  const now = new Date();
  const periodEnd = input.cycle === "daily"
    ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : input.cycle === "monthly"
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
  let subscriptionId: string | null = null;

  if (input.cycle === "one_time") {
    const created = await supabaseFetch(env, "subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: input.planId,
        patient_id: input.patientId,
        payer_user_id: input.payerUserId,
        billing_interval: "one_time",
        status: "active",
        started_at: now.toISOString(),
        current_period_end: null,
      }),
    });
    if (created.ok) {
      const rows = (await created.json()) as { id: string }[];
      subscriptionId = rows[0]?.id ?? null;
    }
  } else {
    const existing = await supabaseFetch(
      env,
      `subscriptions?patient_id=eq.${input.patientId}&status=eq.active&billing_interval=neq.one_time&select=id&limit=1`,
    );
    const rows = existing.ok ? ((await existing.json()) as { id: string }[]) : [];
    if (rows[0]?.id) {
      subscriptionId = rows[0].id;
      await supabaseFetch(env, `subscriptions?id=eq.${subscriptionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          plan_id: input.planId,
          payer_user_id: input.payerUserId,
          billing_interval: input.cycle,
          status: "active",
          current_period_end: periodEnd,
        }),
      });
    } else {
      const created = await supabaseFetch(env, "subscriptions", {
        method: "POST",
        body: JSON.stringify({
          plan_id: input.planId,
          patient_id: input.patientId,
          payer_user_id: input.payerUserId,
          billing_interval: input.cycle,
          status: "active",
          started_at: now.toISOString(),
          current_period_end: periodEnd,
        }),
      });
      if (created.ok) {
        const createdRows = (await created.json()) as { id: string }[];
        subscriptionId = createdRows[0]?.id ?? null;
      }
    }
  }

  await supabaseFetch(env, "audit_logs", {
    method: "POST",
    body: JSON.stringify({
      actor_user_id: input.payerUserId,
      action: "payment.confirmed",
      entity_type: "subscriptions",
      entity_id: subscriptionId,
      metadata: {
        reference: input.reference,
        amount_ngn: input.amount,
        billing_cycle: input.cycle,
        plan_code: input.planCode,
        mode: input.mode,
      },
    }),
  });
  return { persisted: true, subscriptionId };
}

async function updateVisitProof(env: Env, visitId: string, proofUrl: string) {
  if (!supabaseReady(env) || !isUuid(visitId)) return false;
  const response = await supabaseFetch(env, `visits?id=eq.${visitId}`, {
    method: "PATCH",
    body: JSON.stringify({ proof_r2_url: proofUrl }),
  });
  return response.ok;
}

function supabaseReady(env: Env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseFetch(env: Env, path: string, init?: RequestInit) {
  const base = env.SUPABASE_URL!.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    "User-Agent": "myndora-workers",
  };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });
}

function resolvePlanCode(planId: string, planCode: string): PlanCode | null {
  const token = `${planCode} ${planId}`.toLowerCase();
  if (token.includes("basic_daily") || token.includes("basic")) return "basic_daily";
  if (token.includes("family_care") || token.includes("family")) return "family_care";
  if (token.includes("physical_visit") || token.includes("physical") || token.includes("visit")) return "physical_visit";
  if (token.includes("plus")) return "plus";
  return null;
}

async function hmacSha512Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(request: Request, body: unknown, status = 200) {
  const ok = typeof body === "object" && body !== null && "ok" in body ? Boolean((body as { ok: boolean }).ok) : status < 400;
  return new Response(JSON.stringify(body), {
    status: ok ? status : status === 200 ? 400 : status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

function corsHeaders(request: Request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("Origin") ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-paystack-signature, x-myndora-test-token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isUuid(value: string) {
  return UUID_RE.test(value);
}
