import { apiFetch } from './api';
import type { AdminAlert, SyncQueueRow, VisitHistoryRow, VisitProofRow, VitalReading } from './types';
import type { FlaggedVitalReview, ReviewStatus } from './reviewQueue';

export const PLAYTEST_PATIENT_ID = 'playtest-patient-grace';

export interface SponsorPatientRow {
  id: string;
  fullName: string;
  city: string | null;
  pricingZone: string | null;
  consentStatus: boolean | string;
  address?: string | null;
}

export const vitalsApi = {
  listMyPatients: () =>
    apiFetch<SponsorPatientRow[]>('/sponsors/me/patients'),

  getTrend: (patientId: string, days: number) =>
    apiFetch<VitalReading[]>(
      `/sponsors/me/patients/${patientId}/vitals-trend?days=${days}`,
    ),

  getReviewQueue: () =>
    apiFetch<FlaggedVitalReview[]>('/escalations/review-queue'),

  /** Sponsor-scoped alerts derived from open escalations for owned patients. */
  getSponsorAlerts: () =>
    apiFetch<FlaggedVitalReview[]>('/sponsors/me/alerts'),

  updateReview: (
    id: string,
    body: { status: ReviewStatus; clinician_notes?: string },
  ) =>
    apiFetch<FlaggedVitalReview>(`/escalations/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getVisitHistory: (patientId: string) =>
    apiFetch<VisitHistoryRow[]>(`/sponsors/me/patients/${patientId}/visits`),

  getAdminVisitProofs: () =>
    apiFetch<VisitProofRow[]>('/physical-visits/admin'),

  getAdminSyncQueue: () =>
    apiFetch<SyncQueueRow[]>('/physical-visits/admin/sync-queue'),
};

export function reviewQueueToAlerts(
  rows: FlaggedVitalReview[],
  patientName?: string,
): AdminAlert[] {
  return rows
    .filter((row) => !patientName || row.patientName === patientName)
    .map((row) => ({
      id: row.id,
      patient_name: row.patientName,
      message: `BP ${row.systolic}/${row.diastolic} mmHg — ${row.status.replace('_', ' ')}`,
      risk_status: row.riskStatus,
      created_at: row.createdAt,
    }));
}
