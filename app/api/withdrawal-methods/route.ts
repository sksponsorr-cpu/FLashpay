import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const COUNTRIES: Record<
  string,
  {
    name: string;
    currency: string;
    operators: string[];
  }
> = {
  CD: {
    name: "République démocratique du Congo",
    currency: "CDF",
    operators: [
      "Airtel Money",
      "Orange Money",
      "M-Pesa",
      "Africell Money",
    ],
  },
  CM: {
    name: "Cameroun",
    currency: "XAF",
    operators: ["MTN MoMo", "Orange Money"],
  },
  CG: {
    name: "Congo-Brazzaville",
    currency: "XAF",
    operators: ["MTN MoMo", "Airtel Money"],
  },
  SN: {
    name: "Sénégal",
    currency: "XOF",
    operators: ["Orange Money", "Wave"],
  },
  CI: {
    name: "Côte d'Ivoire",
    currency: "XOF",
    operators: [
      "Orange Money",
      "MTN MoMo",
      "Moov Money",
      "Wave",
    ],
  },
  BF: {
    name: "Burkina Faso",
    currency: "XOF",
    operators: ["Orange Money", "Moov Money"],
  },
  BJ: {
    name: "Bénin",
    currency: "XOF",
    operators: ["MTN MoMo", "Moov Money"],
  },
  TG: {
    name: "Togo",
    currency: "XOF",
    operators: ["Moov Money"],
  },
  ML: {
    name: "Mali",
    currency: "XOF",
    operators: ["Orange Money", "Moov Money"],
  },
  RW: {
    name: "Rwanda",
    currency: "RWF",
    operators: ["MTN MoMo", "Airtel Money"],
  },
  KE: {
    name: "Kenya",
    currency: "KES",
    operators: ["M-Pesa", "Airtel Money"],
  },
  GH: {
    name: "Ghana",
    currency: "GHS",
    operators: ["MTN MoMo", "Vodafone Cash"],
  },
  NG: {
    name: "Nigeria",
    currency: "NGN",
    operators: ["Virement bancaire"],
  },
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function authenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET() {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json(
      { message: "Connecte-toi." },
      { status: 401 }
    );
  }

  const admin = adminClient();

  if (!admin) {
    return NextResponse.json(
      { message: "Service indisponible." },
      { status: 503 }
    );
  }

  const { data, error } = await admin
    .from("merchant_withdrawal_methods")
    .select(
      "id,country_code,operator,mobile,beneficiary_name,is_default,created_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        message:
          "Impossible de charger les méthodes. Vérifie la migration SQL.",
      },
      { status: 503 }
    );
  }

  const methods = (data ?? []).map((method) => ({
    ...method,
    country_name:
      COUNTRIES[method.country_code]?.name ??
      method.country_code,
    currency_code:
      COUNTRIES[method.country_code]?.currency ?? "",
  }));

  return NextResponse.json(
    { methods },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json(
      { message: "Connecte-toi." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { message: "Données invalides." },
      { status: 400 }
    );
  }

  const country = body.country_code ?? "";
  const config = COUNTRIES[country];

  const operator = body.operator?.trim() ?? "";

  const mobile =
    body.mobile?.replace(/[^0-9+]/g, "") ?? "";

  const beneficiary =
    body.beneficiary_name?.trim() ?? "";

  if (
    !config ||
    !config.operators.includes(operator) ||
    mobile.replace(/\D/g, "").length < 7 ||
    mobile.length > 24 ||
    beneficiary.length < 2 ||
    beneficiary.length > 100
  ) {
    return NextResponse.json(
      {
        message:
          "Vérifie le pays, le réseau, le numéro et le nom du bénéficiaire.",
      },
      { status: 400 }
    );
  }

  const admin = adminClient();

  if (!admin) {
    return NextResponse.json(
      { message: "Service indisponible." },
      { status: 503 }
    );
  }

  if (body.is_default) {
    await admin
      .from("merchant_withdrawal_methods")
      .update({ is_default: false })
      .eq("owner_id", user.id);
  }

  const { data, error } = await admin
    .from("merchant_withdrawal_methods")
    .insert({
      id: randomUUID(),
      owner_id: user.id,
      country_code: country,
      operator,
      mobile,
      beneficiary_name: beneficiary,
      is_default: Boolean(body.is_default),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        message:
          "Impossible d'enregistrer la méthode. Vérifie la migration SQL.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      saved: true,
      id: data.id,
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json(
      { message: "Connecte-toi." },
      { status: 401 }
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { message: "Identifiant manquant." },
      { status: 400 }
    );
  }

  const admin = adminClient();

  if (!admin) {
    return NextResponse.json(
      { message: "Service indisponible." },
      { status: 503 }
    );
  }

  const { error } = await admin
    .from("merchant_withdrawal_methods")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json(
      { message: "Suppression impossible." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    removed: true,
  });
}
