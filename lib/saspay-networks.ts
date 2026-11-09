// FLASH PAY — SASPAY — résolution du code réseau à partir de la liste officielle (GET /networks/).
// Aucun code n'est deviné : on lit la liste fournie par SasPay, puis on garde le code exact.
const BASE_URL = "https://api.saspay.me/api/v1";
const CACHE_MS = 60 * 60 * 1000;

type NetworkItem = Record<string, unknown>;
let cache: { at: number; items: NetworkItem[] } | null = null;

async function loadNetworks(apiKey: string): Promise<NetworkItem[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;

  const res = await fetch(`${BASE_URL}/networks/`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) {
    console.error("[saspay] networks", res.status);
    return [];
  }

  const data = json["data"];
  const items = (Array.isArray(data) ? data : Array.isArray(json) ? json : []) as NetworkItem[];
  cache = { at: Date.now(), items };
  return items;
}

function countryOf(item: NetworkItem): string {
  const c = item["country"];
  if (typeof c === "string") return c.toUpperCase();
  if (c && typeof c === "object") {
    const o = c as Record<string, unknown>;
    return String(o["iso_code"] ?? o["code"] ?? "").toUpperCase();
  }
  return String(item["country_code"] ?? item["iso_code"] ?? "").toUpperCase();
}

function codeOf(item: NetworkItem): string | null {
  const v = item["code"] ?? item["slug"] ?? item["network_code"] ?? item["network"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Renvoie le code réseau SasPay (ex. tel que listé par GET /networks/) pour un pays et un opérateur.
 * null si aucun réseau ne correspond : dans ce cas, rien n'est envoyé à SasPay.
 */
export async function resolveSaspayNetwork(countryIso: string, operatorLabel: string, apiKey: string): Promise<string | null> {
  const items = await loadNetworks(apiKey);
  const wantCountry = countryIso.toUpperCase();
  const wantName = operatorLabel.toLowerCase().replace(/\s+/g, "");

  const match = items.find((item) => {
    if (countryOf(item) !== wantCountry) return false;
    const name = `${item["name"] ?? ""}${item["label"] ?? ""}${item["code"] ?? ""}`.toLowerCase().replace(/\s+/g, "");
    return wantName.split("money")[0] && name.includes(wantName.split("money")[0]);
  });

  return match ? codeOf(match) : null;
}
