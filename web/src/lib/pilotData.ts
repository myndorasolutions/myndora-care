export type PilotRole = 'chw' | 'sponsor' | 'coordinator';

export type SubscriptionPlanId =
  | 'basic_monitor'
  | 'family_care'
  | 'assisted_care'
  | 'premium_chronic';

export interface PricingTier {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  /** Fixed Framework 2 Dual-Zone price (Zone B default fallback). */
  priceNaira: number;
  priceMinNaira: number;
  priceMaxNaira: number;
}

export interface ChwTrustBadge {
  id: string;
  label: string;
}

export interface IlorinChwProfile {
  id: string;
  name: string;
  area: string;
  yearsExperience: number;
  badges: ChwTrustBadge['id'][];
}

export const PILOT_ROLES: {
  id: PilotRole;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'chw',
    title: 'Community Health Worker',
    subtitle: 'Field checkups, Yoruba audio prompts, visit verification',
  },
  {
    id: 'sponsor',
    title: 'Family Sponsor / Subscriber',
    subtitle: 'Plans, CHW assignment, vitals and alert monitoring',
  },
  {
    id: 'coordinator',
    title: 'Administrative Care Coordinator',
    subtitle: 'Trust grids, sync queues, clinician review simulator',
  },
];

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'basic_monitor',
    name: 'Basic Monitor',
    description: 'Self-tracking only',
    priceNaira: 2500,
    priceMinNaira: 2500,
    priceMaxNaira: 2500,
  },
  {
    id: 'family_care',
    name: 'Family Care Dashboard',
    description: 'Sponsor visibility + alerts',
    priceNaira: 6000,
    priceMinNaira: 6000,
    priceMaxNaira: 6000,
  },
  {
    id: 'assisted_care',
    name: 'Assisted Monitoring',
    description: 'Includes scheduled remote CHW checks',
    priceNaira: 12000,
    priceMinNaira: 12000,
    priceMaxNaira: 12000,
  },
  {
    id: 'premium_chronic',
    name: 'Premium Family Care',
    description: 'Weekly remote checks + clinician review',
    priceNaira: 30000,
    priceMinNaira: 30000,
    priceMaxNaira: 30000,
  },
];

/** Framework 2 zone fallbacks when API unavailable */
export const FRAMEWORK2_ZONE_PRICES: Record<
  'ZONE_A' | 'ZONE_B',
  Record<SubscriptionPlanId, number>
> = {
  ZONE_A: {
    basic_monitor: 3000,
    family_care: 9000,
    assisted_care: 18000,
    premium_chronic: 45000,
  },
  ZONE_B: {
    basic_monitor: 2500,
    family_care: 6000,
    assisted_care: 12000,
    premium_chronic: 30000,
  },
};

export const FRAMEWORK2_VISIT_RATES = {
  ZONE_A: {
    baseVisitNaira: 5500,
    chwPayoutNaira: 4000,
    platformFeeNaira: 1500,
    distanceSurchargePer2kmNaira: 800,
  },
  ZONE_B: {
    baseVisitNaira: 3000,
    chwPayoutNaira: 2200,
    platformFeeNaira: 800,
    distanceSurchargePer2kmNaira: 500,
  },
} as const;

export const TRUST_BADGES: ChwTrustBadge[] = [
  { id: 'identity', label: 'Identity Verified' },
  { id: 'nin', label: 'NIN Verified' },
  { id: 'references', label: 'References Checked' },
  { id: 'background', label: 'Background Check Completed' },
];

export const ILORIN_CHW_PROFILES: IlorinChwProfile[] = [
  {
    id: 'chw-amina',
    name: 'Amina Bello',
    area: 'Gra, Ilorin',
    yearsExperience: 6,
    badges: ['identity', 'nin', 'references', 'background'],
  },
  {
    id: 'chw-chidi',
    name: 'Chidi Nwosu',
    area: 'Tanke, Ilorin',
    yearsExperience: 4,
    badges: ['identity', 'nin', 'references'],
  },
  {
    id: 'chw-fatima',
    name: 'Fatima Abdullahi',
    area: 'Adewole, Ilorin',
    yearsExperience: 8,
    badges: ['identity', 'nin', 'references', 'background'],
  },
];

export function getPilotHome(role: PilotRole): string {
  switch (role) {
    case 'chw':
      return '/chw/today';
    case 'sponsor':
      return '/sponsor/dashboard';
    case 'coordinator':
      return '/admin/dashboard';
  }
}
