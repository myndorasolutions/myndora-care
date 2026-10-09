import { apiFetch } from './api';

export interface ChwPatient {
  id: string;
  fullName: string;
  sponsorId: string;
  conditionTags: string[];
  preferredLanguage: string;
  address: string;
  consentStatus: boolean;
  dateOfBirth?: string;
  gender?: string;
}

export interface ChwVisit {
  id: string;
  sponsorId: string;
  patientId: string;
  chwId: string;
  scheduledTime: string;
  status: string;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  temperatureCelsius?: number | null;
  bloodSugarMgDl?: number | null;
  chwObservationNotes?: string | null;
  patient?: ChwPatient;
  escalations?: Array<{
    id: string;
    severity: string;
    triggerReason: string;
  }>;
}

export interface AudioPrompt {
  id: string;
  promptKey: string;
  language: string;
  transcriptText: string;
  audioUrl: string;
  isApproved: boolean;
}

export interface CheckupVitalsPayload {
  patientId: string;
  sponsorId: string;
  scheduledTime: string;
  checklistResponses: Record<string, unknown>;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  temperatureCelsius?: number;
  bloodSugarMgDl?: number;
  bloodSugarContext?: 'fasting' | 'random';
  oxygenSaturationPct?: number;
  chwObservationNotes?: string;
}

export interface CheckupSubmitResult {
  visit: ChwVisit;
  escalation: {
    id: string;
    severity: string;
    triggerReason: string;
  } | null;
  sponsorNotification: unknown;
}

export const chwApi = {
  listPatients: () => apiFetch<ChwPatient[]>('/chw/patients'),

  listMyVisits: (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<ChwVisit[]>(`/physical-visits/mine${q}`);
  },

  listAudioPrompts: (language?: string) => {
    const q = language ? `?language=${encodeURIComponent(language)}` : '';
    return apiFetch<AudioPrompt[]>(`/audio-prompts${q}`);
  },

  createVisit: (body: CheckupVitalsPayload) =>
    apiFetch<CheckupSubmitResult>('/physical-visits', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  recordVisit: (id: string, body: CheckupVitalsPayload) =>
    apiFetch<CheckupSubmitResult>(`/physical-visits/${id}/record`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  completeVisit: (
    id: string,
    body: { verificationOtp?: string; chwAttestationSigned: boolean },
  ) =>
    apiFetch<ChwVisit>(`/physical-visits/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
