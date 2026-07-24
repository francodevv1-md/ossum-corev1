import { OAuth2Client } from "google-auth-library"
import { google } from "googleapis"
import type { gmail_v1 } from "googleapis"
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
      const gmail: gmail_v1.Gmail = google.gmail({ version: "v1", auth: oauth2Client })

      await Promise.race([
        gmail.users.getProfile({ userId: "me" }),
        new Promise<never>((_, reject) =>
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
