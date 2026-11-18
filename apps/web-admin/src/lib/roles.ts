export const ROLES = [
  "patient",
  "sponsor",
  "chw",
  "pharmacy",
  "clinician",
  "admin",
  "super_admin",
] as const;

export type AppRole = (typeof ROLES)[number];

export const PUBLIC_SIGNUP_ROLES = ["patient", "sponsor"] as const;

export type PublicSignupRole = (typeof PUBLIC_SIGNUP_ROLES)[number];

export const PARTNER_ROLES = ["chw", "pharmacy", "clinician"] as const;

export type PartnerRole = (typeof PARTNER_ROLES)[number];

export const CLEARED_VERIFICATION = ["remote_approved", "home_visit_approved", "verified"] as const;

export const REVIEW_PATH = "/apply/status";

export const ROLE_HOME: Record<AppRole, string> = {
  patient: "/patient",
  sponsor: "/sponsor",
  chw: "/chw",
  pharmacy: "/pharmacy",
  clinician: "/clinician",
  admin: "/admin",
  super_admin: "/super-admin",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  patient: "Patient",
  sponsor: "Sponsor",
  chw: "CHW",
  pharmacy: "Pharmacy",
  clinician: "Clinician",
  admin: "Admin",
  super_admin: "Super Admin",
};

export const PUBLIC_ROLE_LABEL: Record<PublicSignupRole, string> = {
  patient: "Patient",
  sponsor: "Family Sponsor",
};

export const PARTNER_ROLE_LABEL: Record<PartnerRole, string> = {
  chw: "Community Health Worker (CHW)",
  pharmacy: "Pharmacy",
  clinician: "Clinician",
};

export const ROLE_THEME: Record<AppRole, string> = {
  patient: "patient",
  sponsor: "sponsor",
  chw: "chw",
  pharmacy: "pharmacy",
  clinician: "clinician",
  admin: "admin",
  super_admin: "admin",
};

export function isAppRole(value: string | null | undefined): value is AppRole {
  return Boolean(value && (ROLES as readonly string[]).includes(value));
}

export function isPublicSignupRole(value: string | null | undefined): value is PublicSignupRole {
  return Boolean(value && (PUBLIC_SIGNUP_ROLES as readonly string[]).includes(value));
}

export function isPartnerRole(value: string | null | undefined): value is PartnerRole {
  return Boolean(value && (PARTNER_ROLES as readonly string[]).includes(value));
}

export function isClearedVerification(value: string | null | undefined) {
  return Boolean(value && (CLEARED_VERIFICATION as readonly string[]).includes(value));
}

export function accountHome(role: AppRole, verificationStatus?: string | null) {
  if (isPartnerRole(role) && !isClearedVerification(verificationStatus)) return REVIEW_PATH;
  return ROLE_HOME[role];
}

export function roleFromPath(pathname: string): AppRole | null {
  const match = (Object.entries(ROLE_HOME) as [AppRole, string][]).find(
    ([, path]) => pathname === path || pathname.startsWith(`${path}/`),
  );
  return match?.[0] ?? null;
}
