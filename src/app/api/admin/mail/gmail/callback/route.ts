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
