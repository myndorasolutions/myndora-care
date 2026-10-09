// Myndora Care — shared typed data model
// Structured so entities can later map to PostgreSQL/Supabase tables.

export type Role = 'sponsor' | 'patient' | 'chw' | 'admin' | 'clinician';
export type City = 'Lagos' | 'Ilorin' | 'Abuja' | 'Other';
export type PackageTier = 'basic' | 'family' | 'assisted' | 'premium';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'pending_cancellation';
export type AccessLevel = 'payment_only' | 'service_updates' | 'important_alerts' | 'full_monitoring';
export type AccessRequestStatus = 'pending' | 'approved' | 'reduced' | 'rejected' | 'withdrawn';
export type CHWStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type AssignmentStatus = 'offered' | 'accepted' | 'declined' | 'completed' | 'cancelled';
export type VisitStatus = 'scheduled' | 'in_progress' | 'submitted' | 'verified' | 'disputed' | 'cancelled';
export type AlertSeverity = 'urgent' | 'important' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'escalated' | 'resolved';
export type VerificationMethod = 'patient_otp' | 'caregiver_otp' | 'digital_signature' | 'voice_confirmation' | 'assisted_call';
export type ComplaintStage =
  | 'submitted' | 'acknowledged' | 'severity_assigned' | 'evidence_preserved'
  | 'owner_assigned' | 'chw_response_requested' | 'patient_contacted' | 'resolved' | 'appeal';
export type ComplaintType =
  | 'request_different_chw' | 'late_arrival' | 'no_show' | 'incomplete_service'
  | 'inappropriate_conduct' | 'safety_concern' | 'privacy_concern'
  | 'incorrect_record' | 'billing_issue' | 'failed_escalation';
export type AddOnType = 'physical_visit' | 'lab_collection' | 'medicine_delivery' | 'clinician_review';
export type ServiceType = 'remote_check' | 'home_visit' | 'lab_collection' | 'medicine_delivery' | 'wellbeing_call';
export type RequestKind = 'new_service' | 'rate_change' | 'radius_change' | 'add_on';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ReferralKind = 'lab' | 'doctor' | 'pharmacy' | 'hospital';
export type FlagKind =
  | 'impossible_travel' | 'overlapping_visits' | 'identical_readings' | 'copied_notes'
  | 'abnormal_without_escalation' | 'entry_after_checkout' | 'implausibly_short_visit'
  | 'repeated_corrections' | 'disputed_visit';

export interface Account {
  id: string;
  name: string;
  role: Role;
  phone: string;
  city: City;
}

export interface PatientProfile {
  id: string;
  accountId: string;
  name: string;
  age: number;
  relationToSponsor?: string;
  city: City;
  neighbourhood: string;
  address: string; // exact address — revealed to CHW only after assignment acceptance
  conditions: string[];
  languagePreference: string;
  genderPreference: 'any' | 'female' | 'male';
  locationConsentGiven: boolean;
}

export interface SponsorRelationship {
  id: string;
  sponsorAccountId: string;
  patientId: string;
  paysFor: boolean;
  accessLevel: AccessLevel; // patient-controlled. Payment does NOT grant health access.
}

export interface CareSupporter {
  id: string;
  name: string;
  relationship: string;
  patientId: string;
  accessLevel: AccessLevel;
}

export interface ConsentAuthorization {
  id: string;
  patientId: string;
  requesterName: string;
  requesterAccountId: string;
  requestedLevel: AccessLevel;
  status: AccessRequestStatus;
  grantedLevel?: AccessLevel;
  createdAt: string;
  decidedAt?: string;
  note?: string;
}

export interface PackageSubscription {
  id: string;
  patientId: string;
  tier: PackageTier;
  status: SubscriptionStatus;
  scheduledDowngradeTo?: PackageTier; // takes effect next billing cycle
  nextBillingDate: string;
  addOns: AddOnType[];
}

export interface AddOnService {
  type: AddOnType;
  label: string;
  description: string;
  availableIn: City[];
}

export interface CHWProfile {
  id: string;
  name: string;
  cadre: 'CHEW' | 'Registered Nurse' | 'Nurse Midwife';
  yearsExperience: number;
  languages: string[];
  city: City;
  serviceArea: string; // approximate area shown pre-acceptance
  baseRadiusKm: number;
  distanceKm: number; // simulated distance to anchor patient
  etaMinutes: number; // simulated travel time
  rating: number;
  reviewCount: number;
  completedVisits: number;
  available: boolean;
  status: CHWStatus;
  approvedServices: ServiceType[];
  conditionTraining: string[];
  reliabilityScore: number; // 0-100
  complaintCount: number;
  workload: number; // active assignments
  photoVerified: boolean;
  availabilityDays?: string[]; // weekly availability self-managed by the CHW
  matchingSuspended?: boolean; // safety complaints suspend future direct matching until reviewed
  // admin-only verification artefacts (never shown to patients/sponsors)
  verification: {
    nin: string;
    identityChecked: boolean;
    qualificationsChecked: boolean;
    referencesChecked: boolean;
    backgroundChecked: boolean;
    trainingCompleted: boolean;
  };
}

