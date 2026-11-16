import { carePlanOverlay, maybeNotify } from "@/lib/billing";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  DEMO_ALERTS,
  DEMO_ASSIGNMENTS,
  DEMO_CHW,
  DEMO_CLINICIAN,
  DEMO_MEDICATIONS,
  DEMO_PATIENTS,
  DEMO_PHARMACY,
  DEMO_PLAN,
  DEMO_VITALS,
  DEMO_VISITS,
  type DemoAlert,
  type DemoMedication,
  type DemoPatient,
  type DemoVisit,
  type DemoVital,
} from "@/lib/demo-care";
import { enqueue, listQueue, type QueueKind, type QueueRecord } from "@/lib/offline-queue";
import { loadThresholds } from "@/lib/platform-state";
import { classifyReading, type GlucoseType, type ReadingInput, type RiskLevel, type SymptomId } from "@/lib/risk-engine";

export type VitalDraft = ReadingInput & {
  pulse: number | null;
  temperature: number | null;
  weight: number | null;
  notes: string;
};

export type PatientCare = {
  mode: "demo" | "live";
  patient: DemoPatient | null;
  chwName: string | null;
  chwPhone: string | null;
  vitals: DemoVital[];
  medications: DemoMedication[];
  plan: typeof DEMO_PLAN | null;
  notice: string | null;
};

export type ChwCare = {
  mode: "demo" | "live";
  providerId: string | null;
  patients: DemoPatient[];
  notice: string | null;
};

export type SponsorCare = {
  mode: "demo" | "live";
  sponsorName: string;
  patient: DemoPatient | null;
  vitals: DemoVital[];
  visits: DemoVisit[];
  alerts: DemoAlert[];
  planLabel: string;
  notice: string | null;
};

export async function loadPatientCare(): Promise<PatientCare> {
  const user = await currentUser();
  if (!user) {
    const base = demoPatient();
    const patientId = base.patient?.id;
    if (!patientId) return base;
    const extra = await localVitals(patientId, "demo");
    const plan = (await carePlanOverlay(patientId)) ?? base.plan;
    return { ...base, plan, vitals: mergeVitals(base.vitals, extra) };
  }
  const supabase = createClient();
  const { data: patientRow } = await supabase
    .from("patients")
    .select("id, city, state, age, gender, conditions, is_self_sponsored, emergency_contact_name, emergency_contact_phone, risk_status")
    .eq("user_id", user.id)
    .maybeSingle();
  const patient = patientRow as PatientRecord | null;
  if (!patient) {
    return { ...demoPatient(), notice: "No patient record is linked to this account yet." };
  }
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const name = (profile as { full_name?: string } | null)?.full_name || "Patient";
  const [vitals, medications, plan, chw] = await Promise.all([
    liveVitals(patient.id),
    liveMedications(patient.id),
    livePlan(patient.id),
    liveChw(patient.id),
  ]);
  return {
    mode: "live",
    patient: {
      id: patient.id,
      name,
      city: patient.city ?? "",
      state: patient.state ?? "",
      age: patient.age ?? null,
      gender: patient.gender ?? null,
      conditions: patient.conditions ?? [],
      isSelfSponsored: patient.is_self_sponsored,
      emergencyContactName: patient.emergency_contact_name ?? "",
      emergencyContactPhone: patient.emergency_contact_phone ?? "",
      riskStatus: (patient.risk_status as RiskLevel) ?? "green",
    },
    chwName: chw?.name ?? null,
    chwPhone: chw?.phone ?? null,
    vitals: mergeVitals(vitals, await localVitals(patient.id, "live")),
    medications,
    plan: patient.is_self_sponsored ? ((await carePlanOverlay(patient.id)) ?? plan) : null,
    notice: null,
  };
}

