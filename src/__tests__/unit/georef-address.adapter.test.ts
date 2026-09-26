import { describe, expect, it, vi } from "vitest";

import { GeorefLookupUnavailableError, lookupGeorefAddress } from "@/lib/georef/georef-address.adapter";

describe("Georef address adapter", () => {
  it("encodes the request, limits results, and normalizes finite WGS84 candidates", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ direcciones: [
      { id: "a-1", nomenclatura: "Av. Siempre Viva 742", ubicacion: { lat: "-34.6", lon: "-58.4" }, localidad_censal: { nombre: "CABA censal" }, localidad: { nombre: "CABA" }, provincia: { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" } },
      { id: "bad", ubicacion: { lat: "NaN", lon: "-58.4" } },
    ] }), { status: 200 }));

    await expect(lookupGeorefAddress({ street: "Av. Siempre Viva", number: "742", city: "CABA", state: "Buenos Aires" }, fetchImpl)).resolves.toMatchObject([{
      georefId: "a-1", city: "CABA censal", latitude: -34.6, longitude: -58.4, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina",
    }]);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("direccion=Av.+Siempre+Viva+742"), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(fetchImpl.mock.calls[0][0]).toContain("provincia=Buenos+Aires");
    expect(fetchImpl.mock.calls[0][0]).toContain("localidad=CABA");
    expect(fetchImpl.mock.calls[0][0]).toContain("max=10");
  });

  it("falls back to localidad when localidad_censal is absent", async () => {
    await expect(lookupGeorefAddress({ street: "A" }, vi.fn().mockResolvedValue(new Response(JSON.stringify({ direcciones: [
      { ubicacion: { lat: -34.6, lon: -58.4 }, localidad: { nombre: "CABA" } },
    ] }), { status: 200 })))).resolves.toMatchObject([{ city: "CABA" }]);
  });

  it("maps upstream, network, invalid JSON, malformed payload, and timeout failures to the stable unavailable error", async () => {
    await expect(lookupGeorefAddress({ street: "A" }, vi.fn().mockRejectedValue(new Error("offline")))).rejects.toBeInstanceOf(GeorefLookupUnavailableError);
    await expect(lookupGeorefAddress({ street: "A" }, vi.fn().mockResolvedValue(new Response("{}", { status: 502 })))).rejects.toMatchObject({ code: "georef_lookup_unavailable" });
    await expect(lookupGeorefAddress({ street: "A" }, vi.fn().mockResolvedValue(new Response("{", { status: 200 })))).rejects.toMatchObject({ code: "georef_lookup_unavailable" });
    await expect(lookupGeorefAddress({ street: "A" }, vi.fn().mockResolvedValue(new Response(JSON.stringify({ direcciones: {} }), { status: 200 })))).rejects.toMatchObject({ code: "georef_lookup_unavailable" });
    await expect(lookupGeorefAddress({ street: "A" }, vi.fn().mockResolvedValue(new Response("null", { status: 200 })))).rejects.toMatchObject({ code: "georef_lookup_unavailable" });

    vi.useFakeTimers();
    const timeout = lookupGeorefAddress({ street: "A" }, vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))))));
    const timeoutExpectation = expect(timeout).rejects.toMatchObject({ code: "georef_lookup_unavailable" });
    await vi.advanceTimersByTimeAsync(5_000);
    await timeoutExpectation;
    vi.useRealTimers();
  });

  it("returns an empty candidate list for a valid empty provider response", async () => {
    await expect(lookupGeorefAddress({ street: "A" }, vi.fn().mockResolvedValue(new Response(JSON.stringify({ direcciones: [] }), { status: 200 })))).resolves.toEqual([]);
  });
});
