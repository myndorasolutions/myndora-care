import { apiFetch } from './api';

export interface CreatePatientBody {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  phoneNumber: string;
  city: string;
  preferredLanguage?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship?: string;
  };
  caregiverDetails: {
    name: string;
    phone: string;
    address: string;
  };
  conditionTags?: string[];
  medications?: string[];
  consentAcknowledged: boolean;
}

export interface PatientRecord {
  id: string;
  fullName: string;
  city: string | null;
  pricingZone: string | null;
  phoneNumber?: string | null;
  consentStatus: boolean;
}

export const patientsApi = {
  create: (body: CreatePatientBody) =>
    apiFetch<PatientRecord>('/patients', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
