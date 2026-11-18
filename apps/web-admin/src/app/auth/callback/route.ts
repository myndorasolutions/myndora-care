import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { accountHome, isAppRole, isPartnerRole } from "@/lib/roles";
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
  let destination = accountHome("patient", null);

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_role")
      .eq("id", userId)
      .maybeSingle();
    if (isAppRole(profile?.primary_role)) {
      let verificationStatus: string | null = null;
      if (isPartnerRole(profile.primary_role)) {
        const { data: provider } = await supabase
          .from("providers")
          .select("verification_status")
          .eq("user_id", userId)
          .maybeSingle();
        verificationStatus = provider?.verification_status ?? null;
      }
      destination = accountHome(profile.primary_role, verificationStatus);
    }
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
