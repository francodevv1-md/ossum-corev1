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
