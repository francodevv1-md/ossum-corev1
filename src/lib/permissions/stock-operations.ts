import type { ApiAuthContext } from "../api/auth-context";
import { requireCompanyMutationAccess } from "../api/guards";
import { CAJAS_CONTROL_ACTION_ROLES, CAJAS_DIFFERENCE_RESOLUTION_ACTION_ROLES, CAJAS_DISPATCH_ACTION_ROLES, STOCK_OPERATION_ROLES } from "./stock-operations-policy";

export { canPerformStockOperations, STOCK_OPERATION_ROLES } from "./stock-operations-policy";

export function requireStockOperationAccess(ctx: ApiAuthContext): void {
  requireCompanyMutationAccess(ctx, STOCK_OPERATION_ROLES);
}

export function requireCajasControlAccess(ctx: ApiAuthContext): void { requireCompanyMutationAccess(ctx, CAJAS_CONTROL_ACTION_ROLES); }
export function requireCajasDifferenceResolutionAccess(ctx: ApiAuthContext): void { requireCompanyMutationAccess(ctx, CAJAS_DIFFERENCE_RESOLUTION_ACTION_ROLES); }
export function requireCajasDispatchAccess(ctx: ApiAuthContext): void { requireCompanyMutationAccess(ctx, CAJAS_DISPATCH_ACTION_ROLES); }