export interface CHWServiceCatalogueEntry {
  id: string;
  chwId: string;
  service: ServiceType;
  active: boolean;
  requestedChange?: string;
  status: ApprovalStatus;
}

export interface RateBand { upToKm: number; addFee: number; }

export interface CityRateCard {
  id: string;
  city: City;
  serviceType: ServiceType;
  baseRadiusKm: number;
  baseCharge: number; // CHW payout component (NGN)
  distanceBands: RateBand[];
  travelTimeAdjustmentPct: number;
  eveningAdjustmentPct: number;
  weekendAdjustmentPct: number;
  sameDayAdjustmentPct: number;
  sameDayCap: number;
  chwTierMultiplier: number;
  platformFeePct: number;
  effectiveDate: string;
  status: ApprovalStatus;
}

export interface Assignment {
  id: string;
  patientId: string;
  chwId: string;
  serviceType: ServiceType;
  scheduledFor: string;
  status: AssignmentStatus;
  payoutEstimate: number;
  travelComponent: number;
  approximateArea: string; // shown before acceptance
}

export interface VitalsReading {
  id: string;
  patientId: string;
  visitId?: string;
  kind: 'blood_pressure' | 'blood_sugar' | 'weight' | 'temperature' | 'pulse';
  value: string; // e.g. "185/105"
  unit: string;
  recordedBy: 'patient' | 'chw';
  source: 'measured' | 'patient_reported';
  deviceType: string;
  recordedAt: string; // system timestamp — no backdating
  isAbnormal: boolean;
  repeatOf?: string;
}

export interface VisitEvidence {
  geofenceCheckIn?: string;
  geofenceCheckOut?: string;
  serverCheckInTimestamp?: string;
  serverCheckOutTimestamp?: string;
  verificationMethod?: VerificationMethod;
  otpVerified: boolean;
  patientAcknowledged: boolean;
  plausibleDuration: boolean;
  exceptionReview: boolean;
}

export interface Visit {
  id: string;
  assignmentId?: string;
  patientId: string;
  chwId: string;
  scheduledFor: string;
  status: VisitStatus;
  requestedServices: string[];
  completedServices: string[];
  vitalsIds: string[];
  patientReported: string;
  chwObservation: string;
  actionTaken: string;
  symptoms: string[];
  medicationReminder: string;
  followUpRequired: boolean;
  escalationId?: string;
  presentPersons: { name: string; relationship: string; consented: boolean }[];
  verificationMethod?: VerificationMethod;
  chwNotes: string;
  patientSummary: string;
  sponsorSummary: string; // generated under patient permission rules
  patientConfirmed: boolean;
  disputed: boolean;
  disputeReason?: string;
  payoutFrozen: boolean;
  evidence: VisitEvidence;
}

export interface AlertItem {
  id: string;
  patientId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  detail: string; // full clinical detail — gated by permissions
  createdAt: string;
  escalationId?: string;
}

export interface Escalation {
  id: string;
  patientId: string;
  visitId?: string;
  raisedBy: string;
  reason: string;
  status: 'open' | 'routed_to_clinician' | 'resolved';
  createdAt: string;
}

export interface Complaint {
  id: string;
  patientId: string;
  chwId?: string;
  raisedByRole: Role;
  raisedByName: string;
  type: ComplaintType;
  details: string;
  stage: ComplaintStage;
  severity?: 'low' | 'medium' | 'high' | 'safety';
  owner?: string;
  resolution?: string;
  createdAt: string;
  history: { stage: ComplaintStage; at: string; note: string }[];
}

export interface Rating {
  id: string;
  patientId: string;
  chwId: string;
  visitId: string; // ratings only allowed after a verified completed visit
  stars: number;
  comment: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  patientId: string;
  kind: ReferralKind;
  partner: string; // fictional partner name
  description: string;
  status: 'requested' | 'booked' | 'in_progress' | 'completed' | 'routed_to_clinician';
  createdAt: string;
  simulated: true;
}

export interface AuditEvent {
  id: string;
  actor: string;
  actorRole: Role;
  action: string;
  target: string;
  at: string;
  flaggedUnusual?: boolean;
}

export interface ServiceRateRequest {
  id: string;
  chwId: string;
  kind: RequestKind;
  description: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface DataQualityFlag {
  id: string;
  kind: FlagKind;
  description: string;
  visitId?: string;
  chwId?: string;
  status: 'open' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface ClinicianCase {
  id: string;
  patientId: string;
  alertId?: string;
  escalationId?: string;
  title: string;
  chwObservation: string;
  patientStatement: string;
  measuredReadings: { kind: string; value: string; unit: string; abnormal: boolean }[];
  status: 'awaiting_review' | 'more_info_requested' | 'resolved';
  recommendation?: string;
  patientSummary?: string;
  sponsorSummary?: string; // composed under sponsor permission rules
  createdAt: string;
  reviewedAt?: string;
}

export interface OfflineQueueItem {
  id: string;
  kind: 'visit_record' | 'vitals' | 'escalation';
  description: string;
  queuedAt: string;
  synced: boolean;
}
