// OSSUM COR — Governance + audit emission for the CUIT lookup wrapper.
//
// Implements ADR-027H §1 (rate limits), §3 (credit consumption), §4
// (audit policy) and §6 (daily budget). All counters are in-memory and
// reset on process restart; this is intentional per ADR-027H §1
// (backstop is per-instance; Redis/Upstash is a future iteration).
//
// Order inside `lookupCuit` (per parent instruction):
//   1. local CUIT format validation (no counters, no audit, no log)
//   2. governance check (per-actor rate limit, per-company rate limit,
//      per-company daily budget) — reject BEFORE driver / BEFORE in-flight
//   3. in-flight de-dup
//   4. driver
//   5. audit emission (once per top-level lookup, regardless of
//      subscribers)
//
// A rejected-by-governance path MUST NOT touch the in-flight map and
// MUST NOT emit an audit event.

import { ApiError } from "../api/errors";
import { createAuditEvent, type AuditPrismaClient } from "../audit";
import { __maskCuit } from "../log/redacted";

// Default limits from ADR-027H §1 + §6.
const DEFAULT_ACTOR_LIMIT = 30;            // X = 30 req/min
const DEFAULT_ACTOR_WINDOW_MS = 60_000;    // 60s
const DEFAULT_COMPANY_LIMIT = 600;          // Y = 600 req/h
const DEFAULT_COMPANY_WINDOW_MS = 3_600_000; // 3600s
const DEFAULT_DAILY_BUDGET = 2000;          // T = 2000 req/day (UTC)

// In-memory rolling counter buckets. A Map<key, timestamps[]> where
// timestamps are millisecond epoch. The cleanup is lazy: on every
// `record*` we drop entries older than the window's edge.
const actorTimestamps = new Map<string, number[]>();
const companyHourlyTimestamps = new Map<string, number[]>();
const companyDailyTimestamps = new Map<string, number[]>();

// Mutable limit set; tests override via __setGovernanceLimits.
let actorLimit = DEFAULT_ACTOR_LIMIT;
const actorWindowMs = DEFAULT_ACTOR_WINDOW_MS;
let companyLimit = DEFAULT_COMPANY_LIMIT;
const companyWindowMs = DEFAULT_COMPANY_WINDOW_MS;
let dailyBudget = DEFAULT_DAILY_BUDGET;

function pruneBefore(timestamps: number[], cutoff: number): void {
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }
}

