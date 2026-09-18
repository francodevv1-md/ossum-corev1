import { notFound, conflict, internalError } from "@/lib/api/errors"
import type {
  MailProviderAdapter,
  MockMailboxConversationSummary,
  ProviderConversationSnapshot,
} from "./types"
import { GmailConnectionManager } from "../gmail/connection-manager"
import { EncryptedTokenStore } from "../gmail/token-store"
import { google } from "googleapis"
import type { gmail_v1 } from "googleapis"

// ── Rate limiter ──────────────────────────────────────────────────
class SlidingWindowRateLimiter {
  private timestamps: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 200, windowMs = 100_000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  check(): void {
    const now = Date.now()
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs)
    if (this.timestamps.length >= this.maxRequests) {
      throw conflict(
        "Gmail rate limit exceeded — retry shortly",
        "mail_gmail_rate_limited"
      )
    }
    this.timestamps.push(now)
  }
}

// ── Header parsing helpers ────────────────────────────────────────
function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
}

function parseAddressList(raw: string): Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }> {
  if (!raw) return []
  return raw.split(",").map((addr) => {
    const trimmed = addr.trim()
    const match = trimmed.match(/^"?([^"<]*?)"?\s*<(.+?)>$/)
    if (match) {
      return { name: match[1].trim() || undefined, email: match[2].trim() }
    }
    return { email: trimmed }
  })
}

function decodeRfc2047(value: string): string {
  // Decode =?UTF-8?B?...?= and =?UTF-8?Q?...?= encoded words
  return value.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_m, _charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        return Buffer.from(text, "base64").toString("utf-8")
      }
      if (encoding.toUpperCase() === "Q") {
        return text
          .replace(/_/g, " ")
          .replace(/=([0-9A-Fa-f]{2})/g, (_m2, hex) => String.fromCharCode(parseInt(hex, 16)))
      }
    } catch { /* fall through */ }
    return text
  })
}

function getPartHeader(part: gmail_v1.Schema$MessagePart | undefined, name: string): string {
  return part?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
}

type CollectedAttachment = {
  attachmentId: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  providerAttachmentRef: string
  contentDisposition?: string
  contentId?: string
}

type CollectedBodies = {
  textParts: string[]
  htmlParts: string[]
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  return Buffer.from(padded, "base64").toString("utf8")
}

function collectBodiesFromPart(
  part: gmail_v1.Schema$MessagePart | undefined,
  bucket: CollectedBodies
) {
  if (!part) return

  const mimeType = (part.mimeType ?? "").toLowerCase()
  const inlineData = part.body?.data

  if (inlineData && !part.filename) {
    const decoded = decodeBase64Url(inlineData)
    if (mimeType === "text/plain") {
      bucket.textParts.push(decoded)
    }
    if (mimeType === "text/html") {
      bucket.htmlParts.push(decoded)
    }
  }

  for (const child of part.parts ?? []) {
    collectBodiesFromPart(child, bucket)
  }
}

function extractMessageBodies(payload: gmail_v1.Schema$MessagePart | undefined) {
  const bucket: CollectedBodies = { textParts: [], htmlParts: [] }
  collectBodiesFromPart(payload, bucket)

  return {
    bodyText: bucket.textParts.join("\n\n").trim() || undefined,
    bodyHtml: bucket.htmlParts.join("\n<hr>\n").trim() || undefined,
  }
}

function collectAttachmentsFromPart(
  threadId: string,
  messageId: string,
  part: gmail_v1.Schema$MessagePart | undefined,
  bucket: CollectedAttachment[]
) {
  if (!part) return

  const contentDisposition = getPartHeader(part, "Content-Disposition")
  const contentId = getPartHeader(part, "Content-Id")

  if (part.filename && part.body?.attachmentId) {
    bucket.push({
      attachmentId: `${threadId}::${part.body.attachmentId}`,
      fileName: part.filename,
      mimeType: part.mimeType ?? "application/octet-stream",
      sizeBytes: part.body.size ? Number(part.body.size) : undefined,
      providerAttachmentRef: `${messageId}::${part.body.attachmentId}`,
      contentDisposition: contentDisposition || undefined,
      contentId: contentId || undefined,
    })
  }

  for (const child of part.parts ?? []) {
    collectAttachmentsFromPart(threadId, messageId, child, bucket)
  }
}

