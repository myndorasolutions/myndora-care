// Role & permission helpers.
// NON-NEGOTIABLE RULE: payment permission and health-information permission are separate.
// A sponsor may pay for a patient without seeing any health records.

import type { AccessLevel, PackageTier, Role } from '@/types';

export const ACCESS_LEVELS: { id: AccessLevel; label: string; description: string }[] = [
  { id: 'payment_only', label: 'Payment only', description: 'Billing, package and payment status. No health information.' },
  { id: 'service_updates', label: 'Service updates', description: 'Visit scheduling and service delivery status. No clinical detail.' },
  { id: 'important_alerts', label: 'Important alerts', description: 'Service updates plus urgent/important alert notifications (limited text).' },
  { id: 'full_monitoring', label: 'Full approved monitoring', description: 'Approved health summaries, vitals, visit summaries and documents.' },
];

const RANK: Record<AccessLevel, number> = {
  payment_only: 0,
  service_updates: 1,
  important_alerts: 2,
  full_monitoring: 3,
};

export type HealthCategory =
  | 'billing' | 'visit_status' | 'alert_notification' | 'alert_detail'
  | 'vitals' | 'visit_summary' | 'medications' | 'documents' | 'clinician_notes';

const REQUIRED_LEVEL: Record<HealthCategory, AccessLevel> = {
  billing: 'payment_only',
  visit_status: 'service_updates',
  alert_notification: 'important_alerts',
  alert_detail: 'full_monitoring',
  vitals: 'full_monitoring',
  visit_summary: 'full_monitoring',
  medications: 'full_monitoring',
  documents: 'full_monitoring',
  clinician_notes: 'full_monitoring',
};

/** Whether a given access level permits viewing a category of patient information. */
export function canSee(level: AccessLevel, category: HealthCategory): boolean {
  return RANK[level] >= RANK[REQUIRED_LEVEL[category]];
}

export function accessLabel(level: AccessLevel): string {
  return ACCESS_LEVELS.find((l) => l.id === level)?.label ?? level;
}

/** Limited alert text shown when exact medical data is not authorized. */
export function maskedAlertText(patientName: string, severity: string): string {
  return `A ${severity} care alert was raised for ${patientName}. Clinical details are restricted by the patient's permission settings.`;
}

// ---------------------------------------------------------------------------
// Package catalogue & feature gating
// ---------------------------------------------------------------------------

export interface PackageDef {
  id: PackageTier;
  name: string;
  tagline: string;
  features: string[];
  rank: number;
}

export const PACKAGES: PackageDef[] = [
  {
    id: 'basic', name: 'Basic Monitor', rank: 0,
    tagline: 'Personal health tracking and reminders',
    features: ['Patient self-recorded vitals', 'Medication reminders', 'Personal history', 'Self-managed tracking', 'No included CHW visit'],
  },
  {
    id: 'family', name: 'Family Dashboard', rank: 1,
    tagline: 'Stay informed with approved updates',
    features: ['All Basic features', 'Patient-controlled sponsor access', 'Service-status updates', 'Approved health summaries', 'Alerts', 'Monthly summary', 'CHW service optional where available'],
  },
  {
    id: 'assisted', name: 'Assisted Monitoring', rank: 2,
    tagline: 'Proactive monitoring and CHW support',
    features: ['All Family Dashboard features', 'Scheduled CHW remote checks', 'Medication follow-up', 'Wellbeing checklist', 'Missed-check follow-up', 'Abnormal-reading escalation'],
  },
  {
    id: 'premium', name: 'Premium Family Care', rank: 3,
    tagline: 'Enhanced care and priority coordination',
    features: ['All Assisted Monitoring features', 'More frequent checks', 'Enhanced reports', 'Priority coordination', 'Eligible clinician review', 'Optional physical-visit bundle'],
  },
];

export function packageDef(id: PackageTier): PackageDef {
  return PACKAGES.find((p) => p.id === id)!;
}

/** Features gated by package tier. Locked features explain which package enables them. */
export type GatedFeature = 'sponsor_access' | 'alerts' | 'chw_checks' | 'escalation' | 'clinician_review' | 'enhanced_reports' | 'physical_bundle';

const FEATURE_MIN_TIER: Record<GatedFeature, PackageTier> = {
  sponsor_access: 'family',
  alerts: 'family',
  chw_checks: 'assisted',
  escalation: 'assisted',
  clinician_review: 'premium',
  enhanced_reports: 'premium',
  physical_bundle: 'premium',
};

export function tierRank(t: PackageTier): number {
  return packageDef(t).rank;
}

export function featureUnlocked(tier: PackageTier, feature: GatedFeature): boolean {
  return tierRank(tier) >= tierRank(FEATURE_MIN_TIER[feature]);
}

export function featureRequiredPackage(feature: GatedFeature): string {
  return packageDef(FEATURE_MIN_TIER[feature]).name;
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export const ROLE_META: Record<Role, { label: string; portal: string }> = {
  sponsor: { label: 'Sponsor / Family', portal: '/sponsor' },
  patient: { label: 'Patient', portal: '/patient' },
  chw: { label: 'Community Health Worker', portal: '/chw' },
  admin: { label: 'Admin / Operations', portal: '/admin' },
  clinician: { label: 'Clinician', portal: '/clinician' },
};

/** What each role is allowed to see of a CHW profile. */
export function chwVisibleFields(role: Role): { nin: boolean; exactAddress: boolean; certificates: boolean; references: boolean } {
  if (role === 'admin') return { nin: true, exactAddress: true, certificates: true, references: true };
  return { nin: false, exactAddress: false, certificates: false, references: false };
}
