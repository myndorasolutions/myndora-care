import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME, isAppRole, roleFromPath, type AppRole } from "@/lib/roles";
import { demoModeEnabled, supabaseEnv } from "@/lib/supabase/env";

const DEMO_COOKIE = "myndora_demo_role";

export async function proxy(request: NextRequest) {
  const env = supabaseEnv();
  let response = NextResponse.next({ request });
  let role: AppRole | null = null;
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

  if (!routeRole) {
    if ((path === "/login" || path === "/signup") && role) {
      return redirectWithCookies(request, ROLE_HOME[role], response);
    }
    return response;
  }

  if (!env) return response;

  const demoRole = request.cookies.get(DEMO_COOKIE)?.value;
  const demoMatch =
    demoModeEnabled() && isAppRole(demoRole) && demoRole === routeRole;
  const roleMatch =
    role === routeRole ||
    (role === "patient" && selfSponsored && routeRole === "sponsor");

  if (demoMatch || roleMatch) return response;

  const destination = role ? ROLE_HOME[role] : "/login";
  return redirectWithCookies(request, destination, response);
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
