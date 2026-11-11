import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { FLASHPAY_MARGIN_POINTS } from "@/lib/fee-schedule";

// Réglages publics nécessaires à l'affichage des frais (marge FlashPay).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ margin_points: FLASHPAY_MARGIN_POINTS }, { headers: { "Cache-Control": "no-store" } });
  const admin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await admin.from("platform_settings").select("value").eq("key", "client_fee_margin_points").maybeSingle();
  const margin = data ? Number(data.value) : FLASHPAY_MARGIN_POINTS;
  return NextResponse.json({ margin_points: margin }, { headers: { "Cache-Control": "no-store" } });
}
