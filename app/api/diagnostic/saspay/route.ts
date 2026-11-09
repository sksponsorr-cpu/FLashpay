import { NextResponse } from "next/server";

// Page de diagnostic temporaire : teste les adresses SasPay.
// Ouvrir : /api/diagnostic/saspay?key=VALEUR_DE_CRON_SECRET
// À supprimer une fois le problème résolu.
const BASE = "https://api.saspay.me/api/v1";

async function probe(method: "GET" | "POST", path: string, apiKey: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: method === "POST" ? "{}" : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    return {
      path,
      method,
      status: res.status,
      type: res.headers.get("content-type"),
      preview: text.slice(0, 200),
    };
  } catch (e) {
    return { path, method, error: e instanceof Error ? e.message : "erreur" };
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(request.url).searchParams.get("key");
  if (!secret || key !== secret) {
    return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
  }

  const apiKey = process.env.SASPAY_API_KEY ?? "";
  if (!apiKey) return NextResponse.json({ message: "SASPAY_API_KEY absente dans Vercel." });

  const results = [
    await probe("GET", "/countries/", apiKey),
    await probe("GET", "/networks/", apiKey),
    await probe("POST", "/payments/softpay/", apiKey),
    await probe("POST", "/payments/softpay/initialize/", apiKey),
  ];

  return NextResponse.json({
    lecture: "status 400 ou 422 en JSON = adresse correcte. status 404 avec du HTML = mauvaise adresse.",
    results,
  });
}
