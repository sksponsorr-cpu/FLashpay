import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";
import { createClient } from "@/lib/supabase/server";

const endpoint = "https://api.accountpe.com/api/payout/payout_methods";

export async function GET(request: Request) {
  // Seuls les utilisateurs connectés peuvent interroger le compte marchand.
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Connecte-toi pour voir les moyens de paiement." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ message: "Supabase n’est pas disponible." }, { status: 503 });
  }

  const countryCode = new URL(request.url).searchParams.get("country_code")?.trim().toUpperCase();

  const country = getSupportedCountry(countryCode);
  if (!country) {
    return NextResponse.json({ message: "Ce pays n’est pas encore configuré dans FlashPay." }, { status: 400 });
  }

  const liveEnabled = process.env.SWYCHR_PROVIDER_LOOKUPS_ENABLED === "true";
  const apiKey = process.env.SWYCHR_API_KEY;

  if (!liveEnabled) {
    if (countryCode === "CM") {
      return NextResponse.json({
        mode: "demo",
        data: {
          country: "Cameroun",
          country_code: "CM",
          currency_code: "XAF",
          payment_methods: [
            { payment_method: "MTN", mobile_format: "6XXXXXXXX", applicable_mobileno_length: "9" },
            { payment_method: "ORANGE", mobile_format: "6XXXXXXXX", applicable_mobileno_length: "9" },
          ],
        },
      });
    }
    return NextResponse.json({ mode: "demo", data: { country: country.name, country_code: countryCode, currency_code: country.currency, payment_methods: [] } });
  }

  if (!apiKey) {
    return NextResponse.json({ message: "La clé de paiement serveur n’est pas configurée." }, { status: 503 });
  }

  try {
    const providerResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": apiKey },
      body: JSON.stringify({ country_code: countryCode }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const providerResult = await providerResponse.json();

    if (!providerResponse.ok || providerResult.status !== 200) {
      return NextResponse.json(
        { message: providerResult.message ?? "Les moyens de paiement ne sont pas disponibles." },
        { status: providerResponse.status >= 400 ? providerResponse.status : 400 },
      );
    }

    return NextResponse.json({ mode: "live", ...providerResult });
  } catch {
    return NextResponse.json({ message: "Impossible de récupérer les moyens de paiement." }, { status: 502 });
  }
}