export async function loadChwCare(): Promise<ChwCare> {
  const user = await currentUser();
  if (!user) {
    return { mode: "demo", providerId: DEMO_CHW.id, patients: DEMO_PATIENTS, notice: null };
  }
  const supabase = createClient();
  const { data: provider } = await supabase
    .from("providers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const providerId = (provider as { id?: string } | null)?.id;
  if (!providerId) {
    return { mode: "live", providerId: null, patients: [], notice: "No CHW profile is linked to this account yet." };
  }
  const { data: assignments } = await supabase
    .from("patient_provider_assignments")
    .select("patient_id")
    .eq("provider_id", providerId)
    .eq("active", true);
  const ids = ((assignments ?? []) as { patient_id: string }[]).map((row) => row.patient_id);
  if (ids.length === 0) {
    return { mode: "live", providerId, patients: [], notice: "No patients are assigned yet." };
  }
  const { data: patients } = await supabase
    .from("patients")
    .select("id, user_id, city, state, is_self_sponsored, emergency_contact_name, emergency_contact_phone, risk_status")
    .in("id", ids);
  const rows = (patients ?? []) as PatientRecord[];
  const named = await Promise.all(rows.map((row) => namePatient(row)));
  return { mode: "live", providerId, patients: named, notice: null };
}

export async function loadSponsorCare(): Promise<SponsorCare> {
  const user = await currentUser();
  if (!user) {
    const base = demoSponsor();
    const patientId = base.patient?.id;
    if (!patientId) return base;
    const [extraVitals, extraVisits, extraAlerts, overlay] = await Promise.all([
      localVitals(patientId, "demo"),
      localVisits(patientId, "demo"),
      localAlerts(patientId, "demo"),
      carePlanOverlay(patientId),
    ]);
    return {
      ...base,
      planLabel: overlay
        ? `${overlay.name} · ${overlay.dailyLabel} or ${overlay.monthlyLabel} · ${overlay.status}`
        : base.planLabel,
      vitals: mergeVitals(base.vitals, extraVitals),
      visits: [...extraVisits, ...base.visits],
      alerts: [...extraAlerts, ...base.alerts],
    };
  }
  const supabase = createClient();
  const { data: own } = await supabase
    .from("patients")
    .select("id, user_id, city, state, is_self_sponsored, emergency_contact_name, emergency_contact_phone, risk_status")
    .eq("user_id", user.id)
    .maybeSingle();
  const ownPatient = own as PatientRecord | null;
  let patient = ownPatient?.is_self_sponsored ? ownPatient : null;
  if (!patient) {
    const { data: links } = await supabase
      .from("sponsors_patients")
      .select("patient_id")
      .eq("sponsor_user_id", user.id)
      .eq("consent_status", "approved")
      .limit(1);
    const patientId = (links as { patient_id: string }[] | null)?.[0]?.patient_id;
    if (patientId) {
      const { data } = await supabase
        .from("patients")
        .select("id, user_id, city, state, is_self_sponsored, emergency_contact_name, emergency_contact_phone, risk_status")
        .eq("id", patientId)
        .maybeSingle();
      patient = data as PatientRecord | null;
    }
  }
  if (!patient) {
    return { ...demoSponsor(), notice: "No linked patient is available for this account yet." };
  }
  const named = await namePatient(patient);
  const [vitals, visits, alerts, plan, queuedVitalRows, queuedVisitRows, queuedAlertRows] = await Promise.all([
    liveVitals(patient.id),
    liveVisits(patient.id),
    liveAlerts(patient.id),
    livePlan(patient.id),
    localVitals(patient.id, "live"),
    localVisits(patient.id, "live"),
    localAlerts(patient.id, "live"),
  ]);
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const overlay = await carePlanOverlay(patient.id);
  const activePlan = overlay ?? plan;
  return {
    mode: "live",
    sponsorName: (profile as { full_name?: string } | null)?.full_name || "Sponsor",
    patient: named,
    vitals: mergeVitals(vitals, queuedVitalRows),
    visits: [...queuedVisitRows, ...visits],
    alerts: [...queuedAlertRows, ...alerts],
    planLabel: activePlan
      ? `${activePlan.name} · ${activePlan.dailyLabel} or ${activePlan.monthlyLabel} · ${activePlan.status}`
      : "Family Care is ₦1,000/day or ₦30,000/month. No active package is attached yet.",
    notice: null,
  };
}

export async function saveVital(patientId: string, draft: VitalDraft, source: "patient" | "chw" | "pharmacy") {
  const thresholds = await loadThresholds();
  const result = classifyReading(draft, thresholds);
  const recordedAtLocal = new Date().toISOString();
  const user = await currentUser();
  const payload = {
    patient_id: patientId,
    entered_by: user?.id ?? null,
    source,
    reading_at: recordedAtLocal,
    systolic: draft.systolic,
    diastolic: draft.diastolic,
    glucose: draft.glucoseType === "none" ? null : draft.glucose,
    glucose_type: draft.glucoseType,
    pulse: draft.pulse,
    temperature: draft.temperature,
    weight: draft.weight,
    symptoms: draft.symptoms,
    medication_taken: draft.medicationTaken,
    risk_status: result.level,
    sync_status: "synced",
    notes: draft.notes || null,
  };
  const saved = await persist("vital", payload, Boolean(user));
  if (result.level !== "green") {
    await maybeNotify({
      patientId,
      templateType: "abnormal_alert",
      message: result.explanation,
    });
  }
  if (source === "pharmacy" && result.level !== "green") {
    const assignee = await clinicianAssignee(patientId, Boolean(user));
    await persist(
      "alert",
      {
        patient_id: patientId,
        vital_id: saved.server ? saved.id : null,
        severity: result.level,
        title: result.level === "red" ? "Urgent hub reading" : "Hub reading needs review",
        message: result.explanation,
        assigned_to_user_id: assignee,
        status: "new",
      },
      Boolean(user),
    );
  }
  return { result, saved };
}

export async function saveVisit(input: {
  patientId: string;
  providerId: string | null;
  visitType: "remote_check" | "physical_visit";
  startedAt: string;
  gpsLat: number;
  gpsLng: number;
  checklist: Record<string, unknown>;
  audioLanguage: string;
  confirmationMethod: string;
  notes: string;
  draft: VitalDraft;
  id?: string;
  proofR2Url?: string | null;
}) {
  const vital = await saveVital(input.patientId, input.draft, "chw");
  const recordedAtLocal = new Date().toISOString();
  const user = await currentUser();
  const localVisitId = input.id ?? crypto.randomUUID();
  const visitPayload = {
    patient_id: input.patientId,
    chw_provider_id: input.providerId,
    visit_type: input.visitType,
    started_at: input.startedAt,
    completed_at: recordedAtLocal,
    gps_lat: input.gpsLat,
    gps_lng: input.gpsLng,
    checklist_responses: input.checklist,
    audio_language_used: input.audioLanguage,
    patient_confirmed: true,
    confirmation_method: input.confirmationMethod,
    proof_r2_url: input.proofR2Url ?? null,
    status: "completed_verified",
    sync_status: "synced",
    notes: input.notes || null,
  };
  const saved = await persist("visit", visitPayload, Boolean(user), localVisitId);
  await maybeNotify({
    patientId: input.patientId,
    templateType: "visit_completed",
    message: input.visitType === "physical_visit" ? "A home visit was completed." : "A remote check was completed.",
  });
  if (vital.result.level !== "green") {
    await persist(
      "alert",
      {
        patient_id: input.patientId,
        severity: vital.result.level,
        title: vital.result.level === "red" ? "Urgent reading" : "Reading needs review",
        message: vital.result.explanation,
        status: "new",
        ...(saved.server && saved.id ? { visit_id: saved.id } : { localVisitId }),
      },
      Boolean(user),
    );
  }
  return { result: vital.result, saved };
}

export async function markMedicationTaken(patientId: string) {
  return saveVital(
    patientId,
    {
      systolic: null,
      diastolic: null,
      glucose: null,
      glucoseType: "none",
      pulse: null,
      temperature: null,
      weight: null,
      symptoms: [],
      medicationTaken: true,
      notes: "Medication marked taken",
    },
    "patient",
  );
}

export async function requestRefill(patientId: string, medicationId: string, medicationName?: string) {
  const user = await currentUser();
  const pharmacyProviderId = await pharmacyAssignee(patientId, Boolean(user));
  const medication = DEMO_MEDICATIONS.find((item) => item.id === medicationId);
  return persist(
    "refill",
    {
      patient_id: patientId,
      pharmacy_provider_id: pharmacyProviderId,
      medication_id: medicationId,
      medication_name: medicationName ?? medication?.name ?? "Medication",
      dosage: medication?.dosage ?? "",
      patient_name: DEMO_PATIENTS.find((item) => item.id === patientId)?.name ?? "",
      status: "requested",
      notes: "Requested from the patient dashboard.",
      requested_at: new Date().toISOString(),
    },
    Boolean(user),
  );
}

export async function requestReview(patientId: string, explanation: string, level: RiskLevel) {
  const user = await currentUser();
  return persist(
    "alert",
    {
      patient_id: patientId,
      severity: level,
      title: "Clinician review requested",
      message: explanation,
      status: "new",
    },
    Boolean(user),
  );
}

export async function createDispute(visitId: string, reason: string) {
  const user = await currentUser();
  if (user && visitId.startsWith("demo-")) {
    return "This sample visit cannot be disputed until you are signed in to a live record.";
  }
  const saved = await persist(
    "dispute",
    {
      visit_id: visitId,
      raised_by_user_id: user?.id ?? null,
      reason,
      status: "open",
    },
    Boolean(user),
  );
  return saved.ok ? null : saved.error;
}

export async function persist(
  kind: QueueKind,
  payload: Record<string, unknown>,
  live: boolean,
  id = crypto.randomUUID(),
  op: QueueRecord["op"] = "insert",
) {
  const recordedAtLocal = new Date().toISOString();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  if (live && online && hasSupabaseEnv()) {
    const pushed = await pushQueued({
      id,
      kind,
      op,
      mode: "live",
      payload,
      recordedAtLocal,
      syncedAtServer: null,
      syncStatus: "pending_sync",
    });
    if (pushed.ok) {
      return { ok: true as const, error: null, id: pushed.serverId ?? id, server: true };
    }
    await enqueue({
      id,
      kind,
      op,
      mode: "live",
      payload,
      recordedAtLocal,
      syncStatus: "failed_sync",
    });
    return { ok: false as const, error: pushed.error ?? "Save failed.", id, server: false };
  }
  await enqueue({
    id,
    kind,
    op,
    mode: live ? "live" : "demo",
    payload,
    recordedAtLocal,
    syncStatus: live ? "pending_sync" : "synced",
  });
  return { ok: true as const, error: null, id, server: false };
}

export async function pushQueued(item: QueueRecord) {
  const supabase = createClient();
  const payload = { ...item.payload };
  const localVisitId = typeof payload.localVisitId === "string" ? payload.localVisitId : null;
  delete payload.localVisitId;
  const settingTable = typeof payload.setting_table === "string" ? payload.setting_table : null;
  for (const key of ["setting_table", "actor_name", "medication_name", "patient_name", "dosage"]) {
    delete payload[key];
  }
  if (localVisitId && !payload.visit_id) {
    return { ok: false, error: "Waiting for the visit to sync.", serverId: undefined as string | undefined };
  }
  if (item.kind === "audit") {
    const entityId = typeof payload.entity_id === "string" ? payload.entity_id : null;
    if (entityId && !isUuid(entityId)) {
      const metadata = (payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}) as Record<string, unknown>;
      payload.metadata = { ...metadata, entity_label: entityId };
      payload.entity_id = null;
    }
  }

  if (item.kind === "setting" && settingTable === "clinical_thresholds") {
    const { error } = await supabase.from("clinical_thresholds").update(payload as never).eq("id", 1);
    return { ok: !error, error: error?.message, serverId: "1" };
  }
  if (item.kind === "setting" && settingTable === "feature_flags") {
    const { error } = await supabase.from("feature_flags").update({ enabled: payload.enabled } as never).eq("key", String(payload.key));
    return { ok: !error, error: error?.message, serverId: String(payload.key) };
  }
  if (item.kind === "setting" && settingTable === "city_visit_caps") {
    const { error } = await supabase.from("city_visit_caps").upsert(payload as never, { onConflict: "city" });
    return { ok: !error, error: error?.message, serverId: String(payload.city ?? item.id) };
  }

  const table = tableFor(item.kind);
  if (!table) return { ok: false, error: "Unknown record.", serverId: undefined as string | undefined };
  if (item.op === "update") {
    const { error } = await supabase.from(table).update(payload as never).eq("id", item.serverId ?? item.id);
    return { ok: !error, error: error?.message, serverId: item.serverId ?? item.id };
  }
  const { data, error } = await supabase.from(table).insert(payload as never).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Save failed.", serverId: undefined as string | undefined };
  return { ok: true, error: null, serverId: String((data as { id: string }).id) };
}

