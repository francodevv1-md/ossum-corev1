import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  getArticle: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.requireCompanyReadAccess }))
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }))
vi.mock("@/lib/services/article.service", () => ({ getArticle: mocks.getArticle, updateArticle: vi.fn() }))

import { notFound } from "@/lib/api/errors"
import { GET } from "@/app/api/companies/[companyId]/articles/[articleId]/route"

const auth = { companyId: "company-authoritative", actorUserId: "user-1", role: "operator" }
const context = { params: Promise.resolve({ companyId: "company-route", articleId: "article-1" }) }

describe("GET /api/companies/[companyId]/articles/[articleId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApiAuthContext.mockResolvedValue(auth)
    mocks.getArticle.mockResolvedValue({ id: "article-1", sku: "ITM-001", stock: { available: 8, reserved: 2, inTransit: 0 } })
  })

  it("uses the authoritative company after read authorization", async () => {
    const response = await GET(new Request("http://localhost/api"), context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({ id: "article-1", stock: { available: 8, reserved: 2, inTransit: 0 } }),
    })
    expect(mocks.getApiAuthContext).toHaveBeenCalledWith(expect.any(Request), "company-route")
    expect(mocks.requireCompanyReadAccess).toHaveBeenCalledWith(auth)
    expect(mocks.getArticle).toHaveBeenCalledWith(expect.objectContaining({ marker: "prisma" }), "company-authoritative", "article-1")
  })

  it("keeps a non-disclosing 404 when the article is absent from the company", async () => {
    mocks.getArticle.mockRejectedValueOnce(notFound("Article not found", "article_not_found"))

    const response = await GET(new Request("http://localhost/api"), context)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: { code: "article_not_found" } })
  })
})
