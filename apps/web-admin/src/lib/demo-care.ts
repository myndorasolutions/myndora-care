import type { GlucoseType, RiskLevel } from "@/lib/risk-engine";

export const ILORIN_GPS = { lat: 8.479879, lng: 4.541841 };

export type DemoPatient = {
  id: string;
  name: string;
  email?: string;
  city: string;
  state: string;
  age: number | null;
  gender: string | null;
  conditions: string[];
  isSelfSponsored: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  riskStatus: RiskLevel;
  planName?: string;
};

export type DemoVital = {
  id: string;
  patientId: string;
  readingAt: string;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
  glucoseType: GlucoseType;
  pulse: number | null;
  temperature: number | null;
  weight: number | null;
  symptoms: string[];
  medicationTaken: boolean | null;
  riskStatus: RiskLevel;
  notes: string | null;
  source: string;
};

export type DemoVisit = {
  id: string;
  patientId: string;
  patientName: string;
  chwName: string;
  badges: string[];
  visitType: "remote_check" | "physical_visit";
  startedAt: string;
  completedAt: string;
  gpsLat: number;
  gpsLng: number;
  patientConfirmed: boolean;
  confirmationMethod: string;
  audioLanguageUsed: string;
  status: string;
  syncStatus: string;
  chwProviderId: string | null;
  notes: string;
};

export type DemoMedication = {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
};

export type DemoAlert = {
  id: string;
  patientId: string;
  severity: RiskLevel;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  assignedToUserId: string | null;
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export const DEMO_CHW = {
  id: "demo-amina",
  name: "Amina Bello",
  phone: "+2348030003303",
  cadre: "Community Health Extension Worker",
  city: "Ilorin",
  badges: ["home_visit", "remote_check"],
  rating: 4.8,
};

export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: "demo-grace",
    name: "Grace Adeyemi",
    email: "grace.adeyemi@example.com",
    planName: "Plus",
    city: "Ilorin",
    state: "Kwara",
    isSelfSponsored: true,
    age: 58,
    gender: "Female",
    conditions: ["Hypertension"],
    emergencyContactName: "Tunde Adeyemi",
    emergencyContactPhone: "+2348030002202",
    riskStatus: "yellow",
  },
  {
    id: "demo-baba",
    name: "Baba Adeyemi",
    email: "baba.adeyemi@example.com",
    planName: "Family Care",
    city: "Ilorin",
    state: "Kwara",
    age: 74,
    gender: "Male",
    conditions: ["Hypertension", "Type 2 diabetes"],
    isSelfSponsored: false,
    emergencyContactName: "Tunde Adeyemi",
    emergencyContactPhone: "+2348030002202",
    riskStatus: "red",
  },
];

export const DEMO_MEDICATIONS: DemoMedication[] = [
  {
    id: "demo-med-grace",
    patientId: "demo-grace",
    name: "Amlodipine",
    dosage: "5 mg",
    frequency: "Once daily",
  },
  {
    id: "demo-med-grace-metformin",
    patientId: "demo-grace",
    name: "Metformin",
    dosage: "500 mg",
    frequency: "Twice daily",
  },
  {
    id: "demo-med-baba",
    patientId: "demo-baba",
    name: "Amlodipine",
    dosage: "5 mg",
    frequency: "Once daily",
  },
];

export const DEMO_VITALS: DemoVital[] = [
  {
    id: "demo-vital-grace",
    patientId: "demo-grace",
    readingAt: daysAgo(1),
    systolic: 138,
    diastolic: 86,
    glucose: null,
    glucoseType: "none",
    pulse: 78,
    temperature: null,
    weight: null,
    symptoms: [],
    medicationTaken: true,
    riskStatus: "yellow",
    notes: "Morning reading after medication.",
    source: "patient",
  },
  {
    id: "demo-vital-baba",
    patientId: "demo-baba",
    readingAt: daysAgo(0.25),
    systolic: 172,
    diastolic: 104,
    glucose: 214,
    glucoseType: "random",
    pulse: 92,
    temperature: null,
    weight: null,
    symptoms: [],
    medicationTaken: false,
    riskStatus: "red",
    notes: "Home reading during remote check. Glucose elevated.",
    source: "chw",
  },
];

