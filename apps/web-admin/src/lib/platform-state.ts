import {
  DEMO_CITY_CAPS,
  DEMO_FLAGS,
  DEMO_PLANS,
  type DemoCityCap,
  type DemoFlag,
  type DemoPlanRow,
} from "@/lib/demo-care";
import { listQueue } from "@/lib/offline-queue";
import {
  DEFAULT_THRESHOLDS,
  setActiveThresholds,
  type RiskThresholds,
} from "@/lib/risk-engine";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function loadThresholds(): Promise<RiskThresholds> {
  const session = await signedIn();
  let current = { ...DEFAULT_THRESHOLDS };
  if (session) {
    const supabase = createClient();
    const { data } = await supabase.from("clinical_thresholds").select("*").eq("id", 1).maybeSingle();
    if (data) current = thresholdsFromPayload(current, data as Record<string, unknown>);
  }
  const rows = await relevantRows("clinical_thresholds", session);
  for (const row of rows) current = thresholdsFromPayload(current, row.payload);
  setActiveThresholds(current);
  return current;
}

export async function loadFlags(): Promise<DemoFlag[]> {
  const session = await signedIn();
  const map = new Map(DEMO_FLAGS.map((flag) => [flag.key, { ...flag }]));
  if (session) {
    const supabase = createClient();
    const { data } = await supabase.from("feature_flags").select("key, label, enabled");
    for (const row of (data ?? []) as { key: string; label: string; enabled: boolean }[]) {
      map.set(row.key, { key: row.key, label: row.label, enabled: row.enabled });
    }
  } else {
    for (const flag of DEMO_FLAGS) map.set(flag.key, { ...flag });
  }
  if (!session) {
    map.clear();
    for (const flag of DEMO_FLAGS) map.set(flag.key, { ...flag });
  }
  const rows = await relevantRows("feature_flags", session);
  for (const row of rows) {
    const key = String(row.payload.key ?? "");
    const current = map.get(key);
    if (!current) continue;
    map.set(key, {
      ...current,
      enabled: typeof row.payload.enabled === "boolean" ? row.payload.enabled : current.enabled,
    });
  }
  return [...map.values()];
}

export function flagEnabled(flags: DemoFlag[], key: string, fallback = true) {
  return flags.find((flag) => flag.key === key)?.enabled ?? fallback;
}

export async function loadPlanRows(): Promise<DemoPlanRow[]> {
  const session = await signedIn();
  let rows = DEMO_PLANS.map((plan) => ({ ...plan }));
  if (session) {
    const supabase = createClient();
    const { data } = await supabase
      .from("plans")
      .select("id, code, name, price_daily_ngn, price_monthly_ngn, price_one_time_ngn, included_service_count")
      .in("code", ["basic_daily", "plus", "family_care", "physical_visit"]);
    if (data && data.length > 0) {
      rows = (data as PlanRecord[]).map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        priceDaily: plan.price_daily_ngn == null ? null : Number(plan.price_daily_ngn),
        priceMonthly: plan.price_monthly_ngn == null ? null : Number(plan.price_monthly_ngn),
        priceOneTime: plan.price_one_time_ngn == null ? null : Number(plan.price_one_time_ngn),
        includedServiceCount: Number(plan.included_service_count ?? 0),
      }));
    }
  }
  const patches = await relevantRows("plans", session, "plan");
  return rows.map((plan) => {
    const patch = [...patches].reverse().find((row) => row.id === plan.id || row.payload.code === plan.code);
    if (!patch) return plan;
    return {
      ...plan,
      priceDaily: numberOr(patch.payload.price_daily_ngn, plan.priceDaily),
      priceMonthly: numberOr(patch.payload.price_monthly_ngn, plan.priceMonthly),
      priceOneTime: numberOr(patch.payload.price_one_time_ngn, plan.priceOneTime),
      includedServiceCount: numberOr(patch.payload.included_service_count, plan.includedServiceCount) ?? 0,
    };
  });
}

export async function loadCityCaps(): Promise<DemoCityCap[]> {
  const session = await signedIn();
  const map = new Map(DEMO_CITY_CAPS.map((row) => [row.city, { ...row }]));
  if (session) {
    const supabase = createClient();
    const { data } = await supabase.from("city_visit_caps").select("city, cap_ngn");
    for (const row of (data ?? []) as { city: string; cap_ngn: number | null }[]) {
      map.set(row.city, { city: row.city, capNgn: row.cap_ngn == null ? null : Number(row.cap_ngn) });
    }
  }
  const patches = await relevantRows("city_visit_caps", session);
  for (const row of patches) {
    const city = String(row.payload.city ?? "");
    if (!city) continue;
    map.set(city, { city, capNgn: row.payload.cap_ngn == null || row.payload.cap_ngn === "" ? null : Number(row.payload.cap_ngn) });
  }
  return [...map.values()];
}

export function thresholdsPayload(thresholds: RiskThresholds) {
  return {
    setting_table: "clinical_thresholds",
    yellow_systolic: thresholds.yellowSystolic,
    red_systolic: thresholds.redSystolic,
    yellow_diastolic: thresholds.yellowDiastolic,
    red_diastolic: thresholds.redDiastolic,
    yellow_fasting_glucose: thresholds.yellowFastingGlucose,
    red_fasting_glucose: thresholds.redFastingGlucose,
    yellow_random_glucose: thresholds.yellowRandomGlucose,
    red_random_glucose: thresholds.redRandomGlucose,
    updated_at: new Date().toISOString(),
  };
}

function thresholdsFromPayload(base: RiskThresholds, payload: Record<string, unknown>): RiskThresholds {
  return {
    yellowSystolic: numberOr(payload.yellow_systolic, base.yellowSystolic) ?? base.yellowSystolic,
    redSystolic: numberOr(payload.red_systolic, base.redSystolic) ?? base.redSystolic,
    yellowDiastolic: numberOr(payload.yellow_diastolic, base.yellowDiastolic) ?? base.yellowDiastolic,
    redDiastolic: numberOr(payload.red_diastolic, base.redDiastolic) ?? base.redDiastolic,
    yellowFastingGlucose: numberOr(payload.yellow_fasting_glucose, base.yellowFastingGlucose) ?? base.yellowFastingGlucose,
    redFastingGlucose: numberOr(payload.red_fasting_glucose, base.redFastingGlucose) ?? base.redFastingGlucose,
    yellowRandomGlucose: numberOr(payload.yellow_random_glucose, base.yellowRandomGlucose) ?? base.yellowRandomGlucose,
    redRandomGlucose: numberOr(payload.red_random_glucose, base.redRandomGlucose) ?? base.redRandomGlucose,
  };
}

async function signedIn() {
  if (!hasSupabaseEnv()) return false;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
}

async function relevantRows(settingTable: string, session: boolean, kind: "setting" | "plan" = "setting") {
  const rows = await listQueue();
  return rows.filter((row) => {
    if (row.kind !== kind) return false;
    if (kind === "setting" && row.payload.setting_table !== settingTable) return false;
    if (session) return row.mode === "live" && row.syncStatus !== "synced";
    return row.mode === "demo";
  });
}

function numberOr(value: unknown, fallback: number | null) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return fallback;
}

type PlanRecord = {
  id: string;
  code: string;
  name: string;
  price_daily_ngn: number | null;
  price_monthly_ngn: number | null;
  price_one_time_ngn: number | null;
  included_service_count: number | null;
};
