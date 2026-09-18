# SPEC — MAIL-V1-ETAPA3-GMAIL-REAL

Status: **specified**  
Change: `MAIL-V1-ETAPA3-GMAIL-REAL`  
Parent: `MAIL-V1-ETAPA1-IMPLEMENTACION` (Stage 1/2 completo, 706 tests OK)  
Scope: Gmail real provider + OAuth + swappable config  
Approvals: A1–A6 (all approved, see proposal)  
Artifact: `knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/SPEC.md`  
Engram topic: `sdd/MAIL-V1-ETAPA3-GMAIL-REAL/spec`

---

## 1. Purpose

Replace `MockMailProvider` with `GmailMailProvider`, a real Gmail API adapter implementing the same `MailProviderAdapter` interface. The rest of the Stage 1/2 architecture (service, repository, permissions, validators, API routes under `mail-links/` and `mailbox/`) remains unchanged — same request/response contracts, different provider beneath. The connection is admin-managed via OAuth 2.0, with encrypted filesystem token storage.

### 1.1 Approved boundaries (A1–A6)

| # | Decision | Verdict |
|---|----------|---------|
| A1 | GCP project `ossum-cor-mail`, OAuth credentials for `sistemas@districorr.com.ar` | Approved |
| A2 | Scope `gmail.readonly` only; `gmail.send` deferred to sub-stage 3B | Approved |
| A3 | Token storage: filesystem encrypted, no Prisma schema touch | Approved |
| A4 | Metadata + normalized body only; critical attachments persisted optionally | Approved |
| A5 | Send/reply deferred to sub-stage 3B | Approved |
| A6 | Dependency `googleapis` approved | Approved |

### 1.2 Out of scope (explicit)

- Send / reply / compose / draft / forward (deferred to Etapa 4 / sub-stage 3B)
- Inbox global or multi-mailbox dashboard
- Automatic sync, polling, webhooks (Gmail Push Notifications)
- Multiple mailboxes per company
- External storage for attachments (S3/Supabase) — filesystem as Stage 1
- Changes to `schema.prisma`, auth model, permissions model
- Refactor of Cirugías or Expediente tabs
- New admin UI — only API routes in this stage

---

## 2. Architecture overview

```
┌────────────────────────────────────────────────────┐
│              Existing API Routes                     │
│  /mailbox/conversations  /mail-links/**              │
│  (unchanged contracts)                               │
└────────────────────────┬───────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────┐
│               service.ts                             │
│  browseMailboxConversations()                        │
│  attachConversationToSurgery()                       │
│  refreshLinkedConversation()                         │
│  persistCriticalAttachments()                        │
│  listLinkedConversations()                           │
│  unlinkConversationFromSurgery()                     │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  import { getMailProvider } from               │  │
│  │    "./provider/provider-factory"              │  │
│  │  → provider.listMailboxConversations(...)      │  │
│  │  → provider.getConversationSnapshot(...)       │  │
│  │  → provider.downloadAttachment(...)            │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────┬───────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────┐
│           Provider Factory                           │
│  getMailProvider(): MailProviderAdapter               │
│  reads MAIL_PROVIDER env → "mock" | "gmail"           │
│  singletons: MockMailProvider | GmailMailProvider      │
└───────┬───────────────────────────────┬─────────────┘
        │                               │
        ▼                               ▼
┌───────────────┐             ┌───────────────────────┐
│ MockMailProvider│             │  GmailMailProvider     │
│ (unchanged)    │             │  (NEW)                  │
└───────────────┘             └───────────┬─────────────┘
                                          │
                          ┌───────────────▼─────────────┐
                          │   GmailConnectionManager     │
                          │   (NEW)                       │
                          │   - OAuth client lifecycle    │
                          │   - Token refresh             │
                          │   - Health check              │
                          └───────────────┬─────────────┘
                                          │
                          ┌───────────────▼─────────────┐
                          │   EncryptedTokenStore         │
                          │   (NEW)                       │
                          │   - encrypt/decrypt tokens    │
                          │   - filesystem .runtime/      │
                          │     mail-stage1/gmail-tokens  │
                          └──────────────────────────────┘
```

---

## 3. File structure (new + modified)

```
src/lib/mail-stage1/
├── provider/
│   ├── types.ts                     ← NO CHANGES
│   ├── mock-mail-provider.ts        ← NO CHANGES
│   ├── gmail-mail-provider.ts       ← NEW: GmailMailProvider
│   └── provider-factory.ts          ← NEW: factory with env switch
├── gmail/
│   ├── connection-manager.ts        ← NEW: GmailConnectionManager
│   ├── token-store.ts               ← NEW: EncryptedTokenStore
│   └── types.ts                     ← NEW: Gmail-internal types
├── service.ts                       ← MODIFIED: import provider via factory
│                                     ← replaces direct mockMailProvider import
├── types.ts                         ← MODIFIED: MAIL_STAGE1_PROVIDER
│                                     ← from literal to dynamic (factory stub),
│                                     ← or keep literal + add provider label
├── repository.ts                    ← NO CHANGES
└── permissions.ts                   ← NO CHANGES

src/app/api/admin/mail/gmail/
├── auth/route.ts                    ← NEW: OAuth start
├── callback/route.ts                ← NEW: OAuth callback
├── status/route.ts                  ← NEW: connection status
└── disconnect/route.ts              ← NEW: revoke tokens

.vruntime/mail-stage1/
├── companies/                       ← EXISTING (company documents)
├── attachments/                     ← EXISTING (persisted binary)
├── gmail-tokens/                    ← NEW: encrypted token files
│   └── {companyId}.json.enc         ← per-company encrypted tokens
```

