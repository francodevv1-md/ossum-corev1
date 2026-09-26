import { expect, test } from "@playwright/test"

test("public verification is dynamic, protected, and fail-closed without runtime", async ({ page }) => {
  const response = await page.goto("/verificar/remito/redacted")
  expect(response).not.toBeNull()
  expect(response?.status()).toBe(503)
  expect(response?.headers()["cache-control"]).toBe("no-store, max-age=0")
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow, noarchive")
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer")
  expect(response?.headers()["content-security-policy"]).toContain("'strict-dynamic'")
  await expect(page.getByText("Verification temporarily unavailable")).toBeVisible()
  await expect(page.locator("a")).toHaveCount(0)
  await expect(page.locator("body")).not.toContainText("redacted")
})
