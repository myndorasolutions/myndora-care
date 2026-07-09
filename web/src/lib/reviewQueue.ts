export type ReviewStatus = 'needs_review' | 'reviewed' | 'closed';

export interface FlaggedVitalReview {
  id: string;
  patientName: string;
  systolic: number;
  diastolic: number;
  riskStatus: 'green' | 'yellow' | 'red';
  status: ReviewStatus;
  clinicianNotes: string;
  createdAt: string;
}
