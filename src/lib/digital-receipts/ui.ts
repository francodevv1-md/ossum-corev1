import type {
  CreateDigitalReceiptDraftInput,
  DigitalReceipt,
  DigitalReceiptAccess,
  DigitalReceiptActorRef,
  DigitalReceiptAggregate,
  DigitalReceiptSigner,
  DigitalReceiptSignerRole,
  IssueDigitalReceiptInput,
  ReissueDigitalReceiptAccessInput,
  ReissueDigitalReceiptAccessResult,
  SafeDigitalReceiptAggregate,
  SafeDigitalReceiptAccess,
} from "@/lib/digital-receipts"

export type ReceiptUiStatus = "draft" | "sent" | "viewed" | "signed" | "expired" | "revoked"

export const RECEIPT_ROLE_LABELS: Record<DigitalReceiptSignerRole, string> = {
  patient: "Paciente",
  authorized_payer: "Pagador autorizado",
}

export const RECEIPT_STATUS_LABELS: Record<ReceiptUiStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  viewed: "Visto",
  signed: "Firmado",
  expired: "Vencido",
  revoked: "Revocado",
}

export type ReceiptFlowContext = {
  from?: string
  surgeryId?: string
  invoice?: string
}

export type ReceiptCreateDefaults = {
  source: "backend_context"
  surgeryId: string
  companyName: string
  issuerArea: string
  expedienteLabel: string
  patient: ReceiptParty
  payer?: ReceiptParty
  defaultSignerRole: DigitalReceiptSignerRole
  concept: string
  notes: string
  shareChannel: string
  expiresInHours: number
}

export type ReceiptParty = {
  name: string
  document: string
  relationLabel: string
}

export type ReceiptLineItem = {
  label: string
  detail: string
  amount: number
}

export type ReceiptEventView = {
  id: string
  label: string
  detail: string
  at: string
}

export type DigitalReceiptViewModel = {
  id: string
  receiptNumber: string
  status: ReceiptUiStatus
  rawStatus: DigitalReceipt["status"]
  issueDate: string
  dueDate: string
  amount: number
  concept: string
  paymentMethod: string
  issuerName: string
  issuerArea: string
  companyName: string
  surgeryId: string
  expedienteLabel: string
  surgeryDate?: string
  surgeonName?: string
  institutionName?: string
  patient: ReceiptParty
  signerRole: DigitalReceiptSignerRole
  signer: ReceiptParty
  payer?: ReceiptParty
  notes: string
  lineItems: ReceiptLineItem[]
  events: ReceiptEventView[]
  viewedCount: number
  allowPdfBeforeSign: boolean
  allowPdfAfterSign: boolean
  shareChannel: string
  expiresInHours: number
  activeAccessId?: string
  activeAccessStatus?: DigitalReceiptAccess["status"]
  activeAccessTokenLastFour?: string
  demoPublicAvailable: boolean
}

export type CreateInternalReceiptDraftPayload = Pick<
  CreateDigitalReceiptDraftInput,
  "surgeryId" | "concept" | "amount" | "currentSignerRole" | "signers" | "expiresAt"
>

export type IssueInternalReceiptPayload = Pick<
  IssueDigitalReceiptInput,
  "signerRole" | "signerId" | "expiresAt" | "channel" | "recipientEmail" | "recipientPhone"
>

