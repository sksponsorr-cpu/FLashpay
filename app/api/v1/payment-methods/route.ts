import { createHash } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";
import { routeProvider } from "@/lib/payment-routing";
import { saspayOperatorsFor } from "@/lib/saspay-networks";

// GET /api/v1/payment-methods?country_code=CM
// Moyens de paiement acceptés pour un pays. Header : X-FlashPay-Key.
export async function GET(request: Request) {
  const key = request.headers.get("x-flashpay-key") ?? "";
  if (!key || !(key.startsWith("fp_test_") || key.startsWith("fp_live_"))) {
    return NextResponse.json({ message: "Une clé FlashPay valide est requise dans X-FlashPay-Key." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: "Service indisponible." }, { status: 503 });
  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const keyHash = createHash("sha256").update(key).digest("hex");
  const { data: apiKey } = await admin
    .from("api_keys")
    .select("owner_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!apiKey) return NextResponse.json({ message: "Cette clé est invalide ou révoquée." }, { status: 401 });

  const countryCode = (new URL(request.url).searchParams.get("country_code") ?? "").trim().toUpperCase();
  const country = getSupportedCountry(countryCode);
  if (!country) {
    return NextResponse.json({ message: "Pays non pris en charge. Consulte la liste dans la documentation." }, { status: 400 });
  }

  if (routeProvider(country.code) === "saspay") {
    return NextResponse.json({
      country_code: country.code,
      mode: "direct",
      payment_methods: saspayOperatorsFor(country.code).map((code) => ({ payment_method: code, label: code })),
    });
  }

  const accountPeKey = process.env.SWYCHR_API_KEY;
  if (!accountPeKey) return NextResponse.json({ message: "Configuration de paiement manquante." }, { status: 503 });

  let res: Response;
  try {
    res = await fetch("https://api.accountpe.com/api/payout/payout_methods", {
      method: "POST",
      headers: { "Api-Key": accountPeKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ country_code: country.code }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ message: "Le prestataire ne répond pas. Réessaie plus tard." }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ message: "Liste des moyens de paiement indisponible." }, { status: 502 });

  const json = (await res.json()) as Record<string, unknown>;
  const container =
    json["data"] && typeof json["data"] === "object" && !Array.isArray(json["data"])
      ? (json["data"] as Record<string, unknown>)
      : json;
  const list: unknown[] =
    (Array.isArray(container["payment_methods"]) && (container["payment_methods"] as unknown[])) ||
    (Array.isArray(container["methods"]) && (container["methods"] as unknown[])) ||
    (Array.isArray(json["data"]) && (json["data"] as unknown[])) ||
    [];

  const methods = list
    .map((entry) => {
      const item = typeof entry === "string" ? { code: entry } : (entry as Record<string, unknown>);
      const code = String(item["payment_method"] ?? item["method"] ?? item["code"] ?? item["name"] ?? "");
      const label = String(item["name"] ?? item["label"] ?? code);
      return { payment_method: code, label };
    })
    .filter((m) => m.payment_method.length > 0);

  return NextResponse.json({ country_code: country.code, mode: "hosted", payment_methods: methods });
}
