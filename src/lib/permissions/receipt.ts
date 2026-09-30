import type { ApiAuthContext } from "../api/auth-context";
import { requireCompanyMutationAccess } from "../api/guards";
import { STOCK_OPERATION_ROLES } from "./stock-operations-policy";

export function requireReceiptMutationAccess(ctx: ApiAuthContext): void {
  requireCompanyMutationAccess(ctx, STOCK_OPERATION_ROLES);
}