function utcDayStartMs(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

export interface GovernanceResult {
  /** True when all three checks pass. */
  ok: boolean;
  /** When ok=false, the corresponding error code to throw. */
  code?: "cuit_actor_rate_limit" | "cuit_company_rate_limit" | "cuit_budget_exceeded";
}

/**
 * Check per-actor rate limit, per-company rate limit and per-company
 * daily budget. When all three pass, record the request so the next
 * call observes the new count. When any rejects, do NOT record (the
 * rejected request does not consume budget).
 *
 * `now` is an injected timestamp for test determinism; production code
 * passes `Date.now()`.
 */
export function checkAndRecordGovernance(
  actorUserId: string,
  companyId: string,
  now: number = Date.now(),
): GovernanceResult {
  // Per-actor sliding window.
  const actorKey = actorUserId || "unknown";
  const actorCutoff = now - actorWindowMs;
  const actorList = actorTimestamps.get(actorKey) ?? [];
  pruneBefore(actorList, actorCutoff);
  if (actorList.length >= actorLimit) {
    return { ok: false, code: "cuit_actor_rate_limit" };
  }

  // Per-company hourly sliding window.
  const companyKey = companyId || "unknown";
  const companyCutoff = now - companyWindowMs;
  const companyList = companyHourlyTimestamps.get(companyKey) ?? [];
  pruneBefore(companyList, companyCutoff);
  if (companyList.length >= companyLimit) {
    return { ok: false, code: "cuit_company_rate_limit" };
  }

  // Per-company daily budget (UTC day).
  const dayCutoff = utcDayStartMs(now);
  const dayList = companyDailyTimestamps.get(companyKey) ?? [];
  pruneBefore(dayList, dayCutoff);
  if (dayList.length >= dailyBudget) {
    return { ok: false, code: "cuit_budget_exceeded" };
  }

  // All checks passed — record the new request.
  actorList.push(now);
  actorTimestamps.set(actorKey, actorList);
  companyList.push(now);
  companyHourlyTimestamps.set(companyKey, companyList);
  dayList.push(now);
  companyDailyTimestamps.set(companyKey, dayList);
  return { ok: true };
}

/**
 * Throws the appropriate ApiError when the governance result is a
 * rejection. No-op when ok.
 */
export function ensureGovernance(result: GovernanceResult, opts?: { actorUserId?: string; companyId?: string }): void {
  if (result.ok) return;
  switch (result.code) {
    case "cuit_actor_rate_limit":
      throw new ApiError(429, "cuit_actor_rate_limit", "Demasiadas consultas. Intente en un minuto.");
    case "cuit_company_rate_limit":
      throw new ApiError(429, "cuit_company_rate_limit", "La empresa alcanzó el límite horario.");
    case "cuit_budget_exceeded":
      throw new ApiError(429, "cuit_budget_exceeded", "La empresa alcanzó el presupuesto diario.");
    default:
      // No code — fail closed.
      throw new ApiError(429, "cuit_governance_rejected", `Governance rejected${opts?.actorUserId ? ` actor=${opts.actorUserId}` : ""}${opts?.companyId ? ` company=${opts.companyId}` : ""}`);
  }
}

// ---- Test seams ----

export function __clearGovernanceCounters(): void {
  actorTimestamps.clear();
  companyHourlyTimestamps.clear();
  companyDailyTimestamps.clear();
}

export function __setGovernanceLimits(n: number, y: number, t: number): void {
  if (Number.isInteger(n) && n > 0) actorLimit = n;
  if (Number.isInteger(y) && y > 0) {
    companyLimit = y;
    // y is the per-hour company limit, so window stays 1h.
  }
  if (Number.isInteger(t) && t > 0) dailyBudget = t;
}

export function __getGovernanceLimits(): { actor: number; company: number; daily: number } {
  return { actor: actorLimit, company: companyLimit, daily: dailyBudget };
}

// ---- Audit emission ----

export interface CuitLookupAuditInput {
  prisma: AuditPrismaClient | undefined;
  companyId: string;
  actorUserId: string;
  rawCuit: string;
  provider: "stub" | "tusfacturas";
  responseCode: string;
  errorCode?: string;
  durationMs: number;
  requestId: string;
  vatCondition?: string;
  legalNamePresent?: boolean;
  addressPresent?: boolean;
}

export type CuitLookupAuditSink = (input: CuitLookupAuditInput) => Promise<unknown>;

let auditSink: CuitLookupAuditSink | null = null;

export function __setAuditSink(fn: CuitLookupAuditSink | null): void {
  auditSink = fn;
}

export function __resetAuditSink(): void {
  auditSink = null;
}

export function __getLastAuditCall(): CuitLookupAuditInput | null {
  return lastAuditCall;
}

let lastAuditCall: CuitLookupAuditInput | null = null;

/**
 * Emit the `ContactCuitLookup` audit event per ADR-027H §4.
 * Reuses `createAuditEvent` from `src/lib/audit.ts`. NEVER includes
 * full legalName or full address; only the masked CUIT, the
 * `vatCondition` and boolean presence flags.
 *
 * The default sink calls `createAuditEvent`; tests can inject a
 * capture function via `__setAuditSink`.
 */
export async function emitCuitLookupAudit(input: CuitLookupAuditInput): Promise<unknown> {
  lastAuditCall = input;
  const maskedCuit = __maskCuit(input.rawCuit);
  const detailParts: string[] = [];
  if (input.vatCondition) detailParts.push(`vat=${input.vatCondition}`);
  if (input.legalNamePresent) detailParts.push("legalName");
  if (input.addressPresent) detailParts.push("address");
  const detail = detailParts.length > 0 ? detailParts.join(",") : null;

  const metadata: Record<string, unknown> = {
    requestId: input.requestId,
    durationMs: input.durationMs,
  };
  if (input.errorCode) metadata.errorCode = input.errorCode;

  if (auditSink) {
    return auditSink(input);
  }

  // Default sink: require a prisma instance. Production callers
  // (the route) pass it through `input.prisma`. When `input.prisma`
  // is undefined, the audit emission no-ops (test-only paths).
  if (!input.prisma) {
    return undefined;
  }

  return createAuditEvent({
    prisma: input.prisma,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: "ContactCuitLookup",
    entityId: maskedCuit,
    action: "cuit_lookup",
    module: "contacts-fiscal",
  detail: detail ?? undefined,
    metadata,
  });
}

// ---- Test-only helper: a default audit sink that captures into an
// array without touching prisma. Production code does not use this;
// it is exported for unit tests that want a no-prisma capture sink.
export function __captureAuditSink(target: CuitLookupAuditInput[]): CuitLookupAuditSink {
  return (input) => {
    target.push(input);
    return Promise.resolve(undefined);
  };
}
