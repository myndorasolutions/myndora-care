import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ROLE_HOME, isAppRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email", "email_change"] as const;

function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && (OTP_TYPES as readonly string[]).includes(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const login = new URL("/login", request.url);

  if (!code && !(tokenHash && isOtpType(type))) {
    return NextResponse.redirect(login);
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash ?? "" });

  if (error) {
    return NextResponse.redirect(login);
  }

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  let destination = ROLE_HOME.patient;

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_role")
      .eq("id", userId)
      .maybeSingle();
    if (isAppRole(profile?.primary_role)) {
      destination = ROLE_HOME[profile.primary_role];
    }
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
