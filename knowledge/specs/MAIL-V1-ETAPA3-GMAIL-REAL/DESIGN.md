# DESIGN — MAIL-V1-ETAPA3-GMAIL-REAL

Status: **designed**
Change: `MAIL-V1-ETAPA3-GMAIL-REAL`
Parent specs: `PROPOSAL.md` (proposed), `SPEC.md` (specified)
Engram topic: `sdd/MAIL-V1-ETAPA3-GMAIL-REAL/design`
Artifact: `knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/DESIGN.md`

---

## 1. Design summary

This design covers six components that together replace the hardcoded `mockMailProvider` with a swappable Gmail provider:

| Component | File (new/modified) | Purpose |
|-----------|---------------------|---------|
| `GmailMailProvider` | `provider/gmail-mail-provider.ts` (new) | Gmail API adapter implementing `MailProviderAdapter` |
| `GmailConnectionManager` | `gmail/connection-manager.ts` (new) | OAuth 2.0 lifecycle, token refresh, health check |
| `EncryptedTokenStore` | `gmail/token-store.ts` (new) | AES-256-GCM filesystem token persistence |
| `resolveMailProvider()` | `provider/provider-factory.ts` (new) | Env-switchable provider singleton factory |
| `service.ts` modifications | `service.ts` (modified) | Replace direct `mockMailProvider` import with factory call |
| `types.ts` modifications | `types.ts` (modified) | `MAIL_STAGE1_PROVIDER` constant → dynamic `getMailStage1Provider()` |
| Admin API routes (4) | `app/api/admin/mail/gmail/*/route.ts` (new) | OAuth flow, status, disconnect |

All existing API route contracts (`/mail-links/*`, `/mailbox/conversations`) remain **unchanged** — same request/response shape, different provider beneath.

---

## 2. Architecture

```
┌──────────────────────────────────────────┐
│  Existing API routes (unchanged)          │
│  GET  /[companyId]/surgeries/[sId]/      │
│       mailbox/conversations              │
│  POST /[companyId]/surgeries/[sId]/      │
│       mail-links                         │
│  POST /.../mail-links/[linkId]/refresh   │
│  POST /.../mail-links/[linkId]/          │
│       attachments/persist                │
│  DELETE /.../mail-links/[linkId]         │
└──────────────────┬───────────────────────┘
                   │
┌──────────────────▼───────────────────────┐
│  service.ts (MODIFIED: uses factory)      │
│  const provider = getMailProvider()       │
│  provider.listMailboxConversations(...)   │
│  provider.getConversationSnapshot(...)    │
│  provider.downloadAttachment(...)         │
└──────────────────┬───────────────────────┘
                   │
┌──────────────────▼───────────────────────┐
│  provider-factory.ts (NEW)               │
│  resolveMailProvider(): MailProviderAdapter│
│  ┌─ MAIL_PROVIDER === "mock" → mock      │
│  └─ MAIL_PROVIDER === "gmail" → gmail    │
└─────┬─────────────────────┬──────────────┘
      │ (mock)               │ (gmail)
      ▼                      ▼
┌───────────┐  ┌──────────────────────────┐
│MockMail   │  │ GmailMailProvider (NEW)   │
│Provider   │  │  - listMailboxConv...     │
│(unchanged)│  │  - getConversationSnap... │
└───────────┘  │  - downloadAttachment     │
               └──────────┬───────────────┘
                          │ delegates auth to
               ┌──────────▼───────────────┐
               │ GmailConnectionManager    │
               │  - OAuth2Client lifecycle  │
               │  - token refresh          │
               │  - health check           │
               └──────────┬───────────────┘
                          │ reads/writes
               ┌──────────▼───────────────┐
               │ EncryptedTokenStore       │
               │  AES-256-GCM filesystem   │
               │  .runtime/mail-stage1/    │
               │    gmail-tokens/{id}.enc  │
               └──────────────────────────┘

NEW Admin routes (admin-only):
  GET  /api/admin/mail/gmail/auth       → OAuth start
  GET  /api/admin/mail/gmail/callback   → OAuth callback
  GET  /api/admin/mail/gmail/status     → connection health
  POST /api/admin/mail/gmail/disconnect → revoke + delete
```

---

## 3. Component designs

### 3.1 `provider-factory.ts` — `resolveMailProvider()`

**File:** `src/lib/mail-stage1/provider/provider-factory.ts` (NEW)

```ts
import type { MailProviderAdapter } from "./types"
import { mockMailProvider } from "./mock-mail-provider"

let gmailProvider: MailProviderAdapter | null = null

export function getMailProvider(): MailProviderAdapter {
  const provider = process.env.MAIL_PROVIDER ?? "mock"

  switch (provider) {
    case "mock":
      return mockMailProvider

    case "gmail": {
      if (!gmailProvider) {
        // Lazy-load Gmail dependencies to avoid import errors when googleapis is
        // not installed (MAIL_PROVIDER=mock does not need googleapis).
        const { GmailMailProvider } = require("./gmail-mail-provider")
        const { GmailConnectionManager } = require("../gmail/connection-manager")
        const { EncryptedTokenStore } = require("../gmail/token-store")

        // companyId is resolved per-request by each service function.
        // The factory returns a provider that re-resolves the connection per call.
        // See §3.1.1 for company-scoping strategy.
        const tokenStore = new EncryptedTokenStore()
        // NOTE: GmailConnectionManager requires companyId per instance.
        // Since the factory is called without knowing the companyId upfront,
        // we use a lazy-connection pattern: GmailMailProvider resolves the
        // connection manager lazily on first API call, passing the companyId
        // from the service layer's context.
        //
        // Strategy: GmailMailProvider is created with a factory function
        //   (companyId: string) => GmailConnectionManager
        // instead of a pre-built instance. The service layer calls
        // provider.setConnectionContext(companyId) before each operation.
        //
        // For singleton safety: the connection manager instances are cached
        // internally by companyId inside GmailMailProvider.
        gmailProvider = new GmailMailProvider(tokenStore)
      }
      return gmailProvider
    }

    default:
      console.warn(
        `[mail-stage1] Unknown MAIL_PROVIDER "${provider}" — falling back to mock`
      )
      return mockMailProvider
  }
}
```

**Design decision — company scoping:** `getMailProvider()` returns a singleton `GmailMailProvider`. However, Gmail connections are company-scoped. The solution:

