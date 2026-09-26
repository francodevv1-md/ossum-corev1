import { expect, test } from "@playwright/test"

test("React-PDF remains disabled and non-cacheable", async ({ request }) => {
  const response = await request.get("/api/companies/company-1/remitos/remito-1/pdf")

  expect(response.status()).toBe(404)
  expect(response.headers()["cache-control"]).toContain("no-store")
  expect(response.headers()["x-robots-tag"]).toContain("noindex")
})
