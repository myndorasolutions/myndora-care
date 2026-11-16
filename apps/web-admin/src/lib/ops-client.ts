import { currentSession, persist, saveVital, type VitalDraft } from "@/lib/care-client";
import {
  CHW_CHECKS,
  DEMO_ALERTS,
  DEMO_ASSIGNMENTS,
  DEMO_AUDITS,
  DEMO_CLINICIAN,
  DEMO_CONSULTATIONS,
  DEMO_DISPUTES,
  DEMO_MEDICATIONS,
  DEMO_PATIENTS,
  DEMO_PHARMACY,
  DEMO_PROVIDERS,
  DEMO_REFILLS,
  DEMO_REVIEW_VISITS,
  DEMO_VISITS,
  DEMO_VITALS,
  homeVisitReady,
  type DemoAlert,
  type DemoAssignment,
  type DemoAudit,
  type DemoCityCap,
  type DemoConsultation,
  type DemoDispute,
  type DemoFlag,
  type DemoMedication,
  type DemoPatient,
  type DemoPlanRow,
  type DemoProvider,
  type DemoRefill,
  type DemoVisit,
  type DemoVital,
  type ProviderKind,
  type RefillStatus,
  type VerificationStatus,
} from "@/lib/demo-care";
import { listQueue, type QueueRecord } from "@/lib/offline-queue";
import { loadCityCaps, loadFlags, loadPlanRows, loadThresholds, thresholdsPayload } from "@/lib/platform-state";
import type { RiskThresholds } from "@/lib/risk-engine";
import { createClient } from "@/lib/supabase/client";

export type PharmacyCare = {
  mode: "demo" | "live";
  pharmacyId: string | null;
  pharmacyName: string;
  patients: DemoPatient[];
  refills: DemoRefill[];
  notice: string | null;
};

export type ClinicianCare = {
  mode: "demo" | "live";
  clinicianId: string | null;
  clinicianName: string;
  alerts: DemoAlert[];
  patients: DemoPatient[];
  vitals: DemoVital[];
  medications: DemoMedication[];
  visits: DemoVisit[];
  consultations: DemoConsultation[];
  notice: string | null;
};

export type AdminCare = {
  mode: "demo" | "live";
  providers: DemoProvider[];
  patients: DemoPatient[];
  assignments: DemoAssignment[];
  disputes: DemoDispute[];
  visits: DemoVisit[];
  alerts: DemoAlert[];
  notice: string | null;
};

export type SuperCare = {
  mode: "demo" | "live";
  thresholds: RiskThresholds;
  plans: DemoPlanRow[];
  flags: DemoFlag[];
  caps: DemoCityCap[];
  audits: DemoAudit[];
  notice: string | null;
};

export { CHW_CHECKS, homeVisitReady };

export async function loadPharmacyCare(): Promise<PharmacyCare> {
  const { user, live } = await currentSession();
  if (!live || !user) {
    const refills = await mergeRefills(DEMO_REFILLS, "demo");
    const patientIds = new Set(
      DEMO_ASSIGNMENTS.filter((row) => row.providerType === "pharmacy" && row.providerId === DEMO_PHARMACY.id && row.active).map((row) => row.patientId),
    );
    return {
      mode: "demo",
      pharmacyId: DEMO_PHARMACY.id,
      pharmacyName: DEMO_PHARMACY.name,
      patients: DEMO_PATIENTS.filter((patient) => patientIds.has(patient.id)),
      refills: refills.filter((row) => row.pharmacyProviderId === DEMO_PHARMACY.id),
      notice: "Demo preview for HealthPlus Tanke Pharmacy. Status changes stay on this device until you sign in.",
    };
  }
  const supabase = createClient();
  const { data: providerRow } = await supabase
    .from("providers")
    .select("id, provider_name, provider_type")
    .eq("user_id", user.id)
    .eq("provider_type", "pharmacy")
    .maybeSingle();
  const provider = providerRow as { id: string; provider_name: string } | null;
  if (!provider) {
    return { mode: "live", pharmacyId: null, pharmacyName: "Pharmacy", patients: [], refills: [], notice: "No pharmacy profile is linked to this account yet." };
  }
  const { data: refillRows } = await supabase
    .from("pharmacy_refills")
    .select("id, patient_id, pharmacy_provider_id, medication_id, status, notes, requested_at, fulfilled_at")
    .eq("pharmacy_provider_id", provider.id)
    .order("requested_at", { ascending: false });
  const raw = (refillRows ?? []) as RefillRecord[];
  const refills = await hydrateRefills(raw);
  const merged = await mergeRefills(refills, "live");
  const { data: links } = await supabase
    .from("patient_provider_assignments")
    .select("patient_id")
    .eq("provider_id", provider.id)
    .eq("active", true);
  const ids = ((links ?? []) as { patient_id: string }[]).map((row) => row.patient_id);
  return {
    mode: "live",
    pharmacyId: provider.id,
    pharmacyName: provider.provider_name,
    patients: await loadPatients(ids),
    refills: merged.filter((row) => row.pharmacyProviderId === provider.id),
    notice: null,
  };
}

