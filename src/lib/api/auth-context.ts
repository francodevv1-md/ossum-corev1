// OSSUM COR — Unified API auth context.
// Resolves actor identity from Supabase Auth token (primary) or DEV header (fallback).
// Validates User existence, active status, and company access in a single call.

import { forbidden, unauthorized } from "./errors";
import prisma from "../prisma";
import { supabaseServerClient } from "../supabase/server";
import { getUserBySupabaseAuthId } from "../services/user.service";

export interface ApiAuthContext {
  /** Internal User.id (cuid) */
  actorUserId: string;
  /** Supabase Auth user.id (UUID), null if resolved via DEV header */
  supabaseAuthId: string | null;
  /** Target company for this request */
  companyId: string;
  /** User role within this company */
  role: string;
  /** Auth source for observability */
  source: "supabase-auth" | "dev-header";
}

const DEV_ACTOR_HEADER = "x-ossum-actor-user-id";

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
    const { data, error } = await supabaseServerClient.auth.getUser(token);

    if (error || !data.user) {
      throw unauthorized("Invalid or expired auth token", "invalid_auth_token");
    }

    const supabaseAuthId = data.user.id;

    const user = await getUserBySupabaseAuthId(prisma, supabaseAuthId);
    if (!user) {
      throw unauthorized("User not registered in OSSUM COR", "user_not_found");
    }

    if (!user.isActive) {
      throw forbidden("User account is deactivated", "user_deactivated");
    }

    const access = await prisma.userCompanyAccess.findFirst({
      where: { userId: user.id, companyId, isActive: true },
      select: { role: true },
    });

    if (!access) {
      throw forbidden("Company access denied", "company_access_denied");
    }

    return {
      actorUserId: user.id,
      supabaseAuthId,
      companyId,
      role: access.role,
      source: "supabase-auth",
    };
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

  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, isActive: true },
  });

  if (!user) {
    throw unauthorized("DEV user not found", "user_not_found");
  }

  if (!user.isActive) {
    throw forbidden("User account is deactivated", "user_deactivated");
  }

  const access = await prisma.userCompanyAccess.findFirst({
    where: { userId: user.id, companyId, isActive: true },
    select: { role: true },
  });

  if (!access) {
    throw forbidden("Company access denied", "company_access_denied");
  }

  return {
    actorUserId: user.id,
    supabaseAuthId: null,
    companyId,
    role: access.role,
    source: "dev-header",
  };
}
