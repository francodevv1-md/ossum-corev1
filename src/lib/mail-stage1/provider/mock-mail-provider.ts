import { notFound, internalError } from "@/lib/api/errors"
import { MAIL_STAGE1_MAILBOX, MAIL_STAGE1_PROVIDER } from "../types"
import type {
  MailProviderAdapter,
  MockMailboxConversationSummary,
  ProviderConversationSnapshot,
} from "./types"

type FixtureAttachment = {
  attachmentId: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  providerAttachmentRef: string
  downloadBehavior?: "ok" | "fail"
}

type FixtureConversation = ProviderConversationSnapshot & {
  previewSnippet: string
  attachments: FixtureAttachment[]
}

const FIXTURES: FixtureConversation[] = [
  {
    provider: MAIL_STAGE1_PROVIDER,
    mailbox: MAIL_STAGE1_MAILBOX,
    externalConversationId: "conv-ortho-001",
    externalThreadId: "thread-ortho-001",
    subject: "Autorización + implantes | Paciente Fernández",
    participants: [
      { name: "Andrea Ruiz", email: "andrea@districorr.com.ar", role: "from" },
      { name: "OS Central", email: "prestaciones@oscentral.com", role: "to" },
      { name: "Depósito", email: "deposito@districorr.com.ar", role: "cc" },
    ],
    latestMessageAt: "2026-06-21T15:24:00.000Z",
    messages: [
      {
        id: "m-1",
        sentAt: "2026-06-20T10:15:00.000Z",
        from: "andrea@districorr.com.ar",
        to: ["prestaciones@oscentral.com"],
        cc: ["deposito@districorr.com.ar"],
        snippet: "Adjunto pedido de autorización y detalle de implantes para cirugía programada.",
        bodyText: "Hola equipo,\n\nAdjunto pedido de autorización y detalle de implantes para la cirugía programada de Fernández.\n\nQuedo atenta.\nAndrea",
        bodyHtml: "<div>Hola equipo,<br><br>Adjunto pedido de autorización y detalle de implantes para la cirugía programada de <strong>Fernández</strong>.<br><br>Quedo atenta.<br>Andrea</div>",
      },
      {
        id: "m-2",
        sentAt: "2026-06-21T15:24:00.000Z",
        from: "prestaciones@oscentral.com",
        to: ["andrea@districorr.com.ar"],
        cc: [],
        snippet: "Autorización recibida. Falta confirmar disponibilidad del set instrumentador.",
        bodyText: "Andrea,\n\nAutorización recibida. Falta confirmar disponibilidad del set instrumentador para liberar la cobertura.\n\nSaludos.",
        bodyHtml: "<div>Andrea,<br><br>Autorización recibida. Falta confirmar disponibilidad del set instrumentador para liberar la cobertura.<br><br>Saludos.</div>",
      },
    ],
    attachments: [
      {
        attachmentId: "a-ortho-1",
        fileName: "autorizacion-fernandez.pdf",
        mimeType: "application/pdf",
        sizeBytes: 248000,
        providerAttachmentRef: "att-ortho-1",
      },
      {
        attachmentId: "a-ortho-2",
        fileName: "detalle-implantes.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: 48200,
        providerAttachmentRef: "att-ortho-2",
      },
      {
        attachmentId: "a-ortho-3",
        fileName: "credencial-fernandez.png",
        mimeType: "image/png",
        sizeBytes: 184200,
        providerAttachmentRef: "att-ortho-3",
      },
    ],
    previewSnippet: "Autorización recibida. Falta confirmar disponibilidad del set instrumentador.",
  },
  {
    provider: MAIL_STAGE1_PROVIDER,
    mailbox: MAIL_STAGE1_MAILBOX,
    externalConversationId: "conv-trauma-002",
    externalThreadId: "thread-trauma-002",
    subject: "Cambio de fecha | CX PR-2041",
    participants: [
      { name: "Coordinación", email: "coord@districorr.com.ar", role: "from" },
      { name: "Clínica del Sur", email: "quirurgicos@clinicadelsur.com", role: "to" },
    ],
    latestMessageAt: "2026-06-19T18:10:00.000Z",
    messages: [
      {
        id: "m-3",
        sentAt: "2026-06-19T11:05:00.000Z",
        from: "coord@districorr.com.ar",
        to: ["quirurgicos@clinicadelsur.com"],
        cc: [],
        snippet: "Reprogramamos la cirugía para el jueves a las 08:30.",
        bodyText: "Buen día,\n\nReprogramamos la cirugía para el jueves a las 08:30. Mantener el kit de trauma reservado.\n\nGracias.",
      },
      {
        id: "m-4",
        sentAt: "2026-06-19T18:10:00.000Z",
        from: "quirurgicos@clinicadelsur.com",
        to: ["coord@districorr.com.ar"],
        cc: [],
        snippet: "Confirmado. Mantener kit de trauma y ayuno según protocolo.",
        bodyText: "Confirmado.\n\nMantener kit de trauma y ayuno según protocolo. Avisar si cambia el horario de ingreso.\n",
      },
    ],
    attachments: [
      {
        attachmentId: "a-trauma-1",
        fileName: "orden-interna.txt",
        mimeType: "text/plain",
        sizeBytes: 1100,
        providerAttachmentRef: "att-trauma-1",
      },
    ],
    previewSnippet: "Confirmado. Mantener kit de trauma y ayuno según protocolo.",
  },
  {
    provider: MAIL_STAGE1_PROVIDER,
    mailbox: MAIL_STAGE1_MAILBOX,
    externalConversationId: "conv-shared-003",
    externalThreadId: "thread-shared-003",
    subject: "Documentación compartida paciente derivado",
    participants: [
      { name: "Ventas", email: "ventas@districorr.com.ar", role: "from" },
      { name: "Instituto Norte", email: "autorizaciones@institutonorte.com", role: "to" },
      { name: "Ingreso", email: "ingresos@districorr.com.ar", role: "cc" },
    ],
    latestMessageAt: "2026-06-18T09:41:00.000Z",
    messages: [
      {
        id: "m-5",
        sentAt: "2026-06-17T17:22:00.000Z",
        from: "ventas@districorr.com.ar",
        to: ["autorizaciones@institutonorte.com"],
        cc: ["ingresos@districorr.com.ar"],
        snippet: "Compartimos documentación del paciente derivado y pedido de cobertura.",
        bodyText: "Compartimos documentación del paciente derivado y pedido de cobertura.\n\nSe adjunta PDF principal.\n",
        bodyHtml: "<div>Compartimos documentación del paciente derivado y pedido de cobertura.<br><br>Se adjunta PDF principal.</div>",
      },
      {
        id: "m-6",
        sentAt: "2026-06-18T09:41:00.000Z",
        from: "autorizaciones@institutonorte.com",
        to: ["ventas@districorr.com.ar"],
        cc: [],
        snippet: "Recibido. Adjuntamos observaciones; conservar este hilo para ambas cirugías.",
        bodyText: "Recibido.\n\nAdjuntamos observaciones; conservar este hilo para ambas cirugías.\n",
        bodyHtml: "<div>Recibido.<br><br>Adjuntamos observaciones; conservar este hilo para ambas cirugías.</div>",
      },
    ],
    attachments: [
      {
        attachmentId: "a-shared-1",
        fileName: "doc-paciente.pdf",
        mimeType: "application/pdf",
        sizeBytes: 64000,
        providerAttachmentRef: "att-shared-1",
      },
      {
        attachmentId: "a-shared-2",
        fileName: "observaciones.txt",
        mimeType: "text/plain",
        sizeBytes: 1600,
        providerAttachmentRef: "att-shared-2",
        downloadBehavior: "fail",
      },
    ],
    previewSnippet: "Recibido. Adjuntamos observaciones; conservar este hilo para ambas cirugías.",
  },
]