export type ReissueInternalReceiptPayload = Pick<
  ReissueDigitalReceiptAccessInput,
  "signerRole" | "signerId" | "expiresAt" | "channel" | "recipientEmail" | "recipientPhone"
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function formatDateTimeLabel(value?: string) {
  if (!value) return "Sin fecha"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatDateLabel(value: Date) {
  return value.toISOString().slice(0, 10)
}

function computeHoursUntil(dateIso?: string) {
  if (!dateIso) return 72
  const diff = new Date(dateIso).getTime() - Date.now()
  if (Number.isNaN(diff)) return 72
  return Math.max(1, Math.round(diff / (1000 * 60 * 60)))
}

function buildParty(
  signer: Partial<DigitalReceiptSigner> | undefined,
  fallbackLabel: string,
  fallbackName = "Firmante pendiente",
  fallbackDocument = "DNI pendiente"
): ReceiptParty {
  return {
    name: signer?.displayName ?? fallbackName,
    document: signer?.documentNumber ?? fallbackDocument,
    relationLabel: signer?.relationshipLabel ?? fallbackLabel,
  }
}

function readDraftMetadata(receipt: DigitalReceipt) {
  const metadata = isRecord(receipt.metadata) ? receipt.metadata : undefined
  const draft = metadata && isRecord(metadata.draft) ? metadata.draft : undefined
  const placeholders = metadata && isRecord(metadata.placeholders) ? metadata.placeholders : undefined

  return {
    concept: normalizeString(draft?.concept) ?? "Recibo digital interno",
    amount: typeof draft?.amount === "number" ? draft.amount : 0,
    expiresAt: normalizeString(draft?.expiresAt),
    emitter: placeholders && isRecord(placeholders.emitter) ? placeholders.emitter : undefined,
    surgery: placeholders && isRecord(placeholders.surgery) ? placeholders.surgery : undefined,
    legal: placeholders && isRecord(placeholders.legal) ? placeholders.legal : undefined,
  }
}

function readSnapshotPayload(aggregate: DigitalReceiptAggregate | SafeDigitalReceiptAggregate) {
  const payload = aggregate.receipt.latestSnapshot?.payload
  return isRecord(payload) ? payload : undefined
}

function resolveDisplayStatus(
  receipt: DigitalReceipt,
  activeAccess?: Pick<DigitalReceiptAccess, "firstOpenedAt" | "lastOpenedAt"> | Pick<SafeDigitalReceiptAccess, "firstOpenedAt" | "lastOpenedAt">
): ReceiptUiStatus {
  if (receipt.status === "draft") return "draft"
  if (receipt.status === "signed") return "signed"
  if (receipt.status === "expired") return "expired"
  if (receipt.status === "revoked") return "revoked"
  if (activeAccess?.firstOpenedAt || activeAccess?.lastOpenedAt) return "viewed"
  return "sent"
}

function resolveEventLabel(type: string) {
  switch (type) {
    case "created":
      return "Recibo generado"
    case "issued":
      return "Recibo emitido"
    case "access_created":
      return "Link emitido"
    case "access_opened":
      return "Link visualizado"
    case "access_consumed":
      return "Link consumido"
    case "signed":
      return "Recibo firmado"
    case "snapshot_created":
      return "Snapshot generado"
    case "artifact_created":
      return "Artefacto generado"
    case "expired":
      return "Link vencido"
    case "revoked":
      return "Revocado"
    default:
      return type
  }
}

function mapEvents(aggregate: DigitalReceiptAggregate | SafeDigitalReceiptAggregate): ReceiptEventView[] {
  return aggregate.events.map((event) => ({
    id: event.eventId,
    label: resolveEventLabel(event.type),
    detail: event.detail ?? "Evento interno registrado por backend.",
    at: formatDateTimeLabel(event.happenedAt),
  }))
}

export function mapDigitalReceiptToViewModel(
  aggregate: DigitalReceiptAggregate | SafeDigitalReceiptAggregate
): DigitalReceiptViewModel {
  const { receipt } = aggregate
  const snapshot = readSnapshotPayload(aggregate)
  const draft = readDraftMetadata(receipt)
  const activeAccess = aggregate.accesses.find((access) => access.accessId === receipt.activeAccessId)
  const patientSigner = receipt.signers.find((signer) => signer.role === "patient")
  const payerSigner = receipt.signers.find((signer) => signer.role === "authorized_payer")
  const currentSigner = receipt.signers.find((signer) => signer.role === receipt.currentSignerRole) ?? patientSigner ?? payerSigner
  const emitter = snapshot && isRecord(snapshot.emitter) ? snapshot.emitter : draft.emitter
  const surgery = snapshot && isRecord(snapshot.surgery) ? snapshot.surgery : draft.surgery
  const legal = snapshot && isRecord(snapshot.legal) ? snapshot.legal : draft.legal
  const concepts = snapshot && Array.isArray(snapshot.concepts) ? snapshot.concepts : undefined
  const amountRecord = snapshot && isRecord(snapshot.amount) ? snapshot.amount : undefined
  const displayAmount = typeof amountRecord?.total === "number" ? amountRecord.total : draft.amount
  const lineItems = concepts?.length
    ? concepts.map((concept, index) => {
        const item = isRecord(concept) ? concept : {}
        return {
          label: normalizeString(item.label) ?? `Concepto ${index + 1}`,
          detail: normalizeString(item.description) ?? "Sin detalle adicional",
          amount: typeof item.amount === "number" ? item.amount : displayAmount,
        }
      })
    : [
        {
          label: "Cobro registrado",
          detail: draft.concept,
          amount: displayAmount,
        },
      ]

  const issuedAt = snapshot && isRecord(snapshot.receipt) ? normalizeString(snapshot.receipt.issuedAt) : undefined
  const dueDate = activeAccess?.expiredAt ?? draft.expiresAt ?? receipt.expiredAt ?? receipt.issuedAt
  const patientName = normalizeString(surgery?.patientDisplayName) ?? normalizeString(patientSigner?.displayName) ?? "Paciente"
  const patientDocument =
    normalizeString(surgery?.patientDocumentNumber) ?? normalizeString(patientSigner?.documentNumber) ?? "DNI pendiente"
  const payerName = normalizeString(payerSigner?.displayName) ?? normalizeString(surgery?.payerName)
  const payerDocument = normalizeString(payerSigner?.documentNumber)

  return {
    id: receipt.receiptId,
    receiptNumber: receipt.receiptNumber,
    status: resolveDisplayStatus(receipt, activeAccess),
    rawStatus: receipt.status,
    issueDate: issuedAt ?? receipt.issuedAt,
    dueDate,
    amount: displayAmount,
    concept: lineItems[0]?.detail === draft.concept ? draft.concept : draft.concept,
    paymentMethod: "Pendiente de integración",
    issuerName: normalizeString(emitter?.displayName) ?? normalizeString(receipt.issuedBy?.actorDisplayName) ?? "Operador interno",
    issuerArea: normalizeString(emitter?.branchName) ?? "Backoffice OSSUM COR",
    companyName: normalizeString(emitter?.legalName) ?? normalizeString(emitter?.displayName) ?? "Compañía activa",
    surgeryId: receipt.surgeryId,
    expedienteLabel: normalizeString(surgery?.procedureLabel)
      ? `Expediente · ${normalizeString(surgery?.procedureLabel)}`
      : `Cirugía ${receipt.surgeryId}`,
    surgeryDate: normalizeString(surgery?.procedureDate) ?? normalizeString(surgery?.surgeryDate),
    surgeonName: normalizeString(surgery?.surgeonDisplayName),
    institutionName: normalizeString(surgery?.facilityName),
    patient: buildParty(patientSigner, "Paciente", patientName, patientDocument),
    signerRole: receipt.currentSignerRole,
    signer: buildParty(currentSigner, receipt.currentSignerRole === "patient" ? "Paciente firmante" : "Pagador autorizado"),
    payer: payerName
      ? buildParty(payerSigner, "Pagador autorizado", payerName, payerDocument ?? patientDocument)
      : undefined,
    notes:
      normalizeString(legal?.disclaimer) ??
      "El backend interno ya persiste el recibo. La preview pública real depende del token vigente del acceso activo en la sesión que lo emitió o reemitió.",
    lineItems,
    events: mapEvents(aggregate),
    viewedCount: aggregate.accesses.filter((access) => access.firstOpenedAt || access.lastOpenedAt).length,
    allowPdfBeforeSign: true,
    allowPdfAfterSign: true,
    shareChannel: activeAccess?.channel ?? "internal",
    expiresInHours: computeHoursUntil(dueDate),
    activeAccessId: activeAccess?.accessId,
    activeAccessStatus: activeAccess?.status,
    activeAccessTokenLastFour: activeAccess?.tokenLastFour,
    demoPublicAvailable: false,
  }
}

export function buildReceiptFlowQuery(context?: ReceiptFlowContext) {
  const params = new URLSearchParams()
  if (context?.from) params.set("from", context.from)
  if (context?.surgeryId) params.set("surgeryId", context.surgeryId)
  if (context?.invoice) params.set("invoice", context.invoice)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function getReceiptFlowContextItems(context?: ReceiptFlowContext) {
  if (!context) return [] as string[]
  return [
    context.from ? `Origen: ${context.from}` : null,
    context.surgeryId ? `Cirugía: ${context.surgeryId}` : null,
    context.invoice ? `Factura: ${context.invoice}` : null,
  ].filter(Boolean) as string[]
}

export function getReceiptFlowSourceLabel(context?: ReceiptFlowContext) {
  if (context?.from === "expediente") return "Expediente"
  if (context?.from === "cobros") return "Cobros"
  if (context?.from) return context.from
  if (context?.surgeryId || context?.invoice) return "Entrada contextual"
  return "Bandeja interna"
}

export function buildDraftSigners(base: {
  surgeryId: string
  patient: ReceiptParty
  payer?: ReceiptParty
  fallbackSigner?: ReceiptParty
}) {
  const patientSigner = {
    signerId: `patient-${base.surgeryId}`,
    role: "patient" as const,
    displayName: base.patient.name,
    documentNumber: base.patient.document,
    relationshipLabel: base.patient.relationLabel,
  }

  const payer = base.payer ?? base.fallbackSigner

  return payer
    ? [
        patientSigner,
        {
          signerId: `authorized-payer-${base.surgeryId}`,
          role: "authorized_payer" as const,
          displayName: payer.name,
          documentNumber: payer.document,
          relationshipLabel: payer.relationLabel,
        },
      ]
    : [patientSigner]
}

export function resolveIssueSignerId(signers: Array<{ signerId: string; role: DigitalReceiptSignerRole }>, role: DigitalReceiptSignerRole) {
  return signers.find((signer) => signer.role === role)?.signerId
}

export function buildReceiptCreatePreview(input: {
  defaults: ReceiptCreateDefaults
  issuerName?: string
  signerRole: DigitalReceiptSignerRole
  signerDocument: string
  concept: string
  amount: number
  expiresInHours: number
  notes: string
  shareChannel: string
}): DigitalReceiptViewModel {
  const signer = input.signerRole === "patient" ? input.defaults.patient : input.defaults.payer ?? input.defaults.patient
  const now = new Date()
  const dueDate = new Date(now.getTime() + input.expiresInHours * 60 * 60 * 1000)

  return {
    id: `draft-preview-${input.defaults.surgeryId}`,
    receiptNumber: "Se asigna al crear borrador",
    status: "draft",
    rawStatus: "draft",
    issueDate: formatDateLabel(now),
    dueDate: formatDateLabel(dueDate),
    amount: input.amount,
    concept: input.concept,
    paymentMethod: "A definir al registrar el cobro",
    issuerName: input.issuerName ?? "Operador interno",
    issuerArea: input.defaults.issuerArea,
    companyName: input.defaults.companyName,
    surgeryId: input.defaults.surgeryId,
    expedienteLabel: input.defaults.expedienteLabel,
    patient: input.defaults.patient,
    signerRole: input.signerRole,
    signer: {
      ...signer,
      relationLabel: input.signerRole === "patient" ? "Paciente firmante" : "Pagador autorizado firmante",
      document: input.signerDocument,
    },
    payer: input.defaults.payer,
    notes: input.notes,
    lineItems: [
      {
        label: "Cobro registrado",
        detail: input.concept,
        amount: input.amount,
      },
    ],
    events: [
      {
        id: `preview-${input.defaults.surgeryId}`,
        label: "Borrador contextual",
        detail: "Preview armada con contexto real de compañía/cirugía antes de persistir el recibo.",
        at: formatDateTimeLabel(now.toISOString()),
      },
    ],
    viewedCount: 0,
    allowPdfBeforeSign: false,
    allowPdfAfterSign: true,
    shareChannel: input.shareChannel,
    expiresInHours: input.expiresInHours,
    activeAccessStatus: "active",
    demoPublicAvailable: false,
  }
}

export function mapMutationResultToViewModel(result: ReissueDigitalReceiptAccessResult) {
  return {
    receipt: mapDigitalReceiptToViewModel(result.detail),
    detail: result.detail,
    access: result.access,
    accessToken: result.accessToken,
  }
}

export function resolveActorLabel(actor?: DigitalReceiptActorRef) {
  return actor?.actorDisplayName ?? actor?.actorRole ?? actor?.actorUserId ?? "Sistema"
}
