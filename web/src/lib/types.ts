export type UserRole =
  | 'patient'
  | 'caregiver'
  | 'sponsor'
  | 'home_helper'
  | 'chw'
  | 'pharmacy'
  | 'clinician'
  | 'lab'
  | 'admin'
  | 'super_admin';

export type RiskStatus = 'green' | 'yellow' | 'red';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  city?: string;
  pricingZone?: string;
}

export interface VitalReading {
  id: string;
  recorded_at: string;
  systolic_bp: number;
  diastolic_bp: number;
  glucose_fasting?: number;
  pulse: number;
  risk_status: RiskStatus;
}

export interface PatientSummary {
  id: string;
  full_name: string;
  phone: string;
  risk_status: RiskStatus;
  last_vital_at?: string;
  conditions: string[];
}

export interface RefillRequest {
  id: string;
  patient_name: string;
  medication: string;
  status: 'pending' | 'ready' | 'dispensed';
  requested_at: string;
}

export interface ConsultQueueItem {
  id: string;
  patient_name: string;
  reason: string;
  risk_status: RiskStatus;
  wait_minutes: number;
}

export interface LabOrder {
  id: string;
  patient_name: string;
  tests: string[];
  status: 'pending' | 'in_progress' | 'completed';
  ordered_at: string;
}

export interface AdminAlert {
  id: string;
  patient_name: string;
  message: string;
  risk_status: RiskStatus;
  created_at: string;
}

export interface KpiMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface SponsorProfile {
  id: string;
  sponsor_name: string;
  patient_name: string;
  plan: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  country_location: string;
  payment_status: 'paid' | 'pending' | 'failed' | 'trial';
  expires_at: string;
}

export interface RemoteCheckStat {
  label: string;
  value: number;
}

export interface RemoteCheckRow {
  id: string;
  patient_name: string;
  last_check_at: string;
  systolic_bp: number;
  diastolic_bp: number;
  status: RiskStatus;
  medication_adherence: 'yes' | 'no' | 'partial';
  symptom_check: 'clear' | 'mild' | 'concerning';
  short_call_warning: boolean;
}

export interface VisitProofRow {
  id: string;
  patient_name: string;
  chw_name: string;
  visit_date: string;
  verification_method: 'OTP' | 'Signature';
  proof_status: 'confirmed' | 'pending';
  systolic_bp: number;
  diastolic_bp: number;
  pulse?: number;
  recorded_at: string;
  signature_state: 'captured' | 'pending' | 'n/a';
  otp_state: 'confirmed' | 'pending' | 'n/a';
  status?: string;
}

export interface SyncQueueRow {
  id: string;
  patient_name: string;
  recorded_at: string;
  status: 'pending' | 'failed' | 'unconfirmed';
  detail: string;
}

export interface VisitHistoryRow {
  id: string;
  patient_name: string;
  visit_date: string;
  chw_name: string;
  verification_method: 'OTP' | 'Signature';
}
