import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/errors"
import { buildOutboundEmailIdempotencyKey, escapeEmailHtml, parseOutboundEmailInput, sendResendEmail } from "@/lib/outbound-email"

describe("outbound email", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("validates the trust-boundary payload", () => {
    expect(() => parseOutboundEmailInput({ to: "invalid", subject: "S", message: "M", idempotencyKey: "12345678" })).toThrow(ApiError)
    expect(parseOutboundEmailInput({ to: " USER@example.com ", subject: " Subject ", message: " Message ", copyMe: true, idempotencyKey: "12345678" })).toEqual({
      to: "USER@example.com",
      subject: "Subject",
      message: "Message",
      copyMe: true,
      idempotencyKey: "12345678",
    })
  })

  it("escapes user text before building HTML", () => {
    expect(escapeEmailHtml(`<script>"x" & 'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot; &amp; &#039;y&#039;&lt;/script&gt;")
  })

  it("builds provider-safe idempotency keys from arbitrarily long entity identifiers", () => {
    const key = buildOutboundEmailIdempotencyKey("surgery-report", "c".repeat(500), "s".repeat(500), "k".repeat(200))
    expect(key).toHaveLength(79)
    expect(key).not.toBe(buildOutboundEmailIdempotencyKey("surgery-report", "c".repeat(500), "s".repeat(500), `${"k".repeat(199)}x`))
  })

  it("sends a PDF through Resend with idempotency and copy", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(sendResendEmail({
      to: "recipient@example.com",
      cc: "actor@example.com",
      subject: "Report",
      message: "Attached",
      idempotencyKey: "key-1",
      attachments: [{ filename: "report.pdf", content: Buffer.from("pdf") }],
    })).resolves.toEqual({ provider: "resend", providerMessageId: "email-1", status: "accepted" })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers["Idempotency-Key"]).toBe("key-1")
    expect(JSON.parse(init.body)).toMatchObject({
      from: "OSSUM COR | Districorr <sistemas@districorr.com.ar>",
      to: ["recipient@example.com"],
      cc: ["actor@example.com"],
      reply_to: "sistemas@districorr.com.ar",
      attachments: [{ filename: "report.pdf", content: Buffer.from("pdf").toString("base64") }],
    })
  })
})
