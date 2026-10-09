// Small shared helpers.
let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { dateStyle: 'medium' });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

/** Data-entry validation for vitals: range checks + abnormal thresholds. */
export interface VitalsRule {
  kind: string;
  unit: string;
  min: number;
  max: number;
  abnormalLow?: number;
  abnormalHigh?: number;
}

export const VITALS_RULES: VitalsRule[] = [
  { kind: 'blood_pressure_sys', unit: 'mmHg', min: 60, max: 260, abnormalHigh: 160 },
  { kind: 'blood_pressure_dia', unit: 'mmHg', min: 30, max: 160, abnormalHigh: 100 },
  { kind: 'blood_sugar', unit: 'mmol/L', min: 1.5, max: 35, abnormalLow: 3.5, abnormalHigh: 11 },
  { kind: 'temperature', unit: '°C', min: 32, max: 43, abnormalLow: 35.5, abnormalHigh: 38 },
  { kind: 'pulse', unit: 'bpm', min: 30, max: 220, abnormalLow: 45, abnormalHigh: 120 },
  { kind: 'weight', unit: 'kg', min: 2, max: 300 },
];

export function validateVital(kind: string, value: number): { valid: boolean; abnormal: boolean; message?: string } {
  const rule = VITALS_RULES.find((r) => r.kind === kind);
  if (!rule) return { valid: true, abnormal: false };
  if (Number.isNaN(value)) return { valid: false, abnormal: false, message: `Enter a numeric value in ${rule.unit}.` };
  if (value < rule.min || value > rule.max) {
    return { valid: false, abnormal: false, message: `Value out of plausible range (${rule.min}–${rule.max} ${rule.unit}).` };
  }
  const abnormal = (rule.abnormalHigh !== undefined && value >= rule.abnormalHigh) ||
    (rule.abnormalLow !== undefined && value <= rule.abnormalLow);
  return { valid: true, abnormal, message: abnormal ? 'Abnormal reading — a repeat reading is required before submitting.' : undefined };
}

export const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  request_different_chw: 'Request different CHW',
  late_arrival: 'Late arrival',
  no_show: 'No-show',
  incomplete_service: 'Incomplete service',
  inappropriate_conduct: 'Inappropriate conduct',
  safety_concern: 'Safety concern',
  privacy_concern: 'Privacy concern',
  incorrect_record: 'Incorrect record',
  billing_issue: 'Billing issue',
  failed_escalation: 'Failed escalation',
};

export const VERIFICATION_LABELS: Record<string, string> = {
  patient_otp: 'Patient OTP',
  caregiver_otp: 'Caregiver OTP',
  digital_signature: 'Digital signature',
  voice_confirmation: 'Voice confirmation',
  assisted_call: 'Assisted Myndora call',
};

export const ADDON_LABELS: Record<string, string> = {
  physical_visit: 'Physical visit',
  lab_collection: 'Lab sample collection',
  medicine_delivery: 'Medication delivery',
  clinician_review: 'Clinician review',
};
