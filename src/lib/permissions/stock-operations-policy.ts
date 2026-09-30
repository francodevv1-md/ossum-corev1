import { hasCapability } from "./capabilities";
import { type CanonicalRole, resolveCanonicalRole } from "./canonical-roles";

export const STOCK_OPERATION_ROLES = ["admin", "logistics"] as const;

export type StockOperationRole = (typeof STOCK_OPERATION_ROLES)[number];

export function canPerformStockOperations(role: string | null | undefined): boolean {
  return hasCapability(role, "stock:mutate");
}

export const CAJAS_CONTROL_ACTION_ROLES = ["admin", "logistics"] as const;
export const CAJAS_DIFFERENCE_RESOLUTION_ACTION_ROLES = ["admin", "logistics"] as const;
export const CAJAS_DISPATCH_ACTION_ROLES = ["admin", "logistics"] as const;
