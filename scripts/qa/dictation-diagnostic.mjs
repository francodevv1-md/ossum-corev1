// ponytail: dictation diagnostic — runs against the live dev server to
// report whether SpeechRecognition is available under each access method.
// Not committed to the repo; used only for QA validation.
import { chromium } from "playwright"

const VIEWPORTS = [
  { name: "iPhone SE (360x800)", width: 360, height: 800 },
  { name: "Pixel 7 (412x915)", width: 412, height: 915 },
]

const URLS = [
  { name: "localhost (HTTP)", url: "http://localhost:5000/login" },
  { name: "Tailscale (HTTP-via-WireGuard)", url: "http://100.107.173.14:5000/login" },
]

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Users/franc/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
})
try {
  for (const vp of VIEWPORTS) {
    for (const target of URLS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent:
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      })
      const page = await context.newPage()
      try {
        await page.goto(target.url, { waitUntil: "commit", timeout: 15000 })
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {})
      } catch (err) {
        console.log(`SKIP ${target.name}: navigation failed (${err.message})`)
        await context.close()
        continue
      }

      const result = await page.evaluate(() => {
        const w = window
        const nav = navigator
        return {
          href: location.href,
          protocol: location.protocol,
          isSecureContext: Boolean(w.isSecureContext),
          hasSpeechRecognition: typeof w.SpeechRecognition === "function",
          hasWebkitSpeechRecognition: typeof w.webkitSpeechRecognition === "function",
          hasMediaDevices: typeof nav.mediaDevices?.getUserMedia === "function",
          permissionsApi: typeof nav.permissions?.query === "function",
          userAgent: navigator.userAgent.slice(0, 80),
        }
      })

      console.log(`\n[${vp.name}] ${target.name}`)
      console.log(`  href: ${result.href}`)
      console.log(`  protocol: ${result.protocol}`)
      console.log(`  isSecureContext: ${result.isSecureContext}`)
      console.log(`  SpeechRecognition: ${result.hasSpeechRecognition}`)
      console.log(`  webkitSpeechRecognition: ${result.hasWebkitSpeechRecognition}`)
      console.log(`  getUserMedia: ${result.hasMediaDevices}`)

      if (result.permissionsApi) {
        try {
          const mic = await page.evaluate(async () => {
            try {
              const r = await navigator.permissions.query({ name: "microphone" })
              return r.state
            } catch {
              return "<unsupported>"
            }
          })
          console.log(`  microphone permission: ${mic}`)
        } catch {
          console.log(`  microphone permission: <error>`)
        }
      }

      await context.close()
    }
  }
} finally {
  await browser.close()
}