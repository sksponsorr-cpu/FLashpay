import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_PROVIDERS, getActiveProvider, type PaymentProvider } from "@/lib/payment-provider";

// Réservé à l'administrateur FlashPay. Toutes les réponses sont du JSON, même en cas d'erreur.

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function requireAdmin(): Promise<{ ok: true } | { error: NextResponse }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: NextResponse.json({ message: "Connecte-toi." }, { status: 401 }) };

    const { data: isAdmin, error } = await supabase.rpc("is_flashpay_admin");
    if (error) return { error: NextResponse.json({ message: "Vérification administrateur impossible." }, { status: 503 }) };
    if (isAdmin !== true) {
      return { error: NextResponse.json({ message: "Accès réservé à l’administrateur." }, { status: 403 }) };
    }
    return { ok: true };
  } catch (e) {
    console.error("[admin/payment-provider] auth", e);
    return { error: NextResponse.json({ message: "Erreur d’authentification." }, { status: 500 }) };
  }
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const admin = serviceClient();
    if (!admin) return NextResponse.json({ message: "Base non configurée." }, { status: 503 });

    const provider = await getActiveProvider(admin);
    return NextResponse.json({ provider, available: PAYMENT_PROVIDERS });
  } catch (e) {
    console.error("[admin/payment-provider] GET", e);
    return NextResponse.json({ message: "Impossible de lire le réglage." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    let body: { provider?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Données invalides." }, { status: 400 });
    }

    const provider = body.provider as PaymentProvider;
    if (!PAYMENT_PROVIDERS.includes(provider)) {
      return NextResponse.json({ message: "Fournisseur inconnu." }, { status: 400 });
    }

    const admin = serviceClient();
    if (!admin) return NextResponse.json({ message: "Base non configurée." }, { status: 503 });

    const { error } = await admin
      .from("app_settings")
      .upsert({ key: "payment_provider", value: provider, updated_at: new Date().toISOString() });

    if (error) {
      console.error("[admin/payment-provider] upsert", error);
      return NextResponse.json({ message: "Impossible d’enregistrer le choix. La table app_settings existe-t-elle ?" }, { status: 503 });
    }
    return NextResponse.json({ provider });
  } catch (e) {
    console.error("[admin/payment-provider] POST", e);
    return NextResponse.json({ message: "Impossible d’enregistrer le choix." }, { status: 500 });
  }
}
