import { apiFetch } from './api';
import type { UserProfile, UserRole } from './types';

export type AuthBackendRole = 'SPONSOR' | 'CHW' | 'PATIENT' | 'ADMIN';

export interface AuthUserDto {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  role: AuthBackendRole | string;
  isVerified: boolean;
  fullName?: string | null;
  city?: string | null;
  pricingZone?: string | null;
}

export interface AuthTokenResponse {
  accessToken: string;
  requiresOtp: false;
  user: AuthUserDto;
}

export interface AuthOtpPendingResponse {
  userId: string;
  requiresOtp: true;
  channel: 'EMAIL' | 'SMS';
  message?: string;
  devCode?: string;
}

export type AuthFlowResponse = AuthTokenResponse | AuthOtpPendingResponse;

export function mapBackendRoleToFrontend(role: string): UserRole {
  const key = role.toUpperCase();
  if (key === 'SPONSOR') return 'sponsor';
  if (key === 'CHW') return 'chw';
  if (key === 'PATIENT') return 'patient';
  if (key === 'ADMIN' || key === 'COORDINATOR') return 'admin';
  if (key === 'CAREGIVER') return 'caregiver';
  if (key === 'CLINICIAN_REVIEWER') return 'clinician';
  return 'chw';
}

export function authUserToProfile(user: AuthUserDto): UserProfile {
  return {
    id: user.id,
    email: user.email ?? user.phoneNumber ?? 'user@myndora.demo',
    full_name:
      user.fullName?.trim() ||
      user.email?.split('@')[0] ||
      user.phoneNumber ||
      'Myndora User',
    role: mapBackendRoleToFrontend(user.role),
    phone: user.phoneNumber ?? undefined,
    city: user.city ?? undefined,
    pricingZone: user.pricingZone ?? undefined,
  };
}

export const authApi = {
  register: (body: {
    email?: string;
    phoneNumber?: string;
    password: string;
    role: AuthBackendRole;
    fullName?: string;
    city?: string;
    country?: string;
  }) =>
    apiFetch<AuthOtpPendingResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: {
    email?: string;
    phoneNumber?: string;
    password: string;
  }) =>
    apiFetch<AuthFlowResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  requestOtp: (body: { userId: string; channel?: 'EMAIL' | 'SMS' }) =>
    apiFetch<AuthOtpPendingResponse>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyOtp: (body: { userId: string; code: string }) =>
    apiFetch<AuthTokenResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => apiFetch<AuthUserDto>('/auth/me'),
};

export interface PricingZonesResponse {
  zones: Array<{ id: string; label: string; cities: string[] }>;
  cities: Array<{ id: string; name: string; pricingZone: string }>;
}

export interface PricingPlansResponse {
  pricingZone: string;
  city: string | null;
  plans: Array<{
    id: string;
    planKey: string;
    displayName: string;
    description: string;
    allocatedVisits: number;
    monthlyPriceNaira: number | null;
  }>;
  visitRate: {
    baseVisitNaira: number;
    chwPayoutNaira: number;
    platformFeeNaira: number;
    distanceSurchargePer2kmNaira: number;
  } | null;
}

export const pricingApi = {
  getZones: () => apiFetch<PricingZonesResponse>('/pricing/zones'),
  getPlans: (params: { zone?: string; city?: string }) => {
    const q = new URLSearchParams();
    if (params.zone) q.set('zone', params.zone);
    if (params.city) q.set('city', params.city);
    const qs = q.toString();
    return apiFetch<PricingPlansResponse>(`/pricing/plans${qs ? `?${qs}` : ''}`);
  },
};
