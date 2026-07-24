# TASKS — MAIL-V1-ETAPA3-GMAIL-REAL

Status: **tasks**
Change: `MAIL-V1-ETAPA3-GMAIL-REAL`
Parent: `PROPOSAL.md` (proposed) → `SPEC.md` (specified) → `DESIGN.md` (designed)
Engram topic: `sdd/MAIL-V1-ETAPA3-GMAIL-REAL/tasks`
Artifact: `knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/TASKS.md`

---

## 0. Overview

### 0.1 Goal

Replace hardcoded `mockMailProvider` import with a swappable provider factory. When `MAIL_PROVIDER=gmail` and OAuth is configured, the system uses real Gmail API. Otherwise, existing mock behavior is preserved — zero regression.

### 0.2 Approved boundaries (A1–A6)

| # | Decision | Constraint |
|---|----------|------------|
| A1 | GCP project credentials for `sistemas@districorr.com.ar` | Needed before manual E2E; not needed for code slices |
| A2 | Scope `gmail.readonly` only | No send/reply code |
| A3 | Filesystem encrypted token store | No `schema.prisma` changes |
| A4 | Metadata + snippet only; no body content | Decoding deferred |
| A5 | Send/reply deferred to sub-stage 3B | Out of scope for all 5 slices |
| A6 | Dependency `googleapis` approved | Install in S3; conditional-load via factory |

### 0.3 Guardrails (non-negotiable)

- **No `schema.prisma` changes.** Token storage is filesystem-based (A3).
- **No auth model changes.** OAuth is admin-only; existing Supabase/DEV auth unchanged.
- **No send/reply.** `gmail.readonly` scope only (A2, A5).
- **No UI changes to existing components.** Admin routes are API-only; no new pages.
- **Existing API contracts unchanged.** `/mailbox/conversations`, `/mail-links/*` same request/response.
- **706 existing tests must pass at every slice boundary.**

### 0.4 Default safe state

`MAIL_PROVIDER=mock` (or unset) → `getMailProvider()` returns existing `mockMailProvider`. All new code is unreachable in the default path. Zero risk of breaking existing behavior during development.

---

## 1. Slice 1 — Provider factory + type extensions

**Risk:** Low
**Dependencies:** None
**Files:** 3 (1 new, 2 modified)

### 1.1 Objective

Create the provider factory that reads `MAIL_PROVIDER` env var and returns `mockMailProvider` or `GmailMailProvider` singleton. Extend `MailProviderAdapter` interface with optional `companyId` on every method. Change `MAIL_STAGE1_PROVIDER` from constant to dynamic function.

### 1.2 Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/mail-stage1/provider/provider-factory.ts` | **NEW** | `getMailProvider()` — env-switchable singleton factory |
| `src/lib/mail-stage1/provider/types.ts` | **MODIFIED** | Add `companyId?: string` to 3 method inputs; `providerName` → `string`; `provider` → `string` |
| `src/lib/mail-stage1/types.ts` | **MODIFIED** | `MAIL_STAGE1_PROVIDER` constant → calls `getMailStage1Provider()`; new function; `provider` type → `string` |

### 1.3 Implementation steps

#### Step 1.3a — `provider-factory.ts` (NEW)

```ts
// src/lib/mail-stage1/provider/provider-factory.ts
import type { MailProviderAdapter } from "./types"
import { mockMailProvider } from "./mock-mail-provider"

let gmailProvider: MailProviderAdapter | null = null

export function getMailProvider(): MailProviderAdapter {
  const envProvider = process.env.MAIL_PROVIDER ?? "mock"

  switch (envProvider) {
    case "mock":
      return mockMailProvider

    case "gmail": {
      if (!gmailProvider) {
        // Dynamic require to avoid loading googleapis when MAIL_PROVIDER=mock
        const { GmailMailProvider } = require("./gmail-mail-provider") as {
          GmailMailProvider: typeof import("./gmail-mail-provider")["GmailMailProvider"]
        }
        const { EncryptedTokenStore } = require("../gmail/token-store") as {
          EncryptedTokenStore: typeof import("../gmail/token-store")["EncryptedTokenStore"]
        }
        const tokenStore = new EncryptedTokenStore()
        gmailProvider = new GmailMailProvider(tokenStore)
      }
      return gmailProvider
    }

    default:
      console.warn(`[mail-stage1] Unknown MAIL_PROVIDER "${envProvider}" — falling back to mock`)
      return mockMailProvider
  }
}
```

**Key decisions:**
- Dynamic `require()` prevents `googleapis` import errors when `MAIL_PROVIDER=mock`.
- Singleton pattern: `gmailProvider` cached after first creation.
- Company scoping delegated to `GmailMailProvider` (internal `Map<string, GmailConnectionManager>`).

#### Step 1.3b — `provider/types.ts` modifications

Change `MailProviderAdapter` interface:

```ts
// Line 44–60 in current file
export interface MailProviderAdapter {
  readonly providerName: string  // WAS: typeof MAIL_STAGE1_PROVIDER
  listMailboxConversations(input: {
    mailbox: string              // WAS: typeof MAIL_STAGE1_MAILBOX
    query?: string
    limit?: number
    companyId?: string           // NEW
  }): Promise<MockMailboxConversationSummary[]>
  getConversationSnapshot(input: {
    mailbox: string              // WAS: typeof MAIL_STAGE1_MAILBOX
    externalConversationId: string
    companyId?: string           // NEW
  }): Promise<ProviderConversationSnapshot>
  downloadAttachment(input: {
    mailbox: string              // WAS: typeof MAIL_STAGE1_MAILBOX
    externalConversationId: string
    providerAttachmentRef: string
    companyId?: string           // NEW
  }): Promise<{ buffer: Buffer; fileName: string; mimeType: string }>
}
```

