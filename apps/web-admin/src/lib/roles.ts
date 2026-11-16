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

export const SIGNUP_ROLES = [
  "patient",
  "sponsor",
  "chw",
  "pharmacy",
  "clinician",
] as const;

export type SignupRole = (typeof SIGNUP_ROLES)[number];

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

export function isSignupRole(value: string | null | undefined): value is SignupRole {
  return Boolean(value && (SIGNUP_ROLES as readonly string[]).includes(value));
}

export function roleFromPath(pathname: string): AppRole | null {
  const match = (Object.entries(ROLE_HOME) as [AppRole, string][]).find(
    ([, path]) => pathname === path || pathname.startsWith(`${path}/`),
  );
  return match?.[0] ?? null;
}
