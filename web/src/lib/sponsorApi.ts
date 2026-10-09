import { apiFetch } from './api';

export interface SponsorOnboardingStatus {
  hasPatient: boolean;
  hasActiveSubscription: boolean;
  patientsCount: number;
  activeSubscription: null | {
    id: string;
    planName: string;
    isActive: boolean;
    renewalDate: string;
    allocatedVisits: number;
    usedVisits: number;
  };
  sponsorCity: string | null;
  pricingZone: string | null;
}

export function resolveSponsorHome(status: SponsorOnboardingStatus): string {
  if (!status.hasPatient) return '/sponsor/onboarding/add-patient';
  if (!status.hasActiveSubscription) return '/sponsor/onboarding/checkout';
  return '/sponsor/dashboard';
}

export const sponsorApi = {
  getOnboarding: () =>
    apiFetch<SponsorOnboardingStatus>('/sponsors/me/onboarding'),
};
