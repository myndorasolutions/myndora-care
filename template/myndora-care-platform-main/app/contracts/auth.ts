// Shared auth-layer types used by both the api and the frontend.
export type ProfileKind = 'sponsor' | 'patient' | 'chw' | 'chw_applicant' | 'admin' | 'clinician';
export type ProfileStatus = 'active' | 'pending_review' | 'suspended' | 'rejected';

export type AuthProfile = {
  id: number;
  kind: ProfileKind;
  status: ProfileStatus;
  refId: string | null;
};

export type AccountStatus = 'active' | 'suspended' | 'deactivated';

export type AuthAccount = {
  id: number;
  email: string;
  name: string;
  verified: boolean;
  isDemo: boolean;
  status: AccountStatus;
  phone: string | null;
  country: string | null;
  profiles: AuthProfile[];
};

export type AuthSession = {
  account: AuthAccount;
};

export type ChwApplicationStage =
  | 'application_started'
  | 'identity_review'
  | 'qualification_review'
  | 'references_pending'
  | 'training_required'
  | 'approved_remote'
  | 'approved_home_visits'
  | 'suspended'
  | 'rejected';

export const CHW_STAGE_LABELS: Record<ChwApplicationStage, string> = {
  application_started: 'Application started',
  identity_review: 'Identity review',
  qualification_review: 'Qualification review',
  references_pending: 'References pending',
  training_required: 'Training required',
  approved_remote: 'Approved for remote checks',
  approved_home_visits: 'Approved for home visits',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

export type ChwApplicationSummary = {
  id: number;
  applicantName: string;
  city: string;
  stage: ChwApplicationStage;
  payload: Record<string, unknown>;
  hasAccount: boolean;
  updatedAt: Date;
};

export type ClinicianApplicationStage =
  | 'invited'
  | 'application_submitted'
  | 'verification_pending'
  | 'approved'
  | 'suspended'
  | 'rejected';

export const CLINICIAN_STAGE_LABELS: Record<ClinicianApplicationStage, string> = {
  invited: 'Invited',
  application_submitted: 'Application submitted',
  verification_pending: 'Verification pending',
  approved: 'Approved',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

export type ClinicianApplicationSummary = {
  id: number;
  name: string;
  email: string;
  stage: ClinicianApplicationStage;
  payload: Record<string, unknown>;
  hasAccount: boolean;
  updatedAt: Date;
};

export const DEMO_ACCOUNTS = {
  sponsor: { email: 'sponsor@demo.myndora.test', name: 'Tunde Adeyemi' },
  patient: { email: 'patient@demo.myndora.test', name: 'Grace Okafor' },
  chw: { email: 'chw@demo.myndora.test', name: 'Amina Bello' },
  admin: { email: 'admin@demo.myndora.test', name: 'Maya Johnson' },
  clinician: { email: 'clinician@demo.myndora.test', name: 'Dr. Chika Eze' },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

// Demo sign-in password (documented for UAT; one-click demo buttons bypass it).
export const DEMO_PASSWORD = 'myndora-demo-2026';

export const SESSION_COOKIE = 'mc_session';
