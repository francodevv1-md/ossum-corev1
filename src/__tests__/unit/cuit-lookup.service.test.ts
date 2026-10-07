import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import {
  __inFlightClearForTest,
  __setTestFetchOverride,
  __tusFacturasLookupCuit,
} from "@/lib/services/cuit-lookup.service.internal";
import {
  lookupCuit,
  mergeVatConditionText,
} from "@/lib/services/cuit-lookup.service";

const ORIGINAL_ENV = { ...process.env };

// Module-11 valid fixtures covering each deterministic stub bucket.
const CUITS = {
  happy: "30712293840", // canonical stub happy (DISTRIBUIDORA ANTIGRAVITY)
  monotributo: "20000000000", // bucket 0
  responsable: "20000000370", // bucket 1
  exento: "20000000254", // bucket 2
  notFound: "20000000291", // bucket 3
  conflict: "20000000229", // bucket 4
  noIva: "20000000140", // bucket 5
  apoc: "20000000114", // bucket 6
  fullInfo: "20000000187", // bucket 7
  generic: "20000000035", // bucket 8
  badCheck: "30712293849", // invalid modulo-11
} as const;

describe("mergeVatConditionText", () => {
  it.each([
    ["RESPONSABLE INSCRIPTO", "Responsable Inscripto"],
    ["responsable inscripto", "Responsable Inscripto"],
    ["MONOTRIBUTO", "Monotributo"],
    ["monotributo", "Monotributo"],
    ["EXENTO", "Exento"],
    ["CONSUMIDOR FINAL", "Consumidor Final"],
    ["UNKNOWN", "Consumidor Final"],
    ["", "Consumidor Final"],
    [null, "Consumidor Final"],
  ])("maps %s -> %s", (raw, expected) => {
    expect(mergeVatConditionText(raw)).toBe(expected);
  });
});

describe("lookupCuit (default DEV stub driver)", () => {
  beforeEach(() => {
    __inFlightClearForTest();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "development" };
    delete process.env.OSSUM_CUIT_LOOKUP_DRIVER;
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws invalid_cuit_format (400) for too short CUIT", async () => {
    await expect(lookupCuit("1234567890")).rejects.toMatchObject({
      status: 400,
      code: "invalid_cuit_format",
    });
  });

  it("throws invalid_cuit_format (400) for CUIT failing check digit", async () => {
    await expect(lookupCuit(CUITS.badCheck)).rejects.toMatchObject({
      status: 400,
      code: "invalid_cuit_format",
    });
  });

  it("returns mapped subset for the canonical 30712293840", async () => {
    const result = await lookupCuit(CUITS.happy);
    expect(result).toMatchObject({
      source: "stub",
      found: true,
      legalName: "DISTRIBUIDORA ANTIGRAVITY SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: expect.objectContaining({ country: "AR" }),
      estado: "ACTIVO",
    });
  });

  it("returns the monotributo variant for bucket 0", async () => {
    const result = await lookupCuit(CUITS.monotributo);
    expect(result).toMatchObject({ source: "stub", found: true, vatCondition: "Monotributo" });
  });

  it("returns the exento variant for bucket 2", async () => {
    const result = await lookupCuit(CUITS.exento);
    expect(result).toMatchObject({ source: "stub", found: true, vatCondition: "Exento" });
  });

  it("returns found:false for bucket 3 (not found)", async () => {
    const result = await lookupCuit(CUITS.notFound);
    expect(result).toMatchObject({ source: "stub", found: false });
  });

  it("returns apocExiste=true for bucket 6 (apoc variant)", async () => {
    const result = await lookupCuit(CUITS.apoc);
    expect(result).toMatchObject({ source: "stub", found: true });
    expect(result.extra?.apocExiste).toBe(true);
    expect(result.extra?.apocInfo).toEqual(expect.stringContaining("apócrifo"));
  });

  it("returns full actividad+constanciaFullDatos for bucket 7 (informational)", async () => {
    const result = await lookupCuit(CUITS.fullInfo);
    expect(result.extra?.actividad).toBeInstanceOf(Array);
    expect(result.extra?.constanciaFullDatos).toEqual(expect.objectContaining({ domicilioFiscal: expect.any(Object) }));
  });

  it("throws cuit_provider_conflict (422) for bucket 4", async () => {
    await expect(lookupCuit(CUITS.conflict)).rejects.toMatchObject({
      status: 422,
      code: "cuit_provider_conflict",
    });
  });

  it("throws cuit_no_iva_condition (422) for bucket 5", async () => {
    await expect(lookupCuit(CUITS.noIva)).rejects.toMatchObject({
      status: 422,
      code: "cuit_no_iva_condition",
    });
  });

  it("in-flight de-dup: two simultaneous calls share one fetchFn call", async () => {
    let stubCalls = 0;
    process.env.OSSUM_CUIT_LOOKUP_DRIVER = "tusfacturas";
    process.env.TUSFACTURAS_DEV_API_KEY = "k";
    process.env.TUSFACTURAS_DEV_USER_TOKEN = "u";
    process.env.TUSFACTURAS_DEV_API_TOKEN = "t";
    process.env.TUSFACTURAS_DEV_API_URL = "https://example.test/v2";
    __inFlightClearForTest();
    const fetchFn = vi.fn(async () => {
      stubCalls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          razon_social: "SHARED SA",
          condicion_impositiva: "RESPONSABLE INSCRIPTO",
          direccion: "Av 1",
          localidad: "CABA",
          provincia: "BUENOS AIRES",
          codigopostal: "1000",
          estado: "ACTIVO",
          apoc_existe: "NO",
        }),
        text: async () => "",
      };
    });
    __setTestFetchOverride(fetchFn);
    try {
      const p1 = lookupCuit(CUITS.happy, { driver: "tusfacturas" });
      const p2 = lookupCuit(CUITS.happy, { driver: "tusfacturas" });
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(stubCalls).toBe(1);
      expect(r1.found).toBe(true);
      expect(r2.found).toBe(true);
    } finally {
      __setTestFetchOverride(null);
    }
  });

  it("lookupCuit with explicit driver='stub' returns the stub mapped subset", async () => {
    const result = await lookupCuit(CUITS.happy, { driver: "stub" });
    expect(result.source).toBe("stub");
    expect(result.found).toBe(true);
  });
});

