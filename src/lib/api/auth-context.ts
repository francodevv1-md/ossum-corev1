// OSSUM COR — Unified API auth context.
// Resolves actor identity from Supabase Auth token (primary) or DEV header (fallback).
// Validates User existence, active status, and company access in a single call.

import { forbidden, unauthorized } from "./errors";
import prisma from "../prisma";
import { supabaseServerClient } from "../supabase/server";
import { createHash } from "node:crypto";
import {
  type CanonicalRole,
  resolveCanonicalRole,
} from "../permissions/canonical-roles";

export interface ApiAuthContext {
  /** Internal User.id (cuid) */
  actorUserId: string;
  /** Supabase Auth user.id (UUID), null if resolved via DEV header */
  supabaseAuthId: string | null;
  /** Target company for this request */
  companyId: string;
  /** Canonical user role within this company */
  role: CanonicalRole;
  /** Explicit canonical role type */
  canonicalRole: CanonicalRole;
  /** Raw role string from database before normalization */
  rawRole: string;
  /** Minimal non-sensitive user payload reused by /me */
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  /** Minimal active company payload reused by /me */
  activeCompany: {
    id: string;
    name: string;
  };
  /** Auth source for observability */
  source: "supabase-auth" | "dev-header";
}

const DEV_ACTOR_HEADER = "x-ossum-actor-user-id";
const AUTH_CONTEXT_CACHE_TTL_MS = 2_000;
const AUTH_CONTEXT_CACHE_MAX_ENTRIES = 200;

type AuthContextCacheEntry = {
  expiresAt: number;
  context: ApiAuthContext;
};

const authContextCache = new Map<string, AuthContextCacheEntry>();
const authContextInFlight = new Map<string, Promise<ApiAuthContext>>();

function perfNow(): number {
  return performance.now();
}

function logPerf(label: string, startedAt: number, outcome: string): void {
  console.info(label, {
    durationMs: Math.round((perfNow() - startedAt) * 10) / 10,
    outcome,
  });
}

function createAuthContextCacheKey(token: string, companyId: string): string {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return `${companyId}:${tokenHash}`;
}

function cloneAuthContext(context: ApiAuthContext): ApiAuthContext {
  return {
    ...context,
    user: { ...context.user },
    activeCompany: { ...context.activeCompany },
  };
}

function pruneAuthContextCache(now = Date.now()): void {
  for (const [key, entry] of authContextCache) {
    if (entry.expiresAt <= now) {
      authContextCache.delete(key);
    }
  }

  while (authContextCache.size > AUTH_CONTEXT_CACHE_MAX_ENTRIES) {
    const oldestKey = authContextCache.keys().next().value;
    if (!oldestKey) break;
    authContextCache.delete(oldestKey);
  }
}

