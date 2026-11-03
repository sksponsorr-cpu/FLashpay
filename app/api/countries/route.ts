import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("supported_countries")
      .select("code, name, currency_code")
      .order("name");

    if (error) {
      return NextResponse.json({ message: "Le catalogue Supabase est momentanément indisponible." }, { status: 503 });
    }

    return NextResponse.json({ countries: data.map(({ code, name, currency_code }) => ({ code, name, currency: currency_code })) });
  } catch {
    return NextResponse.json({ message: "Supabase n’est pas encore configuré." }, { status: 503 });
  }
}