function cloneConversation(conversation: FixtureConversation): ProviderConversationSnapshot {
  return JSON.parse(JSON.stringify(conversation)) as ProviderConversationSnapshot
}

function cloneSummary(conversation: FixtureConversation): MockMailboxConversationSummary {
  return JSON.parse(
    JSON.stringify({
      externalConversationId: conversation.externalConversationId,
      subject: conversation.subject,
      participants: conversation.participants,
      latestMessageAt: conversation.latestMessageAt,
      messageCount: conversation.messages.length,
      previewSnippet: conversation.previewSnippet,
      latestMessageBodyText:
        [...conversation.messages].reverse().find((message) => message.bodyText?.trim())?.bodyText,
      attachments: conversation.attachments,
    })
  ) as MockMailboxConversationSummary
}

export class MockMailProvider implements MailProviderAdapter {
  readonly providerName = MAIL_STAGE1_PROVIDER

  async listMailboxConversations(input: {
    mailbox: typeof MAIL_STAGE1_MAILBOX
    query?: string
    limit?: number
  }) {
    if (input.mailbox !== MAIL_STAGE1_MAILBOX) {
      throw notFound("Mailbox not available in Stage 1", "mail_mailbox_not_available")
    }

    const query = input.query?.trim().toLowerCase()
    const filtered = FIXTURES.filter((conversation) => {
      if (!query) return true

      return [
        conversation.subject,
        conversation.previewSnippet,
        ...conversation.participants.map((participant) => `${participant.name ?? ""} ${participant.email}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })

    return filtered.slice(0, input.limit ?? 20).map(cloneSummary)
  }

  async getConversationSnapshot(input: {
    mailbox: typeof MAIL_STAGE1_MAILBOX
    externalConversationId: string
  }) {
    if (input.mailbox !== MAIL_STAGE1_MAILBOX) {
      throw notFound("Mailbox not available in Stage 1", "mail_mailbox_not_available")
    }

    const match = FIXTURES.find(
      (conversation) => conversation.externalConversationId === input.externalConversationId
    )

    if (!match) {
      throw notFound("Conversation not found in mock mailbox", "mail_provider_snapshot_unavailable")
    }

    return cloneConversation(match)
  }

  async downloadAttachment(input: {
    mailbox: typeof MAIL_STAGE1_MAILBOX
    externalConversationId: string
    providerAttachmentRef: string
  }) {
    const conversation = FIXTURES.find(
      (item) => item.externalConversationId === input.externalConversationId && item.mailbox === input.mailbox
    )

    if (!conversation) {
      throw notFound("Conversation not found in mock mailbox", "mail_provider_snapshot_unavailable")
    }

    const attachment = conversation.attachments.find(
      (item) => item.providerAttachmentRef === input.providerAttachmentRef
    ) as FixtureAttachment | undefined

    if (!attachment) {
      throw notFound("Attachment not found in mock mailbox", "mail_attachment_not_found")
    }

    if (attachment.downloadBehavior === "fail") {
      throw internalError(
        `Mock attachment download failed for ${attachment.fileName}`,
        "mail_attachment_persist_failed"
      )
    }

    return {
      buffer: Buffer.from(`Mock binary for ${attachment.fileName}`),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    }
  }
}

export const mockMailProvider = new MockMailProvider()
