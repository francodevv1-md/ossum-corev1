import { badRequest } from "@/lib/api/errors"

export function normalizeLogisticsScanCode(value: unknown) {
  if (typeof value !== "string") throw badRequest("Scan code is required", "logistics_scan_code_invalid")
  const code = value.trim().toUpperCase()
  if (!code || code.length > 160) throw badRequest("Scan code must be between 1 and 160 characters", "logistics_scan_code_invalid")
  return code
}

export function validateLogisticsScanCode(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1) throw badRequest("Invalid logistics scan body", "logistics_scan_body_invalid")
  return { code: normalizeLogisticsScanCode((input as Record<string, unknown>).code) }
}
