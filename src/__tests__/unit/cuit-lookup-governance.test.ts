import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lookupCuit } from "@/lib/services/cuit-lookup.service";
import {
  __inFlightClearForTest,
  __setTestFetchOverride,
} from "@/lib/services/cuit-lookup.service.internal";
import {
  __clearGovernanceCounters,
  __setGovernanceLimits,
  __getGovernanceLimits,
} from "@/lib/services/cuit-lookup.governance";
import { __resetLoggerSink, __setLoggerSink } from "@/lib/log/redacted";

const ORIGINAL_ENV = { ...process.env };
const CUITS = {
  happy: "30712293840",
  monotributo: "20000000000",
  conflict: "20000000229",
  notFound: "20000000291",
  bad: "1234567890",
} as const;

let loggerCalls: Array<Record<string, unknown>> = [];

beforeEach(() => {
  __clearGovernanceCounters();
  __inFlightClearForTest();
  __setTestFetchOverride(null);
  process.env = { ...ORIGINAL_ENV, NODE_ENV: "development" };
  delete process.env.OSSUM_CUIT_LOOKUP_DRIVER;
  loggerCalls = [];
  __setLoggerSink((event) => {
    loggerCalls.push({ ...event });
  });
  // Reset to production defaults between tests.
  __setGovernanceLimits(30, 600, 2000);
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  __resetLoggerSink();
  __setTestFetchOverride(null);
  __clearGovernanceCounters();
});

describe("cuit-lookup governance — per-actor rate limit (X=30/min)", () => {
  it("allows up to X requests per actor per minute, rejects the 31st with cuit_actor_rate_limit", async () => {
    __setGovernanceLimits(2, 600, 2000); // tighten to 2/2/2k for determinism
    // 2 successful calls within window
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    // 3rd must be rejected
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 429, code: "cuit_actor_rate_limit" });
  });

  it("does not log or audit when the request is rejected by per-actor rate limit", async () => {
    __setGovernanceLimits(1, 600, 2000);
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    loggerCalls.length = 0;
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 429, code: "cuit_actor_rate_limit" });
    // Logger should NOT have been called for the rejected path.
    expect(loggerCalls).toHaveLength(0);
  });

  it("isolates actor counters: actor-A reaching the limit does not affect actor-B", async () => {
    __setGovernanceLimits(1, 600, 2000);
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    // actor-B is untouched.
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-B", companyId: "company-X" }),
    ).resolves.toMatchObject({ source: "stub" });
  });
});

describe("cuit-lookup governance — per-company rate limit (Y=600/h)", () => {
  it("allows up to Y requests per company per hour, rejects the 601st with cuit_company_rate_limit", async () => {
    __setGovernanceLimits(30, 2, 2000); // company limit becomes 2
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    await lookupCuit(CUITS.happy, { actorUserId: "actor-B", companyId: "company-X" });
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-C", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 429, code: "cuit_company_rate_limit" });
  });

  it("different actors share the same company budget counter", async () => {
    __setGovernanceLimits(30, 2, 2000);
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    await lookupCuit(CUITS.happy, { actorUserId: "actor-B", companyId: "company-X" });
    // actor-C is rejected because the company budget is exhausted
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-C", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 429, code: "cuit_company_rate_limit" });
  });

  it("different companies have independent budget counters", async () => {
    __setGovernanceLimits(30, 1, 2000);
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    // company-Y is untouched
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-Y" }),
    ).resolves.toMatchObject({ source: "stub" });
  });
});

describe("cuit-lookup governance — per-company daily budget (T=2000/day UTC)", () => {
  it("rejects the 2001st request from the same company within UTC day with cuit_budget_exceeded", async () => {
    __setGovernanceLimits(30, 600, 2); // daily budget becomes 2
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    await lookupCuit(CUITS.happy, { actorUserId: "actor-B", companyId: "company-X" });
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-C", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 429, code: "cuit_budget_exceeded" });
  });

  it("does not consume daily budget when per-actor rate limit rejects first", async () => {
    __setGovernanceLimits(1, 600, 2);
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    // actor-A is rate limited; this must NOT count against the daily budget
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" }),
    ).rejects.toMatchObject({ code: "cuit_actor_rate_limit" });
    // actor-B can still hit the daily budget once more (2nd of 2)
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-B", companyId: "company-X" }),
    ).resolves.toMatchObject({ source: "stub" });
  });
});