export async function updateRefill(id: string, status: RefillStatus, notes: string | null) {
  const { live } = await currentSession();
  return persist(
    "refill",
    {
      status,
      notes,
      fulfilled_at: status === "fulfilled" ? new Date().toISOString() : null,
    },
    live,
    id,
    "update",
  );
}

export async function loadClinicianCare(): Promise<ClinicianCare> {
  const { user, live } = await currentSession();
  if (!live || !user) {
    const [alerts, consultations, visits] = await Promise.all([
      mergeAlerts(DEMO_ALERTS, "demo"),
      mergeConsultations(DEMO_CONSULTATIONS, "demo"),
      mergeVisits([...DEMO_VISITS, ...DEMO_REVIEW_VISITS], "demo"),
    ]);
    return {
      mode: "demo",
      clinicianId: DEMO_CLINICIAN.id,
      clinicianName: DEMO_CLINICIAN.name,
      alerts: openAlerts(alerts),
      patients: DEMO_PATIENTS,
      vitals: DEMO_VITALS,
      medications: DEMO_MEDICATIONS,
      visits,
      consultations,
      notice: "Demo preview for Dr. Chinedu Okafor. Directives stay on this device until you sign in.",
    };
  }
  const supabase = createClient();
  const { data: providerRow } = await supabase
    .from("providers")
    .select("id, provider_name")
    .eq("user_id", user.id)
    .eq("provider_type", "clinician")
    .maybeSingle();
  const provider = providerRow as { id: string; provider_name: string } | null;
  if (!provider) {
    return emptyClinician("No clinician profile is linked to this account yet.");
  }
  const { data: links } = await supabase
    .from("patient_provider_assignments")
    .select("patient_id")
    .eq("provider_id", provider.id)
    .eq("active", true);
  const assignedIds = ((links ?? []) as { patient_id: string }[]).map((row) => row.patient_id);
  const { data: alertRows } = await supabase
    .from("alerts")
    .select("id, patient_id, severity, title, message, status, created_at, assigned_to_user_id")
    .in("severity", ["yellow", "red"])
    .in("status", ["new", "in_review"])
    .order("created_at", { ascending: false });
  const alerts = await mergeAlerts(((alertRows ?? []) as AlertRecord[]).map(mapAlert), "live");
  const visible = openAlerts(alerts).filter(
    (alert) => alert.assignedToUserId === user.id || assignedIds.includes(alert.patientId),
  );
  const patientIds = [...new Set([...assignedIds, ...visible.map((alert) => alert.patientId)])];
  const [patients, vitals, medications, visits, consultations] = await Promise.all([
    loadPatients(patientIds),
    loadVitals(patientIds),
    loadMedications(patientIds),
    loadVisits(patientIds),
    loadConsultations(patientIds),
  ]);
  return {
    mode: "live",
    clinicianId: provider.id,
    clinicianName: provider.provider_name,
    alerts: visible,
    patients,
    vitals,
    medications,
    visits,
    consultations,
    notice: null,
  };
}

export async function saveDirective(input: {
  patientId: string;
  alertId: string;
  consultationId: string | null;
  clinicianProviderId: string;
  recommendationNotes: string;
  followUpAction: string;
  followUpDate: string;
  outcome: "in_review" | "resolved";
}) {
  const { live } = await currentSession();
  const now = new Date().toISOString();
  await persist(
    "alert",
    {
      status: input.outcome === "resolved" ? "resolved" : "in_review",
      resolved_at: input.outcome === "resolved" ? now : null,
    },
    live,
    input.alertId,
    "update",
  );
  const consultationId = input.consultationId ?? crypto.randomUUID();
  return persist(
    "consultation",
    {
      patient_id: input.patientId,
      clinician_provider_id: input.clinicianProviderId,
      alert_id: input.alertId,
      recommendation_notes: input.recommendationNotes,
      follow_up_action: input.followUpAction,
      follow_up_date: input.followUpDate || null,
      status: input.outcome === "resolved" ? "completed" : "in_review",
    },
    live,
    consultationId,
    input.consultationId ? "update" : "insert",
  );
}