describe("TusFacturas driver (mocked fetchFn)", () => {
  beforeEach(() => {
    __inFlightClearForTest();
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "development",
      OSSUM_CUIT_LOOKUP_DRIVER: "tusfacturas",
      TUSFACTURAS_DEV_API_KEY: "k",
      TUSFACTURAS_DEV_USER_TOKEN: "u",
      TUSFACTURAS_DEV_API_TOKEN: "t",
      TUSFACTURAS_DEV_API_URL: "https://example.test/v2",
    };
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("happy path: maps razon_social + condicion_impositiva to canonical subset", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({
        razon_social: "ACME SA",
        condicion_impositiva: "RESPONSABLE INSCRIPTO",
        direccion: "Av Corrientes 1234",
        localidad: "CABA",
        provincia: "BUENOS AIRES",
        codigopostal: "1043",
        estado: "ACTIVO",
        apoc_existe: "NO",
        actividad: [{ descripcion: "Servicios" }],
      }),
      text: async () => "",
    }));
    const result = await __tusFacturasLookupCuit(CUITS.happy, { fetchFn });
    expect(result).toMatchObject({
      source: "tusfacturas",
      found: true,
      legalName: "ACME SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: { street: "Av Corrientes 1234", city: "CABA", state: "BUENOS AIRES", zipCode: "1043", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false, actividad: [{ descripcion: "Servicios" }] },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("maps MONOTRIBUTO and EXENTO condicion_impositiva to canonical vatCondition", async () => {
    const monoFetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ razon_social: "M SA", condicion_impositiva: "MONOTRIBUTO" }), text: async () => "" }));
    const exFetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ razon_social: "E SA", condicion_impositiva: "EXENTO" }), text: async () => "" }));
    const mono = await __tusFacturasLookupCuit(CUITS.happy, { fetchFn: monoFetch });
    const ex = await __tusFacturasLookupCuit(CUITS.happy, { fetchFn: exFetch });
    expect(mono.vatCondition).toBe("Monotributo");
    expect(ex.vatCondition).toBe("Exento");
  });

  it("truncates razon_social longer than 240 chars", async () => {
    const longName = "X".repeat(300);
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ razon_social: longName, condicion_impositiva: "RESPONSABLE INSCRIPTO" }), text: async () => "" }));
    const result = await __tusFacturasLookupCuit(CUITS.happy, { fetchFn });
    expect(result.legalName?.length).toBe(240);
  });

  it("error:'S' with IVA error message -> cuit_no_iva_condition (422)", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ error: "S", errores: ["Sin impuestos registrados"] }), text: async () => "" }));
    await expect(__tusFacturasLookupCuit(CUITS.happy, { fetchFn })).rejects.toMatchObject({
      status: 422, code: "cuit_no_iva_condition",
    });
  });

  it("error:'S' with non-IVA message -> cuit_provider_conflict (422)", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ error: "S", errores: ["RG 4280 pendiente"] }), text: async () => "" }));
    await expect(__tusFacturasLookupCuit(CUITS.happy, { fetchFn })).rejects.toMatchObject({
      status: 422, code: "cuit_provider_conflict",
    });
  });

  it("missing config -> cuit_dev_config_missing (422)", async () => {
    // Strip env config to force the missing-config branch.
    const prev = { ...process.env };
    delete process.env.TUSFACTURAS_DEV_API_KEY;
    delete process.env.TUSFACTURAS_DEV_USER_TOKEN;
    delete process.env.TUSFACTURAS_DEV_API_TOKEN;
    delete process.env.TUSFACTURAS_API_KEY;
    delete process.env.TUSFACTURAS_USER_TOKEN;
    delete process.env.TUSFACTURAS_API_TOKEN;
    try {
      await expect(__tusFacturasLookupCuit(CUITS.happy, {})).rejects.toBeInstanceOf(ApiError);
      await expect(__tusFacturasLookupCuit(CUITS.happy, {})).rejects.toMatchObject({
        status: 422, code: "cuit_dev_config_missing",
      });
    } finally {
      process.env = prev;
    }
  });

  it("network failure -> cuit_provider_timeout (502)", async () => {
    const fetchFn = vi.fn(async () => { throw new Error("ECONNRESET"); });
    await expect(__tusFacturasLookupCuit(CUITS.happy, { fetchFn })).rejects.toMatchObject({
      status: 502, code: "cuit_provider_timeout",
    });
  });

  it("returns the extra payload unchanged (route must never persist it)", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({
        razon_social: "EXTRA SA",
        condicion_impositiva: "RESPONSABLE INSCRIPTO",
        apoc_existe: "SI",
        apoc_info: "Apocrifa",
        actividad: [{ d: "x" }],
        constancia_full_datos: { domicilio: "X 100" },
      }),
      text: async () => "",
    }));
    const result = await __tusFacturasLookupCuit(CUITS.happy, { fetchFn });
    expect(result.extra?.apocExiste).toBe(true);
    expect(result.extra?.apocInfo).toBe("Apocrifa");
    expect(result.extra?.actividad).toEqual([{ d: "x" }]);
    expect(result.extra?.constanciaFullDatos).toEqual({ domicilio: "X 100" });
  });
});