describe("cuit-lookup governance — invalid CUIT does not consume counters", () => {
  it("invalid_cuit_format (400) does NOT increment per-actor or per-company counters", async () => {
    __setGovernanceLimits(1, 1, 1);
    // First call invalidates
    await expect(
      lookupCuit(CUITS.bad, { actorUserId: "actor-A", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_cuit_format" });
    // Now a valid call must still be allowed
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" }),
    ).resolves.toMatchObject({ source: "stub" });
  });
});

describe("cuit-lookup governance — in-flight dedupe does not double-count", () => {
  it("two simultaneous subscribers share a single governance count", async () => {
    __setGovernanceLimits(1, 600, 2000);
    process.env.OSSUM_CUIT_LOOKUP_DRIVER = "tusfacturas";
    process.env.TUSFACTURAS_DEV_API_KEY = "k";
    process.env.TUSFACTURAS_DEV_USER_TOKEN = "u";
    process.env.TUSFACTURAS_DEV_API_TOKEN = "t";
    process.env.TUSFACTURAS_DEV_API_URL = "https://example.test/v2";
    __inFlightClearForTest();
    const fetchFn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          razon_social: "SHARED SA",
          condicion_impositiva: "RESPONSABLE INSCRIPTO",
        }),
        text: async () => "",
      };
    });
    __setTestFetchOverride(fetchFn);
    try {
      // Two concurrent calls for the same actor+company. If in-flight
      // dedupe did not short-circuit, the second would be rejected.
      const p1 = lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X", driver: "tusfacturas" });
      const p2 = lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X", driver: "tusfacturas" });
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.found).toBe(true);
      expect(r2.found).toBe(true);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    } finally {
      __setTestFetchOverride(null);
      delete process.env.OSSUM_CUIT_LOOKUP_DRIVER;
      delete process.env.TUSFACTURAS_DEV_API_KEY;
      delete process.env.TUSFACTURAS_DEV_USER_TOKEN;
      delete process.env.TUSFACTURAS_DEV_API_TOKEN;
      delete process.env.TUSFACTURAS_DEV_API_URL;
    }
  });
});

describe("cuit-lookup governance — counter reset", () => {
  it("__clearGovernanceCounters resets all counters", async () => {
    __setGovernanceLimits(1, 1, 1);
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    // After the call, the actor and company counters are at 1.
    __clearGovernanceCounters();
    // Now both should be reset and a fresh call allowed.
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" }),
    ).resolves.toMatchObject({ source: "stub" });
  });

  it("__setGovernanceLimits overrides X, Y, T deterministically", () => {
    __setGovernanceLimits(7, 11, 13);
    const limits = __getGovernanceLimits();
    expect(limits).toEqual({ actor: 7, company: 11, daily: 13 });
  });

  it("successful call increments all three counters (per-actor, per-company hourly, per-company daily)", async () => {
    __setGovernanceLimits(30, 600, 2000);
    // Sanity: 1 call from a fresh actor/company. All three buckets record it.
    await lookupCuit(CUITS.happy, { actorUserId: "actor-N", companyId: "company-N" });
    // If we tighten to 1/600/600, the same actor+company should be rejected.
    __setGovernanceLimits(1, 600, 600);
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-N", companyId: "company-N" }),
    ).rejects.toMatchObject({ code: "cuit_actor_rate_limit" });
  });
});

describe("cuit-lookup governance — provider error increments counters but rejects subsequent", () => {
  it("a successful call counts; a driver error also counts against the actor counter", async () => {
    __setGovernanceLimits(2, 600, 2000);
    // Happy path: 1
    await lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" });
    // Error path (cuit_provider_conflict from bucket 4): 2
    await expect(
      lookupCuit(CUITS.conflict, { actorUserId: "actor-A", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 422, code: "cuit_provider_conflict" });
    // 3rd must be rejected by per-actor rate limit
    await expect(
      lookupCuit(CUITS.happy, { actorUserId: "actor-A", companyId: "company-X" }),
    ).rejects.toMatchObject({ status: 429, code: "cuit_actor_rate_limit" });
  });
});
