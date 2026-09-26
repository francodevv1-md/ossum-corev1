import { beforeEach, describe, expect, it, vi } from "vitest"

const { getApiAuthContext, requireCompanyMutationAccess, extractAutorizacion } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationAccess: vi.fn(),
  extractAutorizacion: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess }))
vi.mock("@/lib/services/ai/autorizacion-extractor", () => ({ extractAutorizacion }))

import { forbidden } from "@/lib/api/errors"
import { POST } from "@/app/api/companies/[companyId]/surgeries/ai-extract/route"

const context = { params: Promise.resolve({ companyId: "company-1" }) }

describe("authorization AI Azure route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getApiAuthContext.mockResolvedValue({ companyId: "company-1", actorUserId: "user-1", role: "admin" })
    extractAutorizacion.mockResolvedValue({
      provider: "azure-document-intelligence+openai",
      confidence: 0.9,
      looks_like_authorization: true,
      warnings: [],
      extracted: {},
      raw_text_preview: "",
    })
  })

  it("stops before multipart parsing when authorization fails", async () => {
    getApiAuthContext.mockRejectedValue(forbidden("Denied", "company_access_denied"))
    const request = { formData: vi.fn() } as unknown as Request
    const response = await POST(request, context)
    expect(response.status).toBe(403)
    expect(request.formData).not.toHaveBeenCalled()
  })

  it("passes Azure mode and server-side actor metadata to extraction", async () => {
    const formData = new FormData()
    formData.set("file", new File(["%PDF-1"], "authorization.pdf", { type: "application/pdf" }))
    formData.set("mode", "azure")
    const response = await POST({ formData: vi.fn().mockResolvedValue(formData) } as unknown as Request, context)

    expect(response.status).toBe(200)
    expect(extractAutorizacion).toHaveBeenCalledWith(expect.objectContaining({
      mode: "azure",
      mimeType: "application/pdf",
      fileName: "authorization.pdf",
      metadata: expect.objectContaining({ companyId: "company-1", actorUserId: "user-1" }),
    }))
  })
})
