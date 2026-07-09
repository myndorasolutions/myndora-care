import { apiFetch } from './api';
import type { AdminAlert, VisitHistoryRow, VitalReading } from './types';
import type { FlaggedVitalReview, ReviewStatus } from './reviewQueue';

export const PLAYTEST_PATIENT_ID = 'playtest-patient-grace';

export const vitalsApi = {
  getTrend: (patientId: string, days: number) =>
    apiFetch<VitalReading[]>(`/vitals/patient/${patientId}/trend?days=${days}`),

  getReviewQueue: () => apiFetch<FlaggedVitalReview[]>('/vitals/review-queue'),

  updateReview: (
    id: string,
    body: { status: ReviewStatus; clinician_notes?: string },
  ) =>
    apiFetch<FlaggedVitalReview>(`/vitals/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getVisitHistory: (patientId: string) =>
    apiFetch<VisitHistoryRow[]>(`/chw-visits/patient/${patientId}`),
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
