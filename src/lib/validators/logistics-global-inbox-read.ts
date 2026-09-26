import { badRequest } from "@/lib/api/errors"

const stages = new Set(["prepare", "control", "dispatch", "receive", "return", "reconcile", "mixed", "unavailable"])
const exceptions = new Set(["blocker", "difference", "pending_identification", "partial"])
const logisticsStatuses = new Set(["Borrador", "Emitido", "En_transito", "Entregado", "Parcialmente_devuelto", "Devuelto", "Anulado", "mixed", "unavailable"])

function optionalText(value: string | null, name: string, max = 160) {
  if (value == null || !value.trim()) return undefined
  const text = value.trim()
  if (text.length > max) throw badRequest(`${name} is too long`, "logistics_inbox_query_invalid")
  return text
}

function optionalBoolean(value: string | null, name: string) {
  if (value == null || !value.trim()) return undefined
  if (value === "true") return true
  if (value === "false") return false
  throw badRequest(`${name} must be true or false`, "logistics_inbox_query_invalid")
}

function optionalLocality(value: string | null) {
  const locality = optionalText(value, "locality")
  return locality?.toLocaleLowerCase()
}

function optionalDate(value: string | null, name: string) {
  const text = optionalText(value, name, 40)
  if (!text) return undefined
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) throw badRequest(`${name} must be a valid date`, "logistics_inbox_query_invalid")
  return date
}

export function validateLogisticsGlobalInboxQuery(searchParams: URLSearchParams) {
  const limitText = searchParams.get("limit")
  const limit = limitText == null || !limitText.trim() ? 25 : Number(limitText)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw badRequest("limit must be an integer between 1 and 100", "logistics_inbox_query_invalid")
  const stage = optionalText(searchParams.get("stage"), "stage", 32)
  const exception = optionalText(searchParams.get("exception"), "exception", 32)
  const logisticsStatus = optionalText(searchParams.get("logisticsStatus"), "logisticsStatus", 32)
  if (stage && !stages.has(stage)) throw badRequest("stage is invalid", "logistics_inbox_query_invalid")
  if (exception && !exceptions.has(exception)) throw badRequest("exception is invalid", "logistics_inbox_query_invalid")
  if (logisticsStatus && !logisticsStatuses.has(logisticsStatus)) throw badRequest("logisticsStatus is invalid", "logistics_inbox_query_invalid")
  const overdue = optionalBoolean(searchParams.get("overdue"), "overdue")
  if (overdue !== undefined) throw badRequest("overdue is unavailable", "logistics_inbox_overdue_unavailable")
  const from = optionalDate(searchParams.get("from"), "from")
  const to = optionalDate(searchParams.get("to"), "to")
  if (from && to && from > to) throw badRequest("from must be before to", "logistics_inbox_query_invalid")
  return { q: optionalText(searchParams.get("q"), "q"), cursor: optionalText(searchParams.get("cursor"), "cursor", 1000), limit, stage, exception, priority: optionalText(searchParams.get("priority"), "priority", 64), news: optionalBoolean(searchParams.get("news"), "news"), branchId: optionalText(searchParams.get("branchId"), "branchId", 160), institutionId: optionalText(searchParams.get("institutionId"), "institutionId", 160), locality: optionalLocality(searchParams.get("locality")), logisticsStatus, hasBlockers: optionalBoolean(searchParams.get("hasBlockers"), "hasBlockers"), cxStatus: optionalText(searchParams.get("cxStatus"), "cxStatus", 64), prepStatus: optionalText(searchParams.get("prepStatus"), "prepStatus", 64), from, to }
}
