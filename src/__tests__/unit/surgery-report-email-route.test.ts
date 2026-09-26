import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), guard: vi.fn(), surgery: vi.fn(), render: vi.fn(), send: vi.fn(), audit: vi.fn() }))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: mocks.guard }))
vi.mock("@/lib/services/surgery.service", () => ({ getSurgeryById: mocks.surgery }))
vi.mock("@react-pdf/renderer", async (importOriginal) => ({ ...(await importOriginal<typeof import("@react-pdf/renderer")>()), renderToBuffer: mocks.render }))
vi.mock("@/lib/outbound-email", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/outbound-email")>()), sendResendEmail: mocks.send }))
vi.mock("@/lib/audit", () => ({ createAuditEvent: mocks.audit }))
vi.mock("@/lib/prisma", () => ({ default: {} }))

import { POST } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/reports/email/route"

describe("Surgery report email route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ actorUserId: "user-1", companyId: "company-1", role: "coordinator", user: { email: "actor@example.com" } })
    mocks.surgery.mockResolvedValue({
      id: "surgery-1", visibleNumber: "CX-0012", patient: { firstName: "Test", lastName: "Patient" }, doctor: null, institution: null, payer: null,
      surgeryDate: new Date("2026-08-30T12:00:00Z"), scheduledDate: null, probableDate: null, cxStatus: "Programada", prepStatus: "Sin_preparar",
      coordinatorAssignment: { status: "resolved", resolved: { label: "Coordinador Test" } }, classification: "Trauma", description: "Procedure", notes: "Note",
    })
    mocks.render.mockResolvedValue(Buffer.from("pdf"))
    mocks.send.mockResolvedValue({ provider: "resend", providerMessageId: "email-2", status: "accepted" })
  })

  it("sends the server-derived report without mutating Surgery", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Report", message: "Attached", copyMe: true, idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", surgeryId: "surgery-1" }) })
    expect(response.status).toBe(200)
    expect(mocks.guard).toHaveBeenCalledWith(expect.objectContaining({ role: "coordinator" }), ["admin", "coordinator", "coordinador"])
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ cc: "actor@example.com", idempotencyKey: expect.stringMatching(/^surgery-report\/[a-f0-9]{64}$/) }))
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "surgery_report_email_accepted", entityId: "surgery-1" }))
  })

  it("returns provider acceptance without encouraging a duplicate retry when audit fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"))
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Report", message: "Attached", idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", surgeryId: "surgery-1" }) })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: { status: "accepted", auditRecorded: false } })
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith("[surgery-report.email.POST] Email accepted but audit failed", { name: "Error", code: "audit_write_failed" })
    errorSpy.mockRestore()
  })

  it("does not expose raw provider errors in logs", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.send.mockRejectedValueOnce(new Error("recipient@example.com secret payload"))
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Report", message: "Attached", idempotencyKey: "key-12345" }) }), { params: Promise.resolve({ companyId: "company-1", surgeryId: "surgery-1" }) })
    expect(response.status).toBe(500)
    expect(errorSpy).toHaveBeenCalledWith("[surgery-report.email.POST]", { name: "Error", code: "unhandled_error" })
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret payload")
    errorSpy.mockRestore()
  })
})
