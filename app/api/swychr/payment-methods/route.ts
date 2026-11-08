import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";
import { createClient } from "@/lib/supabase/server";

const ENDPOINT =
  "https://api.accountpe.com/api/payout/payout_methods";

export async function GET(request: Request) {
  try {
    // 1. Vérifier la connexion utilisateur
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Authentification requise." },
        { status: 401 }
      );
    }

    // 2. Vérifier le pays
    const countryCode = new URL(request.url)
      .searchParams
      .get("country_code")
      ?.trim()
      .toUpperCase();

    const country = getSupportedCountry(countryCode);

    if (!country) {
      return NextResponse.json(
        { message: "Pays non pris en charge." },
        { status: 400 }
      );
    }

    // 3. Vérifier la clé AccountPe
    const apiKey = process.env.SWYCHR_API_KEY;

    if (!apiKey) {
      console.error("SWYCHR_API_KEY missing");

      return NextResponse.json(
        { message: "Configuration AccountPe manquante." },
        { status: 503 }
      );
    }

    // 4. Interroger AccountPe
    const response = await fetch(ENDPOINT, {
      method: "POST",

      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        country_code: countryCode,
      }),

      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
      console.error(
        "AccountPe provider error:",
        response.status,
        result?.message
      );

      return NextResponse.json(
        {
          message:
            result?.message ??
            "Impossible de récupérer les opérateurs.",
        },
        { status: 502 }
      );
    }

    if (
      result.status !== 200 &&
      result.status !== "200"
    ) {
      return NextResponse.json(
        {
          message:
            result.message ??
            "AccountPe n'a retourné aucun opérateur.",
        },
        { status: 502 }
      );
    }

    const providerData = result.data;

    if (
      !providerData ||
      !Array.isArray(providerData.payment_methods)
    ) {
      return NextResponse.json(
        { message: "Réponse AccountPe invalide." },
        { status: 502 }
      );
    }

    // 5. Vérifier la devise
    if (providerData.currency_code !== country.currency) {
      console.error("Currency mismatch:", {
        expected: country.currency,
        received: providerData.currency_code,
      });

      return NextResponse.json(
        {
          message:
            "La devise retournée par AccountPe ne correspond pas au pays sélectionné.",
        },
        { status: 409 }
      );
    }

    // 6. Retourner uniquement les opérateurs réels
    const paymentMethods = providerData.payment_methods
      .filter(
        (method: {
          payment_method?: string;
          mobile_format?: string;
          applicable_mobileno_length?: string;
        }) =>
          typeof method.payment_method === "string" &&
          typeof method.mobile_format === "string"
      )
      .map(
        (method: {
          payment_method: string;
          mobile_format: string;
          applicable_mobileno_length?: string;
        }) => ({
          payment_method: method.payment_method,
          mobile_format: method.mobile_format,
          applicable_mobileno_length:
            method.applicable_mobileno_length ?? null,
        })
      );

    return NextResponse.json({
      mode: "live",
      data: {
        country: providerData.country,
        country_code: providerData.country_code,
        currency_name: providerData.currency_name,
        currency_code: providerData.currency_code,
        payment_methods: paymentMethods,
      },
      message: result.message,
      status: 200,
    });

  } catch (error) {
    console.error("Payment methods error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error &&
          error.name === "TimeoutError"
            ? "AccountPe met trop de temps à répondre."
            : "Erreur de connexion au prestataire.",
      },
      { status: 502 }
    );
  }
}
