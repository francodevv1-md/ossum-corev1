import { C14RuntimeError, type Wcb06Command } from "@/lib/services/c14/bundles/private-writer-runtime"
import { isDeepStrictEqual } from "node:util"

export const definition = Object.freeze({ bundleId: "WCB-06", contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], payloadSectionIds: ["stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "dispatchHeader", "dispatchLines", "reservationEffect", "stockEffect"], bundleRowSha256: "28f17b8991ca4391b5ee1c49aefc93635f28c142df19ac3fadae90904488abd6", productState: "ACTIVATION_CANDIDATE" } as const)
const same = (a: unknown, b: unknown) => isDeepStrictEqual(a, b)
const CONTRACTS = ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"] as const
const SYSTEM = new Set(["companyId", "acceptedAt", "acceptedById", "commandAcceptanceId", "auditEventId", "createdAt", "effectKey", "effectType", "targetKind", "resultEntityType", "resultEntityId"])
const TOP_LEVEL = new Set(["companyId", "commandId", "actorId", "resultEntityId", "completePayloadSha256", "authorizationProof", "anchorIdentifiedUnitIds", "stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "reservationEvidences", "dispatchHeader", "dispatchLines", "reservationEffect", "reservationEffects", "stockEffect"])
const invalid = (): never => { throw new C14RuntimeError("C14_CX08_PAYLOAD_INVALID", 422, 0) }
const positive = (value: unknown) => typeof value === "string" && /^(0|[1-9]\d*)(\.\d{1,4})?$/.test(value) && Number(value) > 0

export function validate(input: Wcb06Command): Readonly<Wcb06Command> {
  if (!input || typeof input !== "object" || Object.keys(input).some(key => !TOP_LEVEL.has(key)) || !input.companyId || !input.commandId || !input.actorId || !input.resultEntityId || !input.authorizationProof || !/^[a-f0-9]{64}$/.test(input.completePayloadSha256)
    || input.authorizationProof.bundleId !== "WCB-06" || input.authorizationProof.companyId !== input.companyId || input.authorizationProof.actorId !== input.actorId
    || !same(input.authorizationProof.contractIds, CONTRACTS)) invalid()
  const pluralReservations = Object.hasOwn(input, "reservationEvidences")
  const pluralEffects = Object.hasOwn(input, "reservationEffects")
  const singularReservations = Object.hasOwn(input, "reservationEvidence")
  const singularEffects = Object.hasOwn(input, "reservationEffect")
  if (pluralReservations !== pluralEffects || singularReservations !== singularEffects) invalid()
  const reservations = pluralReservations ? input.reservationEvidences ?? [] : [input.reservationEvidence]
  const reservationEffects = pluralEffects ? input.reservationEffects ?? [] : [input.reservationEffect]
  if (!Array.isArray(reservations) || !reservations.length || new Set(reservations.map(row => row?.reservationId)).size !== reservations.length || !Array.isArray(reservationEffects) || !reservationEffects.length
    || pluralReservations && singularReservations && (!same(input.reservationEvidence, reservations[0]) || !same(input.reservationEffect, reservationEffects[0]))) invalid()
  const rows = [input.stockEvidenceHeader, ...input.stockEvidenceLines, ...reservations, input.dispatchHeader, ...input.dispatchLines, ...reservationEffects, input.stockEffect]
  if (!input.stockEvidenceLines.length || input.stockEvidenceLines.length !== input.dispatchLines.length || rows.some(row => !row?.id || Object.keys(row).some(key => SYSTEM.has(key)))) invalid()
  if (input.stockEvidenceHeader.id !== input.stockEffect.stockEvidenceId || input.stockEvidenceHeader.kind !== "DISPATCH" || input.stockEvidenceHeader.recordKind !== "ORIGINAL"
    || input.stockEvidenceHeader.correctsEvidenceId !== null || input.stockEvidenceHeader.reversesEvidenceId !== null || reservations.some(row => row.kind !== "APPLY_TO_DISPATCH" || row.replacesEvidenceId !== null)
    || reservations.length !== reservationEffects.length || reservations.some((row, index) => row.id !== reservationEffects[index].stockReservationEvidenceId)
    || input.dispatchHeader.id !== input.resultEntityId || input.dispatchHeader.recordKind !== "ORIGINAL" || input.dispatchHeader.correctsDispatchId !== null) invalid()
  const stock = [...input.stockEvidenceLines].sort((a, b) => Number(a.lineNumber) - Number(b.lineNumber))
  const dispatch = [...input.dispatchLines].sort((a, b) => Number(a.lineNumber) - Number(b.lineNumber))
  const totals = new Map<string, number>()
  for (let index = 0; index < stock.length; index++) {
    const a = stock[index], b = dispatch[index]
    if (!positive(a.quantity) || !positive(b.quantity) || a.evidenceId !== input.stockEvidenceHeader.id || !reservations.some(row => row.reservationId === a.reservationId)
      || a.fromPositionId == null || a.toPositionId !== null || b.dispatchId !== input.dispatchHeader.id || b.stockEvidenceLineId !== a.id || !same(a.lineNumber, b.lineNumber)
      || !same(a.articleId, b.articleId) || typeof a.sourceLineId !== "string" || !a.sourceLineId || typeof b.remitoItemId !== "string" || !b.remitoItemId || !same(a.sourceLineId, b.remitoItemId) || !same(a.fromPositionId, b.stockPositionId) || !same(a.quantity, b.quantity) || !same(a.stockUnit, b.stockUnit)
      || !same(a.scaleSnapshot, b.scaleSnapshot) || !same(a.lotCodeSnapshot, b.lotCodeSnapshot) || !same(a.expirationDateSnapshot, b.expirationDateSnapshot)
      || !same(a.serialNumberSnapshot, b.serialNumberSnapshot) || !same(a.identifiedCodeSnapshot, b.identifiedCodeSnapshot) || !same(a.traceSnapshot, b.traceabilitySnapshot)
      || b.recordKind !== "ORIGINAL" || b.accountingSign !== 1 || b.neutralizesDispatchLineId !== null) invalid()
    totals.set(String(a.reservationId), (totals.get(String(a.reservationId)) ?? 0) + Number(String(a.quantity)))
  }
  if (reservations.some(row => Number(String(row.quantity)) !== totals.get(String(row.reservationId)))) invalid()
  return Object.freeze(input)
}
