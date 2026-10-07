// OSSUM COR — CUIT lookup service (DEV stub driver + TusFacturas seam).
//
// MVP scope: map the upstream response to a strict subset that fits the
// existing Contactos fields (documentType, documentNumber, legalName,
// vatCondition, mainAddress). The `extra` payload carries
// apoc / actividad / constancia data purely as information; it MUST NOT
// be persisted by callers. Cache TTL, retry, throttling and other
// providers are explicitly out of scope.
//
// Driver selection:
//   - explicit `opts.driver === 'stub' | 'tusfacturas'` wins;
//   - else `process.env.OSSUM_CUIT_LOOKUP_DRIVER` if set;
//   - else `'stub'` when `NODE_ENV !== 'production'`,
//         `'tusfacturas'` in production (which this DEV workspace never
//         exercises against ARCA real).
//
// In-flight de-duplication per process: a module-level Map keyed by the
// normalized 11-digit CUIT ensures concurrent callers share a single
// upstream round-trip; failures and successes both clear the slot.
//
// Operational instrumentation (ADR-027G + ADR-027H, INSTRUMENT package
// 2026-10-07): governance (per-actor rate limit, per-company rate
// limit, per-company daily budget), redacted logging and audit
// emission. All three checks run BEFORE the driver and BEFORE the
// in-flight Map; a rejected request never enters the in-flight map and
// never emits an audit. The redacted log + audit are emitted exactly
// once per top-level lookup, by the leader of the in-flight coalesce
// (not by subscribers).

import { randomUUID } from "node:crypto";

import { ApiError } from "../api/errors";
import { getTusFacturasDevConfig } from "./fiscal-tusfacturas.service";
import {
  contactLookupResultSchema,
  type ContactLookupResult,
} from "../validators/cuit-lookup";
import { normalizeCuit, validateCuitFormat } from "../utils/cuit-validation";
import { logLookupEvent, __maskCuit } from "../log/redacted";
import {
  checkAndRecordGovernance,
  emitCuitLookupAudit,
  ensureGovernance,
} from "./cuit-lookup.governance";
import {
  getInFlightMap,
  getTestFetchOverride,
  resolvePrismaForAudit,
  setTusFacturasDriver,
} from "./cuit-lookup.service.internal";

export type CuitLookupDriver = "stub" | "tusfacturas";

export interface CuitLookupOptions {
  driver?: CuitLookupDriver;
  /** Optional auth context: who is making this lookup. */
  actorUserId?: string;
  /** Optional auth context: which company is the lookup scoped to. */
  companyId?: string;
  /** Optional wrapper-generated request id; otherwise a UUID is generated. */
  requestId?: string;
  /**
   * Optional explicit prisma client for audit emission. When omitted
   * the service falls back to the route-registered or test-injected
   * prisma provider (lazy). When no provider resolves, the audit
   * emission becomes a no-op (the test sink still receives the call).
   */
  prisma?: import("../audit").AuditPrismaClient;
}

export type { ContactLookupResult as CuitLookupResult };

export const mergeVatConditionText = (raw: string | null | undefined): ContactLookupResult["vatCondition"] => {
  if (!raw) return "Consumidor Final";
  const normalized = raw.toUpperCase().trim();
  if (normalized === "RESPONSABLE INSCRIPTO") return "Responsable Inscripto";
  if (normalized === "MONOTRIBUTO") return "Monotributo";
  if (normalized === "EXENTO") return "Exento";
  if (normalized === "CONSUMIDOR FINAL") return "Consumidor Final";
  return "Consumidor Final";
};

function resolveDriver(opts?: CuitLookupOptions): CuitLookupDriver {
  if (opts?.driver === "stub" || opts?.driver === "tusfacturas") return opts.driver;
  const env = process.env?.OSSUM_CUIT_LOOKUP_DRIVER;
  if (env === "stub" || env === "tusfacturas") return env;
  return process.env?.NODE_ENV === "production" ? "tusfacturas" : "stub";
}

