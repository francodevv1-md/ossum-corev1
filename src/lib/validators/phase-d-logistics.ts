import { badRequest } from "@/lib/api/errors"

export type PhaseDOperationInput = Readonly<{
  commandKey: string; dispatchId: string; dispatchLineId?: string; quantity: string | number; sourceOperationId?: string
  reason?: string; observations?: string; evidence?: unknown
}>

const commandKey = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= 160
export const decimal = (value: unknown, field: string, allowZero = false) => {
  const normalized = typeof value === "number" ? String(value) : value
  if (typeof normalized !== "string" || !/^(0|[1-9]\d*)(\.\d{1,4})?$/.test(normalized) || (!allowZero && Number(normalized) <= 0)) throw badRequest(`${field} must be ${allowZero ? "non-negative" : "positive"} decimal(24,4)`, "phase_d_invalid_quantity")
  return normalized
}
export function validateOperation(input: unknown): PhaseDOperationInput {
  if (!input || typeof input !== "object") throw badRequest("Invalid Phase D command", "phase_d_invalid_command")
  const value = input as Record<string, unknown>
  if (!commandKey(value.commandKey) || typeof value.dispatchId !== "string" || !value.dispatchId || value.dispatchLineId !== undefined && (typeof value.dispatchLineId !== "string" || !value.dispatchLineId)) throw badRequest("Invalid Phase D command identity", "phase_d_invalid_command")
  return { commandKey: (value.commandKey as string).trim(), dispatchId: value.dispatchId as string, dispatchLineId: value.dispatchLineId as string | undefined, quantity: decimal(value.quantity, "quantity"), sourceOperationId: typeof value.sourceOperationId === "string" ? value.sourceOperationId : undefined, reason: typeof value.reason === "string" ? value.reason : undefined, observations: typeof value.observations === "string" ? value.observations : undefined, evidence: value.evidence }
}