1. `GmailMailProvider` holds an internal `Map<string, GmailConnectionManager>` keyed by `companyId`.
2. Service functions in `service.ts` already know `companyId` from their parameters. They call `provider.setCurrentCompany(companyId)` (or pass it via each method call) before accessing Gmail.
3. **Chosen approach (simplest):** Add an optional `companyId` parameter to a `resolveConnection(companyId)` internal method on `GmailMailProvider`. Each provider method accepts an additional `companyId` field in its input — this requires a minor **extension** of the `MailProviderAdapter` interface input types (adding `companyId: string` to each method's input). The mock provider ignores it. This is a backward-compatible extension.

**Revised `MailProviderAdapter` input extension:**

```ts
// In provider/types.ts — extend each method input with optional companyId
export interface MailProviderAdapter {
  readonly providerName: string  // changes from typeof MAIL_STAGE1_PROVIDER to string
  listMailboxConversations(input: {
    mailbox: string
    query?: string
    limit?: number
    companyId?: string  // NEW: ignored by mock, required by gmail
  }): Promise<MockMailboxConversationSummary[]>
  getConversationSnapshot(input: {
    mailbox: string
    externalConversationId: string
    companyId?: string  // NEW
  }): Promise<ProviderConversationSnapshot>
  downloadAttachment(input: {
    mailbox: string
    externalConversationId: string
    providerAttachmentRef: string
    companyId?: string  // NEW
  }): Promise<{ buffer: Buffer; fileName: string; mimeType: string }>
}
```

This approach keeps the factory simple (no companyId injection at factory level) and delegates company scoping to the provider instance.

#### 3.1.1 Updated `types.ts` — `getMailStage1Provider()`

**File:** `src/lib/mail-stage1/types.ts` (MODIFIED)

Change from constant to function:

```ts
// BEFORE:
export const MAIL_STAGE1_PROVIDER = "mock-mailbox"

// AFTER:
export function getMailStage1Provider(): string {
  return process.env.MAIL_PROVIDER === "gmail" ? "gmail" : "mock-mailbox"
}
// Keep constant for backward compat in tests:
export const MAIL_STAGE1_PROVIDER = getMailStage1Provider()
```

Update `buildConversationKey` to use the function:

```ts
export function buildConversationKey(externalConversationId: string) {
  return `${getMailStage1Provider()}::${MAIL_STAGE1_MAILBOX}::${externalConversationId}`
}
```

`MailConversationSnapshotRecord.provider` field type changes from `typeof MAIL_STAGE1_PROVIDER` to `string` (since it must accommodate both `"mock-mailbox"` and `"gmail"`):

```ts
export type MailConversationSnapshotRecord = {
  conversationKey: string
  provider: string  // was: typeof MAIL_STAGE1_PROVIDER
  // ...
}
```

Similarly, `ProviderConversationSnapshot.provider` changes to `string`.

---

### 3.2 `GmailMailProvider` — `provider/gmail-mail-provider.ts`

**File:** `src/lib/mail-stage1/provider/gmail-mail-provider.ts` (NEW)

```ts
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
  return value.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_m, charset, encoding, text) => {
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

  constructor(tokenStore: EncryptedTokenStore) {
    this.tokenStore = tokenStore
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

    // Step 2: Fetch thread metadata in parallel
    const summaries = await Promise.all(
      threads.map(async (t) => {
        if (!t.id) return null
        this.rateLimiter.check()

        try {
          const threadRes = await gmail.users.threads.get({
            userId: mailbox,
            id: t.id,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "To", "Cc", "Date"],
          })

          const thread = threadRes.data
          const msgs = thread.messages ?? []
          const firstMsg = msgs[0]
          const lastMsg = msgs[msgs.length - 1]
          const headers = lastMsg?.payload?.headers

          // Parse participants from all messages
          const participantMap = new Map<string, { name?: string; email: string; role?: "from" | "to" | "cc" }>()
          for (const msg of msgs) {
            const h = msg.payload?.headers
            const from = getHeader(h, "From")
            const to = getHeader(h, "To")
            const cc = getHeader(h, "Cc")

            parseAddressList(from).forEach((p) => {
              participantMap.set(p.email, { ...p, role: "from" })
            })
            parseAddressList(to).forEach((p) => {
              if (!participantMap.has(p.email)) participantMap.set(p.email, { ...p, role: "to" })
            })
            parseAddressList(cc).forEach((p) => {
              if (!participantMap.has(p.email)) participantMap.set(p.email, { ...p, role: "cc" })
            })
          }

          // Extract attachments from all message parts
          const attachments: MockMailboxConversationSummary["attachments"] = []
          for (const msg of msgs) {
            const parts = msg.payload?.parts ?? []
            for (const part of parts) {
              if (part.filename && part.body?.attachmentId) {
                attachments.push({
                  attachmentId: `${thread.id}::${part.body.attachmentId}`,
                  fileName: part.filename,
                  mimeType: part.mimeType ?? "application/octet-stream",
                  sizeBytes: part.body.size ? Number(part.body.size) : undefined,
                  providerAttachmentRef: `${msg.id}::${part.body.attachmentId}`,
                })
              }
            }
          }

          return {
            externalConversationId: thread.id!,
            subject: decodeRfc2047(getHeader(headers, "Subject") || "(sin asunto)"),
            participants: Array.from(participantMap.values()),
            latestMessageAt: new Date(getHeader(headers, "Date") || Date.now()).toISOString(),
            messageCount: msgs.length,
            previewSnippet: lastMsg?.snippet ?? "",
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

    return summaries.filter((s): s is NonNullable<typeof s> => s !== null)
  }

  // ── getConversationSnapshot ─────────────────────────────────────
  async getConversationSnapshot(input: {
    mailbox: string
    externalConversationId: string
    companyId?: string
  }): Promise<ProviderConversationSnapshot> {
    const companyId = input.companyId
    if (!companyId) throw internalError("companyId required for Gmail provider", "mail_gmail_missing_company_id")

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

      // Collect attachments from parts
      const parts = msg.payload?.parts ?? []
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            attachmentId: `${thread.id}::${part.body.attachmentId}`,
            fileName: part.filename,
            mimeType: part.mimeType ?? "application/octet-stream",
            sizeBytes: part.body.size ? Number(part.body.size) : undefined,
            providerAttachmentRef: `${msg.id}::${part.body.attachmentId}`,
          })
        }
      }

      return {
        id: msg.id!,
        sentAt: new Date(getHeader(headers, "Date") || Date.now()).toISOString(),
        from: parseAddressList(from)[0]?.email ?? "",
        to: parseAddressList(to).map((p) => p.email),
        cc: parseAddressList(cc).map((p) => p.email),
        snippet: msg.snippet ?? "",
      }
    })

    return {
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
```

**Key design decisions:**

1. **Rate limiter:** Sliding window, 200 req/100s, in-memory per-instance. Uses `conflict()` so the service layer can show a retry-able error.
2. **Company scoping:** `companyId` is received via each method's input parameter. The provider caches `GmailConnectionManager` instances by company ID internally.
3. **Attachment filename/mimeType resolution:** The provider returns empty strings. The service layer (`persistCriticalAttachments`) already has the snapshot with metadata — it fills in `fileName` and `mimeType` from the stored snapshot.
4. **Thread 404 between list and fetch:** Silently skipped (returns `null`, filtered out). No error thrown.
5. **Gmail API 401:** Mapped to `mail_gmail_auth_failed` — the connection manager's auto-refresh should prevent this in normal operation.
6. **Query sanitization:** Strips non-Gmail-query-legal characters to prevent injection.

---

### 3.3 `GmailConnectionManager` — `gmail/connection-manager.ts`

**File:** `src/lib/mail-stage1/gmail/connection-manager.ts` (NEW)

```ts
import { OAuth2Client } from "google-auth-library"
import { google } from "googleapis"
import { badRequest, internalError, notFound } from "@/lib/api/errors"
import type { EncryptedTokenStore } from "./token-store"
import type { GmailConnectionState } from "./types"

export class GmailConnectionManager {
  private readonly companyId: string
  private readonly tokenStore: EncryptedTokenStore
  private readonly scopes = ["https://www.googleapis.com/auth/gmail.readonly"]
  private readonly mailbox: string

  constructor(companyId: string, tokenStore: EncryptedTokenStore) {
    this.companyId = companyId
    this.tokenStore = tokenStore
    // Default mailbox — configurable per company in the future
    this.mailbox = process.env.GMAIL_MAILBOX ?? "sistemas@districorr.com.ar"
  }

  // ── OAuth helpers ───────────────────────────────────────────────
  private getClientId(): string {
    const id = process.env.GMAIL_CLIENT_ID
    if (!id) throw internalError("GMAIL_CLIENT_ID not configured", "mail_gmail_misconfigured")
    return id
  }

  private getClientSecret(): string {
    const secret = process.env.GMAIL_CLIENT_SECRET
    if (!secret) throw internalError("GMAIL_CLIENT_SECRET not configured", "mail_gmail_misconfigured")
    return secret
  }

  private getRedirectUri(): string {
    const uri = process.env.GMAIL_REDIRECT_URI
    if (!uri) throw internalError("GMAIL_REDIRECT_URI not configured", "mail_gmail_misconfigured")
    return uri
  }

  private createOAuthClient(): OAuth2Client {
    return new OAuth2Client(
      this.getClientId(),
      this.getClientSecret(),
      this.getRedirectUri()
    )
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Generate the Google OAuth authorization URL.
   * Forces refresh_token issuance via access_type=offline + prompt=consent.
   */
  generateAuthUrl(): string {
    const oauth2Client = this.createOAuthClient()
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: this.scopes,
      state: this.companyId, // CSRF protection + company routing on callback
    })
  }

  /**
   * Handle the OAuth callback: exchange code for tokens, validate scope, persist.
   */
  async handleCallback(code: string): Promise<void> {
    const oauth2Client = this.createOAuthClient()

    let tokenResponse
    try {
      tokenResponse = await oauth2Client.getToken(code)
    } catch (error: any) {
      throw badRequest(
        `OAuth code exchange failed: ${error?.message ?? "unknown"}`,
        "mail_gmail_oauth_code_invalid"
      )
    }

    const tokens = tokenResponse.tokens
    if (!tokens.access_token) {
      throw badRequest("No access token received from Google", "mail_gmail_oauth_code_invalid")
    }

    // Validate scope
    const scope = tokens.scope ?? ""
    if (!scope.includes("gmail.readonly")) {
      throw badRequest(
        "OAuth scope missing gmail.readonly — re-authorize with correct scopes",
        "mail_gmail_oauth_scope_mismatch"
      )
    }

    await this.tokenStore.save(this.companyId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      expiry_date: tokens.expiry_date ?? Date.now() + 3600_000,
      scope: tokens.scope ?? "",
      token_type: (tokens.token_type as "Bearer") ?? "Bearer",
      companyId: this.companyId,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Get an authenticated OAuth2Client, refreshing the token if needed.
   * This is called by GmailMailProvider before every Gmail API call.
   */
  async getAuthClient(): Promise<OAuth2Client> {
    const tokens = await this.tokenStore.load(this.companyId)
    if (!tokens) {
      throw notFound(
        "Gmail not connected — run OAuth flow first",
        "mail_gmail_not_connected"
      )
    }

    if (!tokens.refresh_token) {
      throw internalError(
        "Gmail session expired (no refresh token) — reauthorization required",
        "mail_gmail_session_expired"
      )
    }

    const oauth2Client = this.createOAuthClient()
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
      scope: tokens.scope,
    })

    // Auto-refresh if expired
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      await this.refreshAccessToken(oauth2Client)
    }

    // Auto-save on token refresh events (google-auth-library fires "tokens" event)
    oauth2Client.on("tokens", async (newTokens) => {
      await this.tokenStore.save(this.companyId, {
        access_token: newTokens.access_token ?? tokens.access_token,
        refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
        expiry_date: newTokens.expiry_date ?? Date.now() + 3600_000,
        scope: tokens.scope,
        token_type: "Bearer",
        companyId: this.companyId,
        updatedAt: new Date().toISOString(),
      })
    })

    return oauth2Client
  }

  /**
   * Get connection state with optional health check.
   */
  async getConnectionState(): Promise<GmailConnectionState> {
    const tokens = await this.tokenStore.load(this.companyId)

    if (!tokens) {
      return {
        status: "none",
        mailbox: this.mailbox,
        scopes: [],
      }
    }

    if (!tokens.refresh_token) {
      return {
        status: "expired",
        mailbox: this.mailbox,
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
        lastError: "No refresh token available — reauthorization required",
      }
    }

    // Health check
    try {
      const oauth2Client = await this.getAuthClient()
      const gmail = google.gmail({ version: "v1", auth: oauth2Client })

      await Promise.race([
        gmail.users.getProfile({ userId: "me" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), 5000)
        ),
      ])

      return {
        status: "connected",
        mailbox: this.mailbox,
        connectedAt: tokens.updatedAt,
        lastHealthCheck: new Date().toISOString(),
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
      }
    } catch (error: any) {
      // 401 → expired
      if (error?.response?.status === 401 || error?.code === 401) {
        return {
          status: "expired",
          mailbox: this.mailbox,
          scopes: tokens.scope ? tokens.scope.split(" ") : [],
          lastError: "Token expired or revoked — reauthorization required",
        }
      }

      return {
        status: "error",
        mailbox: this.mailbox,
        connectedAt: tokens.updatedAt,
        lastHealthCheck: new Date().toISOString(),
        lastError: error?.message ?? "Unknown error",
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
      }
    }
  }

  /**
   * Disconnect: revoke token + delete local storage.
   * Revocation is best-effort — local tokens are always deleted.
   */
  async disconnect(): Promise<void> {
    const tokens = await this.tokenStore.load(this.companyId)

    if (tokens?.access_token) {
      try {
        // Revoke via Google OAuth2 revocation endpoint
        const response = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: tokens.access_token }),
        })

        if (!response.ok && response.status !== 404) {
          console.warn(
            `[mail-stage1] Token revocation returned ${response.status} for company ${this.companyId}`
          )
        }
      } catch (error) {
        console.warn(
          `[mail-stage1] Token revocation failed for company ${this.companyId}: ${(error as Error).message}`
        )
      }
    }

    // Always delete local tokens (best-effort revocation)
    await this.tokenStore.delete(this.companyId)
    console.log(`[mail-stage1] Gmail disconnected for company ${this.companyId}`)
  }

  // ── Private ─────────────────────────────────────────────────────

  private async refreshAccessToken(oauth2Client: OAuth2Client): Promise<void> {
    try {
      const res = await oauth2Client.refreshAccessToken()
      const newTokens = res.credentials

      await this.tokenStore.save(this.companyId, {
        access_token: newTokens.access_token!,
        refresh_token: newTokens.refresh_token ?? oauth2Client.credentials.refresh_token!,
        expiry_date: newTokens.expiry_date ?? Date.now() + 3600_000,
        scope: oauth2Client.credentials.scope ?? "",
        token_type: "Bearer",
        companyId: this.companyId,
        updatedAt: new Date().toISOString(),
      })
    } catch (error: any) {
      throw internalError(
        `Gmail session expired — reauthorization required (${error?.message ?? "unknown"})`,
        "mail_gmail_session_expired"
      )
    }
  }
}
```

**Key design decisions:**

1. **Env vars validated at first use** (not constructor) — `getClientId()` etc. throw `internalError` if missing. This avoids startup crashes when `MAIL_PROVIDER=mock`.
2. **OAuth state parameter** carries `companyId` for CSRF protection and callback routing.
3. **Auto-refresh:** `getAuthClient()` checks `expiry_date` and calls `refreshAccessToken()` before returning. The `"tokens"` event listener auto-saves new tokens.
4. **Health check timeout:** 5 seconds via `Promise.race` — prevents hanging requests.
5. **Disconnect:** `POST /revoke` via fetch + always delete local file. Revocation failures are logged but not thrown.

---

### 3.4 `EncryptedTokenStore` — `gmail/token-store.ts`

**File:** `src/lib/mail-stage1/gmail/token-store.ts` (NEW)

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { mkdir, readFile, rename, unlink, writeFile, chmod } from "node:fs/promises"
import path from "node:path"
import { internalError } from "@/lib/api/errors"
import type { GmailTokenPayload } from "./types"

function getRuntimeRoot(): string {
  return process.env.OSSUM_RUNTIME_DIR ?? path.join(process.cwd(), ".runtime")
}

export class EncryptedTokenStore {
  private readonly baseDir: string

  constructor() {
    this.baseDir = path.join(getRuntimeRoot(), "mail-stage1", "gmail-tokens")
  }

  private getKey(): Buffer {
    const hex = process.env.GMAIL_ENCRYPTION_KEY
    if (!hex || hex.length !== 64) {
      throw internalError(
        "GMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
        "mail_gmail_invalid_encryption_key"
      )
    }
    try {
      return Buffer.from(hex, "hex")
    } catch {
      throw internalError("GMAIL_ENCRYPTION_KEY must be valid hex", "mail_gmail_invalid_encryption_key")
    }
  }

  private filePath(companyId: string): string {
    return path.join(this.baseDir, `${companyId}.json.enc`)
  }

  private sanitizeCompanyId(companyId: string): string {
    return companyId.replace(/[^a-zA-Z0-9._-]/g, "_")
  }

  // ── Encryption ──────────────────────────────────────────────────
  private encrypt(plaintext: string): string {
    const key = this.getKey()
    const iv = randomBytes(12) // AES-256-GCM recommended IV length
    const cipher = createCipheriv("aes-256-gcm", key, iv)

    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    // Format: iv (12 bytes) + ciphertext + authTag (16 bytes)
    const combined = Buffer.concat([iv, encrypted, authTag])
    return combined.toString("hex")
  }

  private decrypt(hexCiphertext: string): string {
    const key = this.getKey()
    const combined = Buffer.from(hexCiphertext, "hex")

    const iv = combined.subarray(0, 12)
    const authTag = combined.subarray(combined.length - 16)
    const ciphertext = combined.subarray(12, combined.length - 16)

    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  }

  // ── Public API ──────────────────────────────────────────────────

  async save(companyId: string, tokens: GmailTokenPayload): Promise<void> {
    const safeId = this.sanitizeCompanyId(companyId)
    const payload: GmailTokenPayload = {
      ...tokens,
      companyId,
      updatedAt: new Date().toISOString(),
    }

    const json = JSON.stringify(payload)
    const encrypted = this.encrypt(json)

    const dir = this.baseDir
    await mkdir(dir, { recursive: true })

    const targetPath = this.filePath(safeId)
    const tempPath = `${targetPath}.tmp`

    // Atomic write: write to temp, then rename
    await writeFile(tempPath, encrypted, "utf8")
    await rename(tempPath, targetPath)

    // Best-effort: restrict permissions (no-op on Windows)
    try {
      await chmod(targetPath, 0o600)
    } catch {
      // Windows does not support chmod — ignore
    }
  }

  async load(companyId: string): Promise<GmailTokenPayload | null> {
    const safeId = this.sanitizeCompanyId(companyId)
    const targetPath = this.filePath(safeId)

    try {
      const encrypted = await readFile(targetPath, "utf8")
      const json = this.decrypt(encrypted)
      const payload = JSON.parse(json) as GmailTokenPayload

      // Cross-check companyId
      if (payload.companyId !== companyId) {
        throw internalError(
          "Token file companyId mismatch — possible tampering",
          "mail_gmail_token_company_mismatch"
        )
      }

      return payload
    } catch (error: any) {
      if (error?.code === "ENOENT") return null
      throw error
    }
  }

  async delete(companyId: string): Promise<void> {
    const safeId = this.sanitizeCompanyId(companyId)
    const targetPath = this.filePath(safeId)

    try {
      await unlink(targetPath)
    } catch (error: any) {
      if (error?.code === "ENOENT") return // idempotent
      console.warn(
        `[mail-stage1] Failed to delete token file for company ${companyId}: ${error.message}`
      )
    }
  }

  async exists(companyId: string): Promise<boolean> {
    const safeId = this.sanitizeCompanyId(companyId)
    try {
      await readFile(this.filePath(safeId))
      return true
    } catch {
      return false
    }
  }
}
```

**Key design decisions:**

1. **AES-256-GCM:** 12-byte IV, 16-byte auth tag. The format on disk is `hex(iv || ciphertext || authTag)`.
2. **Key validation:** `getKey()` validates `GMAIL_ENCRYPTION_KEY` length (must be 64 hex chars) and throws `internalError` if invalid. No PBKDF2 — the env var is already a raw 256-bit key.
3. **Atomic writes:** Write to `{file}.tmp` then `rename` — same pattern as `repository.ts`.
4. **Company ID sanitization:** `sanitizeCompanyId()` prevents path traversal via `[^a-zA-Z0-9._-]`.
5. **Cross-check:** `load()` verifies that the decrypted payload's `companyId` matches the requested `companyId`.
6. **Permission hardening:** `chmod 0o600` best-effort (silent on Windows).
7. **Idempotent delete:** `ENOENT` on `unlink` is silently ignored.

---

### 3.5 `gmail/types.ts`

**File:** `src/lib/mail-stage1/gmail/types.ts` (NEW)

```ts
export type GmailTokenPayload = {
  access_token: string
  refresh_token: string
  expiry_date: number       // epoch ms
  scope: string
  token_type: "Bearer"
  companyId: string
  updatedAt: string          // ISO timestamp
}

export type GmailConnectionState = {
  status: "none" | "connected" | "error" | "expired"
  mailbox: string
  connectedAt?: string       // ISO timestamp
  lastHealthCheck?: string   // ISO timestamp
  lastError?: string
  scopes: string[]
}
```

---

### 3.6 `service.ts` modifications

**File:** `src/lib/mail-stage1/service.ts` (MODIFIED)

Changes are minimal — only lines that directly call `mockMailProvider`:

| Line | Before | After |
|------|--------|-------|
| 4 | `import { mockMailProvider } from "./provider/mock-mail-provider"` | `import { getMailProvider } from "./provider/provider-factory"` |
| 225 | `mockMailProvider.listMailboxConversations({ mailbox: MAIL_STAGE1_MAILBOX, query, limit })` | `const provider = getMailProvider(); provider.listMailboxConversations({ mailbox: MAIL_STAGE1_MAILBOX, query, limit, companyId })` |
| 287 | `mockMailProvider.getConversationSnapshot({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: input.externalConversationId })` | `const provider = getMailProvider(); provider.getConversationSnapshot({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: input.externalConversationId, companyId })` |
| 371 | `mockMailProvider.getConversationSnapshot({ ... })` | `const provider = getMailProvider(); provider.getConversationSnapshot({ ..., companyId })` |
| 450 | `mockMailProvider.downloadAttachment({ ... })` | `const provider = getMailProvider(); provider.downloadAttachment({ ..., companyId })` |

Additionally, `ensureConversationSnapshot()` uses `mockMailProvider.getConversationSnapshot` for its type annotation — this parameterized type must change to use the interface type instead:

```ts
// BEFORE (line 32):
function ensureConversationSnapshot(
  existing: MailConversationSnapshotRecord | undefined,
  providerSnapshot: Awaited<ReturnType<typeof mockMailProvider.getConversationSnapshot>>,
  mode: "attach" | "refresh"
): MailConversationSnapshotRecord

// AFTER:
import type { ProviderConversationSnapshot } from "./provider/types"

function ensureConversationSnapshot(
  existing: MailConversationSnapshotRecord | undefined,
  providerSnapshot: ProviderConversationSnapshot,
  mode: "attach" | "refresh"
): MailConversationSnapshotRecord
```

After `downloadAttachment`, the service must fill in `fileName` and `mimeType` from the stored snapshot (since the Gmail provider returns empty strings):

```ts
// In persistCriticalAttachments, after downloadAttachment:
const downloaded = await provider.downloadAttachment({
  mailbox: MAIL_STAGE1_MAILBOX,
  externalConversationId: snapshot.externalConversationId,
  providerAttachmentRef: attachment.providerAttachmentRef,
  companyId,
})

// Fill in fileName/mimeType from stored snapshot metadata
// (Gmail provider returns empty strings for these)
const resolvedFileName = downloaded.fileName || attachment.fileName
const resolvedMimeType = downloaded.mimeType || attachment.mimeType
```

---

### 3.7 Admin API routes

All four routes live under `src/app/api/admin/mail/gmail/`. All use the standard pattern: `getApiAuthContext` + `requireCompanyMutationAccess` with admin-only roles (`["admin", "super_admin", "owner"]`).

#### 3.7.1 `GET /api/admin/mail/gmail/auth`

**File:** `src/app/api/admin/mail/gmail/auth/route.ts` (NEW)

```ts
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { badRequest } from "@/lib/api/errors"
import { GmailConnectionManager } from "@/lib/mail-stage1/gmail/connection-manager"
import { EncryptedTokenStore } from "@/lib/mail-stage1/gmail/token-store"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companyId = url.searchParams.get("companyId")
    if (!companyId) throw badRequest("companyId query param required", "missing_company_id")

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, ["admin", "super_admin", "owner"])

    const tokenStore = new EncryptedTokenStore()
    const connectionManager = new GmailConnectionManager(companyId, tokenStore)
    const redirectUrl = connectionManager.generateAuthUrl()

    return ok({ redirectUrl })
  } catch (error) {
    return errorResponse(error)
  }
}
```

#### 3.7.2 `GET /api/admin/mail/gmail/callback`

**File:** `src/app/api/admin/mail/gmail/callback/route.ts` (NEW)

```ts
import { errorResponse } from "@/lib/api/responses"
import { badRequest } from "@/lib/api/errors"
import { GmailConnectionManager } from "@/lib/mail-stage1/gmail/connection-manager"
import { EncryptedTokenStore } from "@/lib/mail-stage1/gmail/token-store"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const companyId = url.searchParams.get("state") // state=companyId from OAuth

    if (!code) throw badRequest("Missing authorization code", "mail_gmail_oauth_code_missing")
    if (!companyId) throw badRequest("Missing state parameter (companyId)", "mail_gmail_oauth_state_missing")

    const tokenStore = new EncryptedTokenStore()
    const connectionManager = new GmailConnectionManager(companyId, tokenStore)
    await connectionManager.handleCallback(code)

    // Redirect to confirmation page (or return JSON if no frontend page exists yet)
    const frontendBase = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    return NextResponse.redirect(
      `${frontendBase}/admin/mail/gmail/connected?companyId=${encodeURIComponent(companyId)}`
    )
  } catch (error) {
    return errorResponse(error)
  }
}
```

#### 3.7.3 `GET /api/admin/mail/gmail/status`

**File:** `src/app/api/admin/mail/gmail/status/route.ts` (NEW)

```ts
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { badRequest } from "@/lib/api/errors"
import { GmailConnectionManager } from "@/lib/mail-stage1/gmail/connection-manager"
import { EncryptedTokenStore } from "@/lib/mail-stage1/gmail/token-store"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companyId = url.searchParams.get("companyId")
    if (!companyId) throw badRequest("companyId query param required", "missing_company_id")

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const tokenStore = new EncryptedTokenStore()
    const connectionManager = new GmailConnectionManager(companyId, tokenStore)
    const state = await connectionManager.getConnectionState()

    return ok({
      ...state,
      provider: "gmail",
      companyId,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
```

#### 3.7.4 `POST /api/admin/mail/gmail/disconnect`

**File:** `src/app/api/admin/mail/gmail/disconnect/route.ts` (NEW)

```ts
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { badRequest } from "@/lib/api/errors"
import { GmailConnectionManager } from "@/lib/mail-stage1/gmail/connection-manager"
import { EncryptedTokenStore } from "@/lib/mail-stage1/gmail/token-store"

export async function POST(request: Request) {
  try {
    let companyId: string
    const contentType = request.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      const body = await request.json() as { companyId?: string }
      companyId = body.companyId ?? ""
    } else {
      const url = new URL(request.url)
      companyId = url.searchParams.get("companyId") ?? ""
    }

    if (!companyId) throw badRequest("companyId required", "missing_company_id")

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, ["admin", "super_admin", "owner"])

    const tokenStore = new EncryptedTokenStore()
    const connectionManager = new GmailConnectionManager(companyId, tokenStore)
    await connectionManager.disconnect()

    return ok({ status: "disconnected", companyId })
  } catch (error) {
    return errorResponse(error)
  }
}
```

---

## 4. Integration points — how existing code changes

### 4.1 `provider/types.ts` changes

| Field | Before | After |
|-------|--------|-------|
| `MailProviderAdapter.providerName` | `typeof MAIL_STAGE1_PROVIDER` (literal `"mock-mailbox"`) | `string` |
| Each method input | No `companyId` field | `companyId?: string` added |
| `ProviderConversationSnapshot.provider` | `typeof MAIL_STAGE1_PROVIDER` | `string` |

### 4.2 `types.ts` changes

| Element | Before | After |
|---------|--------|-------|
| `MAIL_STAGE1_PROVIDER` | `const = "mock-mailbox"` | `const = getMailStage1Provider()` (calls function) |
| `getMailStage1Provider()` | Does not exist | NEW: returns `"gmail"` or `"mock-mailbox"` based on `MAIL_PROVIDER` env |
| `buildConversationKey()` | Uses `MAIL_STAGE1_PROVIDER` constant | Uses `getMailStage1Provider()` |
| `MailConversationSnapshotRecord.provider` | `typeof MAIL_STAGE1_PROVIDER` | `string` |

### 4.3 `service.ts` changes

| Change | Lines affected |
|--------|---------------|
| Import: `mockMailProvider` → `getMailProvider` | Line 4 |
| `ensureConversationSnapshot` type param: `ReturnType<typeof mockMailProvider...>` → `ProviderConversationSnapshot` | Line 32 |
| `browseMailboxConversations`: add `companyId` to provider call | Line 225 |
| `attachConversationToSurgery`: add `companyId` | Line 287 |
| `refreshLinkedConversation`: add `companyId` | Line 371 |
| `persistCriticalAttachments`: add `companyId`, fill fileName/mimeType from snapshot | Lines 450–470 |

### 4.4 Existing API routes — ZERO changes

The four existing route files under `src/app/api/companies/[companyId]/surgeries/[surgeryId]/mail*/**` are **not touched**. They call `service.ts` functions, which now use `getMailProvider()` internally. The `companyId` is already part of the route context, so it flows naturally to the provider.

### 4.5 Existing tests

The 706 existing tests pass unchanged when `MAIL_PROVIDER=mock` (default). The factory returns `mockMailProvider` in test environments where `MAIL_PROVIDER` is unset or `"mock"`. No test modifications are needed for backward compatibility.

---

## 5. Data flow — Gmail OAuth + browse + attach

```
ADMIN                    API ROUTE              GMAIL                    FILESYSTEM
 │                        │                      │                        │
 │  GET /admin/mail/      │                      │                        │
 │  gmail/auth            │                      │                        │
 ├───────────────────────►│                      │                        │
 │                        │ generateAuthUrl()    │                        │
 │  { redirectUrl }       │                      │                        │
 │◄───────────────────────┤                      │                        │
 │                        │                      │                        │
 │  → Google OAuth        │                      │                        │
 │    consent screen      │                      │                        │
 │                        │                      │                        │
 │  Google redirects to   │                      │                        │
 │  /admin/mail/gmail/    │                      │                        │
 │  callback?code=...     │                      │                        │
 ├───────────────────────►│                      │                        │
 │                        │ exchange code        │                        │
 │                        ├─────────────────────►│                        │
 │                        │◄──── tokens ─────────┤                        │
 │                        │                      │                        │
 │                        │ tokenStore.save()    │                        │
 │                        ├──────────────────────────────────────────────►│
 │                        │                      │         .runtime/      │
 │                        │                      │         mail-stage1/   │
 │                        │                      │         gmail-tokens/  │
 │                        │                      │         org_001.enc    │
 │                        │                      │                        │
 │  302 → /admin/mail/    │                      │                        │
 │  gmail/connected       │                      │                        │
 │◄───────────────────────┤                      │                        │


USER (coordinator)       API ROUTE              GmailMailProvider        GMAIL API
 │                        │                      │                        │
 │  GET /surgeries/{id}/  │                      │                        │
 │  mailbox/conversations │                      │                        │
 ├───────────────────────►│                      │                        │
 │                        │ browseMailboxConv()  │                        │
 │                        ├─────────────────────►│                        │
 │                        │                      │ getAuthClient()        │
 │                        │                      ├──►tokenStore.load()    │
 │                        │                      │◄── tokens              │
 │                        │                      │                        │
 │                        │                      │ users.threads.list()   │
 │                        │                      ├───────────────────────►│
 │                        │                      │◄─── thread IDs ────────┤
 │                        │                      │                        │
 │                        │                      │ users.threads.get() x N│
 │                        │                      ├───────────────────────►│
 │                        │                      │◄─── thread metadata ───┤
 │                        │                      │                        │
 │                        │◄── summaries[] ──────┤                        │
 │  { conversations[] }   │                      │                        │
 │◄───────────────────────┤                      │                        │
```

---

## 6. Error mapping table

All errors use `ApiError` from `@/lib/api/errors` to maintain consistency with existing routes.

| Scenario | `new X()` | `code` | HTTP |
|----------|-----------|--------|------|
| Mailbox not connected (no tokens) | `notFound()` | `mail_gmail_not_connected` | 404 |
| Thread not found | `notFound()` | `mail_provider_snapshot_unavailable` | 404 |
| Attachment not found | `notFound()` | `mail_attachment_not_found` | 404 |
| Invalid attachment ref format | `notFound()` | `mail_attachment_not_found` | 404 |
| Gmail rate limited | `conflict()` | `mail_gmail_rate_limited` | 409 |
| Gmail auth failed (401) | `internalError()` | `mail_gmail_auth_failed` | 500 |
| Token expired, need re-auth | `internalError()` | `mail_gmail_session_expired` | 500 |
| OAuth code invalid | `badRequest()` | `mail_gmail_oauth_code_invalid` | 400 |
| OAuth scope missing gmail.readonly | `badRequest()` | `mail_gmail_oauth_scope_mismatch` | 400 |
| Env vars missing | `internalError()` | `mail_gmail_misconfigured` | 500 |
| Encryption key invalid | `internalError()` | `mail_gmail_invalid_encryption_key` | 500 |
| Token file company mismatch | `internalError()` | `mail_gmail_token_company_mismatch` | 500 |
| General Gmail API failure | `internalError()` | `mail_gmail_api_error` | 500 |
| Missing companyId (Gmail provider) | `internalError()` | `mail_gmail_missing_company_id` | 500 |
| Company access denied (exposed via guard) | `forbidden()` | `company_mutation_access_denied` | 403 |
| Invalid auth token | `unauthorized()` | `invalid_auth_token` | 401 |
| Missing auth token | `unauthorized()` | `auth_required` | 401 |

---

## 7. Environment variables

| Variable | Required when | Default | Validation |
|----------|--------------|---------|------------|
| `MAIL_PROVIDER` | Always | `"mock"` | Must be `"mock"` or `"gmail"` |
| `GMAIL_CLIENT_ID` | `MAIL_PROVIDER=gmail` | — | Non-empty |
| `GMAIL_CLIENT_SECRET` | `MAIL_PROVIDER=gmail` | — | Non-empty |
| `GMAIL_REDIRECT_URI` | `MAIL_PROVIDER=gmail` | — | Valid HTTPS URL |
| `GMAIL_ENCRYPTION_KEY` | `MAIL_PROVIDER=gmail` | — | 64 hex chars (32 bytes) |
| `GMAIL_MAILBOX` | Optional | `"sistemas@districorr.com.ar"` | Valid email |

**Security rules:**
- None of these use `NEXT_PUBLIC_*` — never exposed to client bundle.
- `GMAIL_CLIENT_SECRET` and `GMAIL_ENCRYPTION_KEY` must be excluded from Git.
- `.env.example` contains placeholder values with comments.

---

## 8. Filesystem layout

```
.vruntime/                              (see repository.ts: runtimeRoot())
└── mail-stage1/
    ├── companies/                      (EXISTING — company documents)
    │   └── {companyId}.json
    ├── attachments/                    (EXISTING — persistent binary)
    │   └── {companyId}/
    │       └── {conversationKey}/
    │           └── {attachmentId}-{fileName}
    └── gmail-tokens/                   (NEW)
        └── {companyId}.json.enc        (hex-encoded AES-256-GCM encrypted JSON)
```

The `gmail-tokens/` directory is created automatically on first `EncryptedTokenStore.save()`.

---

## 9. Testing strategy

### 9.1 Unit tests — new files

| Test file | Tests | Mocking |
|-----------|-------|---------|
| `__tests__/unit/gmail-encrypted-token-store.test.ts` | AC-4.1–4.10: encrypt/decrypt, cross-check, atomic write, idempotent delete, key validation | `process.env.GMAIL_ENCRYPTION_KEY` set per test, temp dir for `OSSUM_RUNTIME_DIR` |
| `__tests__/unit/gmail-connection-manager.test.ts` | AC-3.1–3.12: auth URL generation, callback, getAuthClient, refresh, disconnect | Mock `google-auth-library` `OAuth2Client`, mock `EncryptedTokenStore` |
| `__tests__/unit/gmail-mail-provider.test.ts` | AC-2.1–2.11: list, snapshot, download, error mapping, rate limiting, thread 404 skip | Mock `googleapis` (`gmail.users.threads.list/get`, `gmail.users.messages.attachments.get`) |
| `__tests__/unit/provider-factory.test.ts` | AC-1.1–1.4: mock/gmail/unknown switch, singleton behavior | `process.env.MAIL_PROVIDER` set per test |

### 9.2 Existing tests — NO changes needed

`__tests__/unit/mail-stage1.test.ts` and `__tests__/integration/mail-stage1-api.test.ts` test the `MockMailProvider` path. With `MAIL_PROVIDER=mock` (default), the factory returns `mockMailProvider` — all 706 tests pass unchanged.

### 9.3 Integration tests — new routes

| Test file | Tests |
|-----------|-------|
| `__tests__/integration/mail-stage1-gmail-api.test.ts` | AC-5.1–5.7: auth route returns URL, callback processes code, status returns state, disconnect deletes tokens, admin role guard |

### 9.4 Test isolation

- All tests set `OSSUM_RUNTIME_DIR` to a temp directory (via `vi.hoisted()` in Vitest) — same pattern as existing tests.
- Encrypted token store tests set `GMAIL_ENCRYPTION_KEY` to a test key.
- Gmail API calls are never made in unit tests — `googleapis` is mocked via `vi.mock("googleapis", ...)`.

---

## 10. Security design

### 10.1 Defense in depth

| Layer | Measure |
|-------|---------|
| Transport | HTTPS enforced in production — OAuth redirect URIs use HTTPS |
| Authentication | Validated via `getApiAuthContext()` → Supabase Auth token or DEV header |
| Authorization | Admin-only routes use `requireCompanyMutationAccess(ctx, ["admin", "super_admin", "owner"])` |
| Token storage | AES-256-GCM encrypted at rest on filesystem |
| Key management | `GMAIL_ENCRYPTION_KEY` is a separate env var from OAuth secrets |
| Token scoping | OAuth scope limited to `gmail.readonly` — cannot send/delete |
| Credential isolation | All Gmail credentials are server-side only (`process.env`, never `NEXT_PUBLIC_*`) |
| Path traversal prevention | `sanitizeCompanyId()` strips non-alphanumeric chars from file paths |
| Atomic writes | Temp file + rename prevents partial writes on crash |
| Token revocation | `POST /revoke` called on disconnect — best-effort but always deletes local tokens |

### 10.2 Build verification

After build, verify no secrets in client bundle:

```bash
npx next build
# Verify:
grep -r "GMAIL_CLIENT_SECRET" .next/  # should find nothing
grep -r "GMAIL_ENCRYPTION_KEY" .next/ # should find nothing
```

---

## 11. Dependency management

### 11.1 New dependency

```json
{
  "googleapis": "^148.0.0"
}
```

`google-auth-library` is a transitive dependency — the `OAuth2Client` class is imported directly from `google-auth-library` (which `googleapis` re-exports).

### 11.2 Conditional loading

The `provider-factory.ts` uses **dynamic `require()` calls** inside the `"gmail"` case branch. This means:
- When `MAIL_PROVIDER=mock`, `googleapis` is never imported — no startup cost, no import error if the package is not installed.
- The `googleapis` package must be installed in `node_modules` — but is only loaded when `MAIL_PROVIDER=gmail`.

---

## 12. Build and type safety

### 12.1 TypeScript considerations

1. **`providerName` type change:** `MailProviderAdapter.providerName` changes from `typeof MAIL_STAGE1_PROVIDER` (literal type `"mock-mailbox"`) to `string`. This allows `GmailMailProvider.providerName = "gmail"`.

2. **`MAIL_STAGE1_PROVIDER` export:** The constant remains exported as `const MAIL_STAGE1_PROVIDER = getMailStage1Provider()` for backward-compatible imports (e.g., `mock-mail-provider.ts` uses it). Since `getMailStage1Provider()` returns `"mock-mailbox"` when `MAIL_PROVIDER !== "gmail"`, the mock provider sees the expected value.

3. **`MockMailProvider.providerName`:** Remains typed as `typeof MAIL_STAGE1_PROVIDER`, which evaluates to `string` at the call site after the type change. No TypeScript errors expected.

4. **`dynamic require()` types:** Inside the `"gmail"` factory branch, the `require()` calls return `any`. Type assertions or type-only imports are used:
   ```ts
   const { GmailMailProvider } = require("./gmail-mail-provider") as {
     GmailMailProvider: typeof import("./gmail-mail-provider")["GmailMailProvider"]
   }
   ```

### 12.2 Build order

- `npx prisma generate` — not affected (no schema changes)
- `npx tsc --noEmit` — must pass
- `npx next build` — must succeed with `MAIL_PROVIDER=mock` (default)

---

## 13. Rollout sequence (implementation slices)

```
S1: Factory + swappeability           (low risk, 1 file new, 2 files modified)
  → provider-factory.ts (new)
  → types.ts (modified: getMailStage1Provider)
  → provider/types.ts (modified: interface extension)
  Validation: All 706 tests pass

S2: Token store + connection manager  (medium risk, 3 files new)
  → gmail/token-store.ts (new)
  → gmail/connection-manager.ts (new)
  → gmail/types.ts (new)
  Validation: Unit tests for encrypt/decrypt, OAuth flow mocks

S3: GmailMailProvider                 (medium risk, 1 file new)
  → provider/gmail-mail-provider.ts (new)
  Validation: Unit tests with mocked googleapis

S4: Admin routes                      (low risk, 4 files new)
  → app/api/admin/mail/gmail/auth/route.ts
  → app/api/admin/mail/gmail/callback/route.ts
  → app/api/admin/mail/gmail/status/route.ts
  → app/api/admin/mail/gmail/disconnect/route.ts
  Validation: Integration tests

S5: Service.ts integration            (low risk, 1 file modified)
  → service.ts (modified: replace mockMailProvider with factory)
  Validation: All existing tests pass + new integration tests

S6: Manual E2E with real Gmail        (manual, not automated)
  → Requires GCP project credentials (A1)
  → Full OAuth flow → browse → attach → refresh → disconnect
```

---

## 14. Known gaps & deferred

| Gap | Reason | Future resolution |
|-----|--------|-------------------|
| No body content in snapshots | A4: metadata + snippet only | Add `body` field to `ProviderConversationSnapshot.messages[]` when needed |
| No send/reply | Deferred to 3B (A2, A5) | `sendMessage` method on `GmailMailProvider` + `POST /api/admin/mail/gmail/send` |
| Token store is filesystem, not DB | A3: avoid `schema.prisma` | May migrate to Prisma model in Backend Foundation (GPT-027F.5A) |
| Single mailbox per company | V1 scope | `GmailConnectionManager` accepts `mailbox` in constructor — extensible |
| No push notifications / webhooks | Out of scope | Gmail Pub/Sub topic + webhook endpoint in future stage |
| Rate limiter is in-memory only | Single-instance deployment | Redis-backed rate limiter for multi-instance deployments |
| No admin UI page for connection management | Out of scope — API only | Simple admin page at `/admin/mail/gmail` with status + connect/disconnect buttons |

---

## 15. Caveman handoff

```text
Done:
- DESIGN.md for MAIL-V1-ETAPA3-GMAIL-REAL written
- 6 components fully specified: provider-factory, GmailMailProvider,
  GmailConnectionManager, EncryptedTokenStore, gmail/types, service.ts mods
- 4 admin API routes designed with auth guards matching existing patterns
- Data flow diagram: OAuth + browse + attach
- Error mapping table: 16 error codes consistent with existing patterns
- Security design: AES-256-GCM, env-only secrets, atomic writes, path sanitization
- Testing strategy: 4 new unit test files + 1 integration test file
- Filesystem layout: gmail-tokens/ alongside existing companies/ and attachments/
- Build verification: tsc --noEmit + next build + secret-in-bundle scan
- Rollout sequence: 5 implementation slices + 1 manual E2E slice
- 7 known gaps documented with future resolution paths

Changed:
- (none — design phase only, no code changes)

Files:
- knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/DESIGN.md — design artifact (this file)
- knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/PROPOSAL.md — referenced (unchanged)
- knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/SPEC.md — referenced (unchanged)

Validations:
- Architecture: MailProviderAdapter extended with companyId? (backward-compatible)
- Guardrails: no schema.prisma, no auth redesign, no send/reply, gmail.readonly only
- Existing API contracts: zero changes to mail-links and mailbox routes
- Interface compatibility: GmailMailProvider implements MailProviderAdapter
- Error consistency: all errors use ApiError with codes matching existing patterns

Risks:
- dynamic require() for googleapis may cause bundler issues if not handled carefully
  (mitigation: conditional require inside "gmail" case only)
- Gmail API quotas (10K req/day) — rate limiter at 200/100s provides comfortable headroom
- Token file permissions (chmod) are no-op on Windows — acceptable for dev, production on Linux
- provider-factory singleton holds connectionManager references — no cache invalidation on disconnect
  (mitigation: GmailMailProvider clears cache entry on auth failure, not implemented yet)

Next:
- Franco reviews DESIGN.md
- If approved: proceed to S1 implementation (factory + swappeability)
- GCP project credentials (A1) needed before S6 manual E2E
- npm install googleapis before S3 (GmailMailProvider)
```
