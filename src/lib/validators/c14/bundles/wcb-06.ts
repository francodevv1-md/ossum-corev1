import { createHash } from "node:crypto"
import { C14RuntimeError, type Wcb06Command } from "@/lib/services/c14/bundles/private-writer-runtime"

export const definition = Object.freeze({ bundleId: "WCB-06", contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], payloadSectionIds: ["stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "dispatchHeader", "dispatchLines", "reservationEffect", "stockEffect"], bundleRowSha256: "28f17b8991ca4391b5ee1c49aefc93635f28c142df19ac3fadae90904488abd6", productState: "ACTIVATION_CANDIDATE" } as const)
const cj1 = (value: unknown): string => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
const isJsonSafe = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (!value || typeof value !== "object" || seen.has(value) || Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) return false
  seen.add(value)
  return Array.isArray(value) ? value.every(item => isJsonSafe(item, seen)) : Object.entries(value).every(([key, item]) => key !== "__proto__" && isJsonSafe(item, seen))
}
export const computeCompletePayloadSha256 = (input: unknown) => {
  if (!isRecord(input) || !isJsonSafe(input)) return invalid()
  const { completePayloadSha256: _supplied, ...canonical } = input
  return createHash("sha256").update("C14-WCB06-COMPLETE-PAYLOAD-V1").update("\0").update(cj1(canonical)).digest("hex")
}
const same = (a: unknown, b: unknown) => cj1(a) === cj1(b)
const CONTRACTS = ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"] as const
const SYSTEM = new Set(["companyId", "acceptedAt", "acceptedById", "commandAcceptanceId", "auditEventId", "createdAt", "effectKey", "effectType", "targetKind", "resultEntityType", "resultEntityId"])
const ROW_KEYS = {
  stockEvidenceHeader: new Set(["id", "kind", "recordKind", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceCheckpoint", "activationBoundaryId", "correctsEvidenceId", "reversesEvidenceId", "cause"]),
  stockEvidenceLine: new Set(["id", "evidenceId", "lineNumber", "articleId", "fromPositionId", "toPositionId", "reservationId", "quantity", "stockUnit", "scaleSnapshot", "lotCodeSnapshot", "expirationDateSnapshot", "serialNumberSnapshot", "identifiedCodeSnapshot", "sourceLineId", "traceSnapshot"]),
  reservationEvidence: new Set(["id", "reservationId", "sequence", "kind", "quantity", "stockUnit", "scaleSnapshot", "replacesEvidenceId", "cause"]),
  dispatchHeader: new Set(["id", "assignmentId", "remitoId", "sourceControlId", "sequence", "recordKind", "correctsDispatchId", "cause"]),
  dispatchLine: new Set(["id", "dispatchId", "assignmentId", "remitoId", "lineNumber", "recordKind", "accountingSign", "neutralizesDispatchLineId", "remitoItemId", "sourceControlLineId", "sourcePreparationId", "sourcePreparationLineId", "articleId", "stockPositionId", "quantity", "stockUnit", "scaleSnapshot", "skuSnapshot", "descriptionSnapshot", "lotCodeSnapshot", "expirationDateSnapshot", "serialNumberSnapshot", "identifiedCodeSnapshot", "traceabilitySnapshot", "stockEvidenceLineId"]),
  reservationEffect: new Set(["id", "stockReservationEvidenceId"]),
  stockEffect: new Set(["id", "stockEvidenceId"]),
} as const
const MAX_DECIMAL_UNITS = "9007199254740991"
const invalid = (): never => { throw new C14RuntimeError("C14_CX08_PAYLOAD_INVALID", 422, 0) }
const quantityUnits = (value: unknown, scale = 4) => {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)(\.\d{1,4})?$/.test(value)) return null
  const [whole, fraction = ""] = value.split(".")
  const unitsText = `${whole}${fraction.padEnd(4, "0")}`.replace(/^0+/, "") || "0"
  if (unitsText.length > MAX_DECIMAL_UNITS.length || unitsText.length === MAX_DECIMAL_UNITS.length && unitsText > MAX_DECIMAL_UNITS) return null
  const units = Number(unitsText)
  return units > 0 && Number.isSafeInteger(units) && quantityScale(value) <= scale ? units : null
}
const quantityScale = (value: string) => (value.split(".")[1] ?? "").replace(/0+$/, "").length
const isSafeScale = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 4
const isSafePositiveInteger = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
const isRowList = (value: unknown): value is Wcb06Command["stockEvidenceLines"] => Array.isArray(value) && value.every(isRecord)
const hasPayloadShape = (value: unknown): value is Wcb06Command => isRecord(value)
  && isRecord(value.authorizationProof) && Array.isArray(value.anchorIdentifiedUnitIds) && value.anchorIdentifiedUnitIds.every(item => typeof item === "string")
  && isRecord(value.stockEvidenceHeader) && isRowList(value.stockEvidenceLines) && isRecord(value.reservationEvidence)
  && (value.reservationEvidences === undefined || isRowList(value.reservationEvidences))
  && isRecord(value.dispatchHeader) && isRowList(value.dispatchLines)
  && isRecord(value.reservationEffect) && (value.reservationEffects === undefined || isRowList(value.reservationEffects)) && isRecord(value.stockEffect)
const hasOnly = (row: Record<string, unknown>, allowed: ReadonlySet<string>) =>
  Object.keys(row).every(key => allowed.has(key) && !SYSTEM.has(key))
const C14_TRACE_SNAPSHOT_V1 = Object.freeze({ schemaVersion: "C14-TRACE-SNAPSHOT-V1", modes: new Set(["NONE"]) })
const isC14TraceSnapshot = (value: unknown) => isRecord(value)
  && Object.keys(value).every(key => key === "schemaVersion" || key === "mode")
  && value.schemaVersion === C14_TRACE_SNAPSHOT_V1.schemaVersion
  && typeof value.mode === "string" && C14_TRACE_SNAPSHOT_V1.modes.has(value.mode)
const hasStrings = (row: Record<string, unknown>, keys: readonly string[], nullable: readonly string[] = []) =>
  keys.every(key => typeof row[key] === "string") && nullable.every(key => row[key] === null || typeof row[key] === "string")
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}
const frozenClone = (input: Wcb06Command): Readonly<Wcb06Command> => {
  let copy: Wcb06Command
  try { copy = structuredClone(input) } catch { return invalid() }
  // The approved proof is an immutable capability. Keep its exact identity rather
  // than minting approval for a clone with potentially altered provenance fields.
  copy.authorizationProof = input.authorizationProof
  return deepFreeze(copy)
}

