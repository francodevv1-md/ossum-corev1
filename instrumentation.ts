// Next.js 16 instrumentation hook. Runs once when a Node.js server starts.
// The Remito QR/barcode verification subsystem is installed only when the
// explicit DEV master switch is on AND the runtime is nodejs (the proxy and
// the API routes all run in nodejs, so module state is shared). A broken DEV
// config never crashes the server: the subsystem stays dormant and routes
// fail closed.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (process.env.OSSUM_ENABLE_REMITO_VERIFICATION_DEV?.trim().toLowerCase() !== "true") return
  try {
    const { bootstrapRemitoVerificationRuntime } = await import("@/lib/remito-verification/bootstrap")
    const result = await bootstrapRemitoVerificationRuntime(process.env)
    if (!result.installed) {
      // eslint-disable-next-line no-console
      console.warn(`[remito-verification] bootstrap skipped: ${result.reason}`)
    } else {
      // eslint-disable-next-line no-console
      console.info(`[remito-verification] bootstrap OK: ${result.reason}`)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[remito-verification] bootstrap failed (subsystem stays dormant):", error)
  }
}