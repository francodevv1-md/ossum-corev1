import { Prisma, type PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { assertCurrentC14Access } from "@/lib/permissions/c14/authorize-insert-writer"

const RUN_FLAG = "OSSUM_RUN_C14_REVOCATION_LOCKING_DEV_INTEGRATION"
const integrationDescribe = process.env[RUN_FLAG] === "true" ? describe : describe.skip
const prefix = `it-c14-lock-${Date.now()}`
const organizationId = `${prefix}-org`
const companyId = `${prefix}-company`
const userId = `${prefix}-user`
let prisma: PrismaClient | undefined
const TEST_TIMEOUT_MS = 5_000
const C14_ISOLATED_DATABASE_NAME = /^ossum_c14_revocation_lock_dev_[a-z0-9_]+$/

function deferred() {
  let resolve!: () => void
  return { promise: new Promise<void>(done => { resolve = done }), resolve: () => resolve() }
}

function within<T>(promise: Promise<T>, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), TEST_TIMEOUT_MS)
    void promise.then(value => { clearTimeout(timeout); resolve(value) }, error => { clearTimeout(timeout); reject(error) })
  })
}

async function waitForPostgresLock(client: PrismaClient, pid: number) {
  const deadline = Date.now() + TEST_TIMEOUT_MS
  while (Date.now() < deadline) {
    const [activity] = await client.$queryRawUnsafe<{ waitEventType: string | null }[]>(
      'SELECT wait_event_type AS "waitEventType" FROM pg_stat_activity WHERE pid=$1', pid,
    )
    if (activity?.waitEventType === "Lock") return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error("Timed out waiting for revoker PostgreSQL lock state")
}

function assertIsolatedDevDatabase(env: NodeJS.ProcessEnv = process.env) {
  const isolatedDatabaseUrl = env.C14_ISOLATED_DATABASE_URL
  if (env.OSSUM_DEPLOYMENT_TIER !== "development" || env.NODE_ENV === "production" || !isolatedDatabaseUrl) {
    throw new Error("C14 revocation locking test requires an explicitly confirmed isolated DEV database")
  }
  let databaseName: string
  try {
    databaseName = new URL(isolatedDatabaseUrl).pathname.replace(/^\/+/, "")
  } catch {
    throw new Error("C14 revocation locking test requires a valid isolated DEV database URL")
  }
  if (!C14_ISOLATED_DATABASE_NAME.test(databaseName)) {
    throw new Error("C14 revocation locking test requires a C14 isolated DEV database name")
  }
  if (env.DATABASE_URL && env.DATABASE_URL === isolatedDatabaseUrl) {
    throw new Error("C14 revocation locking test refuses to overwrite the original DATABASE_URL target")
  }
  env.DATABASE_URL = isolatedDatabaseUrl
}

describe("C14 revocation lock PostgreSQL guard", () => {
  const isolatedUrl = "postgresql://localhost:5432/ossum_c14_revocation_lock_dev_guard_test"
  const devEnvironment = (): NodeJS.ProcessEnv => ({
    OSSUM_DEPLOYMENT_TIER: "development",
    NODE_ENV: "development",
    C14_ISOLATED_DATABASE_URL: isolatedUrl,
  })

  it("validates the C14 isolated database name before replacing DATABASE_URL", () => {
    const env = devEnvironment()
    assertIsolatedDevDatabase(env)
    expect(env.DATABASE_URL).toBe(isolatedUrl)
  })

  it("rejects an invalid isolated database name without replacing DATABASE_URL", () => {
    const env = { ...devEnvironment(), DATABASE_URL: "postgresql://localhost:5432/original_dev" }
    env["C14_ISOLATED_DATABASE_URL"] = "postgresql://localhost:5432/ossum_shared_dev"
    expect(() => assertIsolatedDevDatabase(env)).toThrow("C14 isolated DEV database name")
    expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/original_dev")
  })

  it("rejects the original DATABASE_URL target before overwriting it", () => {
    const env = { ...devEnvironment(), DATABASE_URL: isolatedUrl }
    expect(() => assertIsolatedDevDatabase(env)).toThrow("refuses to overwrite the original DATABASE_URL target")
    expect(env.DATABASE_URL).toBe(isolatedUrl)
  })

})

integrationDescribe("C14 revocation lock on PostgreSQL", () => {
  beforeAll(async () => {
    assertIsolatedDevDatabase()
    prisma = (await import("@/lib/prisma")).default
    await prisma.organization.create({ data: { id: organizationId, name: "C14 Lock Test", slug: `${prefix}-org` } })
    await prisma.company.create({ data: { id: companyId, organizationId, name: "C14 Lock Test" } })
    await prisma.user.create({ data: { id: userId, email: `${prefix}@ossum.test`, firstName: "C14", lastName: "Lock" } })
    await prisma.userCompanyAccess.create({ data: { userId, companyId, role: "admin" } })
  })

  afterAll(async () => {
    if (!prisma) return
    try {
      await prisma.userCompanyAccess.deleteMany({ where: { userId } })
      await prisma.user.deleteMany({ where: { id: userId } })
      await prisma.company.deleteMany({ where: { id: companyId } })
      await prisma.organization.deleteMany({ where: { id: organizationId } })
    } finally {
      await prisma.$disconnect()
    }
  })

  it("returns PostgreSQL numeric values as exact Prisma Decimals", async () => {
    if (!prisma) throw new Error("Prisma client unavailable")
    const [row] = await prisma.$queryRawUnsafe<{ quantity: Prisma.Decimal }[]>("SELECT 900719925474.0991::numeric AS quantity")
    expect(Prisma.Decimal.isDecimal(row.quantity)).toBe(true)
    expect(row.quantity.equals(new Prisma.Decimal("900719925474.0991"))).toBe(true)
  })

  it("makes a same-row revoker wait until C14 membership verification commits", async () => {
    if (!prisma) throw new Error("Prisma client unavailable")
    const writerLocked = deferred(), releaseWriter = deferred(), revokerStarted = deferred()
    let revokerFinished = false
    const writer = prisma.$transaction(async tx => {
      await assertCurrentC14Access(tx, userId, companyId)
      writerLocked.resolve()
      await releaseWriter.promise
    })
    let revoker: Promise<void> | undefined
    let revokerPid: number | undefined
    try {
      await within(writerLocked.promise, "writer membership lock")
      revoker = prisma.$transaction(async tx => {
        // Scope limitation: no production membership-revocation service/API exists in this worktree.
        // This test-local mutation proves only compatibility with the required same-row lock protocol.
        const [{ pid }] = await tx.$queryRawUnsafe<{ pid: number }[]>("SELECT pg_backend_pid() AS pid")
        revokerPid = pid
        revokerStarted.resolve()
        await tx.$executeRawUnsafe('SELECT "id" FROM "UserCompanyAccess" WHERE "userId"=$1 AND "companyId"=$2 FOR UPDATE', userId, companyId)
        await tx.userCompanyAccess.updateMany({ where: { userId, companyId }, data: { isActive: false } })
        revokerFinished = true
      })
      await within(revokerStarted.promise, "revoker transaction start")
      if (revokerPid === undefined) throw new Error("Revoker PostgreSQL backend PID unavailable")
      await waitForPostgresLock(prisma, revokerPid)
      expect(revokerFinished).toBe(false)
    } finally {
      releaseWriter.resolve()
      await within(Promise.all([writer, revoker].filter((transaction): transaction is Promise<void> => Boolean(transaction))), "transaction cleanup")
    }
    await expect(prisma.userCompanyAccess.findFirst({ where: { userId, companyId }, select: { isActive: true } })).resolves.toEqual({ isActive: false })
  })
})
