import { describe, expect, it } from "vitest"

import { GET } from "@/app/api/companies/[companyId]/remitos/[remitoId]/pdf/route"

describe("disabled Remito PDF endpoint", () => {
  it("returns a non-cacheable 404 without resolving Remito data", async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow")
    expect(body).toEqual({
      error: {
        code: "remito_pdf_disabled",
        message: "Remito PDF endpoint is not available",
      },
    })
  })
})