const inFlight = getInFlightMap();

export async function lookupCuit(
  rawCuit: string,
  opts?: CuitLookupOptions,
): Promise<ContactLookupResult> {
  const cuit = normalizeCuit(rawCuit);
  if (!validateCuitFormat(cuit)) {
    throw new ApiError(400, "invalid_cuit_format", "El CUIT no cumple el algoritmo módulo 11.");
  }

  // 1. In-flight de-dup FIRST: a subscriber returns the leader's
  //    already-resolved promise without re-emitting log/audit or
  //    incrementing governance counters. The leader owns both.
  const existing = inFlight.get(cuit);
  if (existing) {
    return existing as Promise<ContactLookupResult>;
  }

  // 2. Governance check only for new leaders. A rejected request
  //    does not enter the in-flight map and does not consume budget.
  ensureGovernance(
    checkAndRecordGovernance(opts?.actorUserId ?? "unknown", opts?.companyId ?? "unknown"),
    { actorUserId: opts?.actorUserId, companyId: opts?.companyId },
  );

  // 3. Leader: resolve driver, run it, parse, instrument, return.
  const driver = resolveDriver(opts);
  const requestId = opts?.requestId ?? randomUUID();
  const maskedCuit = __maskCuit(cuit);
  const actorUserId = opts?.actorUserId ?? "unknown";
  const companyId = opts?.companyId ?? "unknown";
  const startedAt = Date.now();
  const auditPromises: Array<Promise<unknown>> = [];

  const leaderPromise = (async (): Promise<ContactLookupResult> => {
    let responseCode = "N/A";
    let errorCode: string | undefined;
    let vatCondition: string | undefined;
    let legalNamePresent = false;
    let addressPresent = false;

    try {
      const raw = driver === "tusfacturas"
        ? await runTusFacturasDriver(cuit)
        : await runStubDriver(cuit);
      const result = contactLookupResultSchema.parse(raw);
      responseCode = result.found ? (result.estado ?? "OK") : "NOT_FOUND";
      vatCondition = result.vatCondition;
      legalNamePresent = typeof result.legalName === "string" && result.legalName.length > 0;
      addressPresent = !!result.mainAddress && (
        !!result.mainAddress.street ||
        !!result.mainAddress.city ||
        !!result.mainAddress.state ||
        !!result.mainAddress.zipCode
      );
      return result;
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      errorCode = apiErr?.code ?? "cuit_internal_error";
      responseCode = "ERROR";
      throw err;
    } finally {
      const durationMs = Date.now() - startedAt;
      // Always log exactly once per leader (success OR error).
      logLookupEvent({
        provider: driver,
        responseCode,
        errorCode,
        requestId,
        actorUserId,
        companyId,
        durationMs,
        maskedCuit,
      });
      // Audit emission: queued in the leader's finally so it runs once.
      // The .catch(() => undefined) guards against a throwing default
      // sink; tests inject a capture sink so the default branch is not
      // exercised in unit tests.
      auditPromises.push(
        emitCuitLookupAudit({
          prisma: opts?.prisma ?? resolvePrismaForAudit() ?? undefined,
          companyId,
          actorUserId,
          rawCuit: cuit,
          provider: driver,
          responseCode,
          errorCode,
          durationMs,
          requestId,
          vatCondition,
          legalNamePresent,
          addressPresent,
        }).catch(() => undefined),
      );
    }
  })();

  inFlight.set(cuit, leaderPromise);
  try {
    const result = await leaderPromise;
    // Drain any audit promises before returning. allSettled so one
    // rejection cannot break the lookup.
    await Promise.allSettled(auditPromises);
    return result;
  } finally {
    inFlight.delete(cuit);
  }
}