export async function loadAdminCare(): Promise<AdminCare> {
  const { live } = await currentSession();
  if (!live) {
    const [providers, assignments, disputes, visits, alerts] = await Promise.all([
      mergeProviders(DEMO_PROVIDERS, "demo"),
      mergeAssignments(DEMO_ASSIGNMENTS, "demo"),
      mergeDisputes(DEMO_DISPUTES, "demo"),
      mergeVisits([...DEMO_VISITS, ...DEMO_REVIEW_VISITS], "demo"),
      mergeAlerts(DEMO_ALERTS, "demo"),
    ]);
    return {
      mode: "demo",
      providers,
      patients: DEMO_PATIENTS,
      assignments,
      disputes,
      visits,
      alerts: openAlerts(alerts),
      notice: "Demo preview. Verification, assignments, and dispute decisions stay on this device until you sign in.",
    };
  }
  const supabase = createClient();
  const [{ data: providerRows }, { data: assignmentRows }, { data: disputeRows }, { data: visitRows }, { data: alertRows }] = await Promise.all([
    supabase.from("providers").select("id, user_id, provider_name, provider_type, cadre_or_specialty, city, verification_status, verification_badges"),
    supabase.from("patient_provider_assignments").select("id, patient_id, provider_id, provider_type, active"),
    supabase.from("disputes").select("id, visit_id, reason, status, resolution_notes, created_at, raised_by_user_id").in("status", ["open", "under_review"]),
    supabase.from("visits").select("id, patient_id, visit_type, started_at, completed_at, gps_lat, gps_lng, patient_confirmed, confirmation_method, audio_language_used, status, sync_status, notes, chw_provider_id").or("status.eq.needs_review,status.eq.completed_unverified,sync_status.eq.failed_sync"),
    supabase.from("alerts").select("id, patient_id, severity, title, message, status, created_at, assigned_to_user_id").in("severity", ["yellow", "red"]).in("status", ["new", "in_review"]),
  ]);
  const providers = await mergeProviders(((providerRows ?? []) as ProviderRecord[]).map(mapProvider), "live");
  const assignments = await mergeAssignments(((assignmentRows ?? []) as AssignmentRecord[]).map(mapAssignment), "live");
  const patients = await loadPatients([...new Set(assignments.map((row) => row.patientId))]);
  const disputes = await mergeDisputes(await hydrateDisputes((disputeRows ?? []) as DisputeRecord[], patients), "live");
  const visits = await mergeVisits(((visitRows ?? []) as VisitRecord[]).map((row) => mapVisit(row, patients, providers)), "live");
  const alerts = openAlerts(await mergeAlerts(((alertRows ?? []) as AlertRecord[]).map(mapAlert), "live"));
  return { mode: "live", providers, patients, assignments, disputes, visits, alerts, notice: null };
}

export async function updateChwVerification(providerId: string, status: VerificationStatus, badges: string[]) {
  if ((status === "home_visit_approved" || status === "verified") && !homeVisitReady(badges)) {
    return { ok: false as const, error: "Complete every verification check before home-visit approval.", id: providerId, server: false };
  }
  const { live, user } = await currentSession();
  const saved = await persist(
    "provider",
    { verification_status: status, verification_badges: badges },
    live,
    providerId,
    "update",
  );
  await recordAudit(live, user?.id ?? null, "Myndora Admin", "chw.verification_updated", "providers", providerId, { status, badges });
  return saved;
}

export async function saveAssignment(patientId: string, providerType: ProviderKind, providerId: string, assignments: DemoAssignment[]) {
  const { live, user } = await currentSession();
  const current = assignments.find((row) => row.patientId === patientId && row.providerType === providerType && row.active);
  if (current?.providerId === providerId) return { ok: true as const, error: null, id: current.id, server: false };
  if (current) await persist("assignment", { active: false }, live, current.id, "update");
  const id = crypto.randomUUID();
  const saved = await persist(
    "assignment",
    {
      patient_id: patientId,
      provider_id: providerId,
      provider_type: providerType,
      active: true,
      ...(user ? { assigned_by: user.id } : {}),
    },
    live,
    id,
    "insert",
  );
  await recordAudit(live, user?.id ?? null, "Myndora Admin", "assignment.updated", "patient_provider_assignments", saved.id, {
    patientId,
    providerType,
    providerId,
  });
  return saved;
}

export async function resolveDispute(input: {
  dispute: DemoDispute;
  action: "uphold" | "credit" | "flag";
  comment: string;
  providers: DemoProvider[];
}) {
  const label = input.action === "uphold" ? "Uphold Visit" : input.action === "credit" ? "Issue Service Credit/Reschedule" : "Flag CHW";
  const status = input.action === "uphold" ? "upheld" : input.action === "credit" ? "rejected" : "under_review";
  const { live, user } = await currentSession();
  const saved = await persist(
    "dispute",
    {
      status,
      resolution_notes: `${label}. ${input.comment}`.trim(),
      resolved_at: input.action === "flag" ? null : new Date().toISOString(),
    },
    live,
    input.dispute.id,
    "update",
  );
  if (input.action === "flag" && input.dispute.chwProviderId) {
    const provider = input.providers.find((row) => row.id === input.dispute.chwProviderId);
    const badges = [...new Set([...(provider?.badges ?? []), "flagged"])];
    await persist("provider", { verification_badges: badges }, live, input.dispute.chwProviderId, "update");
  }
  await recordAudit(live, user?.id ?? null, "Myndora Admin", "dispute.resolved", "disputes", input.dispute.id, { action: label });
  return saved;
}

export async function loadSuperCare(): Promise<SuperCare> {
  const { live } = await currentSession();
  const [thresholds, plans, flags, caps, audits] = await Promise.all([
    loadThresholds(),
    loadPlanRows(),
    loadFlags(),
    loadCityCaps(),
    loadAudits(live ? "live" : "demo"),
  ]);
  return {
    mode: live ? "live" : "demo",
    thresholds,
    plans,
    flags,
    caps,
    audits,
    notice: live ? null : "Demo preview. Pricing, flags, and thresholds stay on this device until you sign in.",
  };
}

export async function saveThresholds(thresholds: RiskThresholds) {
  const { live, user } = await currentSession();
  const saved = await persist("setting", thresholdsPayload(thresholds), live, "clinical-thresholds", "update");
  await loadThresholds();
  await recordAudit(live, user?.id ?? null, "Myndora Super Admin", "threshold.updated", "clinical_thresholds", null, { ...thresholds });
  return saved;
}