Change `ProviderConversationSnapshot.provider`:
```ts
export type ProviderConversationSnapshot = {
  provider: string  // WAS: typeof MAIL_STAGE1_PROVIDER
  // ... rest unchanged
}
```

**Impact on `mock-mail-provider.ts`:** `providerName` changes from literal `"mock-mailbox"` to `string`. Since `string` is wider, existing assignment `readonly providerName = MAIL_STAGE1_PROVIDER` (which evaluates to `string` now) compiles without change.

#### Step 1.3c — `types.ts` modifications

```ts
// Line 1: Change constant to function + backward-compat constant
export function getMailStage1Provider(): string {
  return process.env.MAIL_PROVIDER === "gmail" ? "gmail" : "mock-mailbox"
}
export const MAIL_STAGE1_PROVIDER = getMailStage1Provider()

// Line 50: Widen provider type
export type MailConversationSnapshotRecord = {
  conversationKey: string
  provider: string  // WAS: typeof MAIL_STAGE1_PROVIDER
  // ... rest unchanged
}

// Line 184: buildConversationKey uses the function
export function buildConversationKey(externalConversationId: string) {
  return `${getMailStage1Provider()}::${MAIL_STAGE1_MAILBOX}::${externalConversationId}`
}
```

**Impact on `service.ts`:** `ensureConversationSnapshot` type annotation at line 33 uses `Awaited<ReturnType<typeof mockMailProvider.getConversationSnapshot>>`. After the `ProviderConversationSnapshot.provider` type change, this still evaluates correctly. No change needed yet (changed in S5).

**Impact on `mock-mail-provider.ts` line 25:** `provider: MAIL_STAGE1_PROVIDER` — this now evaluates to `string` via `getMailStage1Provider()`. When `MAIL_PROVIDER !== "gmail"`, it still returns `"mock-mailbox"`. OK.

### 1.4 Validation expectations (Slice 1)

| # | Validation | Method | Expected |
|---|-----------|--------|----------|
| V1.1 | TypeScript compiles | `npx tsc --noEmit` | Zero errors |
| V1.2 | Build succeeds | `npx next build` | Success with `MAIL_PROVIDER` unset |
| V1.3 | All 706 existing tests pass | `npx jest` (or `npx vitest run`) | All pass |
| V1.4 | `getMailProvider()` returns `mockMailProvider` when `MAIL_PROVIDER` unset | Unit test (see §1.5) | `provider.providerName === "mock-mailbox"` |
| V1.5 | `getMailProvider()` returns `mockMailProvider` for unknown provider | Unit test | Console.warn called; mock returned |
| V1.6 | `buildConversationKey()` uses `"mock-mailbox"` when `MAIL_PROVIDER` unset | Unit test | Key starts with `mock-mailbox::` |
| V1.7 | `buildConversationKey()` uses `"gmail"` when `MAIL_PROVIDER=gmail` | Unit test | Key starts with `gmail::` |

### 1.5 Slice 1 test (unit, new file)

**File:** `__tests__/unit/provider-factory.test.ts` (NEW)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

describe("getMailProvider", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.MAIL_PROVIDER
  })

  it("returns mockMailProvider when MAIL_PROVIDER is unset", async () => {
    const { getMailProvider } = await import("@/lib/mail-stage1/provider/provider-factory")
    const provider = getMailProvider()
    expect(provider.providerName).toBe("mock-mailbox")
  })

  it("returns mockMailProvider when MAIL_PROVIDER=mock", async () => {
    process.env.MAIL_PROVIDER = "mock"
    const { getMailProvider } = await import("@/lib/mail-stage1/provider/provider-factory")
    const provider = getMailProvider()
    expect(provider.providerName).toBe("mock-mailbox")
  })

  it("defaults to mock with console.warn for unknown provider", async () => {
    process.env.MAIL_PROVIDER = "sendgrid"
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { getMailProvider } = await import("@/lib/mail-stage1/provider/provider-factory")
    const provider = getMailProvider()
    expect(provider.providerName).toBe("mock-mailbox")
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown MAIL_PROVIDER"))
    warnSpy.mockRestore()
  })

  it("returns singleton (same instance on repeated calls)", async () => {
    process.env.MAIL_PROVIDER = "mock"
    const { getMailProvider } = await import("@/lib/mail-stage1/provider/provider-factory")
    const a = getMailProvider()
    const b = getMailProvider()
    expect(a).toBe(b)
  })
})

describe("getMailStage1Provider", () => {
  it("returns mock-mailbox when MAIL_PROVIDER is unset", async () => {
    const { getMailStage1Provider } = await import("@/lib/mail-stage1/types")
    expect(getMailStage1Provider()).toBe("mock-mailbox")
  })

  it("returns gmail when MAIL_PROVIDER=gmail", async () => {
    process.env.MAIL_PROVIDER = "gmail"
    const { getMailStage1Provider } = await import("@/lib/mail-stage1/types")
    expect(getMailStage1Provider()).toBe("gmail")
  })
})