async function resolveSupabaseAuthContext(
  token: string,
  companyId: string
): Promise<ApiAuthContext> {
  const supabaseStartedAt = perfNow();
  let supabaseOutcome = "error";
  const { data, error } = await supabaseServerClient.auth.getUser(token).then((result) => {
    supabaseOutcome = result.error || !result.data.user ? "invalid" : "success";
    return result;
  }).finally(() => {
    logPerf("[PERF][auth-context] supabase.getUser", supabaseStartedAt, supabaseOutcome);
  });

  if (error || !data.user) {
    throw unauthorized("Invalid or expired auth token", "invalid_auth_token");
  }

  const supabaseAuthId = data.user.id;

  const userAccessStartedAt = perfNow();
  let userAccessOutcome = "error";
  const user = await prisma.user.findUnique({
    where: { supabaseAuthId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      companyAccess: {
        where: { companyId, isActive: true },
        take: 1,
        select: {
          role: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  }).then((result) => {
    userAccessOutcome = !result
      ? "user_not_found"
      : !result.isActive
        ? "user_deactivated"
        : result.companyAccess.length > 0
          ? "success"
          : "company_access_denied";
    return result;
  }).finally(() => {
    logPerf("[PERF][auth-context] userAccess.lookup", userAccessStartedAt, userAccessOutcome);
  });
  if (!user) {
    throw unauthorized("User not registered in OSSUM COR", "user_not_found");
  }

  if (!user.isActive) {
    throw forbidden("User account is deactivated", "user_deactivated");
  }

  const access = user.companyAccess[0];

  if (!access) {
    throw forbidden("Company access denied", "company_access_denied");
  }

  const canonicalRole = resolveCanonicalRole(access.role);
  if (!canonicalRole) {
    throw forbidden("Invalid or unassigned company role", "invalid_company_role");
  }

  return {
    actorUserId: user.id,
    supabaseAuthId,
    companyId,
    role: canonicalRole,
    canonicalRole,
    rawRole: access.role,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    activeCompany: {
      id: access.company.id,
      name: access.company.name,
    },
    source: "supabase-auth",
  };
}

/**
 * Extract Bearer token from Authorization header.
 * Returns null if header is missing or malformed.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header) return null;

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;

  return parts[1].trim() || null;
}

/**
 * Resolve the actor identity for an API request targeting a specific company.
 *
 * Priority:
 * 1. Supabase Auth Bearer token → validates with Supabase → maps to internal User.
 * 2. DEV header (x-ossum-actor-user-id) — only in non-production environments.
 *
 * Throws ApiError (401/403) on failure.
 */
export async function getApiAuthContext(
  request: Request,
  companyId: string
): Promise<ApiAuthContext> {
  // ── Path 1: Supabase Auth token ──────────────────────────────
  const token = extractBearerToken(request);
  if (token) {
    const cacheKey = createAuthContextCacheKey(token, companyId);
    const now = Date.now();
    const cached = authContextCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      const cacheStartedAt = perfNow();
      logPerf("[PERF][auth-context] cache.hit", cacheStartedAt, "success");
      return cloneAuthContext(cached.context);
    }

    if (cached) {
      authContextCache.delete(cacheKey);
    }

    pruneAuthContextCache(now);

    const inFlight = authContextInFlight.get(cacheKey);
    if (inFlight) {
      const cacheStartedAt = perfNow();
      let cacheOutcome = "error";
      try {
        const context = await inFlight;
        cacheOutcome = "inflight_success";
        return cloneAuthContext(context);
      } finally {
        logPerf("[PERF][auth-context] cache.hit", cacheStartedAt, cacheOutcome);
      }
    }

    const promise = resolveSupabaseAuthContext(token, companyId).then((context) => {
      authContextCache.set(cacheKey, {
        expiresAt: Date.now() + AUTH_CONTEXT_CACHE_TTL_MS,
        context,
      });
      return context;
    }).finally(() => {
      authContextInFlight.delete(cacheKey);
    });

    authContextInFlight.set(cacheKey, promise);

    const context = await promise;
    return cloneAuthContext(context);
  }

  // ── Path 2: DEV header fallback ──────────────────────────────
  if (process.env.NODE_ENV === "production") {
    throw unauthorized("Authentication required", "auth_required");
  }

  const actorUserId = request.headers.get(DEV_ACTOR_HEADER)?.trim();
  if (!actorUserId) {
    throw unauthorized("Missing actor user header", "missing_actor_user_id");
  }

  console.warn("[DEV] Auth fallback used — header-based identity is NOT secure for production.");

  const internalUserStartedAt = perfNow();
  let internalUserOutcome = "error";
  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  }).then((result) => {
    internalUserOutcome = result ? "success" : "not_found";
    return result;
  }).finally(() => {
    logPerf("[PERF][auth-context] internalUser.lookup", internalUserStartedAt, internalUserOutcome);
  });

  if (!user) {
    throw unauthorized("DEV user not found", "user_not_found");
  }

  if (!user.isActive) {
    throw forbidden("User account is deactivated", "user_deactivated");
  }

  const companyAccessStartedAt = perfNow();
  let companyAccessOutcome = "error";
  const access = await prisma.userCompanyAccess.findFirst({
    where: { userId: user.id, companyId, isActive: true },
    select: {
      role: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  }).then((result) => {
    companyAccessOutcome = result ? "success" : "denied";
    return result;
  }).finally(() => {
    logPerf("[PERF][auth-context] companyAccess.lookup", companyAccessStartedAt, companyAccessOutcome);
  });

  if (!access) {
    throw forbidden("Company access denied", "company_access_denied");
  }

  const canonicalRole = resolveCanonicalRole(access.role);
  if (!canonicalRole) {
    throw forbidden("Invalid or unassigned company role", "invalid_company_role");
  }

  return {
    actorUserId: user.id,
    supabaseAuthId: null,
    companyId,
    role: canonicalRole,
    canonicalRole,
    rawRole: access.role,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    activeCompany: {
      id: access.company.id,
      name: access.company.name,
    },
    source: "dev-header",
  };
}
