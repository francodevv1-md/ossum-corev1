/**
 * CHATZAI-014C: Verify that shared tooltip UI components still work
 * on pages other than /cirugias after the Tooltip.tsx fix.
 */
import { test, expect } from "@playwright/test"

test.describe("Shared tooltip pages — no regression (CHATZAI-014C)", () => {
  test("/ventas/facturacion loads without runtime error", async ({ page }) => {
    await page.goto("/ventas/facturacion", { waitUntil: "networkidle" })

    const bodyText = await page.locator("body").textContent()
    expect(bodyText).not.toContain("Maximum update depth exceeded")
    expect(bodyText).not.toContain("Runtime Error")
  })

  test("/ventas/cobros loads without runtime error", async ({ page }) => {
    await page.goto("/ventas/cobros", { waitUntil: "networkidle" })

    const bodyText = await page.locator("body").textContent()
    expect(bodyText).not.toContain("Maximum update depth exceeded")
    expect(bodyText).not.toContain("Runtime Error")
  })
})
