export type ReceiptStatus = "draft" | "sent" | "viewed" | "signed" | "expired"

export type ReceiptSignerRole = "patient" | "authorized_payer"

export interface ReceiptFlowContext {
  from?: string
  surgeryId?: string
  invoice?: string
}

export interface ReceiptParty {
  name: string
  document: string
  relationLabel: string
}

export interface ReceiptLineItem {
  label: string
  detail: string
  amount: number
}

export interface ReceiptEvent {
  id: string
  label: string
  detail: string
  at: string
}

export interface DigitalReceiptMock {
  id: string
  token: string
  receiptNumber: string
  status: ReceiptStatus
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
  patient: ReceiptParty
  signerRole: ReceiptSignerRole
  signer: ReceiptParty
  payer?: ReceiptParty
  notes: string
  lineItems: ReceiptLineItem[]
  events: ReceiptEvent[]
  viewedCount: number
  allowPdfBeforeSign: boolean
  allowPdfAfterSign: boolean
  shareChannel: string
  expiresInHours: number
}

export const RECEIPT_ROLE_LABELS: Record<ReceiptSignerRole, string> = {
  patient: "Paciente",
  authorized_payer: "Pagador autorizado",
}

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  viewed: "Visto",
  signed: "Firmado",
  expired: "Vencido",
}

