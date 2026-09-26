import prisma from "../prisma";
import { supabaseServerClient } from "../supabase/server";
import { forbidden, unauthorized } from "./errors";

const DEV_ACTOR_HEADER = "x-ossum-actor-user-id";

export type ApiIdentity = {
  actorUserId: string;
  supabaseAuthId: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  source: "supabase-auth" | "dev-header";
};

function bearerToken(request: Request): string | null {
  const match = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

async function activeInternalUser(where: { supabaseAuthId: string } | { id: string }) {
  const user = await prisma.user.findUnique({
    where,
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
  });
  if (!user) throw unauthorized("User not registered in OSSUM COR", "user_not_found");
  if (!user.isActive) throw forbidden("User account is deactivated", "user_deactivated");
  return user;
}

/** Resolves an authenticated active actor without accepting tenant input. */
export async function getApiIdentity(request: Request): Promise<ApiIdentity> {
  const token = bearerToken(request);
  if (token) {
    const { data, error } = await supabaseServerClient.auth.getUser(token);
    if (error || !data.user) {
      throw unauthorized("Invalid or expired auth token", "invalid_auth_token");
    }
    const user = await activeInternalUser({ supabaseAuthId: data.user.id });
    return { actorUserId: user.id, supabaseAuthId: data.user.id, user, source: "supabase-auth" };
  }

  if (process.env.NODE_ENV === "production") {
    throw unauthorized("Authentication required", "auth_required");
  }
  const actorUserId = request.headers.get(DEV_ACTOR_HEADER)?.trim();
  if (!actorUserId) throw unauthorized("Missing actor user header", "missing_actor_user_id");
  const user = await activeInternalUser({ id: actorUserId });
  return { actorUserId: user.id, supabaseAuthId: null, user, source: "dev-header" };
}
