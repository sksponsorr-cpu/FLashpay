import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { notifyMerchant } from "@/lib/merchant-webhook";

type PaymentEvent = {
  event?: string;
  data?: {
    data?: {
      attributes?: {
        transaction_id?: string;
        status?: string;
        amount?: string | number;
        currency_code?: string;
        swychr_reference?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    // 1. Vérification du secret
    const secret = process.env.SWYCHR_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        { message: "Secret webhook non configuré." },
        { status: 503 }
      );
    }

    // 2. Vérification de la signature
    const timestamp =
      request.headers.get("x-webhook-timestamp") ?? "";

    const signature =
      request.headers.get("x-webhook-signature-v2") ?? "";

    const timestampSeconds = Number(timestamp);

    const ageSeconds = Math.abs(
      Date.now() / 1000 - timestampSeconds
    );

    if (
      !Number.isFinite(timestampSeconds) ||
      ageSeconds > 300 ||
      !/^[a-f0-9]{64}$/i.test(signature)
    ) {
      return NextResponse.json(
        { message: "Signature invalide ou expirée." },
        { status: 401 }
      );
    }

    // 3. Lire le corps brut
    const rawBody = await request.text();

    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest();

    const received = Buffer.from(signature, "hex");

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return NextResponse.json(
        { message: "Signature webhook incorrecte." },
        { status: 401 }
      );
    }

    // 4. Lire l'événement
    let event: PaymentEvent;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { message: "JSON invalide." },
        { status: 400 }
      );
    }

    const attributes = event.data?.data?.attributes;

    if (
      event.event !== "payment_link_status_updated" ||
      !attributes?.transaction_id ||
      !attributes.status ||
      attributes.amount === undefined
    ) {
      return NextResponse.json(
        { message: "Événement non reconnu." },
        { status: 400 }
      );
    }

    const amount = Number(attributes.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Montant invalide." },
        { status: 400 }
      );
    }

    // 5. Connexion Supabase sécurisée
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { message: "Configuration Supabase manquante." },
        { status: 503 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 6. Enregistrer et valider le paiement
    const { data, error } = await admin.rpc(
      "apply_swychr_payment_event",
      {
        p_transaction_id: attributes.transaction_id,
        p_provider_status: String(attributes.status).toLowerCase(),
        p_amount: amount,
        p_currency_code: attributes.currency_code ?? "",
        p_swychr_reference:
          attributes.swychr_reference ?? null,
      }
    );

    if (error) {
      console.error("Payment database error:", error);

      return NextResponse.json(
        { message: "Erreur d'enregistrement du paiement." },
        { status: 503 }
      );
    }

    // 7. Refuser les incohérences
    if (
      data === "UNKNOWN_TRANSACTION" ||
      data === "AMOUNT_MISMATCH"
    ) {
      console.error("Payment validation failed:", {
        transaction_id: attributes.transaction_id,
        result: data,
      });

      return NextResponse.json(
        { message: "Transaction non validée.", result: data },
        { status: 400 }
      );
    }

    // 8. Créditer uniquement les paiements confirmés
    if (
      data === "SUCCESSFUL" ||
      data === "ALREADY_PROCESSED"
    ) {
      const { data: purpose, error: settleError } =
        await admin.rpc(
          "settle_successful_transaction",
          {
            p_transaction_id: attributes.transaction_id,
          }
        );

      if (settleError) {
        console.error("Settlement error:", settleError);

        return NextResponse.json(
          { message: "Crédit du portefeuille impossible." },
          { status: 503 }
        );
      }

      // Notification uniquement pour les encaissements.
      if (purpose === "collection") {
        try {
          await notifyMerchant(
            admin,
            attributes.transaction_id
          );
        } catch (notificationError) {
          console.error(
            "Merchant notification error:",
            notificationError
          );
        }
      }

      if (purpose === "subscription") {
        console.info(
          "Paiement abonnement confirmé :",
          attributes.transaction_id
        );

        // Notification au marchand : son abonnement est activé.
        try {
          const { data: subTx } = await admin
            .from("transactions")
            .select("owner_id, amount, currency_code")
            .eq("transaction_id", attributes.transaction_id)
            .maybeSingle();
          const { data: subPay } = await admin
            .from("subscription_payments")
            .select("plan")
            .eq("transaction_id", attributes.transaction_id)
            .maybeSingle();
          if (subTx?.owner_id) {
            const planLabel = subPay?.plan
              ? subPay.plan.charAt(0).toUpperCase() + subPay.plan.slice(1)
              : "Abonnement";
            await admin.from("user_notifications").insert({
              owner_id: subTx.owner_id,
              kind: "subscription",
              title: `Abonnement ${planLabel} activé`,
              body: `Paiement de ${subTx.amount} ${subTx.currency_code} confirmé.`,
              reference: attributes.transaction_id,
            });
          }
        } catch (subscriptionNoticeError) {
          console.error("Subscription notification error:", subscriptionNoticeError);
        }
      }
    }

    return NextResponse.json({
      received: true,
      result: data,
    });

  } catch (error) {
    console.error("Webhook processing error:", error);

    return NextResponse.json(
      { message: "Erreur interne du webhook." },
      { status: 500 }
    );
  }
}
