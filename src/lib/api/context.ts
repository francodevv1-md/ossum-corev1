// OSSUM COR — Minimal explicit API context helpers.
// No real Auth lookup here: API routes must pass context explicitly until Auth exists.

export interface ApiContext {
  companyId: string;
  actorUserId: string;
}

export type ApiContextInput = Partial<ApiContext> | null | undefined;

export function requireApiContext(input: ApiContextInput): ApiContext {
  if (!input?.companyId) {
    throw new Error("Missing API context companyId");
  }

  if (!input.actorUserId) {
    throw new Error("Missing API context actorUserId");
  }

  return {
    companyId: input.companyId,
    actorUserId: input.actorUserId,
  };
}
