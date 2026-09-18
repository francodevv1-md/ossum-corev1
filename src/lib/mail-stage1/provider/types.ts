export type ProviderConversationSnapshot = {
  provider: string
  mailbox: string
  externalConversationId: string
  externalThreadId?: string
  subject: string
  participants: Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }>
  latestMessageAt: string
  messages: Array<{
    id: string
    sentAt: string
    from: string
    to: string[]
    cc: string[]
    snippet: string
    bodyText?: string
    bodyHtml?: string
  }>
  attachments: Array<{
    attachmentId: string
    fileName: string
    mimeType: string
    sizeBytes?: number
    providerAttachmentRef: string
    contentDisposition?: string
    contentId?: string
  }>
}

export type MockMailboxConversationSummary = {
  externalConversationId: string
  subject: string
  participants: Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }>
  latestMessageAt: string
  messageCount: number
  previewSnippet: string
  latestMessageBodyText?: string
  attachments: Array<{
    attachmentId: string
    fileName: string
    mimeType: string
    sizeBytes?: number
    providerAttachmentRef: string
    contentDisposition?: string
    contentId?: string
  }>
}

export interface MailProviderAdapter {
  readonly providerName: string
  listMailboxConversations(input: {
    mailbox: string
    query?: string
    limit?: number
    companyId?: string
  }): Promise<MockMailboxConversationSummary[]>
  getConversationSnapshot(input: {
    mailbox: string
    externalConversationId: string
    companyId?: string
  }): Promise<ProviderConversationSnapshot>
  downloadAttachment(input: {
    mailbox: string
    externalConversationId: string
    providerAttachmentRef: string
    companyId?: string
  }): Promise<{ buffer: Buffer; fileName: string; mimeType: string }>
}
