import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.SWYCHR_WEBHOOK_SECRET;
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-webhook-signature-v2") ?? "";

  if (!secret) {
    return NextResponse.json({ message: "Le secret webhook Swychr n’est pas configuré." }, { status: 503 });
  }

  const timestampSeconds = Number(timestamp);
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (!Number.isFinite(timestampSeconds) || ageSeconds > 300 || !/^[a-f0-9]{64}$/i.test(signature)) {
    return NextResponse.json({ message: "Signature webhook invalide ou expirée." }, { status: 401 });
  }

  const rawBody = await request.text();
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  const received = Buffer.from(signature, "hex");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ message: "Signature webhook invalide." }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as { event?: string; data?: { data?: { attributes?: { transaction_id?: string; status?: string | number } } } };
    if (event.event !== "payment_link_status_updated" || !event.data?.data?.attributes?.transaction_id) {
      return NextResponse.json({ message: "Événement Swychr non reconnu." }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Webhook authentifié, mais la persistance des transactions n’est pas encore configurée." },
      { status: 503 },
    );
  } catch {
    return NextResponse.json({ message: "Corps webhook JSON invalide." }, { status: 400 });
  }
}