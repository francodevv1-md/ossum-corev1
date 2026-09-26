import { purgeRemitoVerificationRateBuckets, retentionGatePassed, verifySchedulerBearer, type RetentionDb } from "@/lib/remito-verification/rate-retention"

type Dependencies = { prisma: RetentionDb; schedulerSecret: Uint8Array; now?: () => Date }
let runtime: Dependencies | null = null

export function installRemitoRetentionRuntime(dependencies: Dependencies): void { runtime = dependencies }

export function createRemitoRetentionPost(dependencies: Dependencies) {
  return async function POST(request: Request): Promise<Response> {
    const headers = { "Cache-Control": "private, no-store", "Content-Type": "application/json" }
    if (!verifySchedulerBearer(request.headers.get("authorization"), dependencies.schedulerSecret)) {
      return new Response(JSON.stringify({ error: { code: "maintenance_access_denied", message: "Access denied" } }), { status: 401, headers })
    }
    try {
      const result = await purgeRemitoVerificationRateBuckets(dependencies.prisma, (dependencies.now ?? (() => new Date()))())
      return new Response(JSON.stringify({ deleted: result.deleted, oldestRemainingAgeSeconds: result.oldestRemainingAgeSeconds }),
        { status: retentionGatePassed(result) ? 200 : 503, headers })
    } catch {
      return new Response(JSON.stringify({ error: { code: "retention_failed", message: "Retention failed" } }), { status: 503, headers })
    }
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!runtime) return new Response(JSON.stringify({ error: { code: "retention_unavailable", message: "Retention unavailable" } }),
    { status: 503, headers: { "Cache-Control": "private, no-store", "Content-Type": "application/json" } })
  return createRemitoRetentionPost(runtime)(request)
}
