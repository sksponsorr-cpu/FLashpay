// FLASH PAY — SASPAY — résolution du code réseau à partir de la liste officielle.
// Structure SasPay : un réseau est rattaché à un pays par son identifiant (UUID).
// Le pays (iso_code, ex. "CD") est donc retrouvé via GET /countries/.
// Les listes sont paginées (champ "results", puis "next").
const BASE_URL = "https://api.saspay.me/api/v1";
const CACHE_MS = 60 * 60 * 1000;

type Row = Record<string, unknown>;
let cache: { at: number; countries: Map<string, string>; networks: Row[] } | null = null;

async function fetchAll(path: string, apiKey: string): Promise<Row[]> {
  const rows: Row[] = [];
  let url: string | null = `${BASE_URL}${path}`;
  let guard = 0;

  while (url && guard < 20) {
    guard += 1;
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !json) {
      console.error("[saspay] liste", path, res.status);
      break;
    }
    const page = Array.isArray(json["results"])
      ? (json["results"] as Row[])
      : Array.isArray(json["data"])
        ? (json["data"] as Row[])
        : Array.isArray(json)
          ? (json as unknown as Row[])
          : [];
    rows.push(...page);
    url = typeof json["next"] === "string" ? (json["next"] as string) : null;
  }
  return rows;
}

async function load(apiKey: string) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;

  const countryRows = await fetchAll("/countries/", apiKey);
  const countries = new Map<string, string>();
  for (const c of countryRows) {
    if (typeof c["id"] === "string" && typeof c["iso_code"] === "string") {
      countries.set(c["id"] as string, (c["iso_code"] as string).toUpperCase());
    }
  }

  const networks = await fetchAll("/networks/", apiKey);
  cache = { at: Date.now(), countries, networks };
  return cache;
}

// Préfixe réseau attendu dans le code SasPay (ex. "orange" pour "orange_cd").
const PREFIX: { match: string[]; prefix: string }[] = [
  { match: ["airtel"], prefix: "airtel" },
  { match: ["mpesa", "m-pesa", "vodacom"], prefix: "mpesa" },
  { match: ["orange"], prefix: "orange" },
  { match: ["mtn"], prefix: "mtn" },
  { match: ["moov"], prefix: "moov" },
  { match: ["wave"], prefix: "wave" },
  { match: ["africell"], prefix: "africell" },
  { match: ["vodafone"], prefix: "vodafone" },
  { match: ["free"], prefix: "free" },
];

/**
 * Code réseau SasPay exact (ex. "orange_cd") pour un pays ISO et un opérateur.
 * Renvoie null si le réseau n'est pas présent et actif sur le compte.
 */
export async function resolveSaspayNetwork(countryIso: string, operatorLabel: string, apiKey: string): Promise<string | null> {
  const { countries, networks } = await load(apiKey);
  const iso = countryIso.toUpperCase();
  const label = operatorLabel.toLowerCase();
  const prefix = PREFIX.find((p) => p.match.some((m) => label.includes(m)))?.prefix;
  if (!prefix) return null;

  const expected = `${prefix}_${iso.toLowerCase()}`;

  for (const n of networks) {
    const code = typeof n["code"] === "string" ? (n["code"] as string) : null;
    if (!code || n["is_active"] === false) continue;
    const countryId = typeof n["country"] === "string" ? (n["country"] as string) : "";
    const countryCode = countries.get(countryId) ?? "";
    if (countryCode === iso && code.toLowerCase() === expected) return code;
  }

  // Repli : même pays, nom du réseau qui contient l'opérateur
  for (const n of networks) {
    const code = typeof n["code"] === "string" ? (n["code"] as string) : null;
    if (!code || n["is_active"] === false) continue;
    const countryCode = countries.get(typeof n["country"] === "string" ? (n["country"] as string) : "") ?? "";
    const name = String(n["name"] ?? "").toLowerCase();
    if (countryCode === iso && name.includes(prefix)) return code;
  }

  return null;
}
