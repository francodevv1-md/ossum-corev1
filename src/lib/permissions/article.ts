import type { ApiAuthContext } from "../api/auth-context";
import { requireCompanyMutationAccess } from "../api/guards";

export const ARTICLE_MUTATION_ROLES = ["admin", "operator"] as const;

export function requireArticleMutationAccess(ctx: ApiAuthContext): void {
  requireCompanyMutationAccess(ctx, ARTICLE_MUTATION_ROLES);
}