describe("buildConversationKey", () => {
  it("uses mock-mailbox namespace by default", async () => {
    const { buildConversationKey } = await import("@/lib/mail-stage1/types")
    const key = buildConversationKey("conv-001")
    expect(key).toBe("mock-mailbox::sistemas@districorr.com.ar::conv-001")
  })

  it("uses gmail namespace when MAIL_PROVIDER=gmail", async () => {
    process.env.MAIL_PROVIDER = "gmail"
    const { buildConversationKey } = await import("@/lib/mail-stage1/types")
    const key = buildConversationKey("thread-abc")
    expect(key).toBe("gmail::sistemas@districorr.com.ar::thread-abc")
  })
})
```

### 1.6 Stop conditions (Slice 1)

- Any TypeScript error in modified files — stop, fix types before continuing.
- Any existing test failure — stop, diagnose regression before proceeding.
- If `provider-factory.ts` dynamic `require()` causes bundler warnings — stop, evaluate alternative (static import behind feature flag).

---

## 2. Slice 2 — EncryptedTokenStore + GmailConnectionManager

**Risk:** Medium (cryptography, OAuth lifecycle)
**Dependencies:** S1 complete (factory types and `getMailStage1Provider` in place)
**Files:** 3 (all new)

### 2.1 Objective

Implement filesystem-based AES-256-GCM encrypted token persistence and OAuth 2.0 connection lifecycle manager. These are infrastructure components — they do not touch Gmail API directly, only the OAuth handshake and token storage.

### 2.2 Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/mail-stage1/gmail/types.ts` | **NEW** | `GmailTokenPayload`, `GmailConnectionState` type definitions |
| `src/lib/mail-stage1/gmail/token-store.ts` | **NEW** | `EncryptedTokenStore` — AES-256-GCM filesystem CRUD |
| `src/lib/mail-stage1/gmail/connection-manager.ts` | **NEW** | `GmailConnectionManager` — OAuth flow, token refresh, health check, disconnect |

### 2.3 Implementation steps

#### Step 2.3a — `gmail/types.ts` (NEW)

```ts
// src/lib/mail-stage1/gmail/types.ts
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

#### Step 2.3b — `gmail/token-store.ts` (NEW)

Implement `EncryptedTokenStore` per DESIGN.md §3.4. Key implementation details:

1. **Constructor**: reads `OSSUM_RUNTIME_DIR` env or defaults to `process.cwd()/.runtime`. Base dir is `<runtime>/mail-stage1/gmail-tokens/`.
2. **`getKey()`**: validates `GMAIL_ENCRYPTION_KEY` is exactly 64 hex chars. Throws `internalError("mail_gmail_invalid_encryption_key")` if invalid.
3. **`encrypt(plaintext)`**: AES-256-GCM with random 12-byte IV. Output: hex-encoded `IV(12) + ciphertext + authTag(16)`.
4. **`decrypt(hexCiphertext)`**: reverses encryption. Extracts IV (first 12 bytes) and authTag (last 16 bytes) from combined buffer.
5. **`save(companyId, tokens)`**: JSON → encrypt → atomic write (temp file + rename) → `chmod 0o600` (best-effort, silent on Windows).
6. **`load(companyId)`**: read file → decrypt → parse JSON → cross-check `payload.companyId === companyId`. Returns `null` if file not found (ENOENT).
7. **`delete(companyId)`**: `unlink`. Idempotent (ENOENT silently ignored).
8. **`exists(companyId)`**: try `readFile` → true/false.
9. **`sanitizeCompanyId(companyId)`**: strip chars outside `[a-zA-Z0-9._-]` to prevent path traversal.

Complete implementation code: DESIGN.md §3.4 (lines 887–1036).

#### Step 2.3c — `gmail/connection-manager.ts` (NEW)

Implement `GmailConnectionManager` per DESIGN.md §3.3. Key implementation details:

1. **Constructor**: receives `companyId` and `EncryptedTokenStore` instance. Reads `GMAIL_MAILBOX` env or defaults to `"sistemas@districorr.com.ar"`.
2. **`generateAuthUrl()`**: creates `OAuth2Client` with env credentials, generates URL with `access_type=offline`, `prompt=consent`, `scope=gmail.readonly`, `state=companyId`.
3. **`handleCallback(code)`**: exchanges code for tokens via `oauth2Client.getToken(code)`. Validates scope includes `gmail.readonly`. Persists tokens via `tokenStore.save()`.
4. **`getAuthClient()`**: loads tokens from store, creates `OAuth2Client` with credentials. Auto-refreshes if expired. Registers `"tokens"` event listener for auto-save. Throws `mail_gmail_not_connected` (404) if no tokens; `mail_gmail_session_expired` (500) if no `refresh_token`.
5. **`getConnectionState()`**: loads tokens, performs lightweight health check (`gmail.users.getProfile({ userId: "me" })` with 5s timeout via `Promise.race`). Returns `GmailConnectionState`.
6. **`disconnect()`**: best-effort token revocation via `POST https://oauth2.googleapis.com/revoke`. Always deletes local token file. Logs disconnection.
7. **`refreshAccessToken()` (private)**: calls `oauth2Client.refreshAccessToken()`. On failure, throws `mail_gmail_session_expired`.

Complete implementation code: DESIGN.md §3.3 (lines 596–871).

**Critical env var validation:** All `getClientId()`, `getClientSecret()`, `getRedirectUri()` accessors throw `internalError("mail_gmail_misconfigured")` if the env var is missing. This prevents startup crashes when `MAIL_PROVIDER=mock` — the env vars are only accessed when Gmail is actually used.

### 2.4 Validation expectations (Slice 2)