interface FetchLike {
  (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
}

async function runStubDriver(
  rawCuit: string,
): Promise<ContactLookupResult> {
  const cuit = normalizeCuit(rawCuit);
  const bucket = Number(cuit.slice(-5)) % 9;

  // Deterministic canonical 30712293840 always returns the same mapped subset.
  if (cuit === "30712293840") {
    return {
      source: "stub",
      found: true,
      legalName: "DISTRIBUIDORA ANTIGRAVITY SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: { street: "Av. Santa Fe 1234", city: "CABA", state: "Buenos Aires", zipCode: "1059", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false },
    };
  }

  switch (bucket) {
    case 0:
      return {
        source: "stub",
        found: true,
        legalName: "MONOTRIBUTISTA PEREZ JUAN",
        vatCondition: "Monotributo",
        mainAddress: { street: "Belgrano 100", city: "Rosario", state: "Santa Fe", zipCode: "2000", country: "AR" },
        estado: "ACTIVO",
        extra: { apocExiste: false },
      };
    case 1:
      return {
        source: "stub",
        found: true,
        legalName: "HOSPITAL ITALIANO SRL",
        vatCondition: "Responsable Inscripto",
        mainAddress: { street: "Av. Italia 1500", city: "La Plata", state: "Buenos Aires", zipCode: "1900", country: "AR" },
        estado: "ACTIVO",
        extra: { apocExiste: false, actividad: [{ descripcion: "Servicios hospitalarios", id: "861010" }] },
      };
    case 2:
      return {
        source: "stub",
        found: true,
        legalName: "ASOCIACION EXENTO SA",
        vatCondition: "Exento",
        mainAddress: { street: "Mitre 200", city: "Mar del Plata", state: "Buenos Aires", zipCode: "7600", country: "AR" },
        estado: "ACTIVO",
        extra: { apocExiste: false },
      };
    case 3:
      return {
        source: "stub",
        found: false,
        estado: "NO_REGISTRADO",
      };
    case 4:
      throw new ApiError(422, "cuit_provider_conflict", "ARCA bloquea la constancia para este CUIT.");
    case 5:
      throw new ApiError(422, "cuit_no_iva_condition", "El CUIT no registra impuestos ante ARCA.");
    case 6:
      return {
        source: "stub",
        found: true,
        legalName: "APOCRIFA SOSPECHOSA SA",
        vatCondition: "Responsable Inscripto",
        mainAddress: { street: "Av. Falsa 123", city: "CABA", state: "Buenos Aires", zipCode: "1000", country: "AR" },
        estado: "ACTIVO",
        extra: { apocExiste: true, apocInfo: "CUIT marcado como apócrifo en padrones ARCA." },
      };
    case 7:
      return {
        source: "stub",
        found: true,
        legalName: "CONSTANCIA LARGA SA",
        vatCondition: "Responsable Inscripto",
        mainAddress: { street: "Lavalle 500", city: "CABA", state: "Buenos Aires", zipCode: "1047", country: "AR" },
        estado: "ACTIVO",
        extra: {
          apocExiste: false,
          actividad: [
            { descripcion: "Venta de artículos de ferretería", id: "475230" },
            { descripcion: "Servicios de consultoría", id: "702099" },
          ],
          constanciaFullDatos: {
            domicilioFiscal: { direccion: "Lavalle 500", localidad: "CABA", provincia: "BUENOS AIRES", cp: "1047" },
            regimenes: ["IVA EXENTO", "GANANCIAS SOCIEDADES"],
            monotributo: false,
          },
        },
      };
    default:
      return {
        source: "stub",
        found: true,
        legalName: "GENERICA EMPRESA SRL",
        vatCondition: "Responsable Inscripto",
        mainAddress: { street: "San Martin 100", city: "Cordoba", state: "Cordoba", zipCode: "5000", country: "AR" },
        estado: "ACTIVO",
        extra: { apocExiste: false },
      };
  }
}

interface TusFacturasDeps {
  fetchFn?: FetchLike;
  configOverride?: ReturnType<typeof getTusFacturasDevConfig>;
}

async function runTusFacturasDriver(
  rawCuit: string,
  deps: TusFacturasDeps = {},
): Promise<ContactLookupResult> {
  const cuit = normalizeCuit(rawCuit);
  if (!validateCuitFormat(cuit)) {
    return { source: "tusfacturas", found: false };
  }
  const config = deps.configOverride ?? getTusFacturasDevConfig();
  if (!config) {
    throw new ApiError(422, "cuit_dev_config_missing", "TusFacturas DEV config no está configurada.");
  }

  const fetchImpl: FetchLike = deps.fetchFn ?? getTestFetchOverride() ?? (async (input, init) => {
    const response = await fetch(input, init);
    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json(),
      text: () => response.text(),
    };
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(`${config.apiUrl}/clientes/afip-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        apikey: config.apiKey,
        apitoken: config.apiToken,
        usertoken: config.userToken,
        cliente: { documento_tipo: "CUIT", documento_nro: cuit },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(502, "cuit_provider_timeout", `TusFacturas no respondió: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(502, "cuit_provider_timeout", "TusFacturas devolvió una respuesta no JSON.");
  }

  const record = (payload ?? {}) as Record<string, unknown>;
  const errorFlag = typeof record.error === "string" ? record.error : "N";
  const errorsArray = Array.isArray(record.errores) ? record.errores.map(String) : [];
  if (errorFlag === "S" || errorFlag.toUpperCase() === "S") {
    const code = classifyTusFacturasError(errorsArray);
    throw new ApiError(422, code, errorsArray[0] ?? "TusFacturas rechazó la consulta.");
  }

  const razonSocialRaw = typeof record.razon_social === "string" ? record.razon_social.trim() : "";
  const razonSocial = razonSocialRaw.slice(0, 240);
  const condicionImpositiva = typeof record.condicion_impositiva === "string"
    ? record.condicion_impositiva
    : "CONSUMIDOR FINAL";
  const vatCondition = mergeVatConditionText(condicionImpositiva);
  const direccion = typeof record.direccion === "string" ? record.direccion.trim().slice(0, 240) : undefined;
  const localidad = typeof record.localidad === "string" ? record.localidad.trim().slice(0, 120) : undefined;
  const provincia = typeof record.provincia === "string" ? record.provincia.trim().slice(0, 120) : undefined;
  const codigoPostal = typeof record.codigopostal === "string" || typeof record.codigo_postal === "string"
    ? String(record.codigopostal ?? record.codigo_postal ?? "").trim().slice(0, 30)
    : undefined;
  const estado = typeof record.estado === "string" ? record.estado.trim() : undefined;

  const apocExisteRaw = typeof record.apoc_existe === "string" ? record.apoc_existe.toUpperCase() : undefined;
  const apocExiste = apocExisteRaw === "SI" ? true : apocExisteRaw === "NO" ? false : undefined;
  const apocInfo = typeof record.apoc_info === "string" ? record.apoc_info : undefined;
  const actividad = Array.isArray(record.actividad) ? record.actividad : undefined;
  const constanciaFullDatos = record.constancia_full_datos ?? undefined;

  if (!razonSocial) {
    return { source: "tusfacturas", found: false, estado, extra: { apocExiste, apocInfo, actividad, constanciaFullDatos } };
  }

  const result: ContactLookupResult = {
    source: "tusfacturas",
    found: true,
    legalName: razonSocial,
    vatCondition,
    mainAddress: {
      street: direccion,
      city: localidad,
      state: provincia,
      zipCode: codigoPostal,
      country: "AR",
    },
    estado,
    extra: { apocExiste, apocInfo, actividad, constanciaFullDatos },
  };
  return result;
}

function classifyTusFacturasError(errors: string[]): string {
  const joined = errors.join(" ").toLowerCase();
  if (joined.includes("iva") || joined.includes("impuesto")) return "cuit_no_iva_condition";
  return "cuit_provider_conflict";
}

// Register the TusFacturas driver so the test seam
// `__tusFacturasLookupCuit` in `cuit-lookup.service.internal.ts` can
// invoke it without a circular import.
setTusFacturasDriver(runTusFacturasDriver);