export function validate(input: unknown): Readonly<Wcb06Command> {
  if (!hasPayloadShape(input) || !isJsonSafe(input)) return invalid()
  if (!input.companyId || !input.commandId || !input.actorId || !input.resultEntityId || !/^[a-f0-9]{64}$/.test(input.completePayloadSha256)
    || input.authorizationProof.bundleId !== "WCB-06" || input.authorizationProof.companyId !== input.companyId || input.authorizationProof.actorId !== input.actorId
    || !same(input.authorizationProof.contractIds, CONTRACTS)) invalid()
  const reservations = input.reservationEvidences?.length ? input.reservationEvidences : [input.reservationEvidence]
  const reservationEffects = input.reservationEffects?.length ? input.reservationEffects : [input.reservationEffect]
  const rows = [input.stockEvidenceHeader, ...input.stockEvidenceLines, ...reservations, input.dispatchHeader, ...input.dispatchLines, ...reservationEffects, input.stockEffect]
  if (!input.stockEvidenceLines.length || input.stockEvidenceLines.length !== input.dispatchLines.length || rows.some(row => !row?.id)
    || !hasOnly(input.stockEvidenceHeader, ROW_KEYS.stockEvidenceHeader)
    || input.stockEvidenceLines.some(row => !hasOnly(row, ROW_KEYS.stockEvidenceLine))
    || reservations.some(row => !hasOnly(row, ROW_KEYS.reservationEvidence))
    || !hasOnly(input.dispatchHeader, ROW_KEYS.dispatchHeader)
    || input.dispatchLines.some(row => !hasOnly(row, ROW_KEYS.dispatchLine))
    || reservationEffects.some(row => !hasOnly(row, ROW_KEYS.reservationEffect))
    || !hasOnly(input.stockEffect, ROW_KEYS.stockEffect)
    || !isSafePositiveInteger(input.dispatchHeader.sequence)
    || reservations.some(row => !isSafePositiveInteger(row.sequence))) invalid()
  if (!hasStrings(input, ["companyId", "commandId", "actorId", "resultEntityId", "completePayloadSha256"])
    || !hasStrings(input.stockEvidenceHeader, ["id", "kind", "recordKind", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceCheckpoint"], ["activationBoundaryId", "correctsEvidenceId", "reversesEvidenceId", "cause"])
    || input.stockEvidenceLines.some(row => !hasStrings(row, ["id", "evidenceId", "articleId", "reservationId", "quantity", "stockUnit"], ["fromPositionId", "toPositionId", "lotCodeSnapshot", "expirationDateSnapshot", "serialNumberSnapshot", "identifiedCodeSnapshot", "sourceLineId"]))
    || reservations.some(row => !hasStrings(row, ["id", "reservationId", "kind", "quantity", "stockUnit"], ["replacesEvidenceId", "cause"]))
    || !hasStrings(input.dispatchHeader, ["id", "assignmentId", "remitoId", "sourceControlId", "recordKind"], ["correctsDispatchId", "cause"])
    || input.dispatchLines.some(row => !hasStrings(row, ["id", "dispatchId", "assignmentId", "remitoId", "recordKind", "remitoItemId", "sourceControlLineId", "sourcePreparationId", "sourcePreparationLineId", "articleId", "quantity", "stockUnit", "stockEvidenceLineId"], ["neutralizesDispatchLineId", "stockPositionId", "skuSnapshot", "descriptionSnapshot", "lotCodeSnapshot", "expirationDateSnapshot", "serialNumberSnapshot", "identifiedCodeSnapshot"]))
    || input.stockEvidenceLines.some(row => !isC14TraceSnapshot(row.traceSnapshot))
    || input.dispatchLines.some(row => !isC14TraceSnapshot(row.traceabilitySnapshot))
    || !hasStrings(input.reservationEffect, ["id", "stockReservationEvidenceId"])
    || reservationEffects.some(row => !hasStrings(row, ["id", "stockReservationEvidenceId"]))
    || input.stockEffect.id === undefined || typeof input.stockEffect.id !== "string" || typeof input.stockEffect.stockEvidenceId !== "string") invalid()
  if (input.completePayloadSha256 !== computeCompletePayloadSha256(input)) invalid()
  if (new Set(reservations.map(row => String(row.reservationId))).size !== reservations.length) invalid()
  if (input.stockEvidenceHeader.id !== input.stockEffect.stockEvidenceId || input.stockEvidenceHeader.kind !== "DISPATCH" || input.stockEvidenceHeader.recordKind !== "ORIGINAL"
    || input.stockEvidenceHeader.sourceDomain !== "CAJAS" || input.stockEvidenceHeader.sourceEntityType !== "CAJAS_DISPATCH" || input.stockEvidenceHeader.sourceEntityId !== input.dispatchHeader.id || input.stockEvidenceHeader.sourceCheckpoint !== "DISPATCH"
    || input.stockEvidenceHeader.correctsEvidenceId !== null || input.stockEvidenceHeader.reversesEvidenceId !== null || reservations.some(row => row.kind !== "APPLY_TO_DISPATCH" || row.replacesEvidenceId !== null)
    || reservations.length !== reservationEffects.length || reservations.some((row, index) => row.id !== reservationEffects[index].stockReservationEvidenceId)
    || input.dispatchHeader.id !== input.resultEntityId || input.dispatchHeader.recordKind !== "ORIGINAL" || input.dispatchHeader.correctsDispatchId !== null) invalid()
  const stock = [...input.stockEvidenceLines].sort((a, b) => Number(a.lineNumber) - Number(b.lineNumber))
  const dispatch = [...input.dispatchLines].sort((a, b) => Number(a.lineNumber) - Number(b.lineNumber))
  const totals = new Map<string, number>()
  for (let index = 0; index < stock.length; index++) {
    const a = stock[index], b = dispatch[index]
    const quantity = quantityUnits(a.quantity, a.scaleSnapshot as number)
    if (quantity === null) invalid()
    const safeQuantity = quantity as number
    if (!quantityUnits(b.quantity, b.scaleSnapshot as number) || a.evidenceId !== input.stockEvidenceHeader.id || !reservations.some(row => row.reservationId === a.reservationId)
      || !isSafePositiveInteger(a.lineNumber) || !isSafePositiveInteger(b.lineNumber) || !isSafeScale(a.scaleSnapshot) || !isSafeScale(b.scaleSnapshot)
      || a.fromPositionId == null || a.toPositionId !== null || b.dispatchId !== input.dispatchHeader.id || b.assignmentId !== input.dispatchHeader.assignmentId || b.remitoId !== input.dispatchHeader.remitoId || b.stockEvidenceLineId !== a.id || !same(a.lineNumber, b.lineNumber)
      || !same(a.articleId, b.articleId) || !same(a.fromPositionId, b.stockPositionId) || !same(a.quantity, b.quantity) || !same(a.stockUnit, b.stockUnit)
      || !same(a.scaleSnapshot, b.scaleSnapshot) || !same(a.lotCodeSnapshot, b.lotCodeSnapshot) || !same(a.expirationDateSnapshot, b.expirationDateSnapshot)
      || !same(a.serialNumberSnapshot, b.serialNumberSnapshot) || !same(a.identifiedCodeSnapshot, b.identifiedCodeSnapshot) || !same(a.traceSnapshot, b.traceabilitySnapshot)
      || quantityScale(a.quantity as string) > a.scaleSnapshot || b.recordKind !== "ORIGINAL" || b.accountingSign !== 1 || b.neutralizesDispatchLineId !== null) invalid()
    const total = (totals.get(String(a.reservationId)) ?? 0) + safeQuantity
    if (!Number.isSafeInteger(total)) invalid()
    totals.set(String(a.reservationId), total)
  }
  if (reservations.some(row => !quantityUnits(row.quantity) || !isSafeScale(row.scaleSnapshot)
    || quantityScale(row.quantity as string) > row.scaleSnapshot
    || !stock.some(line => line.reservationId === row.reservationId)
    || stock.some(line => line.reservationId === row.reservationId && (line.stockUnit !== row.stockUnit || line.scaleSnapshot !== row.scaleSnapshot))
    || quantityUnits(row.quantity, row.scaleSnapshot as number) !== totals.get(String(row.reservationId)))) invalid()
  return frozenClone(input)
}
