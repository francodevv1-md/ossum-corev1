/**
 * mail-send-honesty.test.ts
 *
 * Route-layer honesty tests for the Resend mail-send API
 * (`src/app/api/companies/[companyId]/mail/send/route.ts`).
 *
 * Scope: when the `sendEmailWithResend` service returns one of the three
 * result shapes (simulated / provider-accepted / error), the route must
 * record an audit entry whose content and summary are honest:
 *   - simulated   → header "🧪 Correo simulado; no fue entregado."
 *                  summary starts with "Simulación de correo formal a "
 *                  content never matches /Correo enviado/
 *   - accepted    → header "📧 Correo aceptado por el proveedor (no se confirma entrega)."
 *                  summary starts with "Aceptación de correo formal a "
 *                  content never matches /Correo enviado/
 *   - error       → no audit entry is written; 400 mail_dispatch_failed
 *
 * The service is mocked here because the route's contract is "compose the
 * right audit copy from the service's result"; the real service is covered
 * by `resend.service.test.ts`. No DB, no network, no env probe.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateSeguimientoEntry, mockResolveCompanySurgery, mockSendEmailWithResend, mockAuthContext } = vi.hoisted(() => ({
  mockCreateSeguimientoEntry: vi.fn(async (_db: unknown, _input: { content: string; summary?: string }) => ({ id: "entry_1" })),
  mockResolveCompanySurgery: vi.fn(async () => ({ id: "surgery_x", visibleNumber: "CX-0001" })),
  mockSendEmailWithResend: vi.fn(),
  mockAuthContext: {
    actorUserId: "user_1",
    supabaseAuthId: "uuid_1",
    companyId: "test-co",
    role: "admin" as const,
    canonicalRole: "admin" as const,
    rawRole: "admin",
    user: { id: "user_1", email: "u@example.com", firstName: "Test", lastName: "User" },
    activeCompany: { id: "test-co", name: "Test Co" },
    source: "dev-header" as const,
  },
}))

vi.mock("@/lib/services/seguimiento.service", () => ({
  createSeguimientoEntry: mockCreateSeguimientoEntry,
}))

vi.mock("@/lib/surgery/resolve-company-surgery", () => ({
  resolveCompanySurgery: mockResolveCompanySurgery,
}))

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext: vi.fn(async () => mockAuthContext),
}))

vi.mock("@/lib/api/guards", () => ({
  requireCompanyMutationAccess: vi.fn(),
}))

// Keep the real HTML generators (used by the route), but stub
// `sendEmailWithResend` so the route never hits network/env.
vi.mock("@/lib/services/resend.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/resend.service")>()
  return {
    ...actual,
    sendEmailWithResend: mockSendEmailWithResend,
  }
})

// Prevent the route's top-level `import prisma from "@/lib/prisma"` from
// loading the real Prisma client. The audit path is verified via the
// createSeguimientoEntry mock.
vi.mock("@/lib/prisma", () => ({
  default: {},
}))

async function callRoute(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/companies/[companyId]/mail/send/route")
  const request = new Request("http://localhost/api/companies/test-co/mail/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return POST(request, {
    params: Promise.resolve({ companyId: "test-co" }),
  })
}

describe("MAIL-SIMULATION-HONESTY-010 — audit entry honesty (route)", () => {
  beforeEach(() => {
    mockCreateSeguimientoEntry.mockReset().mockResolvedValue({ id: "entry_1" })
    mockResolveCompanySurgery.mockReset().mockResolvedValue({ id: "surgery_x", visibleNumber: "CX-0001" })
    mockSendEmailWithResend.mockReset()
    mockAuthContext.companyId = "test-co"
    vi.resetModules()
  })

  it("DEV/simulated: audit content says 'Simulado' / 'no fue entregado' and never 'Correo enviado'", async () => {
    mockSendEmailWithResend.mockResolvedValueOnce({
      success: true,
      id: "dev_resend_simulated_42",
      devMode: true,
    })

    const response = await callRoute({
      surgeryId: "surgery_x",
      to: ["a@example.com", "b@example.com"],
      subject: "Test subject",
      text: "Test body",
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.devMode).toBe(true)

    expect(mockCreateSeguimientoEntry).toHaveBeenCalledTimes(1)
    const entry = mockCreateSeguimientoEntry.mock.calls[0][1]
    expect(entry.content).toMatch(/Simulado/i)
    expect(entry.content).toMatch(/no fue entregado/i)
    expect(entry.content).not.toMatch(/Correo enviado/)
    expect(entry.summary).toMatch(/^Simulación de correo formal a /)
    expect(entry.summary).not.toMatch(/Envío de correo formal/)
  })

  it("provider-accepted: audit content says 'aceptado' / 'no se confirma entrega' and never 'Correo enviado'", async () => {
    mockSendEmailWithResend.mockResolvedValueOnce({
      success: true,
      id: "resend_real_abc123",
    })

    const response = await callRoute({
      surgeryId: "surgery_x",
      to: ["a@example.com"],
      subject: "Test subject",
      text: "Test body",
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.devMode).toBe(false)

    expect(mockCreateSeguimientoEntry).toHaveBeenCalledTimes(1)
    const entry = mockCreateSeguimientoEntry.mock.calls[0][1]
    expect(entry.content).toMatch(/aceptado/i)
    expect(entry.content).toMatch(/no se confirma entrega/i)
    expect(entry.content).not.toMatch(/Correo enviado/)
    expect(entry.summary).toMatch(/^Aceptación de correo formal a /)
    expect(entry.summary).not.toMatch(/Envío de correo formal/)
  })

  it("error: no audit entry is written when the provider fails", async () => {
    mockSendEmailWithResend.mockResolvedValueOnce({
      success: false,
      error: "Resend API Error (500): boom",
    })

    const response = await callRoute({
      surgeryId: "surgery_x",
      to: ["a@example.com"],
      subject: "Test subject",
      text: "Test body",
    })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error?.code).toBe("mail_dispatch_failed")
    expect(mockCreateSeguimientoEntry).not.toHaveBeenCalled()
  })

  it("resolves company/case before dispatch and rejects a foreign case without calling provider", async () => {
    const { badRequest } = await import("@/lib/api/errors")
    mockResolveCompanySurgery.mockRejectedValueOnce(badRequest("Foreign case", "invalid_surgery"))
    const response = await callRoute({ surgeryId: "foreign", to: ["a@example.com"], subject: "Test" })
    expect(response.status).toBe(400)
    expect(mockSendEmailWithResend).not.toHaveBeenCalled()
  })

  it.each([
    { to: "a@example.com", subject: "Test" },
    { to: ["a@example.com\r\nBcc:spoof@example.com"], subject: "Test" },
    { to: ["a@example.com"], subject: "Test\r\nInjected" },
    { to: ["a@example.com"], subject: "Test", attachments: [{ filename: "a.png", content: "" }] },
    { to: ["a@example.com"], subject: "Test", attachments: [{ filename: "a.png", content: "https://private.example/image" }] },
  ])("rejects invalid input before resolving or sending: %s", async (input) => {
    expect((await callRoute({ surgeryId: "surgery_x", ...input })).status).toBe(400)
    expect(mockResolveCompanySurgery).not.toHaveBeenCalled()
    expect(mockSendEmailWithResend).not.toHaveBeenCalled()
  })

  it("keeps accepted send successful and warns when audit fails", async () => {
    mockSendEmailWithResend.mockResolvedValue({ success: true, id: "accepted" })
    mockCreateSeguimientoEntry.mockRejectedValueOnce(new Error("audit unavailable"))
    const response = await callRoute({ surgeryId: "surgery_x", to: ["a@example.com"], subject: "Test" })
    expect(response.status).toBe(200)
    expect((await response.json()).data).toMatchObject({ success: true, id: "accepted", auditRecorded: false, warning: expect.stringContaining("No lo reenvíes") })
    expect(mockSendEmailWithResend).toHaveBeenCalledTimes(1)
  })

  it("server owns authorization signature, reply address and CID even if browser spoofs identity/HTML", async () => {
    mockSendEmailWithResend.mockResolvedValue({ success: true, id: "accepted" })
    const response = await callRoute({ surgeryId: "surgery_x", to: ["a@example.com"], subject: "Test", templateType: "authorization", html: "<script>spoof()</script>", replyTo: "spoof@example.com", authorizationData: { patientName: "Actual", signature: { name: "Spoof", companyName: "Other" } }, attachments: [{ filename: "actual.png", content: "data:image/png;base64,iVBORw0KGgo=", contentType: "image/png", contentId: "spoof" }] })
    expect(response.status).toBe(200)
    const payload = mockSendEmailWithResend.mock.calls[0][0]
    expect(payload).toMatchObject({ senderName: "Test User · Test Co", replyTo: "u@example.com", attachments: [{ contentId: "authorization-1" }] })
    expect(payload.html).toContain("Test User")
    expect(payload.html).toContain("Test Co")
    expect(payload.html).not.toContain("Spoof")
    expect(payload.html).not.toContain("<script>")
    expect(payload.html).toContain('src="cid:authorization-1"')
    expect(mockResolveCompanySurgery.mock.invocationCallOrder[0]).toBeLessThan(mockSendEmailWithResend.mock.invocationCallOrder[0])
  })
})
