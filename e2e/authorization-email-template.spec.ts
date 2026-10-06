import { test, expect } from "@playwright/test"
import { generateAuthorizationEmailHtml } from "../src/lib/services/resend.service"
import { normalizeMailAttachments } from "../src/lib/validators/mail.validator"

for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
  test(`synthetic authorization image is readable and uncropped at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const requests: string[] = []
    await page.route("**/*", (route) => {
      requests.push(route.request().url())
      return route.abort()
    })
    const imageData = await page.evaluate(() => {
      const canvas = document.createElement("canvas")
      canvas.width = 1000
      canvas.height = 1200
      const context = canvas.getContext("2d")!
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = "#334155"
      context.lineWidth = 4
      context.strokeRect(20, 20, 960, 1160)
      context.fillStyle = "#0f172a"
      context.font = "bold 44px Arial"
      context.fillText("DEV AUTHORIZATION FIXTURE", 60, 110)
      context.font = "30px Arial"
      context.fillText("Synthetic image - no clinical data", 60, 170)
      context.fillText("Original top and bottom must remain visible.", 60, 250)
      context.fillText("END OF ORIGINAL DOCUMENT", 60, 1120)
      return canvas.toDataURL("image/png")
    })
    const attachments = normalizeMailAttachments([
      { filename: "synthetic-authorization.png", content: imageData, contentType: "image/png" },
    ], true)
    const data = {
      patientName: "Synthetic patient",
      clientOrArt: "Synthetic payer",
      surgeonName: "Synthetic surgeon",
      notes: "Please review the original authorization image.\nSynthetic QA only.",
      signature: { name: "Test User", companyName: "Test Company", email: "user@example.com" },
    }
    const delivered = generateAuthorizationEmailHtml(data, attachments)
    expect(delivered).toContain('src="cid:authorization-1"')
    expect(delivered).not.toContain("data:image")

    await page.setContent(generateAuthorizationEmailHtml(data, attachments, true))
    const image = page.getByRole("img", { name: "synthetic-authorization.png" })
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1000)
    const dimensions = await image.evaluate((element) => {
      const image = element as HTMLImageElement
      const bounds = image.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height, naturalRatio: image.naturalWidth / image.naturalHeight }
    })
    expect(dimensions.width).toBeGreaterThan(viewport.width < 500 ? 300 : 650)
    expect(dimensions.width).toBeLessThanOrEqual(viewport.width)
    expect(dimensions.width / dimensions.height).toBeCloseTo(dimensions.naturalRatio, 3)
    const order = await page.evaluate(() => {
      const image = document.querySelector("img")!
      const summary = document.querySelector("table")!
      return Boolean(image.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    expect(order).toBe(true)
    await expect(page.getByText("Test User", { exact: false })).toBeVisible()
    await expect(page.getByText("Synthetic patient", { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(requests).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`authorization-${viewport.width}.png`), fullPage: true })
  })
}
