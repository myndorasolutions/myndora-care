import { apiFetch } from './api';

export interface AuditLogRow {
  id: string;
  actorId: string;
  actorEmail?: string | null;
  actorPhone?: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
}

export type ChwActivationLevel =
  | 'PENDING_REVIEW'
  | 'IDENTITY_VERIFIED'
  | 'REMOTE_CHECK_APPROVED'
  | 'HOME_VISIT_APPROVED'
  | 'SENIOR_FIELD_LEAD'
  | 'SUSPENDED';

export interface ChwAdminProfile {
  id: string;
  userId: string;
  fullName: string;
  activationLevel: ChwActivationLevel;
  ninStatus: boolean;
  identityVerified: boolean;
  referencesChecked: boolean;
  trainingCompleted: boolean;
  serviceAreas: string[];
  languagesSpoken: string[];
  vettingScorecard: unknown;
  ratingAverage: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateChwActivationBody {
  chwProfileId: string;
  activationLevel: ChwActivationLevel;
  ninStatus?: boolean;
  identityVerified?: boolean;
  referencesChecked?: boolean;
  trainingCompleted?: boolean;
  vettingScorecard?: {
    identityDocument: number;
    ninVerification: number;
    referenceOne: number;
    referenceTwo: number;
    trainingCompetency: number;
    coordinatorNotes?: string;
  };
}

export interface PricingZoneBlock {
  id: string;
  label: string;
  cities: string[];
}

export interface PricingZonesResponse {
  zones: PricingZoneBlock[];
  cities: Array<{ id: string; name: string; pricingZone: string }>;
}

export interface PricingPlansResponse {
  pricingZone: string;
  city: string | null;
  plans: Array<{
    id: string;
    planKey: string;
    displayName: string;
    description: string | null;
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

export const adminApi = {
  listAuditLogs: (limit = 100) =>
    apiFetch<AuditLogRow[]>(`/audit-logs?limit=${limit}`),

  listChwProfiles: () =>
    apiFetch<ChwAdminProfile[]>('/chw/admin/profiles'),

  updateChwActivation: (body: UpdateChwActivationBody) =>
    apiFetch<ChwAdminProfile>('/chw/activation', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  listPricingZones: () => apiFetch<PricingZonesResponse>('/pricing/zones'),

  listPricingPlans: (zone: string) =>
    apiFetch<PricingPlansResponse>(
      `/pricing/plans?zone=${encodeURIComponent(zone)}`,
    ),
};