export const digitalReceiptsMock: DigitalReceiptMock[] = [
  {
    id: "rdb-24001",
    token: "tok-recibo-pendiente-24001",
    receiptNumber: "RD-0001-000024001",
    status: "viewed",
    issueDate: "2026-06-29",
    dueDate: "2026-07-02",
    amount: 185000,
    concept: "Cobro de seña por cirugía programada + reserva de implantes",
    paymentMethod: "Transferencia bancaria",
    issuerName: "Carla Miranda",
    issuerArea: "Administración Comercial",
    companyName: "OSSUM COR Demo",
    surgeryId: "CX-1842",
    expedienteLabel: "Expediente 1842 · LCA rodilla derecha",
    patient: {
      name: "Valentina Gómez",
      document: "31.442.908",
      relationLabel: "Paciente",
    },
    signerRole: "patient",
    signer: {
      name: "Valentina Gómez",
      document: "31.442.908",
      relationLabel: "Paciente firmante",
    },
    payer: {
      name: "Valentina Gómez",
      document: "31.442.908",
      relationLabel: "Pagadora",
    },
    notes: "El recibo digital no reemplaza comprobante fiscal. La firma deja constancia de conformidad por recepción del cobro registrado.",
    lineItems: [
      {
        label: "Seña cirugía",
        detail: "Reserva de fecha quirúrgica y coordinación inicial",
        amount: 120000,
      },
      {
        label: "Reserva de materiales",
        detail: "Bloqueo de stock crítico para implantes",
        amount: 65000,
      },
    ],
    events: [
      {
        id: "evt-1",
        label: "Recibo generado",
        detail: "Se creó desde Cobros con firma requerida para paciente.",
        at: "2026-06-29 09:14",
      },
      {
        id: "evt-2",
        label: "Link enviado",
        detail: "Enviado por WhatsApp comercial con vencimiento de 72 h.",
        at: "2026-06-29 09:18",
      },
      {
        id: "evt-3",
        label: "Link visualizado",
        detail: "Primera visualización registrada desde iPhone Safari.",
        at: "2026-06-29 10:02",
      },
    ],
    viewedCount: 2,
    allowPdfBeforeSign: true,
    allowPdfAfterSign: true,
    shareChannel: "WhatsApp + email",
    expiresInHours: 72,
  },
  {
    id: "rdb-24002",
    token: "tok-recibo-firmado-24002",
    receiptNumber: "RD-0001-000024002",
    status: "signed",
    issueDate: "2026-06-27",
    dueDate: "2026-06-30",
    amount: 324500,
    concept: "Cobro total de entrega programada + conformidad de pagador autorizado",
    paymentMethod: "Tarjeta débito + saldo caja",
    issuerName: "Mauro Ricci",
    issuerArea: "Caja Principal",
    companyName: "OSSUM COR Demo",
    surgeryId: "CX-1835",
    expedienteLabel: "Expediente 1835 · Cadera izquierda",
    patient: {
      name: "Tomás Ferreyra",
      document: "29.118.552",
      relationLabel: "Paciente",
    },
    signerRole: "authorized_payer",
    signer: {
      name: "Marina Ferreyra",
      document: "24.905.778",
      relationLabel: "Madre / pagadora autorizada",
    },
    payer: {
      name: "Marina Ferreyra",
      document: "24.905.778",
      relationLabel: "Pagadora",
    },
    notes: "Firma capturada una sola vez. PDF firmado disponible en expediente y cobros.",
    lineItems: [
      {
        label: "Entrega principal",
        detail: "Implantes + set complementario",
        amount: 280000,
      },
      {
        label: "Diferencia logística",
        detail: "Cobertura de entrega urgente",
        amount: 44500,
      },
    ],
    events: [
      {
        id: "evt-1",
        label: "Recibo generado",
        detail: "Emitido desde cobro aplicado a cirugía CX-1835.",
        at: "2026-06-27 11:06",
      },
      {
        id: "evt-2",
        label: "Link enviado",
        detail: "Email enviado con descarga PDF previa habilitada.",
        at: "2026-06-27 11:10",
      },
      {
        id: "evt-3",
        label: "Recibo firmado",
        detail: "DNI validado y firma confirmada por pagadora autorizada.",
        at: "2026-06-27 13:42",
      },
    ],
    viewedCount: 4,
    allowPdfBeforeSign: true,
    allowPdfAfterSign: true,
    shareChannel: "Email",
    expiresInHours: 48,
  },
  {
    id: "rdb-24003",
    token: "tok-recibo-vencido-24003",
    receiptNumber: "RD-0001-000024003",
    status: "expired",
    issueDate: "2026-06-24",
    dueDate: "2026-06-26",
    amount: 98000,
    concept: "Cobro parcial de reserva de fecha con link vencido pendiente de reenvío",
    paymentMethod: "Transferencia pendiente de acreditación",
    issuerName: "Carla Miranda",
    issuerArea: "Administración Comercial",
    companyName: "OSSUM COR Demo",
    surgeryId: "CX-1819",
    expedienteLabel: "Expediente 1819 · Hombro derecho",
    patient: {
      name: "Julián Martínez",
      document: "33.880.417",
      relationLabel: "Paciente",
    },
    signerRole: "patient",
    signer: {
      name: "Julián Martínez",
      document: "33.880.417",
      relationLabel: "Paciente firmante",
    },
    notes: "Mock para demo de reenvío / regeneración visual. No permite firmar porque el link venció.",
    lineItems: [
      {
        label: "Reserva de fecha",
        detail: "Cobro parcial con vencimiento corto",
        amount: 98000,
      },
    ],
    events: [
      {
        id: "evt-1",
        label: "Recibo generado",
        detail: "Se generó con expiración acelerada para demo.",
        at: "2026-06-24 15:03",
      },
      {
        id: "evt-2",
        label: "Link vencido",
        detail: "No se registró firma dentro de las 48 h definidas.",
        at: "2026-06-26 15:03",
      },
    ],
    viewedCount: 1,
    allowPdfBeforeSign: true,
    allowPdfAfterSign: true,
    shareChannel: "WhatsApp",
    expiresInHours: 48,
  },
]

export function getDigitalReceiptById(receiptId: string) {
  return digitalReceiptsMock.find((receipt) => receipt.id === receiptId)
}

export function getDigitalReceiptByToken(token: string) {
  return digitalReceiptsMock.find((receipt) => receipt.token === token)
}

export function getDigitalReceiptStats() {
  const total = digitalReceiptsMock.length
  const signed = digitalReceiptsMock.filter((receipt) => receipt.status === "signed").length
  const pendingSignature = digitalReceiptsMock.filter((receipt) => ["sent", "viewed"].includes(receipt.status)).length
  const expired = digitalReceiptsMock.filter((receipt) => receipt.status === "expired").length
  const totalAmount = digitalReceiptsMock.reduce((sum, receipt) => sum + receipt.amount, 0)

  return { total, signed, pendingSignature, expired, totalAmount }
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
  if (context?.from === "expediente") return "Expediente mock"
  if (context?.from === "cobros") return "Cobros mock"
  if (context?.from) return `${context.from} mock`
  if (context?.surgeryId || context?.invoice) return "Entrada contextual"
  return "Bandeja mock"
}