export async function savePlan(plan: DemoPlanRow) {
  const { live, user } = await currentSession();
  const saved = await persist(
    "plan",
    {
      code: plan.code,
      price_daily_ngn: plan.priceDaily,
      price_monthly_ngn: plan.priceMonthly,
      included_service_count: plan.includedServiceCount,
    },
    live,
    plan.id,
    "update",
  );
  await recordAudit(live, user?.id ?? null, "Myndora Super Admin", "plan.updated", "plans", plan.id, {
    code: plan.code,
    priceDaily: plan.priceDaily,
    priceMonthly: plan.priceMonthly,
    includedServiceCount: plan.includedServiceCount,
  });
  return saved;
}

export async function saveCityCap(city: string, capNgn: number | null) {
  const { live, user } = await currentSession();
  const saved = await persist(
    "setting",
    { setting_table: "city_visit_caps", city, cap_ngn: capNgn, updated_at: new Date().toISOString() },
    live,
    `city-cap-${city.toLowerCase()}`,
    "update",
  );
  await recordAudit(live, user?.id ?? null, "Myndora Super Admin", "city_cap.updated", "city_visit_caps", null, { city, capNgn });
  return saved;
}

export async function saveFlag(flag: DemoFlag) {
  const { live, user } = await currentSession();
  const saved = await persist(
    "setting",
    { setting_table: "feature_flags", key: flag.key, label: flag.label, enabled: flag.enabled, updated_at: new Date().toISOString() },
    live,
    `flag-${flag.key}`,
    "update",
  );
  await recordAudit(live, user?.id ?? null, "Myndora Super Admin", "feature_flag.updated", "feature_flags", null, { key: flag.key, enabled: flag.enabled });
  return saved;
}

export async function loadRefillsForPatient(patientId: string, mode: "demo" | "live") {
  const base = mode === "demo" ? DEMO_REFILLS.filter((row) => row.patientId === patientId) : await liveRefillsForPatient(patientId);
  const merged = await mergeRefills(base, mode);
  return merged.filter((row) => row.patientId === patientId);
}

