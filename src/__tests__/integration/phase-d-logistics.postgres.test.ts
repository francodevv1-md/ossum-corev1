import { config as loadEnv } from "dotenv"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { recordConsumption } from "@/lib/services/phase-d-logistics.service"

const RUN_FLAG = "OSSUM_RUN_PHASE_D_POSTGRES_CONCURRENCY_DEV_INTEGRATION"
if (process.env[RUN_FLAG] === "true") { loadEnv({ path: ".env.local", override: false }); loadEnv({ path: ".env", override: false }) }
const integrationDescribe = process.env[RUN_FLAG] === "true" ? describe : describe.skip
let prisma: PrismaClient | undefined

integrationDescribe("Phase D PostgreSQL same-key concurrency", () => {
  beforeAll(async () => { prisma = (await import("@/lib/prisma")).default })
  afterAll(async () => { await prisma?.$disconnect() })

  it("persists one winner/evidence chain, replays loser, and rejects changed intent", async () => {
    if (!prisma) throw new Error("Prisma unavailable")
    const line = await prisma.cajasDispatchLine.findFirst({ where: { dispatch: { remito: { surgeryId: { not: null } } } }, include: { dispatch: { include: { remito: true } } } })
    if (!line?.dispatch.remito.surgeryId) throw new Error("Phase D proof requires an existing DEV surgical dispatch line")
    const membership = await prisma.userCompanyAccess.findFirst({ where: { companyId: line.companyId, isActive: true } })
    if (!membership) throw new Error("Phase D proof requires an active DEV company membership")
    await prisma.cajasPhaseDActionGrant.upsert({ where: { companyId_userId_action: { companyId: line.companyId, userId: membership.userId, action: "CONSUME" } }, create: { companyId: line.companyId, userId: membership.userId, action: "CONSUME", grantedById: membership.userId }, update: {} })
    const key = `phase-d-pg-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const ctx = { companyId: line.companyId, actorId: membership.userId, role: membership.role, surgeryId: line.dispatch.remito.surgeryId, prisma }
    const input = { commandKey: key, dispatchId: line.dispatchId, dispatchLineId: line.id, quantity: line.quantity.toString() }
    const [first, second] = await Promise.all([recordConsumption(ctx, input), recordConsumption(ctx, input)])
    expect([first.replayed, second.replayed].sort()).toEqual([false, true])
    expect(await prisma.cajasPhaseDOperation.count({ where: { companyId: line.companyId, commandKey: key } })).toBe(1)
    await expect(recordConsumption(ctx, { ...input, evidence: { changed: true } })).rejects.toMatchObject({ code: "phase_d_idempotency_conflict" })
  })
})