| # | Validation | Method | Expected |
|---|-----------|--------|----------|
| V2.1 | TypeScript compiles | `npx tsc --noEmit` | Zero errors |
| V2.2 | Build succeeds | `npx next build` | Success with `MAIL_PROVIDER=mock` |
| V2.3 | All 706 existing tests pass | `npx jest` | All pass (new code unreachable with `MAIL_PROVIDER=mock`) |
| V2.4 | Token store encrypt/decrypt round-trip | Unit test | Write → read → payload matches |
| V2.5 | Token store returns null for nonexistent file | Unit test | `load("nonexistent")` → `null` |
| V2.6 | Token store cross-checks companyId | Unit test | Write with A, load with B → throws |
| V2.7 | Token store delete is idempotent | Unit test | Delete nonexistent → no error |
| V2.8 | Encryption key validation: 64 hex chars required | Unit test | Invalid key → throws |
| V2.9 | Connection manager generates valid OAuth URL | Unit test | URL contains `access_type=offline`, `prompt=consent`, `gmail.readonly` |
| V2.10 | Connection manager handles callback + persists tokens | Unit test | Token store called with correct payload |
| V2.11 | Connection manager `getAuthClient` returns client when tokens exist | Unit test | OAuth2Client returned with credentials |
| V2.12 | Connection manager `getConnectionState` returns "none" without tokens | Unit test | `{ status: "none" }` |
| V2.13 | Connection manager `disconnect` deletes tokens | Unit test | `tokenStore.delete()` called |

### 2.5 Slice 2 tests (unit, new files)

**File:** `__tests__/unit/gmail-encrypted-token-store.test.ts` (NEW)

Test coverage per AC-4.1 through AC-4.10 (see SPEC.md §7). Use temp directory via `OSSUM_RUNTIME_DIR` env var. Set `GMAIL_ENCRYPTION_KEY` to a test key (`crypto.randomBytes(32).toString("hex")`).

**File:** `__tests__/unit/gmail-connection-manager.test.ts` (NEW)

Test coverage per AC-3.1 through AC-3.12. Mock `google-auth-library` (`OAuth2Client`). Mock `EncryptedTokenStore` (in-memory implementation). Key tests:
- `generateAuthUrl()` includes correct params
- `handleCallback()` validates scope
- `getAuthClient()` auto-refreshes expired tokens
- `getAuthClient()` throws when no tokens
- `getConnectionState()` health check timeout
- `disconnect()` best-effort revocation

### 2.6 Stop conditions (Slice 2)

- If `GMAIL_ENCRYPTION_KEY` validation fails in test but passes in production env — investigate test isolation.
- If `Promise.race` timeout behavior differs in test runner vs Node.js — verify with explicit timeout.
- If `google-auth-library` mock setup is brittle — prefer manual mock with `vi.mock()` over library-provided mocks.
- Any test that modifies real filesystem outside temp dir — stop, fix test isolation.

---

## 3. Slice 3 — GmailMailProvider

**Risk:** Medium (Gmail API mapping, rate limiting, thread parsing)
**Dependencies:** S1 (factory/types), S2 (connection manager + token store)
**Prerequisite:** `npm install googleapis` — this package must be installed before this slice. S1–S2 compile without it (dynamic `require()` only executes when `MAIL_PROVIDER=gmail`).
**Files:** 1 new + 1 dependency

### 3.1 Objective

Implement `GmailMailProvider` — the real Gmail API adapter that implements `MailProviderAdapter`. It delegates auth to `GmailConnectionManager` and translates Gmail's thread/message/attachment model into the existing provider interface types.

### 3.2 Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/mail-stage1/provider/gmail-mail-provider.ts` | **NEW** | `GmailMailProvider` class — 3 interface methods + rate limiter + header parsing helpers |
| `package.json` | **MODIFIED** | Add `"googleapis": "^148.0.0"` dependency |
| `node_modules/` | **SIDE-EFFECT** | `npm install` populates `googleapis` + transitive deps |

### 3.3 Implementation steps

#### Step 3.3a — Install dependency

```bash
npm install googleapis@^148.0.0
```

Verify: `node -e "require('googleapis')"` succeeds; `node -e "require('google-auth-library')"` succeeds.

#### Step 3.3b — `gmail-mail-provider.ts` (NEW)

Implement per DESIGN.md §3.2 (lines 222–579). Key components:

**Internal helpers:**
- `SlidingWindowRateLimiter` — 200 req/100s sliding window, throws `mail_gmail_rate_limited` (409)
- `getHeader(headers, name)` — extract header value from Gmail message part headers array
- `parseAddressList(raw)` — parse `"Name <email>"` formatted addresses
- `decodeRfc2047(value)` — decode `=?UTF-8?B?...?=` and `=?UTF-8?Q?...?=` encoded subjects
- `sanitizeGmailQuery(raw)` — strip non-Gmail-query-legal characters

**Class `GmailMailProvider`:**

Constructor:
- Receives `EncryptedTokenStore`
- Maintains internal `Map<string, GmailConnectionManager>` cache by companyId
- Creates `SlidingWindowRateLimiter`

`listMailboxConversations({ mailbox, query?, limit?, companyId? })`:
1. Validate `companyId` — throws `mail_gmail_missing_company_id` if missing
2. Get Gmail client via `getGmailClient(companyId)`
3. Build query: `in:inbox` + optional sanitized query
4. `gmail.users.threads.list({ userId: mailbox, q, maxResults: limit ?? 20 })`
5. For each thread → `gmail.users.threads.get({ id, format: "metadata", metadataHeaders: [...] })`
6. Parallel fetch with `Promise.all`
7. Map to `MockMailboxConversationSummary[]` — parse participants, attachments, snippet
8. Skip threads that return 404 (deleted between list and fetch)
9. Rate limiter check before every API call