export async function loadLatestDirective(patientId: string, mode: "demo" | "live") {
  const base = mode === "demo" ? DEMO_CONSULTATIONS.filter((row) => row.patientId === patientId) : await liveConsultations(patientId);
  const merged = await mergeConsultations(base, mode);
  return merged
    .filter((row) => row.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export async function recordHubVitals(patientId: string, draft: VitalDraft) {
  return saveVital(patientId, draft, "pharmacy");
}

async function liveRefillsForPatient(patientId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("pharmacy_refills")
    .select("id, patient_id, pharmacy_provider_id, medication_id, status, notes, requested_at, fulfilled_at")
    .eq("patient_id", patientId);
  return hydrateRefills((data ?? []) as RefillRecord[]);
}

async function liveConsultations(patientId: string) {
  const rows = await loadConsultations([patientId]);
  return rows;
}

async function recordAudit(
  live: boolean,
  userId: string | null,
  actorName: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
) {
  await persist(
    "audit",
    {
      actor_user_id: userId,
      actor_name: actorName,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    },
    live,
  );
}

async function loadAudits(mode: "demo" | "live"): Promise<DemoAudit[]> {
  const base = mode === "demo" ? DEMO_AUDITS : await liveAudits();
  const patches = await queueRows("audit", mode);
  return mergeRecords(base, patches, applyAudit, createAudit).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function liveAudits(): Promise<DemoAudit[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as AuditRecord[];
  const ids = [...new Set(rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const profile of (profiles ?? []) as { id: string; full_name: string }[]) names.set(profile.id, profile.full_name);
  }
  return rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: (row.actor_user_id && names.get(row.actor_user_id)) || "Staff",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}

function openAlerts(alerts: DemoAlert[]) {
  return alerts.filter((alert) => (alert.severity === "yellow" || alert.severity === "red") && (alert.status === "new" || alert.status === "in_review"));
}

function emptyClinician(notice: string): ClinicianCare {
  return {
    mode: "live",
    clinicianId: null,
    clinicianName: "Clinician",
    alerts: [],
    patients: [],
    vitals: [],
    medications: [],
    visits: [],
    consultations: [],
    notice,
  };
}

async function loadPatients(ids: string[]): Promise<DemoPatient[]> {
  if (ids.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, user_id, age, gender, city, state, conditions, is_self_sponsored, emergency_contact_name, emergency_contact_phone, risk_status")
    .in("id", ids);
  const rows = (data ?? []) as PatientRecord[];
  const userIds = rows.map((row) => row.user_id).filter((id): id is string => Boolean(id));
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
    for (const profile of (profiles ?? []) as { id: string; full_name: string }[]) names.set(profile.id, profile.full_name);
  }
  return rows.map((row) => ({
    id: row.id,
    name: (row.user_id && names.get(row.user_id)) || (row.city ? `Patient in ${row.city}` : "Patient"),
    city: row.city ?? "",
    state: row.state ?? "",
    age: row.age,
    gender: row.gender,
    conditions: row.conditions ?? [],
    isSelfSponsored: row.is_self_sponsored,
    emergencyContactName: row.emergency_contact_name ?? "",
    emergencyContactPhone: row.emergency_contact_phone ?? "",
    riskStatus: row.risk_status === "red" || row.risk_status === "yellow" ? row.risk_status : "green",
  }));
}

async function loadVitals(patientIds: string[]): Promise<DemoVital[]> {
  if (patientIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("vitals_log")
    .select("id, patient_id, reading_at, systolic, diastolic, glucose, glucose_type, pulse, temperature, weight, symptoms, medication_taken, risk_status, notes, source")
    .in("patient_id", patientIds)
    .order("reading_at", { ascending: false });
  const remote = ((data ?? []) as VitalRecord[]).map(mapVital);
  const queued = (await queueRows("vital", "live")).map(createVital).filter((row): row is DemoVital => row != null && patientIds.includes(row.patientId));
  const ids = new Set(remote.map((row) => row.id));
  return [...queued.filter((row) => !ids.has(row.id)), ...remote];
}

async function loadMedications(patientIds: string[]): Promise<DemoMedication[]> {
  if (patientIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase.from("medications").select("id, patient_id, medication_name, dosage, frequency").in("patient_id", patientIds).eq("active", true);
  return ((data ?? []) as { id: string; patient_id: string; medication_name: string; dosage: string | null; frequency: string | null }[]).map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    name: row.medication_name,
    dosage: row.dosage ?? "",
    frequency: row.frequency ?? "",
  }));
}

async function loadVisits(patientIds: string[]) {
  if (patientIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("visits")
    .select("id, patient_id, visit_type, started_at, completed_at, gps_lat, gps_lng, patient_confirmed, confirmation_method, audio_language_used, status, sync_status, notes, chw_provider_id")
    .in("patient_id", patientIds);
  const patients = await loadPatients(patientIds);
  const mapped = ((data ?? []) as VisitRecord[]).map((row) => mapVisit(row, patients, []));
  return mergeVisits(mapped, "live");
}

async function loadConsultations(patientIds: string[]) {
  if (patientIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("consultations")
    .select("id, patient_id, clinician_provider_id, alert_id, recommendation_notes, follow_up_action, follow_up_date, status, created_at")
    .in("patient_id", patientIds);
  return mergeConsultations(((data ?? []) as ConsultationRecord[]).map(mapConsultation), "live");
}

async function hydrateRefills(rows: RefillRecord[]): Promise<DemoRefill[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();
  const medicationIds = [...new Set(rows.map((row) => row.medication_id))];
  const patientIds = [...new Set(rows.map((row) => row.patient_id))];
  const [{ data: medications }, patients] = await Promise.all([
    supabase.from("medications").select("id, medication_name, dosage").in("id", medicationIds),
    loadPatients(patientIds),
  ]);
  const meds = new Map(
    ((medications ?? []) as { id: string; medication_name: string; dosage: string | null }[]).map((row) => [row.id, row] as const),
  );
  return rows.map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    patientName: patients.find((patient) => patient.id === row.patient_id)?.name ?? "Patient",
    pharmacyProviderId: row.pharmacy_provider_id ?? "",
    medicationId: row.medication_id,
    medicationName: meds.get(row.medication_id)?.medication_name ?? "Medication",
    dosage: meds.get(row.medication_id)?.dosage ?? "",
    status: (row.status as RefillStatus) ?? "requested",
    notes: row.notes,
    requestedAt: row.requested_at,
    fulfilledAt: row.fulfilled_at,
  }));
}

async function hydrateDisputes(rows: DisputeRecord[], patients: DemoPatient[]): Promise<DemoDispute[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();
  const visitIds = rows.map((row) => row.visit_id);
  const { data } = await supabase.from("visits").select("id, patient_id, chw_provider_id").in("id", visitIds);
  const visits = new Map(
    ((data ?? []) as { id: string; patient_id: string; chw_provider_id: string | null }[]).map((row) => [row.id, row] as const),
  );
  const missingPatients = [...new Set([...visits.values()].map((visit) => visit.patient_id))].filter((id) => !patients.some((patient) => patient.id === id));
  const named = missingPatients.length ? await loadPatients(missingPatients) : [];
  const everyone = [...patients, ...named];
  return rows.map((row) => {
    const visit = visits.get(row.visit_id);
    const patient = everyone.find((item) => item.id === visit?.patient_id);
    return {
      id: row.id,
      visitId: row.visit_id,
      patientName: patient?.name ?? "Patient",
      reason: row.reason,
      status: row.status,
      resolutionNotes: row.resolution_notes,
      raisedBy: row.raised_by_user_id,
      chwProviderId: visit?.chw_provider_id ?? null,
      createdAt: row.created_at,
    };
  });
}

async function mergeRefills(base: DemoRefill[], mode: "demo" | "live") {
  return mergeRecords(base, await queueRows("refill", mode), applyRefill, createRefill);
}

async function mergeAlerts(base: DemoAlert[], mode: "demo" | "live") {
  return mergeRecords(base, await queueRows("alert", mode), applyAlert, createAlert);
}

async function mergeConsultations(base: DemoConsultation[], mode: "demo" | "live") {
  return mergeRecords(base, await queueRows("consultation", mode), applyConsultation, createConsultation);
}

async function mergeVisits(base: DemoVisit[], mode: "demo" | "live") {
  return mergeRecords(base, await queueRows("visit", mode), applyVisit, createVisit);
}

async function mergeProviders(base: DemoProvider[], mode: "demo" | "live") {
  return mergeRecords(base, await queueRows("provider", mode), applyProvider, () => null);
}

async function mergeAssignments(base: DemoAssignment[], mode: "demo" | "live") {
  return mergeRecords(base, await queueRows("assignment", mode), applyAssignment, createAssignment);
}

async function mergeDisputes(base: DemoDispute[], mode: "demo" | "live") {
  return mergeRecords(base, await queueRows("dispute", mode), applyDispute, createDispute);
}

async function queueRows(kind: QueueRecord["kind"], mode: "demo" | "live") {
  const rows = await listQueue();
  return rows.filter((row) => row.kind === kind && (mode === "demo" ? row.mode === "demo" : row.mode === "live" && row.syncStatus !== "synced"));
}

function mergeRecords<T extends { id: string }>(
  base: T[],
  patches: QueueRecord[],
  apply: (row: T, payload: Record<string, unknown>) => T,
  create: (row: QueueRecord) => T | null,
) {
  const map = new Map(base.map((row) => [row.id, row]));
  for (const patch of patches) {
    if (patch.op === "update") {
      const current = map.get(patch.id);
      if (current) map.set(patch.id, apply(current, patch.payload));
      continue;
    }
    const created = create(patch);
    if (created) map.set(created.id, created);
  }
  return [...map.values()];
}

function applyRefill(row: DemoRefill, payload: Record<string, unknown>): DemoRefill {
  return {
    ...row,
    status: (payload.status as RefillStatus) ?? row.status,
    notes: payload.notes === undefined ? row.notes : payload.notes == null ? null : String(payload.notes),
    fulfilledAt: payload.fulfilled_at === undefined ? row.fulfilledAt : payload.fulfilled_at == null ? null : String(payload.fulfilled_at),
  };
}

function createRefill(row: QueueRecord): DemoRefill {
  const medicationId = String(row.payload.medication_id ?? "");
  const medication = DEMO_MEDICATIONS.find((item) => item.id === medicationId);
  const patientId = String(row.payload.patient_id ?? "");
  return {
    id: row.id,
    patientId,
    patientName: String(row.payload.patient_name ?? DEMO_PATIENTS.find((patient) => patient.id === patientId)?.name ?? "Patient"),
    pharmacyProviderId: String(row.payload.pharmacy_provider_id ?? ""),
    medicationId,
    medicationName: String(row.payload.medication_name ?? medication?.name ?? "Medication"),
    dosage: String(row.payload.dosage ?? medication?.dosage ?? ""),
    status: (row.payload.status as RefillStatus) ?? "requested",
    notes: row.payload.notes == null ? null : String(row.payload.notes),
    requestedAt: String(row.payload.requested_at ?? row.recordedAtLocal),
    fulfilledAt: row.payload.fulfilled_at == null ? null : String(row.payload.fulfilled_at),
  };
}

function applyAlert(row: DemoAlert, payload: Record<string, unknown>): DemoAlert {
  return { ...row, status: payload.status ? String(payload.status) : row.status };
}

function createAlert(row: QueueRecord): DemoAlert {
  return {
    id: row.id,
    patientId: String(row.payload.patient_id ?? ""),
    severity: row.payload.severity === "red" || row.payload.severity === "green" ? row.payload.severity : "yellow",
    title: String(row.payload.title ?? "Alert"),
    message: String(row.payload.message ?? ""),
    status: String(row.payload.status ?? "new"),
    createdAt: row.recordedAtLocal,
    assignedToUserId: row.payload.assigned_to_user_id ? String(row.payload.assigned_to_user_id) : null,
  };
}

function applyConsultation(row: DemoConsultation, payload: Record<string, unknown>): DemoConsultation {
  return {
    ...row,
    recommendationNotes: payload.recommendation_notes === undefined ? row.recommendationNotes : String(payload.recommendation_notes ?? ""),
    followUpAction: payload.follow_up_action === undefined ? row.followUpAction : String(payload.follow_up_action ?? ""),
    followUpDate: payload.follow_up_date === undefined ? row.followUpDate : payload.follow_up_date == null ? null : String(payload.follow_up_date),
    status: payload.status === "completed" || payload.status === "in_review" || payload.status === "open" ? payload.status : row.status,
  };
}

function createConsultation(row: QueueRecord): DemoConsultation {
  return mapConsultation({
    id: row.id,
    patient_id: String(row.payload.patient_id ?? ""),
    clinician_provider_id: row.payload.clinician_provider_id ? String(row.payload.clinician_provider_id) : null,
    alert_id: row.payload.alert_id ? String(row.payload.alert_id) : null,
    recommendation_notes: row.payload.recommendation_notes == null ? null : String(row.payload.recommendation_notes),
    follow_up_action: row.payload.follow_up_action == null ? null : String(row.payload.follow_up_action),
    follow_up_date: row.payload.follow_up_date == null ? null : String(row.payload.follow_up_date),
    status: String(row.payload.status ?? "open"),
    created_at: row.recordedAtLocal,
  });
}

function applyVisit(row: DemoVisit, payload: Record<string, unknown>): DemoVisit {
  return {
    ...row,
    status: payload.status ? String(payload.status) : row.status,
    syncStatus: payload.sync_status ? String(payload.sync_status) : row.syncStatus,
    notes: payload.notes === undefined ? row.notes : String(payload.notes ?? ""),
  };
}

function createVisit(row: QueueRecord): DemoVisit {
  return {
    id: row.id,
    patientId: String(row.payload.patient_id ?? ""),
    patientName: DEMO_PATIENTS.find((patient) => patient.id === row.payload.patient_id)?.name ?? "Patient",
    chwName: "Community health worker",
    badges: [],
    visitType: row.payload.visit_type === "physical_visit" ? "physical_visit" : "remote_check",
    startedAt: String(row.payload.started_at ?? row.recordedAtLocal),
    completedAt: String(row.payload.completed_at ?? row.recordedAtLocal),
    gpsLat: Number(row.payload.gps_lat ?? 0),
    gpsLng: Number(row.payload.gps_lng ?? 0),
    patientConfirmed: Boolean(row.payload.patient_confirmed),
    confirmationMethod: String(row.payload.confirmation_method ?? ""),
    audioLanguageUsed: String(row.payload.audio_language_used ?? ""),
    status: String(row.payload.status ?? "completed_verified"),
    syncStatus: String(row.payload.sync_status ?? "synced"),
    chwProviderId: row.payload.chw_provider_id ? String(row.payload.chw_provider_id) : null,
    notes: String(row.payload.notes ?? ""),
  };
}

function applyProvider(row: DemoProvider, payload: Record<string, unknown>): DemoProvider {
  const status = payload.verification_status;
  return {
    ...row,
    verificationStatus: isVerification(status) ? status : row.verificationStatus,
    badges: Array.isArray(payload.verification_badges) ? payload.verification_badges.map(String) : row.badges,
  };
}

function applyAssignment(row: DemoAssignment, payload: Record<string, unknown>): DemoAssignment {
  return {
    ...row,
    active: typeof payload.active === "boolean" ? payload.active : row.active,
    providerId: payload.provider_id ? String(payload.provider_id) : row.providerId,
  };
}

function createAssignment(row: QueueRecord): DemoAssignment {
  return {
    id: row.id,
    patientId: String(row.payload.patient_id ?? ""),
    providerId: String(row.payload.provider_id ?? ""),
    providerType: row.payload.provider_type === "pharmacy" || row.payload.provider_type === "clinician" ? row.payload.provider_type : "chw",
    active: payloadActive(row.payload.active),
  };
}

function applyDispute(row: DemoDispute, payload: Record<string, unknown>): DemoDispute {
  return {
    ...row,
    status: payload.status ? String(payload.status) : row.status,
    resolutionNotes: payload.resolution_notes === undefined ? row.resolutionNotes : payload.resolution_notes == null ? null : String(payload.resolution_notes),
  };
}

function createDispute(row: QueueRecord): DemoDispute {
  return {
    id: row.id,
    visitId: String(row.payload.visit_id ?? ""),
    patientName: "Patient",
    reason: String(row.payload.reason ?? ""),
    status: String(row.payload.status ?? "open"),
    resolutionNotes: row.payload.resolution_notes == null ? null : String(row.payload.resolution_notes),
    raisedBy: String(row.payload.raised_by_user_id ?? ""),
    chwProviderId: null,
    createdAt: row.recordedAtLocal,
  };
}

function applyAudit(row: DemoAudit, payload: Record<string, unknown>): DemoAudit {
  return createAudit({ id: row.id, kind: "audit", op: "insert", mode: "demo", payload, recordedAtLocal: row.createdAt, syncedAtServer: null, syncStatus: "synced" });
}

function createAudit(row: QueueRecord): DemoAudit {
  const metadata = row.payload.metadata && typeof row.payload.metadata === "object" ? (row.payload.metadata as Record<string, unknown>) : {};
  return {
    id: row.id,
    actorUserId: row.payload.actor_user_id ? String(row.payload.actor_user_id) : null,
    actorName: String(row.payload.actor_name ?? "Staff"),
    action: String(row.payload.action ?? ""),
    entityType: String(row.payload.entity_type ?? ""),
    entityId: row.payload.entity_id ? String(row.payload.entity_id) : null,
    metadata,
    createdAt: row.recordedAtLocal,
  };
}

function createVital(row: QueueRecord): DemoVital | null {
  if (!row.payload.patient_id) return null;
  return mapVital({
    id: row.id,
    patient_id: String(row.payload.patient_id),
    reading_at: String(row.payload.reading_at ?? row.recordedAtLocal),
    systolic: numberOrNull(row.payload.systolic),
    diastolic: numberOrNull(row.payload.diastolic),
    glucose: numberOrNull(row.payload.glucose),
    glucose_type: row.payload.glucose_type === "fasting" || row.payload.glucose_type === "random" ? row.payload.glucose_type : "none",
    pulse: numberOrNull(row.payload.pulse),
    temperature: numberOrNull(row.payload.temperature),
    weight: numberOrNull(row.payload.weight),
    symptoms: Array.isArray(row.payload.symptoms) ? row.payload.symptoms.map(String) : [],
    medication_taken: typeof row.payload.medication_taken === "boolean" ? row.payload.medication_taken : null,
    risk_status: typeof row.payload.risk_status === "string" ? row.payload.risk_status : null,
    notes: row.payload.notes == null ? null : String(row.payload.notes),
    source: String(row.payload.source ?? "pharmacy"),
  });
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
    riskStatus: row.risk_status === "red" || row.risk_status === "yellow" ? row.risk_status : "green",
    notes: row.notes,
    source: row.source,
  };
}