---

## 4. Component specifications

### 4.1 `GmailMailProvider` — `src/lib/mail-stage1/provider/gmail-mail-provider.ts`

Implements `MailProviderAdapter`. Must be a singleton exported as `gmailMailProvider`.

#### 4.1.1 Class contract

```ts
import type { MailProviderAdapter } from "./types"
import type { MAIL_STAGE1_MAILBOX, MAIL_STAGE1_PROVIDER } from "../types"

export class GmailMailProvider implements MailProviderAdapter {
  readonly providerName: string  // "gmail"

  constructor(connectionManager: GmailConnectionManager)

  // --- MailProviderAdapter methods (see §4.4–4.6) ---
  async listMailboxConversations(input: {
    mailbox: typeof MAIL_STAGE1_MAILBOX
    query?: string
    limit?: number
  }): Promise<MockMailboxConversationSummary[]>

  async getConversationSnapshot(input: {
    mailbox: typeof MAIL_STAGE1_MAILBOX
    externalConversationId: string
  }): Promise<ProviderConversationSnapshot>

  async downloadAttachment(input: {
    mailbox: typeof MAIL_STAGE1_MAILBOX
    externalConversationId: string
    providerAttachmentRef: string
  }): Promise<{ buffer: Buffer; fileName: string; mimeType: string }>
}
```

#### 4.1.2 Constructor

- Receives a `GmailConnectionManager` instance.
- Lazily initializes the Gmail API client (`google.gmail({ version: "v1", auth })`) per connection.
- The `auth` client is obtained from `connectionManager.getAuthClient()`.
- Must NOT hold authorization state — delegates entirely to `connectionManager`.

#### 4.1.3 Error mapping

All Gmail API errors must be mapped to the same error codes used by `MockMailProvider` for API route compatibility:

| Gmail API error | HTTP status | `code` string |
|-----------------|-------------|---------------|
| Mailbox not configured / no connection | 404 | `mail_mailbox_not_available` |
| Thread/message not found | 404 | `mail_provider_snapshot_unavailable` |
| Attachment not found | 404 | `mail_attachment_not_found` |
| Gmail rate limit (HTTP 429) | 429 | `mail_gmail_rate_limited` |
| Auth failure (HTTP 401 from Gmail) | 502 | `mail_gmail_auth_failed` |
| General Gmail API failure | 500 | `mail_gmail_api_error` |

Errors thrown use `notFound()`, `conflict()`, `internalError()` from `@/lib/api/errors` to match existing pattern.

#### 4.1.4 Rate limiting