export const DEMO_VISITS: DemoVisit[] = [
  {
    id: "demo-visit-grace",
    patientId: "demo-grace",
    patientName: "Grace Adeyemi",
    chwName: DEMO_CHW.name,
    badges: DEMO_CHW.badges,
    visitType: "remote_check",
    startedAt: daysAgo(2),
    completedAt: daysAgo(2),
    gpsLat: ILORIN_GPS.lat,
    gpsLng: ILORIN_GPS.lng,
    patientConfirmed: true,
    confirmationMethod: "audio_prompt",
    audioLanguageUsed: "yo",
    status: "completed_verified",
    syncStatus: "synced",
    chwProviderId: "demo-amina",
    notes: "Remote check completed in Yoruba.",
  },
  {
    id: "demo-visit-baba",
    patientId: "demo-baba",
    patientName: "Baba Adeyemi",
    chwName: DEMO_CHW.name,
    badges: DEMO_CHW.badges,
    visitType: "physical_visit",
    startedAt: daysAgo(1),
    completedAt: daysAgo(1),
    gpsLat: ILORIN_GPS.lat,
    gpsLng: ILORIN_GPS.lng,
    patientConfirmed: true,
    confirmationMethod: "caregiver:Tunde Adeyemi",
    audioLanguageUsed: "yo",
    status: "completed_verified",
    syncStatus: "synced",
    chwProviderId: "demo-amina",
    notes: "Home visit in Tanke. Amlodipine dose was missed this morning.",
  },
];

export const DEMO_REVIEW_VISITS: DemoVisit[] = [
  {
    id: "demo-visit-review",
    patientId: "demo-baba",
    patientName: "Baba Adeyemi",
    chwName: DEMO_CHW.name,
    badges: DEMO_CHW.badges,
    visitType: "physical_visit",
    startedAt: daysAgo(0.5),
    completedAt: daysAgo(0.4),
    gpsLat: ILORIN_GPS.lat,
    gpsLng: ILORIN_GPS.lng,
    patientConfirmed: false,
    confirmationMethod: "pending",
    audioLanguageUsed: "yo",
    status: "needs_review",
    syncStatus: "failed_sync",
    chwProviderId: "demo-amina",
    notes: "Offline reading still needs a coordinator check.",
  },
];

export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: "demo-alert-baba",
    patientId: "demo-baba",
    severity: "red",
    title: "High blood pressure and glucose",
    message: "Baba Adeyemi recorded 172/104 mmHg and a random glucose of 214 mg/dL. Medication was missed.",
    status: "new",
    createdAt: daysAgo(0.25),
    assignedToUserId: "demo-chinedu-user",
  },
  {
    id: "demo-alert-grace",
    patientId: "demo-grace",
    severity: "yellow",
    title: "Blood pressure needs a closer look",
    message: "Grace Adeyemi recorded 138/86 mmHg. The reading is in the caution range.",
    status: "new",
    createdAt: daysAgo(1),
    assignedToUserId: "demo-chinedu-user",
  },
];

export const DEMO_PLAN = {
  name: "Plus",
  dailyLabel: "₦500/day",
  monthlyLabel: "₦15,000/month",
  status: "active",
};

export const DEMO_PHARMACY = {
  id: "demo-healthplus",
  userId: "demo-healthplus-user",
  name: "HealthPlus Tanke Pharmacy",
  city: "Ilorin",
};

export const DEMO_CLINICIAN = {
  id: "demo-chinedu",
  userId: "demo-chinedu-user",
  name: "Dr. Chinedu Okafor",
  city: "Abuja",
};

export type ProviderKind = "chw" | "pharmacy" | "clinician";

export type VerificationStatus =
  | "pending"
  | "remote_approved"
  | "home_visit_approved"
  | "verified"
  | "suspended";

export type DemoProvider = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  providerType: ProviderKind;
  cadre: string;
  city: string;
  serviceArea?: string;
  verificationStatus: VerificationStatus;
  badges: string[];
};

export const CHW_CHECKS = [
  { key: "identity_verified", label: "Identity Verified" },
  { key: "license_cadre_verified", label: "License/Cadre Verified" },
  { key: "references_checked", label: "Two Professional References Checked" },
  { key: "training_completed", label: "Training Completed" },
] as const;

export function homeVisitReady(badges: string[]) {
  return CHW_CHECKS.every((check) => badges.includes(check.key));
}

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: DEMO_CHW.id,
    userId: "demo-amina-user",
    name: DEMO_CHW.name,
    email: "amina.bello@example.com",
    providerType: "chw",
    cadre: DEMO_CHW.cadre,
    city: "Ilorin",
    serviceArea: "Tanke",
    verificationStatus: "verified",
    badges: ["identity_verified", "license_cadre_verified", "references_checked", "training_completed", "home_visit", "remote_check"],
  },
  {
    id: "demo-seyi",
    userId: "demo-seyi-user",
    name: "Seyi Balogun",
    email: "seyi.balogun@example.com",
    providerType: "chw",
    cadre: "Community Health Extension Worker",
    city: "Ilorin",
    serviceArea: "Oke-Oyi",
    verificationStatus: "pending",
    badges: ["identity_verified"],
  },
  {
    id: DEMO_PHARMACY.id,
    userId: DEMO_PHARMACY.userId,
    name: DEMO_PHARMACY.name,
    email: "healthplus.tanke@example.com",
    providerType: "pharmacy",
    cadre: "Retail pharmacy",
    city: "Ilorin",
    serviceArea: "Tanke",
    verificationStatus: "verified",
    badges: ["refill_hub"],
  },
  {
    id: DEMO_CLINICIAN.id,
    userId: DEMO_CLINICIAN.userId,
    name: DEMO_CLINICIAN.name,
    email: "chinedu.okafor@example.com",
    providerType: "clinician",
    cadre: "Internal medicine",
    city: "Abuja",
    serviceArea: "Garki",
    verificationStatus: "verified",
    badges: ["clinician_review"],
  },
];

