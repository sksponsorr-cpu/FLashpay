import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedEmailTypes: EmailOtpType[] = ["signup", "email"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const emailType = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !emailType || !allowedEmailTypes.includes(emailType)) {
    return NextResponse.redirect(new URL("/login?confirmation=failed", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: emailType, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(new URL("/login?confirmation=failed", request.url));
  }

  return NextResponse.redirect(new URL("/apps", request.url));
}
