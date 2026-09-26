export type Wcb06Row = Record<string, unknown> & { id: string }
export type Wcb06Command = {
  companyId: string; commandId: string; actorId: string; resultEntityId: string; completePayloadSha256: string
  authorizationProof: Record<string, unknown>; anchorIdentifiedUnitIds: string[]
  stockEvidenceHeader: Wcb06Row; stockEvidenceLines: Wcb06Row[]; reservationEvidence: Wcb06Row; reservationEvidences?: Wcb06Row[]
  dispatchHeader: Wcb06Row; dispatchLines: Wcb06Row[]
  reservationEffect: Wcb06Row; reservationEffects?: Wcb06Row[]; stockEffect: Wcb06Row
}

export class C14RuntimeError extends Error {
  constructor(public readonly code: string, public readonly httpStatus: number, public readonly attemptCount: number) { super(code) }
}