export type DemoAssignment = {
  id: string;
  patientId: string;
  providerId: string;
  providerType: ProviderKind;
  active: boolean;
};

export const DEMO_ASSIGNMENTS: DemoAssignment[] = [
  { id: "demo-asg-grace-chw", patientId: "demo-grace", providerId: DEMO_CHW.id, providerType: "chw", active: true },
  { id: "demo-asg-grace-pharmacy", patientId: "demo-grace", providerId: DEMO_PHARMACY.id, providerType: "pharmacy", active: true },
  { id: "demo-asg-grace-clinician", patientId: "demo-grace", providerId: DEMO_CLINICIAN.id, providerType: "clinician", active: true },
  { id: "demo-asg-baba-chw", patientId: "demo-baba", providerId: DEMO_CHW.id, providerType: "chw", active: true },
  { id: "demo-asg-baba-pharmacy", patientId: "demo-baba", providerId: DEMO_PHARMACY.id, providerType: "pharmacy", active: true },
  { id: "demo-asg-baba-clinician", patientId: "demo-baba", providerId: DEMO_CLINICIAN.id, providerType: "clinician", active: true },
];

export type RefillStatus = "requested" | "ready_for_pickup" | "fulfilled" | "unavailable";

export type DemoRefill = {
  id: string;
  patientId: string;
  patientName: string;
  pharmacyProviderId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  status: RefillStatus;
  notes: string | null;
  requestedAt: string;
  fulfilledAt: string | null;
};

export const DEMO_REFILLS: DemoRefill[] = [
  {
    id: "demo-refill-grace-amlodipine",
    patientId: "demo-grace",
    patientName: "Grace Adeyemi",
    pharmacyProviderId: DEMO_PHARMACY.id,
    medicationId: "demo-med-grace",
    medicationName: "Amlodipine",
    dosage: "5 mg",
    status: "requested",
    notes: "Requested for pickup at HealthPlus Tanke Pharmacy.",
    requestedAt: daysAgo(0.2),
    fulfilledAt: null,
  },
  {
    id: "demo-refill-grace-metformin",
    patientId: "demo-grace",
    patientName: "Grace Adeyemi",
    pharmacyProviderId: DEMO_PHARMACY.id,
    medicationId: "demo-med-grace-metformin",
    medicationName: "Metformin",
    dosage: "500 mg",
    status: "requested",
    notes: "Requested for pickup at HealthPlus Tanke Pharmacy.",
    requestedAt: daysAgo(0.2),
    fulfilledAt: null,
  },
  {
    id: "demo-refill-baba-amlodipine",
    patientId: "demo-baba",
    patientName: "Baba Adeyemi",
    pharmacyProviderId: DEMO_PHARMACY.id,
    medicationId: "demo-med-baba",
    medicationName: "Amlodipine",
    dosage: "5 mg",
    status: "requested",
    notes: "Sponsor asked for pickup at Tanke.",
    requestedAt: daysAgo(0.125),
    fulfilledAt: null,
  },
];

export type DemoConsultation = {
  id: string;
  patientId: string;
  clinicianProviderId: string;
  alertId: string | null;
  recommendationNotes: string;
  followUpAction: string;
  followUpDate: string | null;
  status: "open" | "in_review" | "completed";
  createdAt: string;
};

export const DEMO_CONSULTATIONS: DemoConsultation[] = [
  {
    id: "demo-consult-grace",
    patientId: "demo-grace",
    clinicianProviderId: DEMO_CLINICIAN.id,
    alertId: "demo-alert-grace",
    recommendationNotes: "Continue the morning reading and take Amlodipine as prescribed.",
    followUpAction: "Monitor at Home",
    followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "open",
    createdAt: daysAgo(1),
  },
  {
    id: "demo-consult-baba",
    patientId: "demo-baba",
    clinicianProviderId: DEMO_CLINICIAN.id,
    alertId: "demo-alert-baba",
    recommendationNotes: "Repeat the blood pressure today. Do not add a new drug until the reading is confirmed.",
    followUpAction: "Repeat Reading in 24h",
    followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "open",
    createdAt: daysAgo(0.2),
  },
];

