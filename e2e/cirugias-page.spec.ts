/**
 * CHATZAI-014C: E2E regression test for /cirugias runtime error.
 *
 * This test guards against "Maximum update depth exceeded" infinite loop
 * that crashed the /cirugias page. The root cause was the Tooltip component
 * wrapping each instance in its own TooltipProvider, creating cascading
 * re-renders that exceeded React's update depth limit.
 *
 * Fix: Removed TooltipProvider from inside Tooltip(); rely on single
 * root-level provider from layout.tsx.
 */
import { test, expect } from "@playwright/test"

test.describe("/cirugias page — runtime error regression (CHATZAI-014C)", () => {
  test("page loads without runtime error overlay", async ({ page }) => {
    // Navigate to /cirugias
    await page.goto("/cirugias", { waitUntil: "networkidle" })

    // Check that no runtime error overlay is visible
    // Next.js shows errors in a div with specific attributes or in an overlay
    const errorOverlay = page.locator("[data-nextjs-dialog], [data-overlay-error], .nextjs-error-overlay")
    await expect(errorOverlay).not.toBeVisible()

    // Verify the page does NOT contain "Maximum update depth exceeded"
    const bodyText = await page.locator("body").textContent()
    expect(bodyText).not.toContain("Maximum update depth exceeded")

    // Verify the table renders (look for the table element)
    const table = page.locator("table")
    await expect(table).toBeVisible({ timeout: 10_000 })
  })

  test("patient column is visible with tooltips working", async ({ page }) => {
    await page.goto("/cirugias", { waitUntil: "networkidle" })

    // Wait for the table to be present
    const table = page.locator("table")
    await expect(table).toBeVisible({ timeout: 10_000 })

    // Check that truncated cells (patient, surgeon, institution) exist
    // These are the cells that use Tooltip with asChild + span
    const truncatedSpans = page.locator("td span.truncate, td span.max-w-\\[130px\\], td span.max-w-\\[110px\\], td span.max-w-\\[120px\\]")
    const count = await truncatedSpans.count()
    // Should have at least some truncated spans (patient, surgeon, institution per row)
    expect(count).toBeGreaterThan(0)
  })

  test("hovering on a tooltip cell does not crash the page", async ({ page }) => {
    await page.goto("/cirugias", { waitUntil: "networkidle" })

    const table = page.locator("table")
    await expect(table).toBeVisible({ timeout: 10_000 })

    // Find the first truncated span (patient cell) and hover
    const firstTruncated = page.locator("td span.truncate").first()
    if (await firstTruncated.isVisible()) {
      await firstTruncated.hover()

      // Wait a moment and verify no error appeared
      await page.waitForTimeout(500)

      const bodyText = await page.locator("body").textContent()
      expect(bodyText).not.toContain("Maximum update depth exceeded")
      expect(bodyText).not.toContain("Runtime Error")
    }
  })
})