function sanitizeGmailQuery(raw: string): string {
  // Allow alphanumeric, @, :, ., _, -, whitespace, double quotes, parentheses
  return raw.replace(/[^a-zA-Z0-9@:._\-\s"()]/g, "")
}

// ── GmailMailProvider ─────────────────────────────────────────────
export class GmailMailProvider implements MailProviderAdapter {
  readonly providerName = "gmail"

  private readonly tokenStore: EncryptedTokenStore
  private readonly rateLimiter = new SlidingWindowRateLimiter()
  private readonly connectionCache = new Map<string, GmailConnectionManager>()

  // ── In-memory cache ────────────────────────────────────────────
  private cache = new Map<string, { data: any; ts: number }>()
  private CACHE_TTL = 5 * 60 * 1000 // 5 min

  constructor(tokenStore: EncryptedTokenStore) {
    this.tokenStore = tokenStore
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.ts < this.CACHE_TTL) return entry.data as T
    this.cache.delete(key)
    return null
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, ts: Date.now() })
  }

  /** Invalidate all cached results for a given company, or entire cache if no companyId. */
  invalidateCache(companyId?: string) {
    if (!companyId) {
      this.cache.clear()
      return
    }
    const prefix = `${companyId}:`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key)
    }
  }

  private getConnectionManager(companyId: string): GmailConnectionManager {
    let mgr = this.connectionCache.get(companyId)
    if (!mgr) {
      mgr = new GmailConnectionManager(companyId, this.tokenStore)
      this.connectionCache.set(companyId, mgr)
    }
    return mgr
  }

  private async getGmailClient(companyId: string): Promise<gmail_v1.Gmail> {
    const auth = await this.getConnectionManager(companyId).getAuthClient()
    return google.gmail({ version: "v1", auth })
  }

  // ── listMailboxConversations ────────────────────────────────────
  async listMailboxConversations(input: {
    mailbox: string
    query?: string
    limit?: number
    companyId?: string
  }): Promise<MockMailboxConversationSummary[]> {
    const companyId = input.companyId
    if (!companyId) throw internalError("companyId required for Gmail provider", "mail_gmail_missing_company_id")

    const cacheKey = `list:${companyId}:${input.query?.trim() || "_"}`
    const cached = this.getCached<MockMailboxConversationSummary[]>(cacheKey)
    if (cached) return cached

    const gmail = await this.getGmailClient(companyId)
    const mailbox = input.mailbox
    const limit = input.limit ?? 20

    // Build query
    let q = "in:inbox"
    if (input.query?.trim()) {
      q = `${q} ${sanitizeGmailQuery(input.query.trim())}`
    }

    this.rateLimiter.check()

    // Step 1: List threads
    const listRes = await gmail.users.threads.list({
      userId: mailbox,
      q,
      maxResults: limit,
    })

    const threads = listRes.data.threads ?? []
    if (threads.length === 0) return []

    // Step 2: Fetch thread details in parallel
    const summaries = await Promise.all(
      threads.map(async (t) => {
        if (!t.id) return null
        this.rateLimiter.check()

        try {
          const threadRes = await gmail.users.threads.get({
            userId: mailbox,
            id: t.id,
            format: "full",
          })

          const thread = threadRes.data
          const msgs = thread.messages ?? []
          const lastMsg = msgs[msgs.length - 1]
          const headers = lastMsg?.payload?.headers

          // Parse participants from all messages
          const participantMap = new Map<string, { name?: string; email: string; role?: "from" | "to" | "cc" }>()
          let latestMessageBodyText: string | undefined
          for (const msg of msgs) {
            const h = msg.payload?.headers
            const from = getHeader(h, "From")
            const to = getHeader(h, "To")
            const cc = getHeader(h, "Cc")
            const { bodyText } = extractMessageBodies(msg.payload)

            parseAddressList(from).forEach((p) => {
              participantMap.set(p.email, { ...p, role: "from" })
            })
            parseAddressList(to).forEach((p) => {
              if (!participantMap.has(p.email)) participantMap.set(p.email, { ...p, role: "to" })
            })
            parseAddressList(cc).forEach((p) => {
              if (!participantMap.has(p.email)) participantMap.set(p.email, { ...p, role: "cc" })
            })

            if (bodyText?.trim()) {
              latestMessageBodyText = bodyText.trim()
            }
          }

          // Extract attachments from all message parts (recursive for multipart/related,mixed)
          const attachments: MockMailboxConversationSummary["attachments"] = []
          for (const msg of msgs) {
            collectAttachmentsFromPart(thread.id!, msg.id!, msg.payload, attachments)
          }

          return {
            externalConversationId: thread.id!,
            subject: decodeRfc2047(getHeader(headers, "Subject") || "(sin asunto)"),
            participants: Array.from(participantMap.values()),
            latestMessageAt: new Date(getHeader(headers, "Date") || Date.now()).toISOString(),
            messageCount: msgs.length,
            previewSnippet: lastMsg?.snippet ?? "",
            latestMessageBodyText,
            attachments,
          } satisfies MockMailboxConversationSummary
        } catch (error: any) {
          // Thread deleted between list and fetch — skip silently
          if (error?.response?.status === 404 || error?.code === 404) {
            return null
          }
          throw error
        }
      })
    )

    const result = summaries.filter((s): s is NonNullable<typeof s> => s !== null)
    this.setCache(cacheKey, result)
    return result
  }

  // ── getConversationSnapshot ─────────────────────────────────────
  async getConversationSnapshot(input: {
    mailbox: string
    externalConversationId: string
    companyId?: string
  }): Promise<ProviderConversationSnapshot> {
    const companyId = input.companyId
    if (!companyId) throw internalError("companyId required for Gmail provider", "mail_gmail_missing_company_id")

    const cacheKey = `snapshot:${companyId}:${input.externalConversationId}`
    const cached = this.getCached<ProviderConversationSnapshot>(cacheKey)
    if (cached) return cached

    const gmail = await this.getGmailClient(companyId)
    this.rateLimiter.check()

    let thread: gmail_v1.Schema$Thread
    try {
      const res = await gmail.users.threads.get({
        userId: input.mailbox,
        id: input.externalConversationId,
        format: "FULL",
      })
      thread = res.data
    } catch (error: any) {
      const status = error?.response?.status ?? error?.code
      if (status === 404) {
        throw notFound("Thread not found in Gmail", "mail_provider_snapshot_unavailable")
      }
      if (status === 401) {
        throw internalError("Gmail authentication failed", "mail_gmail_auth_failed")
      }
      throw internalError(
        `Gmail API error: ${error?.message ?? "unknown"}`,
        "mail_gmail_api_error"
      )
    }

    const messages = thread.messages ?? []
    const participantMap = new Map<string, { name?: string; email: string; role?: "from" | "to" | "cc" }>()
    const attachments: ProviderConversationSnapshot["attachments"] = []

    const mappedMessages = messages.map((msg) => {
      const headers = msg.payload?.headers
      const from = getHeader(headers, "From")
      const to = getHeader(headers, "To")
      const cc = getHeader(headers, "Cc")
      const { bodyText, bodyHtml } = extractMessageBodies(msg.payload)

      // Collect participants
      parseAddressList(from).forEach((p) => {
        participantMap.set(p.email, { ...p, role: "from" })
      })
      parseAddressList(to).forEach((p) => {
        if (!participantMap.has(p.email)) participantMap.set(p.email, { ...p, role: "to" })
      })
      parseAddressList(cc).forEach((p) => {
        if (!participantMap.has(p.email)) participantMap.set(p.email, { ...p, role: "cc" })
      })

      // Collect attachments recursively from parts
      collectAttachmentsFromPart(thread.id!, msg.id!, msg.payload, attachments)

      return {
        id: msg.id!,
        sentAt: new Date(getHeader(headers, "Date") || Date.now()).toISOString(),
        from: parseAddressList(from)[0]?.email ?? "",
        to: parseAddressList(to).map((p) => p.email),
        cc: parseAddressList(cc).map((p) => p.email),
        snippet: msg.snippet ?? "",
        bodyText,
        bodyHtml,
      }
    })

    const result: ProviderConversationSnapshot = {
      provider: "gmail",
      mailbox: input.mailbox,
      externalConversationId: thread.id!,
      externalThreadId: thread.id!,
      subject: decodeRfc2047(getHeader(messages[0]?.payload?.headers, "Subject") || "(sin asunto)"),
      participants: Array.from(participantMap.values()),
      latestMessageAt: mappedMessages[mappedMessages.length - 1]?.sentAt ?? new Date().toISOString(),
      messages: mappedMessages,
      attachments,
    }
    this.setCache(cacheKey, result)
    return result
  }

  // ── downloadAttachment ──────────────────────────────────────────
  async downloadAttachment(input: {
    mailbox: string
    externalConversationId: string
    providerAttachmentRef: string
    companyId?: string
  }): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const companyId = input.companyId
    if (!companyId) throw internalError("companyId required for Gmail provider", "mail_gmail_missing_company_id")

    const gmail = await this.getGmailClient(companyId)
    this.rateLimiter.check()

    // Parse providerAttachmentRef: {messageId}::{attachmentId}
    const parts = input.providerAttachmentRef.split("::")
    if (parts.length !== 2) {
      throw notFound("Invalid attachment reference format", "mail_attachment_not_found")
    }
    const [messageId, attachmentId] = parts

    try {
      const res = await gmail.users.messages.attachments.get({
        userId: input.mailbox,
        messageId,
        id: attachmentId,
      })

      const data = res.data.data
      if (!data) {
        throw notFound("Attachment data empty", "mail_attachment_not_found")
      }

      return {
        buffer: Buffer.from(data, "base64"),
        // fileName and mimeType are filled by the service layer from the stored snapshot.
        fileName: "",
        mimeType: "",
      }
    } catch (error: any) {
      const status = error?.response?.status ?? error?.code
      if (status === 404) {
        throw notFound("Attachment not found in Gmail", "mail_attachment_not_found")
      }
      throw internalError(
        `Gmail attachment download failed: ${error?.message ?? "unknown"}`,
        "mail_gmail_api_error"
      )
    }
  }
}