`getConversationSnapshot({ mailbox, externalConversationId, companyId? })`:
1. Validate `companyId`
2. `gmail.users.threads.get({ userId: mailbox, id: externalConversationId, format: "FULL" })`
3. Map messages → participants, attachments, snippets
4. Return `ProviderConversationSnapshot` with `provider: "gmail"`

`downloadAttachment({ mailbox, externalConversationId, providerAttachmentRef, companyId? })`:
1. Validate `companyId`
2. Parse `providerAttachmentRef`: split on `::` → `[messageId, attachmentId]`
3. `gmail.users.messages.attachments.get({ userId: mailbox, messageId, id: attachmentId })`
4. Return `{ buffer: Buffer.from(data, "base64"), fileName: "", mimeType: "" }`
5. `fileName`/`mimeType` filled by service layer from stored snapshot (S5)

**Error mapping:**
| Gmail HTTP status | Throws | Code |
|-------------------|--------|------|
| 404 (thread/attachment) | `notFound()` | `mail_provider_snapshot_unavailable` / `mail_attachment_not_found` |
| 401 | `internalError()` | `mail_gmail_auth_failed` |
| 429 (not reached due to rate limiter) | `conflict()` | `mail_gmail_rate_limited` |
| Other | `internalError()` | `mail_gmail_api_error` |

Complete implementation code: DESIGN.md §3.2 (lines 222–579).

### 3.4 Validation expectations (Slice 3)

| # | Validation | Method | Expected |
|---|-----------|--------|----------|
| V3.1 | TypeScript compiles with `googleapis` | `npx tsc --noEmit` | Zero errors |
| V3.2 | Build succeeds | `npx next build` | Success |
| V3.3 | All 706 existing tests pass | `npx jest` | All pass (GmailMailProvider unreachable with `MAIL_PROVIDER=mock`) |
| V3.4 | `GmailMailProvider` implements `MailProviderAdapter` | TypeScript check | `implements MailProviderAdapter` compiles |
| V3.5 | `listMailboxConversations` maps correctly | Unit test with mocked `googleapis` | Returns correct `MockMailboxConversationSummary[]` |
| V3.6 | `getConversationSnapshot` returns full thread | Unit test | Returns `ProviderConversationSnapshot` with messages + attachments |
| V3.7 | `downloadAttachment` returns buffer | Unit test | Buffer from base64-encoded mock data |
| V3.8 | Rate limiter allows 200 requests, blocks 201st | Unit test | 200th succeeds, 201st throws `mail_gmail_rate_limited` |
| V3.9 | Thread 404 between list and fetch skipped | Unit test | Returned array shorter than thread list |
| V3.10 | Gmail API 401 mapped to `mail_gmail_auth_failed` | Unit test | Throws `internalError` with correct code |
| V3.11 | `companyId` missing → throws `mail_gmail_missing_company_id` | Unit test | Throws on all 3 methods |

### 3.5 Slice 3 tests (unit, new file)

**File:** `__tests__/unit/gmail-mail-provider.test.ts` (NEW)

Test coverage per AC-2.1 through AC-2.11.

Mock strategy:
```ts
vi.mock("googleapis", () => ({
  google: {
    gmail: vi.fn(() => ({
      users: {
        threads: {
          list: vi.fn(),
          get: vi.fn(),
        },
        messages: {
          attachments: {
            get: vi.fn(),
          },
        },
      },
    })),
  },
}))
```

Use thread/message fixtures that mirror real Gmail API response shapes:
- Multipart messages with `text/plain` and `application/pdf` parts
- Threads with 3+ messages, multiple participants, Cc headers
- Attachments with `filename`, `attachmentId`, `size`
- Base64-encoded attachment data

### 3.6 Stop conditions (Slice 3)

