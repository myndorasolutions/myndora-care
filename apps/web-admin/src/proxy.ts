import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  REVIEW_PATH,
  accountHome,
  isAppRole,
  isClearedVerification,
  isPartnerRole,
  roleFromPath,
  type AppRole,
} from "@/lib/roles";
import { demoModeEnabled, supabaseEnv } from "@/lib/supabase/env";

const DEMO_COOKIE = "myndora_demo_role";

export async function proxy(request: NextRequest) {
  const env = supabaseEnv();
  let response = NextResponse.next({ request });
  let role: AppRole | null = null;
  let verificationStatus: string | null = null;
  let selfSponsored = false;

  if (env) {
    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_role")
        .eq("id", data.user.id)
        .maybeSingle();
      const profileRole = profile?.primary_role;
      if (isAppRole(profileRole)) {
        role = profileRole;
      }

      if (isPartnerRole(role)) {
        const { data: provider } = await supabase
          .from("providers")
          .select("verification_status")
          .eq("user_id", data.user.id)
          .maybeSingle();
        verificationStatus = provider?.verification_status ?? null;
      }

      const { data: patient } = await supabase
        .from("patients")
        .select("is_self_sponsored")
        .eq("user_id", data.user.id)
        .maybeSingle();
      selfSponsored = Boolean(patient?.is_self_sponsored);
    }
  }

  const path = request.nextUrl.pathname;
  const routeRole = roleFromPath(path);
  const home = role ? accountHome(role, verificationStatus) : "/login";

  if (path === REVIEW_PATH || path.startsWith(`${REVIEW_PATH}/`)) {
    if (!env) return redirectWithCookies(request, "/login", response);
    if (!role) return redirectWithCookies(request, "/login", response);
    if (isPartnerRole(role) && !isClearedVerification(verificationStatus)) return response;
    return redirectWithCookies(request, home, response);
  }

  if (!routeRole) {
    if ((path === "/login" || path === "/signup" || path === "/apply") && role) {
      return redirectWithCookies(request, home, response);
    }
    return response;
  }

  if (!env) return response;

  const demoRole = request.cookies.get(DEMO_COOKIE)?.value;
  const demoMatch = demoModeEnabled() && isAppRole(demoRole) && demoRole === routeRole;
  if (demoMatch) return response;

  if (isPartnerRole(role) && !isClearedVerification(verificationStatus) && isPartnerRole(routeRole)) {
    return redirectWithCookies(request, REVIEW_PATH, response);
  }

  const roleMatch =
    role === routeRole ||
    (role === "patient" && selfSponsored && routeRole === "sponsor");

  if (roleMatch) return response;

  return redirectWithCookies(request, home, response);
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
) {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
