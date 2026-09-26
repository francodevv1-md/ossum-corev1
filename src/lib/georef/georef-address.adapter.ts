export type GeoCandidate = {
  georefId: string | null;
  entityType: "ADDRESS" | "LOCALITY";
  displayName: string;
  city: string | null;
  provinceGeorefId: string | null;
  provinceName: string | null;
  latitude: number;
  longitude: number;
  coordinateType: "ADDRESS" | "CENTROID";
  crs: "EPSG:4326";
  source: "Georef Argentina";
  sourceVersion: "v2.0";
  retrievedAt: string;
};

export type GeorefAddressLookup = {
  street: string;
  number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: "AR";
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const LOOKUP_TIMEOUT_MS = 5_000;

export class GeorefLookupUnavailableError extends Error {
  readonly code = "georef_lookup_unavailable";

  constructor() {
    super("Georef address lookup is unavailable");
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function coordinate(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export async function lookupGeorefAddress(
  input: GeorefAddressLookup,
  fetchImpl: FetchLike = fetch
): Promise<GeoCandidate[]> {
  const address = [input.street, input.number].filter((value): value is string => Boolean(value?.trim())).join(" ");
  const query = new URLSearchParams({ direccion: address, max: "10" });
  if (input.state?.trim()) query.set("provincia", input.state.trim());
  if (input.city?.trim()) query.set("localidad", input.city.trim());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(`https://apis.datos.gob.ar/georef/api/v2.0/direcciones?${query}`, { signal: controller.signal });
  } catch {
    throw new GeorefLookupUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new GeorefLookupUnavailableError();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GeorefLookupUnavailableError();
  }
  if (!body || typeof body !== "object" || !Array.isArray((body as { direcciones?: unknown }).direcciones)) throw new GeorefLookupUnavailableError();
  const { direcciones } = body as { direcciones: unknown[] };

  const retrievedAt = new Date().toISOString();
  return direcciones.flatMap((row): GeoCandidate[] => {
    if (!row || typeof row !== "object") return [];
    const candidate = row as Record<string, unknown>;
    const location = candidate.ubicacion as Record<string, unknown> | undefined;
    const latitude = coordinate(location?.lat);
    const longitude = coordinate(location?.lon);
    if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
    const censusLocality = candidate.localidad_censal as Record<string, unknown> | undefined;
    const locality = candidate.localidad as Record<string, unknown> | undefined;
    const province = candidate.provincia as Record<string, unknown> | undefined;
    const displayName = text(candidate.nomenclatura) ?? text(candidate.nombre) ?? address;
    return [{
      georefId: text(candidate.id), entityType: "ADDRESS", displayName,
      city: text(censusLocality?.nombre) ?? text(locality?.nombre), provinceGeorefId: text(province?.id), provinceName: text(province?.nombre),
      latitude, longitude, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", sourceVersion: "v2.0", retrievedAt,
    }];
  });
}
