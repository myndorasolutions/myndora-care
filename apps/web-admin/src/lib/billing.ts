import { DEMO_DISPATCHES, DEMO_PATIENTS, type DemoDispatch } from "@/lib/demo-care";
import { enqueue, listQueue } from "@/lib/offline-queue";
import { flagEnabled, loadFlags } from "@/lib/platform-state";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { confirmPayment, dispatchNotification, type NotifyTemplate, type PaymentInit } from "@/lib/worker-client";

export type PaymentRecord = {
  id: string;
  patientId: string;
  planName: string;
  planCode: string;
  billingCycle: string;
  amountNgn: number;
  dailyLabel: string;
  monthlyLabel: string;
  reference: string;
  status: string;
  createdAt: string;
};

export type CarePlanBadge = {
  name: string;
  dailyLabel: string;
  monthlyLabel: string;
  status: string;
};

export async function loadPayments(patientId: string): Promise<PaymentRecord[]> {
  const rows = await listQueue();
  return rows
    .filter((row) => row.kind === "payment" && row.payload.patient_id === patientId)
    .map(mapPayment)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function carePlanOverlay(patientId: string): Promise<CarePlanBadge | null> {
  const care = (await loadPayments(patientId)).find((row) => row.billingCycle !== "one_time" && row.status === "confirmed");
  if (!care) return null;
  return {
    name: care.planName,
    dailyLabel: care.dailyLabel,
    monthlyLabel: care.monthlyLabel,
    status: "active",
  };
}

export async function confirmAndStore(payment: PaymentInit) {
  if (!payment.ok || !payment.reference || payment.amount_ngn == null || !payment.patient_id) {
    return { ok: false, error: payment.error ?? "Payment could not start." };
  }
  const confirmed = await confirmPayment(payment);
  const stored = (confirmed.payment ?? {}) as Record<string, unknown>;
  const createdAt = new Date().toISOString();
  const cycle = String(stored.billing_cycle ?? payment.billing_cycle ?? "");
  const code = String(stored.plan_code ?? payment.plan_code ?? "");
  const amount = Number(stored.amount_ngn ?? payment.amount_ngn);
  const labels = planLabels(code, cycle, amount);
  await enqueue({
    id: payment.reference,
    kind: "payment",
    mode: "demo",
    op: "insert",
    payload: {
      patient_id: payment.patient_id,
      plan_name: String(stored.plan_name ?? payment.plan_name ?? "Plan"),
      plan_code: code,
      billing_cycle: cycle,
      amount_ngn: amount,
      daily_label: labels.dailyLabel,
      monthly_label: labels.monthlyLabel,
      reference: payment.reference,
      status: "confirmed",
      created_at: createdAt,
    },
    recordedAtLocal: createdAt,
    syncStatus: "synced",
  });
  if (payment.mode !== "live") {
    await maybeNotify({
      patientId: payment.patient_id,
      templateType: "payment_confirmed",
      message: `${String(payment.plan_name ?? "Plan")} payment of ₦${payment.amount_ngn.toLocaleString("en-NG")} was confirmed.`,
    });
  }
  return { ok: true, error: null };
}

export async function loadDispatches(): Promise<DemoDispatch[]> {
  const rows = await listQueue();
  const extra = rows
    .filter((row) => row.kind === "notification")
    .map((row) => ({
      id: row.id,
      recipientPhone: String(row.payload.recipient_phone ?? ""),
      channel: row.payload.channel === "whatsapp" ? "whatsapp" as const : "sms" as const,
      templateType: String(row.payload.template_type ?? "abnormal_alert") as DemoDispatch["templateType"],
      message: String(row.payload.message ?? ""),
      mode: row.payload.mode === "live" ? "live" as const : "mock" as const,
      createdAt: String(row.payload.created_at ?? row.recordedAtLocal),
    }));
  return [...extra, ...DEMO_DISPATCHES].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function maybeNotify(input: { patientId: string; templateType: NotifyTemplate; message: string }) {
  const flags = await loadFlags();
  if (!flagEnabled(flags, "sms_whatsapp_dispatch", false)) return;
  const phone = await recipientPhone(input.patientId);
  if (!phone) return;
  const sent = await dispatchNotification({
    recipientPhone: phone,
    channel: "sms",
    templateType: input.templateType,
    message: input.message,
  });
  const createdAt = new Date().toISOString();
  await enqueue({
    id: crypto.randomUUID(),
    kind: "notification",
    mode: "demo",
    op: "insert",
    payload: {
      patient_id: input.patientId,
      recipient_phone: phone,
      channel: "sms",
      template_type: input.templateType,
      message: input.message,
      mode: sent.mode,
      created_at: createdAt,
    },
    recordedAtLocal: createdAt,
    syncStatus: "synced",
  });
}

async function recipientPhone(patientId: string) {
  const demo = DEMO_PATIENTS.find((patient) => patient.id === patientId);
  if (demo?.emergencyContactPhone) return demo.emergencyContactPhone;
  if (!hasSupabaseEnv()) return "";
  const supabase = createClient();
  const { data } = await supabase
    .from("patients")
    .select("emergency_contact_phone, user_id")
    .eq("id", patientId)
    .maybeSingle();
  const row = data as { emergency_contact_phone?: string | null; user_id?: string | null } | null;
  if (row?.emergency_contact_phone) return row.emergency_contact_phone;
  if (!row?.user_id) return "";
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", row.user_id).maybeSingle();
  return (profile as { phone?: string | null } | null)?.phone ?? "";
}

function planLabels(code: string, cycle: string, amount: number) {
  const table: Record<string, [number, number]> = {
    basic_daily: [300, 9000],
    plus: [500, 15000],
    family_care: [1000, 30000],
  };
  const pair = table[code] ?? [amount, amount];
  const daily = cycle === "daily" ? amount : pair[0];
  const monthly = cycle === "monthly" ? amount : pair[1];
  return {
    dailyLabel: `₦${daily.toLocaleString("en-NG")}/day`,
    monthlyLabel: `₦${monthly.toLocaleString("en-NG")}/month`,
  };
}

function mapPayment(row: { id: string; payload: Record<string, unknown>; recordedAtLocal: string }): PaymentRecord {
  return {
    id: row.id,
    patientId: String(row.payload.patient_id ?? ""),
    planName: String(row.payload.plan_name ?? "Plan"),
    planCode: String(row.payload.plan_code ?? ""),
    billingCycle: String(row.payload.billing_cycle ?? ""),
    amountNgn: Number(row.payload.amount_ngn ?? 0),
    dailyLabel: String(row.payload.daily_label ?? ""),
    monthlyLabel: String(row.payload.monthly_label ?? ""),
    reference: String(row.payload.reference ?? row.id),
    status: String(row.payload.status ?? "confirmed"),
    createdAt: String(row.payload.created_at ?? row.recordedAtLocal),
  };
}
