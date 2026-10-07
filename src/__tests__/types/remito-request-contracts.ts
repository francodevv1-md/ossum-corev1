import type { z } from "zod"
import type { UpdateRemitoDraftPayload, RemitoOrigin, RemitoSalidaReason, RemitoState } from "@/lib/api/remitos"
import type { remitoCreateSchema, remitoDraftUpdateSchema, remitoStateTransitionSchema, remitoListQuerySchema } from "@/lib/validators/remito"

const metadataOnly: UpdateRemitoDraftPayload = { metadata: { note: "Partial edit" } }
const clearSurgery: UpdateRemitoDraftPayload = { surgeryId: null }
const replaceItems: UpdateRemitoDraftPayload = { items: [{ description: "Implant", quantity: "0.5" }] }
const updateWithVersion: UpdateRemitoDraftPayload = { expectedUpdatedAt: "2026-10-07T00:00:00Z", declaredValue: null }
// @ts-expect-error Origin remains immutable on PATCH.
const invalidOrigin: UpdateRemitoDraftPayload = { origin: "manual" }

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T
type CreateInput = z.input<typeof remitoCreateSchema>
type PatchInput = z.input<typeof remitoDraftUpdateSchema>
type TransitionInput = z.input<typeof remitoStateTransitionSchema>
type QueryInput = z.input<typeof remitoListQuerySchema>
export type OriginLiteral = Assert<Equal<CreateInput["origin"], RemitoOrigin>>
export type ReasonLiteral = Assert<Equal<CreateInput["salidaReason"], RemitoSalidaReason>>
export type PatchReasonLiteral = Assert<Equal<PatchInput["salidaReason"], RemitoSalidaReason | undefined>>
export type TransitionLiteral = Assert<Equal<TransitionInput["state"], RemitoState | undefined>>
export type QueryStateLiteral = Assert<Equal<QueryInput["state"], RemitoState | undefined>>
export type QueryOriginLiteral = Assert<Equal<QueryInput["origin"], RemitoOrigin | undefined>>
export type QueryReasonLiteral = Assert<Equal<QueryInput["salidaReason"], RemitoSalidaReason | undefined>>
void [metadataOnly, clearSurgery, replaceItems, updateWithVersion, invalidOrigin]
