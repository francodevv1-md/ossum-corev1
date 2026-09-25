export const STOCK_OPERATION_ROLES = ["admin", "operator"] as const;

export type StockOperationRole = (typeof STOCK_OPERATION_ROLES)[number];

export function canPerformStockOperations(role: string | null | undefined): role is StockOperationRole {
  return STOCK_OPERATION_ROLES.some((allowedRole) => allowedRole === role);
}

export const CAJAS_CONTROL_ACTION_ROLES = ["admin", "operator"] as const;
export const CAJAS_DIFFERENCE_RESOLUTION_ACTION_ROLES = ["admin", "operator"] as const;
export const CAJAS_DISPATCH_ACTION_ROLES = ["admin", "operator"] as const;