- Track request timestamps internally (in-memory, per-instance).
- Maximum 200 requests per 100 seconds (well under Gmail's 250/sec limit to account for `/users.threads.get` child calls).
- If limit would be exceeded, throw `conflict("Gmail rate limit exceeded", "mail_gmail_rate_limited")`.
- Reset counter on rolling window (100 seconds from first tracked call).

---

### 4.2 `GmailConnectionManager` — `src/lib/mail-stage1/gmail/connection-manager.ts`

Manages the OAuth 2.0 lifecycle for a Gmail connection. Company-scoped.

#### 4.2.1 Class contract

```ts
import type { GmailConnectionState } from "./types"

export class GmailConnectionManager {
  constructor(
    companyId: string,
    tokenStore: EncryptedTokenStore
  )

  // OAuth flow
  generateAuthUrl(): string
  async handleCallback(code: string): Promise<void>

  // Runtime
  async getAuthClient(): Promise<OAuth2Client>
  async getConnectionState(): Promise<GmailConnectionState>
  async disconnect(): Promise<void>

  // Internal (called by getAuthClient)
  private async refreshAccessToken(): Promise<void>
}
```

#### 4.2.2 Constructor

- `companyId`: scopes the connection to one company. Multi-company is achieved by instantiating one `GmailConnectionManager` per company.
- `tokenStore`: injected `EncryptedTokenStore` — the manager does not read/write files directly.

#### 4.2.3 `generateAuthUrl(): string`

1. Create an `OAuth2Client` from `google-auth-library` using:
   - `clientId` → `process.env.GMAIL_CLIENT_ID`
   - `clientSecret` → `process.env.GMAIL_CLIENT_SECRET`
   - `redirectUri` → `process.env.GMAIL_REDIRECT_URI`
2. Generate auth URL with:
   - Scope: `https://www.googleapis.com/auth/gmail.readonly`
   - Access type: `offline` (required for refresh token)
   - Prompt: `consent` (force refresh token on every auth)
   - State parameter: `companyId` (verified on callback to prevent CSRF)
3. Return the URL string. Does NOT redirect — the API route does.

#### 4.2.4 `handleCallback(code: string): Promise<void>`

1. Use the same `OAuth2Client` configuration to exchange `code` for tokens via `getToken(code)`.
2. Extract `access_token`, `refresh_token`, `expiry_date`, `scope`, `token_type`.
3. Validate that scope includes `gmail.readonly`. Reject if not.
4. Pass tokens to `tokenStore.save(companyId, tokens)`.
5. Mark connection as healthy (state transitions to `connected`).
6. Throw `badRequest("Invalid OAuth code", "mail_gmail_oauth_code_invalid")` if token exchange fails.

#### 4.2.5 `getAuthClient(): Promise<OAuth2Client>`

1. Load tokens from `tokenStore.load(companyId)`.
2. If no tokens → throw `notFound("Gmail not connected", "mail_gmail_not_connected")`.
3. Create `OAuth2Client` with loaded credentials.
4. Set up `on("tokens", ...)` listener that auto-saves refreshed tokens to `tokenStore`.
5. If `access_token` is expired (check `expiry_date`), call `refreshAccessToken()`.
6. Return the authenticated client.

#### 4.2.6 `getConnectionState(): Promise<GmailConnectionState>`

Return type `GmailConnectionState`:
```ts
type GmailConnectionState = {
  status: "none" | "connected" | "error" | "expired"
  mailbox: string
  connectedAt?: string        // ISO timestamp
  lastHealthCheck?: string    // ISO timestamp
  lastError?: string
  scopes: string[]
}
```

1. Load tokens from `tokenStore.load(companyId)`.
2. If no tokens → `{ status: "none", mailbox: "...", scopes: [] }`.
3. If tokens exist but `refresh_token` missing or empty → `{ status: "expired", ... }`.
4. Try a lightweight health check: call `gmail.users.getProfile({ userId: "me" })` with a 5-second timeout.
5. If health check passes → `{ status: "connected", ... }`.
6. If health check fails with 401 → `{ status: "expired", ... }`.
7. If health check fails with other error → `{ status: "error", lastError: message, ... }`.

#### 4.2.7 `disconnect(): Promise<void>`

1. Load tokens from `tokenStore`.
2. If tokens exist, attempt to revoke the `access_token` via Google's revocation endpoint: `POST https://oauth2.googleapis.com/revoke?token={access_token}`.
3. Call `tokenStore.delete(companyId)` — removes encrypted file.
4. If revoke fails, still delete local tokens (best-effort revocation).
5. Log the disconnection for audit.

#### 4.2.8 `refreshAccessToken(): Promise<void>` (private)

1. Called when `access_token` is expired.
2. Uses `OAuth2Client.refreshAccessToken()` (from `google-auth-library`) — this uses the stored `refresh_token`.
3. On success: the `"tokens"` event handler auto-persists via `tokenStore.save(...)`.
4. On failure (refresh token revoked, invalid_grant): throw `internalError("Gmail session expired — reauthorization required", "mail_gmail_session_expired")`. The admin must re-run the OAuth flow.

---

### 4.3 `EncryptedTokenStore` — `src/lib/mail-stage1/gmail/token-store.ts`

Company-scoped, encrypted, filesystem-backed token persistence. Does NOT use `schema.prisma`.

#### 4.3.1 Storage contract

```
.vruntime/
└── mail-stage1/
    └── gmail-tokens/
        └── {companyId}.json.enc     ← hex-encoded AES-256-GCM encrypted JSON
```

- One file per company.
- File is always encrypted at rest.
- Atomic write via temp-file + rename (same pattern as `repository.ts`).
- Directory created on first write.

#### 4.3.2 Data shape (stored, after encryption)

```ts
type GmailTokenPayload = {
  access_token: string
  refresh_token: string
  expiry_date: number       // epoch ms
  scope: string
  token_type: "Bearer"
  companyId: string          // cross-checked on load
  updatedAt: string          // ISO timestamp
}
```

#### 4.3.3 Class contract

```ts
export class EncryptedTokenStore {
  async save(companyId: string, tokens: GmailTokenPayload): Promise<void>
  async load(companyId: string): Promise<GmailTokenPayload | null>
  async delete(companyId: string): Promise<void>
  async exists(companyId: string): Promise<boolean>
}
```

#### 4.3.4 Encryption

- Algorithm: **AES-256-GCM** (`node:crypto`).
- Key: derived from `process.env.GMAIL_ENCRYPTION_KEY` (64 hex chars = 32 bytes).
  - Hex-decoded directly — no PBKDF2/HKDF needed since the env var is already a raw 256-bit key.
  - On startup, validate key length (must be 64 hex chars). Throw `internalError("GMAIL_ENCRYPTION_KEY must be 64 hex characters", "mail_gmail_invalid_encryption_key")` if invalid.
- IV: 12 random bytes generated per write via `crypto.randomBytes(12)`. Stored prepended to ciphertext.
- Auth tag: GCM appends 16-byte tag automatically. Not stored separately.
- Format on disk: `hex(iv + ciphertext + authTag)` → the encrypted file is a hex string.

#### 4.3.5 `save(companyId, tokens)`

1. Add `companyId` and `updatedAt` to the payload.
2. Serialize to JSON.
3. Generate random 12-byte IV.
4. Encrypt with AES-256-GCM: `crypto.createCipheriv("aes-256-gcm", key, iv)`.
5. Get auth tag: `cipher.getAuthTag()` — append to ciphertext.
6. Prepend IV to ciphertext.
7. Hex-encode the full buffer.
8. Write atomically to `.runtime/mail-stage1/gmail-tokens/{companyId}.json.enc`.
   - Write to temp file → `rename` to target (same as `repository.ts` pattern).
9. Set restrictive file permissions: `0o600` (owner read/write only — `fs.chmod` after write). On Windows, this is a best-effort operation (no-op) — no error thrown.

#### 4.3.6 `load(companyId)`

1. Check if file exists. If not → return `null`.
2. Read file as hex string.
3. Hex-decode to buffer.
4. Extract first 12 bytes as IV.
5. Extract remaining bytes as ciphertext + auth tag.
6. Decrypt with AES-256-GCM: `crypto.createDecipheriv("aes-256-gcm", key, iv)` + `decipher.setAuthTag(tag)`.
7. Parse JSON.
8. Cross-check: `payload.companyId === companyId`. If mismatch → throw `internalError(...)`.
9. Return payload.

#### 4.3.7 `delete(companyId)`

1. If file exists, unlink it.
2. If file does not exist, no-op (idempotent).
3. Errors caught and logged — does not throw unless filesystem is unreachable.

#### 4.3.8 `exists(companyId)`

- Returns `true` if the encrypted token file exists and is readable.

---

### 4.4 Gmail API mapping: threads → conversations

#### 4.4.1 `listMailboxConversations`

Maps Gmail threads to `MockMailboxConversationSummary[]`.

**Gmail API calls:**
```
1. GET /gmail/v1/users/{mailbox}/threads?q=in:inbox&maxResults={limit}
   → { threads: [{ id, snippet, historyId }], ... }

2. For each thread: GET /gmail/v1/users/{mailbox}/threads/{id}
   → ?format=metadata&metadataHeaders=Subject&metadataHeaders=From
     &metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date
```

**Query construction:**
- Base: `in:inbox` (configurable later via company settings).
- If `input.query` is provided → append it raw (Gmail query syntax). Sanitize: strip any characters not in `[a-zA-Z0-9:@._\-\s"()]` to prevent injection.
- **IMPORTANT**: Only the admin's authenticated mailbox is queried — `input.mailbox` must match the authenticated user's email. If `input.mailbox !== authenticatedEmail` → throw `notFound("Mailbox not available", "mail_mailbox_not_available")`.

**Mapping:**

| Gmail field | Output field | Notes |
|-------------|--------------|-------|
| `thread.id` | `externalConversationId` | Direct mapping |
| `thread.messages[0].payload.headers[Subject]` | `subject` | First non-empty subject |
| `thread.messages[0].payload.headers[From/To/Cc]` | `participants` | Parsed into `{name?, email, role}` |
| `thread.messages[last].payload.headers[Date]` | `latestMessageAt` | Last message's Date header, parsed to ISO 8601 |
| `thread.messages.length` | `messageCount` | Count of messages in thread |
| `thread.messages[last].snippet` | `previewSnippet` | From last message in thread |
| Per-message `parts[].filename` | `attachments` | Only parts where `filename` is non-empty; `attachmentId` = `${thread.id}::${part.body.attachmentId}` |

**Gmail thread ID stability:**
- Gmail thread IDs are stable across API calls for the same user.
- Used as `externalConversationId` in the Stage 1 model — no re-mapping needed.

**Fallback for deleted threads:**
- If a thread returns 404 on `get` (deleted between list and fetch), skip it silently (not included in results).
- Do not throw — the list should degrade gracefully.

#### 4.4.2 `getConversationSnapshot`

Maps a single Gmail thread to `ProviderConversationSnapshot`.

**Gmail API call:**
```
GET /gmail/v1/users/{mailbox}/threads/{externalConversationId}
  → ?format=FULL
```

**Response structure** (Gmail `Thread` resource):
```json
{
  "id": "thread-abc123",
  "historyId": "...",
  "messages": [
    {
      "id": "msg-1",
      "threadId": "thread-abc123",
      "labelIds": ["INBOX", "IMPORTANT"],
      "snippet": "...",
      "payload": {
        "partId": "",
        "mimeType": "multipart/mixed",
        "headers": [
          { "name": "Subject", "value": "..." },
          { "name": "From", "value": "..." },
          { "name": "To", "value": "..." },
          { "name": "Cc", "value": "..." },
          { "name": "Date", "value": "..." }
        ],
        "parts": [
          {
            "partId": "0",
            "mimeType": "text/plain",
            "body": { "size": 123, "data": "SGVsbG8=" }   // base64
          },
          {
            "partId": "1",
            "mimeType": "application/pdf",
            "filename": "autorizacion.pdf",
            "body": {
              "attachmentId": "ANGjdJ...",
              "size": 48200
            }
          }
        ]
      }
    }
  ]
}
```

**Mapping to `ProviderConversationSnapshot`:**

| Output field | Source | Notes |
|-------------|--------|-------|
| `provider` | `"gmail"` | Hardcoded |
| `mailbox` | `input.mailbox` | Pass-through |
| `externalConversationId` | `thread.id` | Direct |
| `externalThreadId` | `thread.id` | Same value (Gmail thread ≈ conversation) |
| `subject` | First message's `Subject` header | Decoded from RFC 2047 if needed |
| `participants` | All unique `From`/`To`/`Cc` across all messages | Deduplicated by email; `role` derived from header name |
| `latestMessageAt` | Last message's `Date` header | RFC 2822 → ISO 8601 |
| `messages` | Each `thread.messages[n]` | See message mapping below |
| `attachments` | All parts with `filename` across all messages | See attachment mapping below |

**Message mapping** (each `thread.messages[n]`):
| Output field | Source |
|-------------|--------|
| `id` | `message.id` |
| `sentAt` | `Date` header → ISO 8601 |
| `from` | `From` header → email only |
| `to` | `To` header → email array |
| `cc` | `Cc` header → email array (empty if no Cc) |
| `snippet` | `message.snippet` (Gmail-provided, max 200 chars) |

**Body extraction** (A4 compliance — metadata only, no full body):
- Message bodies are NOT included in the snapshot.
- `message.snippet` from Gmail is sufficient (it's a Gmail-generated preview, not the raw body).
- If a future stage requires body content, add a `body` field with decoding of `text/plain` parts from `payload.parts`.
- For Stage 3A: snippet only, as spec'd in A4.

**Attachment mapping** (across all messages in thread):
| Output field | Source |
|-------------|--------|
| `attachmentId` | `{thread.id}::{part.body.attachmentId}` (scoped to thread) |
| `fileName` | `part.filename` |
| `mimeType` | `part.mimeType` |
| `sizeBytes` | `part.body.size` |
| `providerAttachmentRef` | `${message.id}::${part.body.attachmentId}` (Gmail attachment ref) |

**Header parsing:**
- `From`: `name <email>` → extract both. If no name, use email portion before `@` as name fallback.
- `To`: comma-separated list → `[{name?, email}, ...]`.
- `Cc`: comma-separated list → `[{name?, email}, ...]`.
- `Date`: RFC 2822 → parsed with `new Date()` → `.toISOString()`.
- `Subject`: decoded from RFC 2047 encoded-words (`=?UTF-8?B?...?=` → UTF-8).

#### 4.4.3 `downloadAttachment`

Fetches a single Gmail attachment and returns its binary content.

**Gmail API call:**
```
GET /gmail/v1/users/{mailbox}/messages/{messageId}/attachments/{attachmentId}
  → { "attachmentId": "...", "size": 48200, "data": "base64string..." }
```

**`providerAttachmentRef` format:** `{messageId}::{attachmentId}` (from the attachment mapping above).
- Parse: split on `::` → `[messageId, attachmentId]`.
- If format is invalid → throw `notFound("Invalid attachment reference", "mail_attachment_not_found")`.

**Return:**
```ts
{
  buffer: Buffer.from(data, "base64"),
  fileName: (from snapshot — the providerAttachmentRef resolves to the right filename
            via a lookup in the snapshot's attachment list),
  mimeType: (from snapshot)
}
```

**IMPORTANT:** `fileName` and `mimeType` should ideally come from the attachment metadata stored in the snapshot (already fetched). However, the `downloadAttachment` method signature does not pass them in. Options:
1. **Recommended**: Do a lightweight lookup — call `gmail.users.messages.get({ id: messageId, format: "metadata", metadataHeaders: [] })` to get the part metadata for filename/mimeType. This is 1 extra API call.
2. **Alternative**: Store filename and mimeType in the `providerAttachmentRef` string (e.g., `msgId::attId::fileName::mimeType`) — but this exposes them and is fragile.
3. **Pragmatic (chosen for Stage 3A)**: Accept that Gmail's attachment download response only includes `data` and `size`. Use the snapshot attachment list already stored in the company document to resolve filename/mimeType from `providerAttachmentRef`. This avoids extra API calls.

**Resolution strategy (implemented in service, not provider):**
- `service.persistCriticalAttachments()` already has the snapshot (with attachment metadata) in scope.
- The provider returns `{ buffer, fileName: "", mimeType: "" }` from the raw download.
- The service layer fills in `fileName` and `mimeType` from the stored snapshot.
- This keeps the provider contract clean and avoids redundant API calls.

---

### 4.5 Provider factory — `src/lib/mail-stage1/provider/provider-factory.ts`

#### 4.5.1 Contract

```ts
import type { MailProviderAdapter } from "./types"

export function getMailProvider(): MailProviderAdapter

// Internal:
// - Reads process.env.MAIL_PROVIDER ("mock" | "gmail")
// - Returns singleton for each provider type
// - "gmail" returns GmailMailProvider with real connection manager
// - "mock" returns mockMailProvider (existing)
// - Any other value → defaults to "mock" with console warning
```

#### 4.5.2 Behavior

1. Read `process.env.MAIL_PROVIDER` at call time (allows runtime switch without restart if the env system supports it; otherwise, server restart required — both acceptable).
2. `"mock"` → return existing `mockMailProvider` singleton.
3. `"gmail"` → return `gmailMailProvider` singleton.
   - Instantiate `EncryptedTokenStore` once.
   - Instantiate `GmailConnectionManager(companyId, tokenStore)` once.
   - Instantiate `GmailMailProvider(connectionManager)` once.
4. Unknown value → log warning to console, return `mockMailProvider`.
5. The factory is called by `service.ts` on every function entry. The singleton ensures no repeated instantiation cost. The lazy pattern is:
   ```ts
   let gmailProvider: GmailMailProvider | null = null
   // ...
   case "gmail":
     if (!gmailProvider) {
       const tokenStore = new EncryptedTokenStore()
       const connManager = new GmailConnectionManager(companyId, tokenStore)
       gmailProvider = new GmailMailProvider(connManager)
     }
     return gmailProvider
   ```

#### 4.5.3 `MAIL_STAGE1_PROVIDER` dynamic resolution

Current `types.ts`:
```ts
export const MAIL_STAGE1_PROVIDER = "mock-mailbox"
```

This is used in `buildConversationKey()` and throughout the system to namespace snapshots.

**Required change:** `MAIL_STAGE1_PROVIDER` must reflect the active provider so that conversation keys are namespaced correctly. If a conversation was imported under `gmail`, its key must contain `gmail` — otherwise switching providers would cause key collisions or data loss.

**Strategy:**
```ts
export function getMailStage1Provider(): string {
  return process.env.MAIL_PROVIDER === "gmail" ? "gmail" : "mock-mailbox"
}
```
- `buildConversationKey()` calls `getMailStage1Provider()` instead of reading the constant.
- This ensures Gmail-imported conversations have keys like `gmail::sistemas@districorr.com.ar::thread-abc`.
- Mock-imported conversations keep their keys: `mock-mailbox::sistemas@districorr.com.ar::conv-ortho-001`.
- No data loss on provider switch — existing conversations are unaffected.

---

### 4.6 `service.ts` modifications

Minimal change: replace direct `mockMailProvider` import with factory call.

**Before:**
```ts
import { mockMailProvider } from "./provider/mock-mail-provider"
// ...
mockMailProvider.listMailboxConversations({ ... })
```

**After:**
```ts
import { getMailProvider } from "./provider/provider-factory"
// ...
const provider = getMailProvider()
provider.listMailboxConversations({ ... })
```

Plus the `MAIL_STAGE1_PROVIDER` constant → `getMailStage1Provider()` function change in `types.ts`.

All 6 service functions (`browseMailboxConversations`, `attachConversationToSurgery`, `refreshLinkedConversation`, `persistCriticalAttachments`, `listLinkedConversations`, `unlinkConversationFromSurgery`) are affected identically — each call to the provider is prefixed with `const provider = getMailProvider()`.

---

### 4.7 Admin API routes

All routes under `src/app/api/admin/mail/gmail/`. Admin-only (role check: `admin`, `super_admin`, `owner`). Use existing `getApiAuthContext` + `requireCompanyReadAccess` or a new `requireAdminAccess` guard.

#### 4.7.1 `GET /api/admin/mail/gmail/auth`

**Purpose:** Initiate OAuth flow.

**Request:**
```
GET /api/admin/mail/gmail/auth?companyId={companyId}
```

**Behavior:**
1. Validate `companyId` query param is non-empty.
2. Load auth context — verify admin role.
3. Instantiate `GmailConnectionManager` for the company.
4. Call `connectionManager.generateAuthUrl()`.
5. Return `{ redirectUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }`.
   - The client redirects (HTTP 302 or the frontend uses `window.location`).
   - Preferred: return the URL as JSON and let the client handle redirect.

**Response:** `200 { redirectUrl: string }`

**Errors:**
- `400` — missing companyId
- `403` — not admin
- `500` — missing env variables (`GMAIL_CLIENT_ID`, etc.)

#### 4.7.2 `GET /api/admin/mail/gmail/callback`

**Purpose:** Handle OAuth callback from Google.

**Request:**
```
GET /api/admin/mail/gmail/callback?code={code}&state={companyId}
```

**Behavior:**
1. Validate `code` is present.
2. Validate `state` matches a valid company.
3. Instantiate `GmailConnectionManager` for the company.
4. Call `connectionManager.handleCallback(code)`.
5. Redirect to a confirmation page: `/admin/mail/gmail/connected?companyId={companyId}`.
   - This is a simple static page or a generic success message.
   - Alternatively: return `200 { status: "connected", mailbox: "sistemas@districorr.com.ar" }`.

**Response:** `302 → /admin/mail/gmail/connected?companyId={companyId}`

**Errors:**
- `400` — missing `code`, invalid OAuth code
- `500` — token exchange failed

#### 4.7.3 `GET /api/admin/mail/gmail/status`

**Purpose:** Check connection health.

**Request:**
```
GET /api/admin/mail/gmail/status?companyId={companyId}
```

**Behavior:**
1. Validate `companyId`.
2. Verify admin role.
3. Instantiate `GmailConnectionManager` for the company.
4. Call `connectionManager.getConnectionState()`.
5. Return the state.

**Response:**
```json
{
  "status": "connected",
  "mailbox": "sistemas@districorr.com.ar",
  "connectedAt": "2026-06-21T15:00:00.000Z",
  "lastHealthCheck": "2026-06-21T15:05:00.000Z",
  "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
  "provider": "gmail",
  "companyId": "org_001"
}
```

#### 4.7.4 `POST /api/admin/mail/gmail/disconnect`

**Purpose:** Revoke tokens and disconnect.

**Request:**
```
POST /api/admin/mail/gmail/disconnect
Content-Type: application/json

{ "companyId": "org_001" }
```

**Behavior:**
1. Validate `companyId`.
2. Verify admin role.
3. Instantiate `GmailConnectionManager` for the company.
4. Call `connectionManager.disconnect()`.
5. Return `{ status: "disconnected" }`.

**Response:** `200 { status: "disconnected", mailbox: "sistemas@districorr.com.ar" }`

---

## 5. Environment variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MAIL_PROVIDER` | Yes | Provider switch: `"mock"` or `"gmail"` | `mock` |
| `GMAIL_CLIENT_ID` | If provider=gmail | OAuth 2.0 client ID | `xxx.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | If provider=gmail | OAuth 2.0 client secret | `GOCSPX-xxx` |
| `GMAIL_REDIRECT_URI` | If provider=gmail | OAuth callback URL | `https://app.example.com/api/admin/mail/gmail/callback` |
| `GMAIL_ENCRYPTION_KEY` | If provider=gmail | 64 hex chars (256-bit) for AES-256-GCM | (generated via `crypto.randomBytes(32).toString("hex")`) |

**Security rules:**
- All variables are server-side only (never exposed to client via `NEXT_PUBLIC_*`).
- `GMAIL_CLIENT_SECRET` and `GMAIL_ENCRYPTION_KEY` excluded from Git (`.env.example` contains placeholder values).
- `GMAIL_ENCRYPTION_KEY` must be different in each environment (dev, staging, prod).

---

## 6. Dependencies

### 6.1 New

```json
{
  "googleapis": "^148.0.0"
}
```

Note: `google-auth-library` is a transitive dependency of `googleapis` and provides `OAuth2Client` — no separate package needed.

### 6.2 Native (already available)

- `node:crypto` → `createCipheriv`, `createDecipheriv`, `randomBytes` (AES-256-GCM encryption)
- `node:fs/promises` → `mkdir`, `readFile`, `writeFile`, `rename`, `unlink`, `chmod` (token file IO)

---

## 7. Acceptance criteria

### AC-1: Provider factory swappeability

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1.1 | `MAIL_PROVIDER=mock` → system uses `MockMailProvider` (existing behavior) | Existing 706 tests pass unchanged |
| AC-1.2 | `MAIL_PROVIDER=gmail` → system uses `GmailMailProvider` | Manual integration test or unit test with mocked `googleapis` |
| AC-1.3 | Unknown `MAIL_PROVIDER` → defaults to `mock` with console warning | Unit test |
| AC-1.4 | Provider switch does not change API route contracts | Smoke test: same request → same response shape |
| AC-1.5 | Existing mock-imported conversations work after switch (no data loss) | Integration test: attach with mock, switch to gmail, browse — existing links intact |

### AC-2: GmailMailProvider

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-2.1 | `listMailboxConversations` returns correctly mapped summaries | Unit test with mock Gmail API responses |
| AC-2.2 | `listMailboxConversations` with empty query returns all threads | Unit test |
| AC-2.3 | `listMailboxConversations` with query filters correctly | Unit test |
| AC-2.4 | `getConversationSnapshot` returns full thread with messages + attachments | Unit test |
| AC-2.5 | `getConversationSnapshot` throws `mail_provider_snapshot_unavailable` for nonexistent thread | Unit test |
| AC-2.6 | `downloadAttachment` returns correct buffer, filename, mimeType | Unit test |
| AC-2.7 | `downloadAttachment` throws `mail_attachment_not_found` for invalid ref | Unit test |
| AC-2.8 | Gmail API 401 → throws `mail_gmail_auth_failed` (triggers token refresh upstream) | Unit test |
| AC-2.9 | Gmail API 429 → throws `mail_gmail_rate_limited` | Unit test |
| AC-2.10 | `listMailboxConversations` gracefully skips threads deleted between list and fetch | Integration test |
| AC-2.11 | Provider implements `MailProviderAdapter` fully (TypeScript) | `implements MailProviderAdapter` compiles without errors |

### AC-3: GmailConnectionManager

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-3.1 | `generateAuthUrl` returns valid Google OAuth URL with correct scopes | Unit test: inspect URL params |
| AC-3.2 | `generateAuthUrl` includes `access_type=offline` and `prompt=consent` | Unit test: URL param inspection |
| AC-3.3 | `handleCallback` exchanges code for tokens and persists them | Integration test with mock OAuth server |
| AC-3.4 | `handleCallback` rejects if scope does not include `gmail.readonly` | Unit test |
| AC-3.5 | `getAuthClient` returns authenticated client when tokens exist | Unit test with mock token store |
| AC-3.6 | `getAuthClient` auto-refreshes expired access token | Unit test: mock expired expiry_date |
| AC-3.7 | `getAuthClient` throws `mail_gmail_session_expired` if refresh fails | Unit test: mock invalid_grant |
| AC-3.8 | `getConnectionState` returns `"none"` when no tokens exist | Unit test |
| AC-3.9 | `getConnectionState` returns `"connected"` after successful auth | Integration test |
| AC-3.10 | `getConnectionState` returns `"expired"` when refresh fails | Integration test |
| AC-3.11 | `disconnect` revokes token and deletes local storage | Unit test: verify `tokenStore.delete` called |
| AC-3.12 | `disconnect` still deletes local token if revoke fails (best-effort) | Unit test: mock revoke failure |

### AC-4: EncryptedTokenStore

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-4.1 | `save` writes encrypted file to `.runtime/mail-stage1/gmail-tokens/{companyId}.json.enc` | Unit test: verify file exists and is not plain JSON |
| AC-4.2 | `load` decrypts and returns valid token payload | Unit test: write → read → compare |
| AC-4.3 | `load` returns `null` if file does not exist | Unit test |
| AC-4.4 | `load` cross-checks `companyId` in payload | Unit test: write with company A, load with company B → throw |
| AC-4.5 | `delete` removes file | Unit test: write → delete → load returns null |
| AC-4.6 | `delete` is idempotent (no error if file doesn't exist) | Unit test |
| AC-4.7 | Encrypted file is not readable as plain JSON | Manual verification: `cat file.json.enc` → hex garbage |
| AC-4.8 | `GMAIL_ENCRYPTION_KEY` length validation: rejects non-64-hex keys | Unit test |
| AC-4.9 | Atomic write: corrupt file never left on disk (temp + rename) | Unit test: mock `rename` failure → original file intact |
| AC-4.10 | Different key → decrypt fails (ciphertext bound to key) | Unit test: write with key A, change key, attempt load → error |

### AC-5: Admin API routes

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-5.1 | `GET /admin/mail/gmail/auth` returns redirect URL | Integration test |
| AC-5.2 | `GET /admin/mail/gmail/auth` rejects non-admin roles (403) | Integration test |
| AC-5.3 | `GET /admin/mail/gmail/callback` processes code and persists tokens | Integration test with test OAuth code |
| AC-5.4 | `GET /admin/mail/gmail/callback` redirects to confirmation page | Integration test: follow redirect |
| AC-5.5 | `GET /admin/mail/gmail/status` returns correct connection state | Integration test |
| AC-5.6 | `POST /admin/mail/gmail/disconnect` revokes and deletes tokens | Integration test |
| AC-5.7 | All admin routes require admin role (403 otherwise) | Integration test per route |

### AC-6: End-to-end with Gmail API

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-6.1 | Full OAuth flow: auth → callback → status shows "connected" | Manual E2E with real GCP project |
| AC-6.2 | Browse mailbox: lists real conversations from `sistemas@districorr.com.ar` | Manual E2E |
| AC-6.3 | Attach conversation: snapshot with messages + attachments persisted | Manual E2E |
| AC-6.4 | Refresh conversation: updates snapshot from live Gmail | Manual E2E |
| AC-6.5 | Persist attachment: downloads and stores binary | Manual E2E |
| AC-6.6 | Disconnect: status returns "none", browse fails gracefully | Manual E2E |
| AC-6.7 | All existing 706 tests pass after modifications | `npx jest` |

### AC-7: Non-functional

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-7.1 | TypeScript compiles with `googleapis` dependency | `npx tsc --noEmit` |
| AC-7.2 | Build succeeds (`next build`) | `npx next build` |
| AC-7.3 | No secrets in client bundle (verify with build output inspection) | Grep for `GMAIL_CLIENT_SECRET` in `.next/` |
| AC-7.4 | Token files have `0o600` permissions (Unix) or are created securely | Unit test verifies `chmod` call |
| AC-7.5 | Rate limiter keeps requests under 200/100s | Unit test: simulate 201 rapid calls → 200th succeeds, 201st throws |
| AC-7.6 | `MAIL_PROVIDER=mock` has zero performance regression vs current | Benchmark: browse with mock → same response time |

---

## 8. Migration & rollout

### 8.1 Feature flag

- Default: `MAIL_PROVIDER=mock` — all existing behavior preserved.
- To activate: set `MAIL_PROVIDER=gmail`, configure Gmail env vars, run OAuth flow via admin route.
- No code deploy needed for activation — env change + OAuth flow is sufficient.

### 8.2 Rollback

- Change `MAIL_PROVIDER=mock` → instant fallback.
- Gmail-imported snapshots remain accessible (filesystem data is provider-agnostic).
- Gmail tokens remain on disk (not deleted) — reconnection requires only setting the env vars back.

### 8.3 Implementation order (slices from proposal)

| Slice | Content | Dependencies | Risk |
|-------|---------|--------------|------|
| S1 | Factory + swappeability | None | Low |
| S2 | Token store + connection manager | S1 (factory provides instances) | Medium |
| S3 | GmailMailProvider | S2 (needs auth client) | Medium |
| S4 | Admin routes | S2 (needs connection manager) | Low |
| S5 | Tests | S1–S4 | Medium |
| S6 | (Deferred to 3B) Send/reply | Not in this stage | — |

---

## 9. Risks & mitigations (revisited from proposal)

| Risk | Spec mitigation |
|------|----------------|
| Gmail API quotas (10K req/day) | Rate limiter at 200 req/100s (~72K/day theoretical, but real usage is far lower — browse is manual, not automated) |
| Token rotation during dev | `access_type=offline` + `prompt=consent` forces refresh token on every OAuth. Auto-refresh via `google-auth-library` |
| Complex Gmail thread parsing | Exhaustive unit tests with real anonymized thread fixtures covering multipart/mixed, nested parts, base64 bodies |
| Credential leaks | All env vars server-side only. Build verification step checks for secrets in client bundle. Encryption key separate from OAuth secrets |
| Schema.prisma prohibition | Encrypted filesystem token store — zero Prisma or DB changes |
| Latency (300–800ms/call) | Existing loading indicators from Stage 1. No change in UX patterns — browse is already async with loading states |
| Multi-company future | `GmailConnectionManager` accepts `companyId`. Token store partitions by company. One `GmailMailProvider` re-instantiated per company via factory |

---

## 10. Caveman handoff

```text
Done:
- SPEC for MAIL-V1-ETAPA3-GMAIL-REAL written with all 6 approved boundaries
- GmailMailProvider defined: 3 interface methods + error mapping + rate limiter
- GmailConnectionManager defined: full OAuth 2.0 lifecycle, token refresh, health check, disconnect
- EncryptedTokenStore defined: AES-256-GCM filesystem persistence, atomic writes, company-scoped
- Provider factory defined: env-switchable singleton, lazy instantiation, mock fallback
- 4 admin routes spec'd: auth, callback, status, disconnect — all admin-only
- Gmail API mapping detailed: threads→conversations, messages→snapshots, header parsing, attachment resolution
- 36 acceptance criteria across 7 categories (AC-1 through AC-7)
- MAIL_STAGE1_PROVIDER dynamic resolution spec'd to prevent key collisions

Changed:
- knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/SPEC.md — NEW artifact

Files:
- knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/SPEC.md — specification artifact
- (no code changes — spec phase only)

Validations:
- Architecture review: all existing contracts untouched (MailProviderAdapter, API routes, service signatures)
- Guardrails: no schema.prisma (A3), no send/reply (A2/A5), gmail.readonly only (A2), googleapis approved (A6)
- Existing types: MockMailboxConversationSummary, ProviderConversationSnapshot — unchanged
- Error codes: consistent with existing mock-mail-provider.ts error codes
- Security: AES-256-GCM, 0o600 permissions, env-only secrets, build verification point

Risks:
- Gmail API quotas mitigated by rate limiter (200 req/100s window)
- Token expiration handled by auto-refresh via google-auth-library
- Thread parsing complexity covered by AC-2.1–2.11 unit tests
- Credential leaks checked via AC-7.3 build scan
- Multi-company future-proofed with companyId scoping from start

Next:
- Franco reviews SPEC.md
- If approved: proceed to task breakdown (slices S1–S5 per proposal §4.1)
- S1 (factory): lowest risk, can start immediately after approval
- GCP project + OAuth credentials (A1) needed before S2 can integration-test
```
