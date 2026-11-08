import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupportedCountry } from "@/lib/countries";
import {
  createSwychrPaymentRequest,
  localMobile,
  swychrMethod,
} from "@/lib/swychr";
import { createClient } from "@/lib/supabase/server";
import { liveGate } from "@/lib/live-gate";

type CollectionInput = {
  country_code?: string;
  name?: string;
  email?: string;
  mobile?: string;
  amount?: number;
  transaction_id?: string;
  payment_method?: string;
  description?: string;
  app_id?: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    // 1. Authentification
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Connecte-toi pour effectuer une collecte." },
        { status: 401 }
      );
    }

    // 2. Lecture des données
    let input: CollectionInput;

    try {
      input = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Données JSON invalides." },
        { status: 400 }
      );
    }

    const countryCode = input.country_code
      ?.trim()
      .toUpperCase();

    const country = getSupportedCountry(countryCode);

    const amount = Number(input.amount);

    const name = input.name?.trim();
    const mobile = input.mobile?.trim();
    const operator = input.payment_method?.trim();

    if (!country) {
      return NextResponse.json(
        { message: "Pays non pris en charge." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1000000000
    ) {
      return NextResponse.json(
        { message: "Montant invalide." },
        { status: 400 }
      );
    }

    if (!name || !mobile || !operator) {
      return NextResponse.json(
        { message: "Nom, numéro et opérateur obligatoires." },
        { status: 400 }
      );
    }

    // 3. Configuration serveur
    const admin = getAdminClient();

    if (!admin || !process.env.SWYCHR_API_KEY) {
      return NextResponse.json(
        { message: "Configuration du paiement incomplète." },
        { status: 503 }
      );
    }

    // 4. Vérification du compte marchand
    const gate = await liveGate(admin, user.id);

    if (!gate.ok) {
      return NextResponse.json(
        { message: gate.message },
        { status: 403 }
      );
    }

    // 5. Vérification de l'application
    if (!input.app_id) {
      return NextResponse.json(
        { message: "Identifiant de l'application obligatoire." },
        { status: 400 }
      );
    }

    const { data: app, error: appError } = await admin
      .from("apps")
      .select("id, owner_id")
      .eq("id", input.app_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (appError || !app) {
      return NextResponse.json(
        { message: "Application introuvable ou non autorisée." },
        { status: 403 }
      );
    }

    // 6. Vérification de la devise
    const { data: countryData, error: countryError } =
      await admin
        .from("supported_countries")
        .select("currency_code")
        .eq("code", country.code)
        .single();

    if (countryError || !countryData) {
      return NextResponse.json(
        { message: "Configuration de la devise indisponible." },
        { status: 503 }
      );
    }

    if (countryData.currency_code !== country.currency) {
      return NextResponse.json(
        { message: "Incohérence de devise." },
        { status: 409 }
      );
    }

    // 7. Référence unique
    const transactionId =
      input.transaction_id?.trim() ||
      `FP-${randomBytes(12).toString("hex").toUpperCase()}`;

    if (transactionId.length > 100) {
      return NextResponse.json(
        { message: "Référence trop longue." },
        { status: 400 }
      );
    }

    const paymentMethod = swychrMethod(operator);

    // 8. Enregistrement AVANT l'appel au prestataire
    const { error: insertError } = await admin
      .from("transactions")
      .insert({
        owner_id: user.id,
        app_id: app.id,
        transaction_id: transactionId,
        country_code: country.code,
        payment_method: paymentMethod,
        amount,
        currency_code: country.currency,
        processing_fee: 0,
        net_payable: amount,
        status: "pending",
      });

    if (insertError) {
      console.error("Transaction insert error:", insertError);

      return NextResponse.json(
        {
          message:
            "Impossible d'enregistrer la transaction.",
        },
        { status: 503 }
      );
    }

    // 9. Création du paiement AccountPe
    const payment = await createSwychrPaymentRequest(
      {
        country_code: country.code,
        name,
        email: input.email?.trim() || user.email || undefined,
        mobile: localMobile(country.code, mobile),
        transaction_id: transactionId,
        amount,
        payment_method: paymentMethod,
        description:
          input.description?.trim() ||
          `Encaissement FlashPay ${transactionId}`,
        pass_digital_charge: true,
      },
      process.env.SWYCHR_API_KEY
    );

    // 10. Gestion du refus
    if (!payment.ok) {
      await admin
        .from("transactions")
        .update({ status: "failed" })
        .eq("transaction_id", transactionId)
        .eq("owner_id", user.id);

      console.error("AccountPe payment rejected:", {
        transactionId,
        message: payment.message,
      });

      return NextResponse.json(
        { message: payment.message },
        { status: 502 }
      );
    }

    // 11. Enregistrement de la référence prestataire
    if (payment.swychrReference) {
      const { error: referenceError } = await admin
        .from("transactions")
        .update({
          swychr_reference: payment.swychrReference,
        })
        .eq("transaction_id", transactionId);

      if (referenceError) {
        console.error(
          "Provider reference save error:",
          referenceError
        );

        return NextResponse.json(
          {
            message:
              "Paiement créé, mais référence prestataire non enregistrée. Vérification nécessaire.",
            transaction_id: transactionId,
          },
          { status: 503 }
        );
      }
    }

    // 12. Réponse
    return NextResponse.json({
      ok: true,
      mode: "live",
      data: {
        transaction_id: transactionId,
        amount,
        currency_code: country.currency,
        payment_method: paymentMethod,
        status: "pending",
        payment_link: payment.paymentLink,
        message:
          "Demande transmise au prestataire. En attente de confirmation.",
      },
    });

  } catch (error) {
    console.error("FlashPay collection error:", error);

    return NextResponse.json(
      { message: "Erreur interne lors de la création du paiement." },
      { status: 500 }
    );
  }
            }