export type DemoDispute = {
  id: string;
  visitId: string;
  patientName: string;
  reason: string;
  status: string;
  resolutionNotes: string | null;
  raisedBy: string;
  chwProviderId: string | null;
  createdAt: string;
};

export const DEMO_DISPUTES: DemoDispute[] = [
  {
    id: "demo-dispute-grace",
    visitId: "demo-visit-grace",
    patientName: "Grace Adeyemi",
    reason: "I was at the market when this remote check was marked complete.",
    status: "open",
    resolutionNotes: null,
    raisedBy: "Grace Adeyemi",
    chwProviderId: DEMO_CHW.id,
    createdAt: daysAgo(1),
  },
];

export type DemoPlanRow = {
  id: string;
  code: string;
  name: string;
  priceDaily: number | null;
  priceMonthly: number | null;
  priceOneTime: number | null;
  includedServiceCount: number;
};

export const DEMO_PLANS: DemoPlanRow[] = [
  { id: "demo-plan-basic", code: "basic_daily", name: "Basic Daily", priceDaily: 300, priceMonthly: 9000, priceOneTime: null, includedServiceCount: 0 },
  { id: "demo-plan-plus", code: "plus", name: "Plus", priceDaily: 500, priceMonthly: 15000, priceOneTime: null, includedServiceCount: 4 },
  { id: "demo-plan-family", code: "family_care", name: "Family Care", priceDaily: 1000, priceMonthly: 30000, priceOneTime: null, includedServiceCount: 8 },
  { id: "demo-plan-visit", code: "physical_visit", name: "Physical Visit Add-on", priceDaily: null, priceMonthly: null, priceOneTime: null, includedServiceCount: 1 },
];

export type DemoFlag = {
  key: string;
  label: string;
  enabled: boolean;
};

export const DEMO_FLAGS: DemoFlag[] = [
  { key: "yoruba_audio_prompts", label: "Yoruba Audio Prompts", enabled: true },
  { key: "self_sponsored_signup", label: "Self-Sponsored Signup", enabled: true },
  { key: "offline_sync_queue", label: "Offline Sync Queue", enabled: true },
  { key: "sms_whatsapp_dispatch", label: "SMS/WhatsApp Dispatch", enabled: false },
];

export type DemoCityCap = {
  city: string;
  capNgn: number | null;
};

export const DEMO_CITY_CAPS: DemoCityCap[] = [
  { city: "Ilorin", capNgn: null },
  { city: "Lagos", capNgn: null },
  { city: "Abuja", capNgn: null },
];

export type DemoDispatch = {
  id: string;
  recipientPhone: string;
  channel: "sms" | "whatsapp";
  templateType: "abnormal_alert" | "visit_completed" | "refill_ready" | "payment_confirmed";
  message: string;
  mode: "live" | "mock";
  createdAt: string;
};

export const DEMO_DISPATCHES: DemoDispatch[] = [
  {
    id: "demo-dispatch-baba-alert",
    recipientPhone: "+2348030002202",
    channel: "sms",
    templateType: "abnormal_alert",
    message: "Baba Adeyemi has a red reading: 172/104 mmHg and random glucose 214 mg/dL.",
    mode: "mock",
    createdAt: daysAgo(0.25),
  },
  {
    id: "demo-dispatch-grace-visit",
    recipientPhone: "+2348030002202",
    channel: "whatsapp",
    templateType: "visit_completed",
    message: "A remote check for Grace Adeyemi was completed.",
    mode: "mock",
    createdAt: daysAgo(1),
  },
  {
    id: "demo-dispatch-grace-refill",
    recipientPhone: "+2348030002202",
    channel: "sms",
    templateType: "refill_ready",
    message: "Grace Adeyemi: Amlodipine 5 mg is ready for pickup or delivery.",
    mode: "mock",
    createdAt: daysAgo(0.5),
  },
];

export type DemoAudit = {
  id: string;
  actorUserId: string | null;
  actorName: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export const DEMO_AUDITS: DemoAudit[] = [
  {
    id: "demo-audit-dispute",
    actorUserId: null,
    actorName: "Grace Adeyemi",
    actorRole: "Patient",
    action: "dispute.opened",
    entityType: "disputes",
    entityId: "demo-dispute-grace",
    metadata: { source: "seed", city: "Ilorin" },
    createdAt: daysAgo(1),
  },
];

export const FOLLOW_UP_ACTIONS = [
  "Monitor at Home",
  "Repeat Reading in 24h",
  "Schedule CHW Physical Visit",
  "Adjust Refill at Clinic",
  "Urgent Hospital Referral",
] as const;

export const REFILL_LABEL: Record<RefillStatus, string> = {
  requested: "Requested",
  ready_for_pickup: "Ready for Pickup/Delivery",
  fulfilled: "Fulfilled",
  unavailable: "Unavailable",
};
