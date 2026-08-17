import { beforeEach, describe, expect, it, vi } from "vitest"

const { getApiAuthContext, resolveCompanySurgery, uploadOperationalDocument } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  resolveCompanySurgery: vi.fn(),
  uploadOperationalDocument: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }))
vi.mock("@/lib/surgery/resolve-company-surgery", () => ({ resolveCompanySurgery }))
vi.mock("@/lib/services/operational-document-upload.service", () => ({ uploadOperationalDocument }))
vi.mock("@/lib/prisma", () => ({ default: { __mockPrisma: true } }))

import { POST } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/documents/route"

const context = { params: Promise.resolve({ companyId: "company-1", surgeryId: "42" }) }

describe("operational document upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getApiAuthContext.mockResolvedValue({ companyId: "company-1", actorUserId: "user-1", role: "admin" })
    resolveCompanySurgery.mockResolvedValue({ id: "surgery-1" })
    uploadOperationalDocument.mockResolvedValue({ id: "entry-1" })
  })

  it("denies non-admin roles before parsing malformed multipart input", async () => {
    getApiAuthContext.mockResolvedValue({ companyId: "company-1", actorUserId: "user-2", role: "coordinator" })
    const response = await POST(new Request("http://localhost", { method: "POST", body: "not multipart" }), context)
    expect(response.status).toBe(403)
    expect(resolveCompanySurgery).not.toHaveBeenCalled()
    expect(uploadOperationalDocument).not.toHaveBeenCalled()
  })

  it("accepts one valid PDF with server-derived scope and actor", async () => {
    const formData = new FormData()
    formData.set("file", new File(["%PDF-1"], "case.pdf", { type: "application/pdf" }))
    formData.set("description", "Authorization received")
    const request = {
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as Request
    const response = await POST(request, context)

    expect(response.status).toBe(201)
    expect(uploadOperationalDocument).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-1",
      surgeryId: "surgery-1",
      actorUserId: "user-1",
      description: "Authorization received",
      file: expect.objectContaining({ fileName: "case.pdf", mimeType: "application/pdf" }),
    }))
  })

  it("rejects a chunked multipart body before buffering beyond the limit", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4_100_001))
        controller.close()
      },
    })
    const request = {
      url: "http://localhost",
      method: "POST",
      headers: new Headers({ "content-type": "multipart/form-data; boundary=test" }),
      body,
      formData: vi.fn(),
    } as unknown as Request

    const response = await POST(request, context)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: { code: "document_too_large", message: "The document exceeds the 4 MB processing limit" },
    })
    expect(request.formData).not.toHaveBeenCalled()
    expect(uploadOperationalDocument).not.toHaveBeenCalled()
  })
})
