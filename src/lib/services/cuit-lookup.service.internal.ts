// OSSUM COR — Internal seams for `cuit-lookup.service`.
//
// This module exists to keep the production service free of `__`-prefixed
// test exports while preserving the exact same seam surface for unit tests.
// The runtime `lookupCuit` consults `getTestFetchOverride()` here to honor
// the override; tests call `__setTestFetchOverride(...)` from this module.
// `__tusFacturasLookupCuit` here delegates to the production driver that
// the service registers via `setTusFacturasDriver()` at module load.
//
// Nothing in this file is part of the public service contract. The seams
// are intentionally `__`-prefixed and intended only for the unit test
// suite under `src/__tests__/`.

import { getTusFacturasDevConfig } from "./fiscal-tusfacturas.service";
import type { ContactLookupResult } from "../validators/cuit-lookup";
import type { AuditPrismaClient } from "../audit";

interface FetchLike {
  (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
}

let __testFetchOverride: FetchLike | null = null;

export function getTestFetchOverride(): FetchLike | null {
  return __testFetchOverride;
}

export function __setTestFetchOverride(fn: FetchLike | null): void {
  __testFetchOverride = fn;
}

// In-flight de-dup slot map lives here so both the production service and
// the `__tusFacturasLookupCuit` test seam observe the same instance.
const inFlight = new Map<string, Promise<ContactLookupResult>>();

export function getInFlightMap(): Map<string, Promise<ContactLookupResult>> {
  return inFlight;
}

export function __inFlightClearForTest(): void {
  inFlight.clear();
}

// Production driver registration. `cuit-lookup.service.ts` calls
// `setTusFacturasDriver(runTusFacturasDriver)` at module load. The test
// seam below delegates to whatever driver was registered.
type TusFacturasDriver = (
  rawCuit: string,
  deps: { fetchFn?: FetchLike; configOverride?: ReturnType<typeof getTusFacturasDevConfig> },
) => Promise<ContactLookupResult>;

let registeredDriver: TusFacturasDriver | null = null;

export function setTusFacturasDriver(fn: TusFacturasDriver | null): void {
  registeredDriver = fn;
}

// Re-exported seam that delegates to the production driver. Behavior is
// identical to the prior location inside `cuit-lookup.service.ts`.
export async function __tusFacturasLookupCuit(
  rawCuit: string,
  deps: { fetchFn?: FetchLike; configOverride?: ReturnType<typeof getTusFacturasDevConfig> } = {},
): Promise<ContactLookupResult> {
  if (!registeredDriver) {
    throw new Error("__tusFacturasLookupCuit called before setTusFacturasDriver() — module load order bug");
  }
  return registeredDriver(rawCuit, deps);
}

// ---- Prisma provider seam ----
//
// The service needs a prisma client to emit audit events. To keep
// the service importable in test environments that do not have
// DATABASE_URL, the production route registers a lazy provider that
// is invoked at audit emission time. Tests can override the provider
// via `__setPrismaProviderForTest` to inject a spy double (or leave
// it untouched to skip audit emission).
type PrismaProvider = () => AuditPrismaClient | undefined;

let routePrismaProvider: PrismaProvider | null = null;

export function setRoutePrismaProvider(fn: PrismaProvider | null): void {
  routePrismaProvider = fn;
}

export function __getRoutePrismaProvider(): PrismaProvider | null {
  return routePrismaProvider;
}

let testPrismaProvider: PrismaProvider | null = null;

export function __setPrismaProviderForTest(fn: PrismaProvider | null): void {
  testPrismaProvider = fn;
}

/**
 * Resolves the prisma client to use for audit emission. Order:
 *  1. test seam (highest priority — unit tests inject spy doubles)
 *  2. route-registered provider (production)
 *  3. `undefined` (audit emission becomes a no-op for the default sink)
 */
export function resolvePrismaForAudit(): AuditPrismaClient | undefined {
  if (testPrismaProvider) return testPrismaProvider();
  if (routePrismaProvider) return routePrismaProvider();
  return undefined;
}