function mapAlert(row: AlertRecord): DemoAlert {
  return {
    id: row.id,
    patientId: row.patient_id,
    severity: row.severity === "red" || row.severity === "green" ? row.severity : "yellow",
    title: row.title,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    assignedToUserId: row.assigned_to_user_id,
  };
}

function mapConsultation(row: ConsultationRecord): DemoConsultation {
  const status = row.status === "completed" || row.status === "in_review" ? row.status : "open";
  return {
    id: row.id,
    patientId: row.patient_id,
    clinicianProviderId: row.clinician_provider_id ?? "",
    alertId: row.alert_id,
    recommendationNotes: row.recommendation_notes ?? "",
    followUpAction: row.follow_up_action ?? "",
    followUpDate: row.follow_up_date,
    status,
    createdAt: row.created_at,
  };
}

function mapProvider(row: ProviderRecord): DemoProvider {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.provider_name,
    providerType: row.provider_type === "pharmacy" || row.provider_type === "clinician" ? row.provider_type : "chw",
    cadre: row.cadre_or_specialty ?? "",
    city: row.city ?? "",
    verificationStatus: isVerification(row.verification_status) ? row.verification_status : "pending",
    badges: row.verification_badges ?? [],
  };
}

function mapAssignment(row: AssignmentRecord): DemoAssignment {
  return {
    id: row.id,
    patientId: row.patient_id,
    providerId: row.provider_id,
    providerType: row.provider_type === "pharmacy" || row.provider_type === "clinician" ? row.provider_type : "chw",
    active: row.active,
  };
}

