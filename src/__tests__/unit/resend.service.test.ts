/**
 * resend.service.test.ts
 *
 * Focalized tests for `sendEmailWithResend` (the real function, NOT mocked).
 * The devMode / provider-accepted / error contract is exercised without
 * network and without env leakage:
 *   - simulated:  no RESEND_API_KEY set, fetch must NOT be called
 *   - accepted:   mocked fetch returns 2xx with a provider id
 *   - provider error: mocked fetch returns non-2xx
 *   - thrown:      mocked fetch rejects
 *
 * No DB, no real network, no real credentials. Env is stubbed and restored.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { sendEmailWithResend } from "@/lib/services/resend.service"

const SAMPLE_PAYLOAD = {
  to: ["x@example.com"],
  subject: "Test subject",
  html: "<p>Hello</p>",
  text: "Hello",
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
beforeEach(() => {
  vi.stubEnv("RESEND_FROM_EMAIL", "Test Co <mail@example.com>")
  vi.stubEnv("RESEND_REPLY_TO_EMAIL", "")
})

describe("sendEmailWithResend — real function, no mock", () => {
  it("simulated branch: devMode=true, dev_resend_* id, fetch NOT called", async () => {
    vi.stubEnv("RESEND_API_KEY", "")
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await sendEmailWithResend(SAMPLE_PAYLOAD)

    expect(result.success).toBe(true)
    expect(result.devMode).toBe(true)
    expect(typeof result.id).toBe("string")
    expect(result.id).toMatch(/^dev_resend_/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("simulated branch: 'mock_key' sentinel also takes the simulated path", async () => {
    vi.stubEnv("RESEND_API_KEY", "mock_key")
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await sendEmailWithResend(SAMPLE_PAYLOAD)

    expect(result.success).toBe(true)
    expect(result.devMode).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("provider-accepted branch: 2xx response, no devMode, provider id", async () => {
    vi.stubEnv("RESEND_API_KEY", "test_key_abc")
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "resend_real_abc123" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    )

    const result = await sendEmailWithResend(SAMPLE_PAYLOAD)

    expect(result.success).toBe(true)
    expect(result.devMode).toBeUndefined()
    expect(result.id).toBe("resend_real_abc123")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe("https://api.resend.com/emails")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toMatchObject({
      to: ["x@example.com"],
      subject: "Test subject",
      html: "<p>Hello</p>",
    })
  })

  it("provider-error branch: non-2xx response, success=false with descriptive error", async () => {
    vi.stubEnv("RESEND_API_KEY", "test_key_abc")
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }),
    )

    const result = await sendEmailWithResend(SAMPLE_PAYLOAD)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Resend API Error \(401\)/)
    expect(result.id).toBeUndefined()
    expect(result.devMode).toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("thrown branch: fetch rejection, success=false with the thrown message", async () => {
    vi.stubEnv("RESEND_API_KEY", "test_key_abc")
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("network down"))

    const result = await sendEmailWithResend(SAMPLE_PAYLOAD)

    expect(result.success).toBe(false)
    expect(result.error).toBe("network down")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("requires configured sender before a real provider call", async () => {
    vi.stubEnv("RESEND_API_KEY", "fake-test-key")
    vi.stubEnv("RESEND_FROM_EMAIL", "")
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network"))
    expect(await sendEmailWithResend(SAMPLE_PAYLOAD)).toMatchObject({ success: false, error: expect.stringContaining("RESEND_FROM_EMAIL") })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("maps trusted display name, reply-to, MIME and CID to REST snake_case", async () => {
    vi.stubEnv("RESEND_API_KEY", "fake-test-key")
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "accepted" })))
    await sendEmailWithResend({ ...SAMPLE_PAYLOAD, senderName: "Test User · Test Co", replyTo: "user@example.com", attachments: [{ filename: "image.png", content: "data:image/png;base64,iVBORw0KGgo=", contentType: "image/png", contentId: "authorization-1" }] })
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({
      from: "Test User · Test Co <mail@example.com>", reply_to: "user@example.com",
      attachments: [{ filename: "image.png", content: "iVBORw0KGgo=", content_type: "image/png", content_id: "authorization-1" }],
    })
  })

  it.each([{}, { id: "" }, { id: "  " }, { id: 42 }])("does not confirm acceptance without a nonempty provider ID: %s", async (body) => {
    vi.stubEnv("RESEND_API_KEY", "fake-test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body)))
    expect(await sendEmailWithResend(SAMPLE_PAYLOAD)).toMatchObject({ success: false })
  })
})