- If `googleapis` package conflicts with existing TypeScript types — check type roots in `tsconfig.json`.
- If mocked `googleapis` function signatures don't match actual types — use `as any` casts only in test files.
- If rate limiter test is flaky due to timing — use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.
- If `require()` of `googleapis` inside `provider-factory.ts` causes bundler errors — verify `MAIL_PROVIDER=mock` path does not trigger the `require()` (it's inside `case "gmail"` branch).

---

## 4. Slice 4 — Admin API routes

**Risk:** Low (new routes, no existing route modifications)
**Dependencies:** S2 (connection manager + token store). S3 (GmailMailProvider) not needed — admin routes only use `GmailConnectionManager`, not `GmailMailProvider`.
**Files:** 4 (all new)

### 4.1 Objective

Create four admin-only API routes for Gmail connection management: OAuth initiation, OAuth callback, connection status, and disconnect.

### 4.2 Files

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/admin/mail/gmail/auth/route.ts` | **NEW** | `GET` — initiate OAuth flow, return redirect URL |
| `src/app/api/admin/mail/gmail/callback/route.ts` | **NEW** | `GET` — OAuth callback, exchange code, persist tokens |
| `src/app/api/admin/mail/gmail/status/route.ts` | **NEW** | `GET` — connection state + health check |
| `src/app/api/admin/mail/gmail/disconnect/route.ts` | **NEW** | `POST` — revoke tokens, delete local storage |

### 4.3 Implementation steps

All routes follow the same auth pattern as existing routes (`getApiAuthContext` + guard). Admin role check uses `requireCompanyMutationAccess(ctx, ["admin", "super_admin", "owner"])` for mutation endpoints; `requireCompanyReadAccess(ctx)` for status.

#### Step 4.3a — `auth/route.ts` (NEW)

Per DESIGN.md §3.7.1:
- Extract `companyId` from query params
- `getApiAuthContext(request, companyId)`
- `requireCompanyMutationAccess(ctx, ["admin", "super_admin", "owner"])`
- `new GmailConnectionManager(companyId, new EncryptedTokenStore())`
- `connectionManager.generateAuthUrl()`
- Return `{ redirectUrl }`

#### Step 4.3b — `callback/route.ts` (NEW)

Per DESIGN.md §3.7.2:
- Extract `code` and `state` (companyId) from query params
- No admin auth check — this endpoint is called by Google, not by the admin user directly
- `connectionManager.handleCallback(code)`
- Redirect to confirmation page OR return JSON success
- Fallback: `NEXT_PUBLIC_APP_URL` for redirect base, or default to `http://localhost:3000`

**IMPORTANT:** The callback route does NOT call `getApiAuthContext` because the request comes from Google's OAuth server, not from the admin's browser session. Auth context is not available. The `state` parameter (companyId) is verified by Google's OAuth redirect integrity.

#### Step 4.3c — `status/route.ts` (NEW)

Per DESIGN.md §3.7.3:
- Extract `companyId` from query params
- `getApiAuthContext(request, companyId)`
- `requireCompanyReadAccess(ctx)` — any authenticated user can check status
- `connectionManager.getConnectionState()`
- Return state + `provider: "gmail"` + `companyId`

#### Step 4.3d — `disconnect/route.ts` (NEW)

Per DESIGN.md §3.7.4:
- Accept `companyId` from JSON body OR query params
- `getApiAuthContext(request, companyId)`
- `requireCompanyMutationAccess(ctx, ["admin", "super_admin", "owner"])`
- `connectionManager.disconnect()`
- Return `{ status: "disconnected", companyId }`

### 4.4 Validation expectations (Slice 4)

| # | Validation | Method | Expected |
|---|-----------|--------|----------|
| V4.1 | TypeScript compiles | `npx tsc --noEmit` | Zero errors |
| V4.2 | Build succeeds | `npx next build` | Success |
| V4.3 | All 706 existing tests pass | `npx jest` | All pass |
| V4.4 | `GET /admin/mail/gmail/auth` returns redirect URL | Integration test | 200 + `{ redirectUrl: "https://accounts.google.com/..." }` |
| V4.5 | `GET /admin/mail/gmail/auth` rejects non-admin | Integration test | 403 |
| V4.6 | `GET /admin/mail/gmail/callback` processes valid code | Integration test | 302 redirect or 200 |
| V4.7 | `GET /admin/mail/gmail/callback` rejects missing code | Integration test | 400 |
| V4.8 | `GET /admin/mail/gmail/status` returns state | Integration test | 200 + connection state object |
| V4.9 | `GET /admin/mail/gmail/status` rejects unauthorized | Integration test | 401 |
| V4.10 | `POST /admin/mail/gmail/disconnect` revokes tokens | Integration test | 200 + `{ status: "disconnected" }` |
| V4.11 | `POST /admin/mail/gmail/disconnect` rejects non-admin | Integration test | 403 |

### 4.5 Slice 4 tests (integration, new file)

**File:** `__tests__/integration/mail-stage1-gmail-api.test.ts` (NEW)

Uses the same test setup pattern as existing integration tests. Key considerations:
- `MAIL_PROVIDER=mock` in tests → admin routes still function (create `GmailConnectionManager` directly, no provider involved)
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `GMAIL_ENCRYPTION_KEY` must be set in test env
- OAuth callback test: mock `google-auth-library` `OAuth2Client.getToken()` to return test tokens
- Use temp runtime dir for token files (set `OSSUM_RUNTIME_DIR` per test)

### 4.6 Stop conditions (Slice 4)

- If admin route callbacks conflict with Next.js route resolution — verify route file structure: `admin/mail/gmail/auth/route.ts` (NOT `admin/mail/gmail/auth.ts`).
- If `NEXT_PUBLIC_APP_URL` redirect causes CORS issues in test — return JSON instead of redirect in test mode.
- If auth guard for callback route is tricky (no user context from Google) — the callback intentionally skips auth; validate `state` parameter instead.

---

## 5. Slice 5 — Service.ts integration

**Risk:** Low (replacing direct import, not changing logic)
**Dependencies:** S1 (factory), S3 (GmailMailProvider accessible via factory), S4 (admin routes operational but not required)
**Files:** 1 modified

### 5.1 Objective

Replace the direct `mockMailProvider` import in `service.ts` with calls to `getMailProvider()`. Pass `companyId` to provider methods. Update the `ensureConversationSnapshot` type annotation. Fill in `fileName`/`mimeType` from stored snapshot in `persistCriticalAttachments` after Gmail download.

### 5.2 Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/mail-stage1/service.ts` | **MODIFIED** | Replace `mockMailProvider` direct usage with `getMailProvider()` + `companyId` passthrough |

### 5.3 Implementation steps

#### Step 5.3a — Change import

```ts
// Line 4: BEFORE
import { mockMailProvider } from "./provider/mock-mail-provider"

// Line 4: AFTER
import { getMailProvider } from "./provider/provider-factory"
```

#### Step 5.3b — Update `ensureConversationSnapshot` type annotation

```ts
// Line 31–35: BEFORE
function ensureConversationSnapshot(
  existing: MailConversationSnapshotRecord | undefined,
  providerSnapshot: Awaited<ReturnType<typeof mockMailProvider.getConversationSnapshot>>,
  mode: "attach" | "refresh"
): MailConversationSnapshotRecord

// Line 31–35: AFTER
import type { ProviderConversationSnapshot } from "./provider/types"

function ensureConversationSnapshot(
  existing: MailConversationSnapshotRecord | undefined,
  providerSnapshot: ProviderConversationSnapshot,
  mode: "attach" | "refresh"
): MailConversationSnapshotRecord
```

Add `import type { ProviderConversationSnapshot } from "./provider/types"` to the imports block (alongside other type imports from `./types`).

#### Step 5.3c — Replace 5 call sites

| Function | Line | Before | After |
|----------|------|--------|-------|
| `browseMailboxConversations` | 225 | `mockMailProvider.listMailboxConversations({ mailbox: MAIL_STAGE1_MAILBOX, query, limit })` | `const provider = getMailProvider(); provider.listMailboxConversations({ mailbox: MAIL_STAGE1_MAILBOX, query, limit, companyId })` |
| `attachConversationToSurgery` | 287 | `mockMailProvider.getConversationSnapshot({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: input.externalConversationId })` | `const provider = getMailProvider(); provider.getConversationSnapshot({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: input.externalConversationId, companyId })` |
| `refreshLinkedConversation` | 371 | `mockMailProvider.getConversationSnapshot({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: ... })` | `const provider = getMailProvider(); provider.getConversationSnapshot({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: ..., companyId })` |
| `persistCriticalAttachments` | 450 | `mockMailProvider.downloadAttachment({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: ..., providerAttachmentRef: ... })` | `const provider = getMailProvider(); provider.downloadAttachment({ mailbox: MAIL_STAGE1_MAILBOX, externalConversationId: ..., providerAttachmentRef: ..., companyId })` |

#### Step 5.3d — Fill in fileName/mimeType from snapshot (Gmail compatibility)

In `persistCriticalAttachments`, after download:

```ts
// Lines 450–454: BEFORE
const downloaded = await mockMailProvider.downloadAttachment({
  mailbox: MAIL_STAGE1_MAILBOX,
  externalConversationId: snapshot.externalConversationId,
  providerAttachmentRef: attachment.providerAttachmentRef,
})

// Lines 450–454: AFTER
const provider = getMailProvider()
const downloaded = await provider.downloadAttachment({
  mailbox: MAIL_STAGE1_MAILBOX,
  externalConversationId: snapshot.externalConversationId,
  providerAttachmentRef: attachment.providerAttachmentRef,
  companyId,
})

// Gmail provider returns empty fileName/mimeType — fill from stored snapshot
const resolvedFileName = downloaded.fileName || attachment.fileName
const resolvedMimeType = downloaded.mimeType || attachment.mimeType
```

Then use `resolvedFileName` and `resolvedMimeType` in the `mailStage1Repository.persistAttachmentBinary()` call (line 456–461).

### 5.4 Validation expectations (Slice 5)

| # | Validation | Method | Expected |
|---|-----------|--------|----------|
| V5.1 | TypeScript compiles | `npx tsc --noEmit` | Zero errors |
| V5.2 | Build succeeds | `npx next build` | Success |
| V5.3 | **All 706 existing tests pass** | `npx jest` | **ALL pass — this is the critical gate** |
| V5.4 | `browseMailboxConversations` with `MAIL_PROVIDER=mock` returns same data | Smoke test | Identical output to pre-change behavior |
| V5.5 | `attachConversationToSurgery` with `MAIL_PROVIDER=mock` works | Smoke test | Same behavior |
| V5.6 | `refreshLinkedConversation` with `MAIL_PROVIDER=mock` works | Smoke test | Same behavior |
| V5.7 | `persistCriticalAttachments` with `MAIL_PROVIDER=mock` works | Smoke test | Same behavior |
| V5.8 | `unlinkConversationFromSurgery` works (no provider calls) | Smoke test | Same behavior |
| V5.9 | `listLinkedConversations` works (no provider calls) | Smoke test | Same behavior |
| V5.10 | Conversation keys for mock provider unchanged | Unit test | Key format: `mock-mailbox::sistemas@districorr.com.ar::conv-...` |
| V5.11 | New unit tests from S1–S4 pass | `npx jest` | All pass |
| V5.12 | New integration tests from S4 pass | `npx jest` | All pass |
| V5.13 | No `mockMailProvider` references remain in `service.ts` | Grep | Zero matches for `mockMailProvider` (except in import comments/docs) |

### 5.5 Stop conditions (Slice 5)

- **Any existing test failure → STOP.** Run Diagnose cycle. Do NOT proceed with Gmail testing until all 706 tests are green.
- If `ensureConversationSnapshot` type change causes cascading errors in downstream types — widen types incrementally, not all at once.
- If `companyId` is not available in any service function — all service functions already receive `companyId` as first parameter. No change needed to function signatures.
- If `fileName`/`mimeType` fallback breaks mock provider behavior — mock provider already returns non-empty values, so the fallback (`|| attachment.fileName`) is a no-op for mock.

---

## 6. Cross-slice validations

These validations apply across all slices and must be verified at each slice boundary:

### 6.1 Build gate

```bash
npx tsc --noEmit    # Must pass at every slice
npx next build      # Must pass at every slice
npx jest            # All 706 existing tests must pass at every slice
```

### 6.2 Secret leak check (S3 onward, after `googleapis` installed)

```bash
npx next build
# Verify no secrets in client bundle:
rg "GMAIL_CLIENT_SECRET" .next/static/   # must find nothing
rg "GMAIL_ENCRYPTION_KEY" .next/static/  # must find nothing
```

### 6.3 Guardrail compliance

| Guardrail | Verification method | Slice |
|-----------|---------------------|-------|
| No `schema.prisma` changes | `git diff prisma/schema.prisma` → empty | All |
| No auth model changes | `git diff src/lib/api/auth-context.ts` → empty | All |
| No send/reply endpoints | Grep `gmail.send` in new code → absent | S3, S4 |
| No UI changes to existing components | `git diff src/components/` → empty | All |
| Existing API routes unchanged | `git diff src/app/api/companies/` → empty | All |
| All env vars server-side only | Grep `NEXT_PUBLIC_GMAIL` → absent | All |

---

## 7. Slice dependency graph

```
S1 (factory + types)
├── S2 (token store + connection manager) ── depends on S1 types
│   └── S4 (admin routes) ── depends on S2
├── S3 (GmailMailProvider) ── depends on S1 + S2
└── S5 (service.ts integration) ── depends on S1 + S3
```

Execution order: **S1 → S2 → (S3, S4 in parallel) → S5**

S3 and S4 can be developed in parallel since they have no shared files:
- S3 writes `provider/gmail-mail-provider.ts`
- S4 writes `app/api/admin/mail/gmail/*/route.ts`

However, S3 requires `npm install googleapis` which modifies `package.json` and `node_modules/`. If working in parallel, coordinate the install.

---

## 8. Rollout strategy

### 8.1 Default safe state

After all 5 slices, the system defaults to `MAIL_PROVIDER=mock`. Zero behavior change until explicitly activated.

### 8.2 Activation checklist

To switch to Gmail (after all slices complete):

1. Set environment variables:
   ```bash
   MAIL_PROVIDER=gmail
   GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=GOCSPX-xxx
   GMAIL_REDIRECT_URI=https://app.example.com/api/admin/mail/gmail/callback
   GMAIL_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```
2. Deploy/restart server
3. Admin visits `GET /api/admin/mail/gmail/auth?companyId=org_001`
4. Completes Google OAuth consent screen
5. Callback processes token exchange
6. Verify: `GET /api/admin/mail/gmail/status?companyId=org_001` → `{ status: "connected" }`
7. Browse mailbox, attach conversation, refresh → all work against real Gmail

### 8.3 Rollback

```bash
MAIL_PROVIDER=mock   # Instant fallback, no deploy needed
```

Gmail-imported snapshots remain accessible in filesystem. Gmail tokens remain on disk (not deleted). Reconnection requires only setting env vars back.

---

## 9. Acceptance criteria traceability

| AC group | SPEC § | Covered by slice | Test file |
|----------|--------|-----------------|-----------|
| AC-1 (factory swappeability) | §7 | S1, S5 | `provider-factory.test.ts` + existing 706 tests |
| AC-2 (GmailMailProvider) | §7 | S3 | `gmail-mail-provider.test.ts` |
| AC-3 (GmailConnectionManager) | §7 | S2 | `gmail-connection-manager.test.ts` |
| AC-4 (EncryptedTokenStore) | §7 | S2 | `gmail-encrypted-token-store.test.ts` |
| AC-5 (Admin API routes) | §7 | S4 | `mail-stage1-gmail-api.test.ts` |
| AC-6 (E2E with real Gmail) | §7 | Manual post-S5 | Requires GCP credentials (A1) |
| AC-7 (non-functional) | §7 | All slices | tsc --noEmit, next build, secret scan |

---

## 10. Caveman handoff

```text
Done:
- 5 implementation slices defined for MAIL-V1-ETAPA3-GMAIL-REAL
- S1: provider-factory.ts + types.ts + provider/types.ts modifications
- S2: EncryptedTokenStore + GmailConnectionManager + gmail/types.ts
- S3: GmailMailProvider (3 interface methods + rate limiter + header parsing)
- S4: 4 admin API routes (auth, callback, status, disconnect)
- S5: service.ts integration (5 call sites + fileName/mimeType fallback)
- 55 validation expectations across 5 slices
- Cross-slice guardrail compliance matrix
- Dependency graph: S1→S2→(S3∥S4)→S5
- Default-safe rollout: MAIL_PROVIDER=mock until explicit activation
- Activation checklist + rollback procedure

Changed:
- (none — tasks artifact only, no code changes)

Files:
- knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/TASKS.md — tasks artifact

Validations:
- All slices verify: tsc --noEmit, next build, 706 existing tests pass
- S1 verifies: factory returns mock by default, buildConversationKey unchanged for mock
- S2 verifies: encrypt/decrypt round-trip, OAuth URL generation, token lifecycle
- S3 verifies: Gmail API mapping, rate limiter, error codes, companyId validation
- S4 verifies: admin-only access, OAuth callback, status health check, disconnect
- S5 verifies: all 706 tests pass, no mockMailProvider references in service.ts
- Guardrails: no schema.prisma, no auth changes, no send/reply, no UI changes

Risks:
- Slice 3 requires npm install googleapis — modifies package.json, could conflict if parallel
- dynamic require() in S1 factory may cause bundler issues — conditional on "gmail" case only
- Gmail API calls NOT tested in CI (no real credentials) — manual E2E post-S5 needed (A1)
- Token file chmod is no-op on Windows — acceptable for dev; production on Linux
- If any existing test fails at any slice boundary, stop and Diagnose before proceeding

Next:
- Franco reviews TASKS.md
- If approved: begin S1 implementation (factory + types)
- S1 can start immediately — no dependencies, no new packages
- GCP credentials (A1) needed only for post-S5 manual E2E
```