function mapVisit(row: VisitRecord, patients: DemoPatient[], providers: DemoProvider[]): DemoVisit {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: patients.find((patient) => patient.id === row.patient_id)?.name ?? "Patient",
    chwName: providers.find((provider) => provider.id === row.chw_provider_id)?.name ?? "Community health worker",
    badges: [],
    visitType: row.visit_type === "physical_visit" ? "physical_visit" : "remote_check",
    startedAt: row.started_at ?? row.completed_at ?? "",
    completedAt: row.completed_at ?? "",
    gpsLat: Number(row.gps_lat ?? 0),
    gpsLng: Number(row.gps_lng ?? 0),
    patientConfirmed: Boolean(row.patient_confirmed),
    confirmationMethod: row.confirmation_method ?? "",
    audioLanguageUsed: row.audio_language_used ?? "",
    status: row.status,
    syncStatus: row.sync_status ?? "synced",
    chwProviderId: row.chw_provider_id,
    notes: row.notes ?? "",
  };
}

function isVerification(value: unknown): value is VerificationStatus {
  return value === "pending" || value === "remote_approved" || value === "home_visit_approved" || value === "verified" || value === "suspended";
}

function payloadActive(value: unknown) {
  return value !== false;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

type RefillRecord = {
  id: string;
  patient_id: string;
  pharmacy_provider_id: string | null;
  medication_id: string;
  status: string;
  notes: string | null;
  requested_at: string;
  fulfilled_at: string | null;
};

type AlertRecord = {
  id: string;
  patient_id: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  assigned_to_user_id: string | null;
};

type ConsultationRecord = {
  id: string;
  patient_id: string;
  clinician_provider_id: string | null;
  alert_id: string | null;
  recommendation_notes: string | null;
  follow_up_action: string | null;
  follow_up_date: string | null;
  status: string;
  created_at: string;
};

type ProviderRecord = {
  id: string;
  user_id: string;
  provider_name: string;
  provider_type: string;
  cadre_or_specialty: string | null;
  city: string | null;
  verification_status: string;
  verification_badges: string[] | null;
};

type AssignmentRecord = {
  id: string;
  patient_id: string;
  provider_id: string;
  provider_type: string;
  active: boolean;
};

type DisputeRecord = {
  id: string;
  visit_id: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  raised_by_user_id: string;
};

type VisitRecord = {
  id: string;
  patient_id: string;
  visit_type: string;
  started_at: string | null;
  completed_at: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  patient_confirmed: boolean | null;
  confirmation_method: string | null;
  audio_language_used: string | null;
  status: string;
  sync_status: string | null;
  notes: string | null;
  chw_provider_id: string | null;
};

type PatientRecord = {
  id: string;
  user_id: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  conditions: string[] | null;
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
  glucose_type: "fasting" | "random" | "none";
  pulse: number | null;
  temperature: number | null;
  weight: number | null;
  symptoms: string[] | null;
  medication_taken: boolean | null;
  risk_status: string | null;
  notes: string | null;
  source: string;
};

type AuditRecord = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
