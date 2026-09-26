import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  guard: vi.fn(),
  getRemito: vi.fn(),
  render: vi.fn(),
  send: vi.fn(),
  audit: vi.fn(),
  printCodes: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: mocks.guard }))
vi.mock("@/lib/services/remito.service", () => ({ getRemito: mocks.getRemito, REMITO_MUTATION_ROLES: ["admin"] }))
vi.mock("@react-pdf/renderer", async (importOriginal) => ({ ...(await importOriginal<typeof import("@react-pdf/renderer")>()), renderToBuffer: mocks.render }))
vi.mock("@/lib/outbound-email", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/outbound-email")>()), sendResendEmail: mocks.send }))
vi.mock("@/lib/audit", () => ({ createAuditEvent: mocks.audit }))
vi.mock("@/lib/prisma", () => ({ default: {} }))
vi.mock("@/lib/services/remito-print-code.service", () => ({ getRemitoPrintCodes: mocks.printCodes }))
vi.mock("@/lib/remito-verification/service", () => ({ getRemitoVerificationRuntime: () => ({ keyring: {}, internalOrigin: new URL("https://internal.example"), publicOrigin: new URL("https://public.example") }) }))
vi.mock("@/lib/remito-verification/activation", () => ({ getRemitoActivationGate: vi.fn().mockResolvedValue({ flags: { remitoPrintCodes: true } }) }))

import { POST } from "@/app/api/companies/[companyId]/remitos/[remitoId]/email/route"

const remito = {
  id: "rem-1", visibleNumber: 12, companyId: "company-1", state: "Emitido", origin: "manual", salidaReason: "cirugia",
  branchId: "branch-1", branchLabel: "Depósito", issuedBranchLabel: "Central", surgeryId: "surgery-1", surgeryLabel: "CX-0012", remitoShortCode: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
  surgeryDescription: "Artroscopia", surgeryDate: "2026-09-01T12:00:00Z", surgeryPatientName: "Paciente", surgeryDoctorName: "Dra. Médica", surgeryInstitutionName: "Hospital", surgeryClientName: "Cobertura",
  issuedAt: new Date("2026-08-30T12:00:00Z"), deliveredAt: null, returnedAt: null, createdAt: new Date("2026-08-30T11:00:00Z"),
  destinatarioSnapshot: { nombre: "Hospital" }, shippingAddressSnapshot: null, transportSnapshot: null, metadata: null,
  packageCount: null, declaredValue: null,
  items: [{ sku: "SKU", description: "Item", quantity: 1, unit: "un", lotNumber: null, serialNumber: null, returnedQuantity: 0 }],
  detailItems: [{ groupLabel: "Caja / Fórmula 1", sku: "SNAP", description: "Componente snapshot", quantity: 2, unit: "un", lotNumber: "L-1", serialNumber: "S-1", expirationDate: "2028-01-01T00:00:00Z", identifiedCode: "UNIT-1" }],
}

describe("Remito email route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ actorUserId: "user-1", companyId: "company-1", role: "admin", user: { email: "actor@example.com" } })
    mocks.getRemito.mockResolvedValue(remito)
    mocks.render.mockResolvedValue(Buffer.from("pdf"))
    mocks.send.mockResolvedValue({ provider: "resend", providerMessageId: "email-1", status: "accepted" })
    mocks.printCodes.mockResolvedValue({ publicQrDataUrl: "data:image/png;base64,PUBLIC" })
  })

  it("sends only an issued, company-scoped Remito and copies the actor", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Remito", message: "Adjunto", copyMe: true, idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", remitoId: "rem-1" }) })
    expect(response.status).toBe(200)
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "recipient@example.com",
      cc: "actor@example.com",
      idempotencyKey: expect.stringMatching(/^remito\/[a-f0-9]{64}$/),
      attachments: [{ filename: "R-0012.pdf", content: Buffer.from("pdf") }],
    }))
    const document = mocks.render.mock.calls[0][0] as { props: { data: { logoDataUrl: string; qrDataUrl: string; detailItems: Array<Record<string, unknown>> } } }
    expect(document.props.data.logoDataUrl).toMatch(/^data:image\/png;base64,/)
    expect(document.props.data.qrDataUrl).toBe("data:image/png;base64,PUBLIC")
    expect(document.props.data.detailItems).toEqual([expect.objectContaining({ description: "Componente snapshot", expirationDate: expect.stringMatching(/1\/1\/28/), identifiedCode: "UNIT-1" })])
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "remito_email_accepted", entityId: "rem-1" }))
  })

  it("rejects drafts before contacting Resend", async () => {
    mocks.getRemito.mockResolvedValue({ ...remito, state: "Borrador" })
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Remito", message: "Adjunto", idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", remitoId: "rem-1" }) })
    expect(response.status).toBe(400)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("does not expose raw Remito, Surgery, or Branch IDs in the emailed PDF data", async () => {
    mocks.getRemito.mockResolvedValue({ ...remito, visibleNumber: null, surgeryLabel: null, issuedBranchLabel: null, branchLabel: null })
    await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Remito", message: "Adjunto", idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", remitoId: "rem-1" }) })

    const document = mocks.render.mock.calls[0][0] as { props: { data: { surgeryLabel: string | null } } }
    expect(document.props.data.surgeryLabel).toBeNull()
    expect(JSON.stringify(document.props.data)).not.toContain("rem-1")
    expect(JSON.stringify(document.props.data)).not.toContain("surgery-1")
    expect(JSON.stringify(document.props.data)).not.toContain("branch-1")
  })

  it("returns provider acceptance without encouraging a duplicate retry when audit fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"))
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Remito", message: "Adjunto", idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", remitoId: "rem-1" }) })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: { status: "accepted", auditRecorded: false } })
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith("[remito.email.POST] Email accepted but audit failed", { name: "Error", code: "audit_write_failed" })
    errorSpy.mockRestore()
  })

  it("does not expose raw provider errors in logs", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.send.mockRejectedValueOnce(new Error("recipient@example.com secret payload"))
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Remito", message: "Adjunto", idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", remitoId: "rem-1" }) })
    expect(response.status).toBe(500)
    expect(errorSpy).toHaveBeenCalledWith("[remito.email.POST]", { name: "Error", code: "unhandled_error" })
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret payload")
    errorSpy.mockRestore()
  })
})