export async function currentSession() {
  const user = await currentUser();
  return { user, live: Boolean(user) };
}

async function currentUser() {
  if (!hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

function demoPatient(): PatientCare {
  const patient = DEMO_PATIENTS[0];
  return {
    mode: "demo",
    patient,
    chwName: DEMO_CHW.name,
    chwPhone: DEMO_CHW.phone,
    vitals: DEMO_VITALS.filter((row) => row.patientId === patient.id),
    medications: DEMO_MEDICATIONS.filter((row) => row.patientId === patient.id),
    plan: DEMO_PLAN,
    notice: "Demo preview. New readings stay on this device until you sign in.",
  };
}

function demoSponsor(): SponsorCare {
  const patient = DEMO_PATIENTS[1];
  return {
    mode: "demo",
    sponsorName: "Tunde Adeyemi",
    patient,
    vitals: DEMO_VITALS.filter((row) => row.patientId === patient.id),
    visits: DEMO_VISITS.filter((row) => row.patientId === patient.id),
    alerts: DEMO_ALERTS.filter((row) => row.patientId === patient.id),
    planLabel: "Family Care is ₦1,000/day or ₦30,000/month. No active package is attached yet.",
    notice: "Demo preview for Baba Adeyemi. Disputes stay on this device until you sign in.",
  };
}

async function liveVitals(patientId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("vitals_log")
    .select("id, patient_id, reading_at, systolic, diastolic, glucose, glucose_type, pulse, temperature, weight, symptoms, medication_taken, risk_status, notes, source")
    .eq("patient_id", patientId)
    .order("reading_at", { ascending: false });
  return ((data ?? []) as VitalRecord[]).map(mapVital);
}

async function localVitals(patientId: string, mode: "demo" | "live") {
  const rows = await listQueue();
  return rows
    .filter((row) => {
      if (row.kind !== "vital" || row.mode !== mode || row.payload.patient_id !== patientId) return false;
      return mode === "demo" || row.syncStatus !== "synced";
    })
    .map((row) => mapVital({ ...(row.payload as VitalRecord), id: row.id, patient_id: patientId }));
}

async function localVisits(patientId: string, mode: "demo" | "live"): Promise<DemoVisit[]> {
  const rows = await listQueue();
  return rows
    .filter((row) => row.kind === "visit" && row.mode === mode && row.payload.patient_id === patientId)
    .map((row) => ({
      id: row.id,
      patientId,
      patientName: "",
      chwName: DEMO_CHW.name,
      badges: DEMO_CHW.badges,
      visitType: row.payload.visit_type === "physical_visit" ? "physical_visit" : "remote_check",
      startedAt: String(row.payload.started_at ?? row.recordedAtLocal),
      completedAt: String(row.payload.completed_at ?? row.recordedAtLocal),
      gpsLat: Number(row.payload.gps_lat ?? 0),
      gpsLng: Number(row.payload.gps_lng ?? 0),
      patientConfirmed: true,
      confirmationMethod: String(row.payload.confirmation_method ?? ""),
      audioLanguageUsed: String(row.payload.audio_language_used ?? ""),
      status: String(row.payload.status ?? "completed_verified"),
      syncStatus: String(row.payload.sync_status ?? "synced"),
      chwProviderId: row.payload.chw_provider_id ? String(row.payload.chw_provider_id) : null,
      notes: String(row.payload.notes ?? ""),
    }));
}

async function localAlerts(patientId: string, mode: "demo" | "live"): Promise<DemoAlert[]> {
  const rows = await listQueue();
  return rows
    .filter((row) => row.kind === "alert" && row.mode === mode && row.payload.patient_id === patientId)
    .map((row) => ({
      id: row.id,
      patientId,
      severity: (row.payload.severity as RiskLevel) ?? "yellow",
      title: String(row.payload.title ?? "Alert"),
      message: String(row.payload.message ?? ""),
      status: String(row.payload.status ?? "new"),
      createdAt: row.recordedAtLocal,
      assignedToUserId: row.payload.assigned_to_user_id ? String(row.payload.assigned_to_user_id) : null,
    }));
}

function mergeVitals(remote: DemoVital[], pending: DemoVital[]) {
  const ids = new Set(remote.map((row) => row.id));
  return [...pending.filter((row) => !ids.has(row.id)), ...remote];
}

async function liveMedications(patientId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("medications")
    .select("id, patient_id, medication_name, dosage, frequency, active")
    .eq("patient_id", patientId)
    .eq("active", true);
  return ((data ?? []) as MedicationRecord[])
    .filter((row) => row.active !== false)
    .map((row) => ({
      id: row.id,
      patientId: row.patient_id,
      name: row.medication_name,
      dosage: row.dosage ?? "",
      frequency: row.frequency ?? "",
    }));
}

async function livePlan(patientId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, billing_interval, plans(name, price_daily_ngn, price_monthly_ngn)")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .neq("billing_interval", "one_time")
    .limit(1)
    .maybeSingle();
  const row = data as {
    status?: string;
    plans?: { name?: string; price_daily_ngn?: number | null; price_monthly_ngn?: number | null } | null;
  } | null;
  if (!row?.plans?.name) return null;
  return {
    name: row.plans.name,
    dailyLabel: row.plans.price_daily_ngn != null ? `₦${row.plans.price_daily_ngn.toLocaleString("en-NG")}/day` : "Daily price not set",
    monthlyLabel: row.plans.price_monthly_ngn != null ? `₦${row.plans.price_monthly_ngn.toLocaleString("en-NG")}/month` : "Monthly price not set",
    status: row.status ?? "active",
  };
}

async function liveChw(patientId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("patient_provider_assignments")
    .select("provider_id")
    .eq("patient_id", patientId)
    .eq("provider_type", "chw")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const providerId = (data as { provider_id?: string } | null)?.provider_id;
  if (!providerId) return null;
  const { data: provider } = await supabase
    .from("providers")
    .select("provider_name, user_id")
    .eq("id", providerId)
    .maybeSingle();
  const row = provider as { provider_name?: string; user_id?: string } | null;
  let phone: string | null = null;
  if (row?.user_id) {
    const { data: profile } = await supabase.from("profiles").select("phone").eq("id", row.user_id).maybeSingle();
    phone = (profile as { phone?: string | null } | null)?.phone ?? null;
  }
  return { name: row?.provider_name ?? "Community health worker", phone };
}

async function liveVisits(patientId: string): Promise<DemoVisit[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("visits")
    .select("id, patient_id, visit_type, started_at, completed_at, gps_lat, gps_lng, patient_confirmed, confirmation_method, audio_language_used, status, notes, chw_provider_id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as VisitRecord[];
  return Promise.all(
    rows.map(async (row) => {
      let chwName = "Community health worker";
      let badges: string[] = [];
      if (row.chw_provider_id) {
        const { data: provider } = await supabase
          .from("providers")
          .select("provider_name, verification_badges")
          .eq("id", row.chw_provider_id)
          .maybeSingle();
        const parsed = provider as { provider_name?: string; verification_badges?: string[] } | null;
        chwName = parsed?.provider_name ?? chwName;
        badges = parsed?.verification_badges ?? [];
      }
      return {
        id: row.id,
        patientId: row.patient_id,
        patientName: "",
        chwName,
        badges,
        visitType: row.visit_type,
        startedAt: row.started_at ?? row.completed_at ?? "",
        completedAt: row.completed_at ?? "",
        gpsLat: Number(row.gps_lat ?? 0),
        gpsLng: Number(row.gps_lng ?? 0),
        patientConfirmed: row.patient_confirmed,
        confirmationMethod: row.confirmation_method ?? "",
        audioLanguageUsed: row.audio_language_used ?? "",
        status: row.status,
        syncStatus: "synced",
        chwProviderId: row.chw_provider_id,
        notes: row.notes ?? "",
      };
    }),
  );
}

async function liveAlerts(patientId: string): Promise<DemoAlert[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("alerts")
    .select("id, patient_id, severity, title, message, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as AlertRecord[]).map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    severity: row.severity,
    title: row.title,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    assignedToUserId: null,
  }));
}

async function namePatient(row: PatientRecord): Promise<DemoPatient> {
  let name = row.city ? `Patient in ${row.city}` : "Linked patient";
  if (row.user_id && hasSupabaseEnv()) {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
    const fullName = (data as { full_name?: string } | null)?.full_name;
    if (fullName) name = fullName;
  }
  return {
    id: row.id,
    name,
    city: row.city ?? "",
    state: row.state ?? "",
    age: row.age ?? null,
    gender: row.gender ?? null,
    conditions: row.conditions ?? [],
    isSelfSponsored: row.is_self_sponsored,
    emergencyContactName: row.emergency_contact_name ?? "",
    emergencyContactPhone: row.emergency_contact_phone ?? "",
    riskStatus: (row.risk_status as RiskLevel) ?? "green",
  };
}

function mapVital(row: VitalRecord): DemoVital {
  return {
    id: row.id,
    patientId: row.patient_id,
    readingAt: row.reading_at,
    systolic: row.systolic,
    diastolic: row.diastolic,
    glucose: row.glucose == null ? null : Number(row.glucose),
    glucoseType: row.glucose_type,
    pulse: row.pulse,
    temperature: row.temperature == null ? null : Number(row.temperature),
    weight: row.weight == null ? null : Number(row.weight),
    symptoms: row.symptoms ?? [],
    medicationTaken: row.medication_taken,
    riskStatus: (row.risk_status as RiskLevel) ?? "green",
    notes: row.notes,
    source: row.source,
  };
}

function tableFor(kind: QueueKind) {
  switch (kind) {
    case "vital":
      return "vitals_log";
    case "visit":
      return "visits";
    case "alert":
      return "alerts";
    case "refill":
      return "pharmacy_refills";
    case "dispute":
      return "disputes";
    case "consultation":
      return "consultations";
    case "provider":
      return "providers";
    case "assignment":
      return "patient_provider_assignments";
    case "plan":
      return "plans";
    case "audit":
      return "audit_logs";
    case "setting":
    case "payment":
    case "notification":
      return null;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function clinicianAssignee(patientId: string, live: boolean) {
  if (!live) return DEMO_CLINICIAN.userId;
  const providerId = await liveProviderId(patientId, "clinician");
  if (!providerId) return null;
  const supabase = createClient();
  const { data } = await supabase.from("providers").select("user_id").eq("id", providerId).maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

async function pharmacyAssignee(patientId: string, live: boolean) {
  if (!live) {
    return (
      DEMO_ASSIGNMENTS.find((row) => row.patientId === patientId && row.providerType === "pharmacy" && row.active)?.providerId ??
      DEMO_PHARMACY.id
    );
  }
  return liveProviderId(patientId, "pharmacy");
}

async function liveProviderId(patientId: string, providerType: "chw" | "pharmacy" | "clinician") {
  const supabase = createClient();
  const { data } = await supabase
    .from("patient_provider_assignments")
    .select("provider_id")
    .eq("patient_id", patientId)
    .eq("provider_type", providerType)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return (data as { provider_id?: string } | null)?.provider_id ?? null;
}

type PatientRecord = {
  id: string;
  user_id?: string | null;
  city: string | null;
  state: string | null;
  age?: number | null;
  gender?: string | null;
  conditions?: string[] | null;
  is_self_sponsored: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  risk_status: string | null;
};

type VitalRecord = {
  id: string;
  patient_id: string;
  reading_at: string;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
  glucose_type: GlucoseType;
  pulse: number | null;
  temperature: number | null;
  weight: number | null;
  symptoms: string[] | null;
  medication_taken: boolean | null;
  risk_status: string | null;
  notes: string | null;
  source: string;
};

type MedicationRecord = {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  active?: boolean;
};

type VisitRecord = {
  id: string;
  patient_id: string;
  visit_type: "remote_check" | "physical_visit";
  started_at: string | null;
  completed_at: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  patient_confirmed: boolean;
  confirmation_method: string | null;
  audio_language_used: string | null;
  status: string;
  notes: string | null;
  chw_provider_id: string | null;
};

type AlertRecord = {
  id: string;
  patient_id: string;
  severity: RiskLevel;
  title: string;
  message: string;
  status: string;
  created_at: string;
};

export type { SymptomId };
