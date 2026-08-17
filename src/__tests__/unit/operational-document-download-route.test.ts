import { beforeEach, describe, expect, it, vi } from "vitest"

const { getApiAuthContext, resolveCompanySurgery, readOperationalDocument } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  resolveCompanySurgery: vi.fn(),
  readOperationalDocument: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }))
vi.mock("@/lib/surgery/resolve-company-surgery", () => ({ resolveCompanySurgery }))
vi.mock("@/lib/services/operational-document-upload.service", () => ({ readOperationalDocument }))
vi.mock("@/lib/prisma", () => ({ default: { __mockPrisma: true } }))

import { forbidden, notFound } from "@/lib/api/errors"
import { GET } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/documents/[entryId]/route"

const context = { params: Promise.resolve({ companyId: "company-1", surgeryId: "42", entryId: "entry-1" }) }

describe("operational document download route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getApiAuthContext.mockResolvedValue({ companyId: "company-1", actorUserId: "user-1", role: "admin" })
    resolveCompanySurgery.mockResolvedValue({ id: "surgery-1" })
    readOperationalDocument.mockResolvedValue({
      bytes: new TextEncoder().encode("%PDF-1"),
      fileName: "case.pdf",
      mimeType: "application/pdf",
    })
  })

  it("stops before surgery and storage access when company auth fails", async () => {
    getApiAuthContext.mockRejectedValue(forbidden("Company access denied", "company_access_denied"))
    const response = await GET(new Request("http://localhost"), context)
    expect(response.status).toBe(403)
    expect(resolveCompanySurgery).not.toHaveBeenCalled()
    expect(readOperationalDocument).not.toHaveBeenCalled()
  })

  it("preserves a tenant-scoped not-found response", async () => {
    readOperationalDocument.mockRejectedValue(notFound("Document not found", "operational_document_not_found"))
    const response = await GET(new Request("http://localhost"), context)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: { code: "operational_document_not_found", message: "Document not found" } })
  })

  it("returns private no-store bytes with a safe filename", async () => {
    const response = await GET(new Request("http://localhost"), context)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/pdf")
    expect(response.headers.get("content-disposition")).toBe('inline; filename="case.pdf"')
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(await response.text()).toBe("%PDF-1")
  })
})
