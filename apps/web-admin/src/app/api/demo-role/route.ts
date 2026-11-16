import { NextResponse } from "next/server";
import { ROLE_HOME, isAppRole } from "@/lib/roles";
import { demoModeEnabled } from "@/lib/supabase/env";

const DEMO_COOKIE = "myndora_demo_role";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("clear") === "1") {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  const role = url.searchParams.get("role");
  if (!demoModeEnabled() || !isAppRole(role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  response.cookies.set(DEMO_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  });
  return response;
}
