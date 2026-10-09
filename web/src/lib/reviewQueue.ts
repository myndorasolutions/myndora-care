export type ReviewStatus = 'needs_review' | 'reviewed' | 'closed';

export type AlertSeverityLabel =
  | 'NORMAL'
  | 'CAUTION'
  | 'URGENT'
  | 'NEEDS_REVIEW';

export interface FlaggedVitalReview {
  id: string;
  patientName: string;
  patientId?: string | null;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  temperatureCelsius?: number | null;
  bloodSugarMgDl?: number | null;
  severity?: AlertSeverityLabel;
  triggerReason?: string;
  riskStatus: 'green' | 'yellow' | 'red';
  status: ReviewStatus;
  clinicianNotes: string;
  createdAt: string;
}

/** Display label: CAUTION maps to needs-review for clinician UI. */
export function severityDisplayLabel(severity?: string | null): string {
  if (severity === 'URGENT') return 'URGENT';
  if (severity === 'NEEDS_REVIEW' || severity === 'CAUTION') return 'NEEDS REVIEW';
  return severity?.replace(/_/g, ' ') ?? 'Flagged';
}

export function isAwaitingClinicalReview(row: FlaggedVitalReview): boolean {
  if (row.status !== 'needs_review') return false;
  const sev = row.severity;
  return (
    !sev ||
    sev === 'URGENT' ||
    sev === 'NEEDS_REVIEW' ||
    sev === 'CAUTION'
  );
}
