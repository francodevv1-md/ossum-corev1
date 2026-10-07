// Real PostgreSQL evidence, opt-in only. No Auth/membership fixture creation or destructive cleanup.
import { randomUUID } from "node:crypto"
import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createPresupuesto, updatePresupuestoDraft, emitPresupuesto, updatePresupuestoState } from "@/lib/services/presupuesto.service"
import { createInvoiceFromSource } from "@/lib/services/invoice.service"

const RUN_FLAG = "OSSUM_RUN_PRESUPUESTOS_FINAL_VALIDATION_DEV"
const PROJECT_REF = "yywqcdromnmmelijvspi"
const OWNER = "PRESUPUESTOS-FINAL-VALIDATION-DEV-001"
const COMPANY_ID = "codevdistricorr1000000000"
const SURGERY_ID = "sgdevsurgery1000000000000"
const integration = process.env[RUN_FLAG] === "true" ? describe : describe.skip

function assertConfirmedTarget(environment: Record<string, string | undefined>) {
  if (environment[RUN_FLAG] !== "true" || environment.OSSUM_DEPLOYMENT_TIER !== "development" ||
    environment.NODE_ENV === "production" || environment.OSSUM_PRESUPUESTOS_CONFIRMED_TARGET !== PROJECT_REF) {
    throw new Error("Presupuesto PostgreSQL test refused: explicit confirmed disposable DEV gate missing")
  }
  const db = new URL(environment.DATABASE_URL ?? "")
  const supabase = new URL(environment.SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL ?? "")
  const direct = db.hostname === `db.${PROJECT_REF}.supabase.co` && db.port === "5432" && decodeURIComponent(db.username) === "postgres"
  const pooler = db.hostname === "aws-1-sa-east-1.pooler.supabase.com" && db.port === "6543" && decodeURIComponent(db.username) === `postgres.${PROJECT_REF}`
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || (!direct && !pooler) || db.pathname !== "/postgres" ||
    db.search || db.hash || supabase.protocol !== "https:" || supabase.hostname !== `${PROJECT_REF}.supabase.co` ||
    supabase.port || supabase.username || supabase.password || supabase.search || supabase.hash ||
    !["", "/", "/rest/v1", "/rest/v1/"].includes(supabase.pathname)) {
    throw new Error("Presupuesto PostgreSQL test refused: connected target does not match confirmed DEV")
  }
}

describe("presupuesto PostgreSQL target gate (no connections)", () => {
  const confirmed: NodeJS.ProcessEnv = {
    [RUN_FLAG]: "true", OSSUM_DEPLOYMENT_TIER: "development", NODE_ENV: "test",
    OSSUM_PRESUPUESTOS_CONFIRMED_TARGET: PROJECT_REF,
    DATABASE_URL: `postgresql://postgres.${PROJECT_REF}:synthetic@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`,
    SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
  }
  it("accepts the explicitly confirmed exact target", () => expect(() => assertConfirmedTarget(confirmed)).not.toThrow())
  it("accepts the existing Supabase REST base path without changing target identity", () => {
    expect(() => assertConfirmedTarget({ ...confirmed, SUPABASE_URL: confirmed.SUPABASE_URL + "/rest/v1/" })).not.toThrow()
  })
  it.each([
    { [RUN_FLAG]: "false" }, { OSSUM_DEPLOYMENT_TIER: "staging" }, { NODE_ENV: "production" },
    { OSSUM_PRESUPUESTOS_CONFIRMED_TARGET: undefined },
    { DATABASE_URL: "postgresql://postgres:synthetic@localhost:5432/postgres" },
    { DATABASE_URL: confirmed.DATABASE_URL + "?host=foreign.invalid" },
    { SUPABASE_URL: `https://${PROJECT_REF}.supabase.co.foreign.invalid` },
  ])("refuses an unconfirmed or mismatched target %j", (override) => {
    expect(() => assertConfirmedTarget({ ...confirmed, ...override })).toThrow(/refused/)
  })
})

integration("presupuesto real independent-connection same-revision race", () => {
  let connections: PrismaClient[] = []
  let actorId: string

  beforeAll(async () => {
    assertConfirmedTarget(process.env)
    connections = [0, 1].map(() => new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1, connectionTimeoutMillis: 10000 }),
      transactionOptions: { maxWait: 10000, timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    }))
    const surgery = await connections[0].surgery.findFirst({
      where: { id: SURGERY_ID, companyId: COMPANY_ID, visibleNumber: "CX-DEV-2026-0001" }, select: { id: true },
    })
    expect(surgery?.id).toBe(SURGERY_ID)
    // Reuse an existing authorized synthetic DEV actor; never create/edit a membership or role.
    const access = await connections[0].userCompanyAccess.findFirst({
      where: { companyId: COMPANY_ID, role: "admin", isActive: true, user: { isActive: true }, company: { isActive: true } },
      select: { userId: true },
    })
    expect(access).not.toBeNull()
    actorId = access!.userId
  }, 30000)

  afterAll(async () => { await Promise.all(connections.map((client) => client.$disconnect())) })

  it("accepts exactly one write, increments once and commits only the winning items/totals/metadata/audit", async () => {
    const runId = randomUUID()
    const draft = await createPresupuesto({
      companyId: COMPANY_ID, surgeryId: SURGERY_ID, createdById: actorId,
      title: `${OWNER} PostgreSQL ${runId}`, metadata: { qaOwner: OWNER, qaRunId: runId },
      items: [{ description: "Exact-owned synthetic base", quantity: 1, unitPrice: 10 }], prisma: connections[0],
    })
    expect(draft.revision).toBe(1)
    const variants = [
      { writer: "A", quantity: 2, price: 100, discountPercent: 10, expected: ["200", "20", "37.8", "217.8"] },
      { writer: "B", quantity: 3, price: 150, discountPercent: 0, expected: ["450", "0", "94.5", "544.5"] },
    ]
    const identities: Array<{ pid: number; xid: string }> = []
    let releaseStart!: () => void
    const bothStarted = new Promise<void>((resolve) => { releaseStart = resolve })
    // This is only a simultaneous START barrier. It does not queue writes or choose a winner.
    // Both real transactions/connections are open before either service callback starts; PostgreSQL owns all serialization.
    const results = await Promise.allSettled(variants.map((variant, index) => {
      const db = connections[index]
      const transactionPort = {
        $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(async (tx) => {
          const [identity] = await tx.$queryRaw<Array<{ pid: number; xid: string }>>`SELECT pg_backend_pid() AS pid, txid_current()::text AS xid`
          identities.push(identity)
          if (identities.length === 2) releaseStart()
          let timer: ReturnType<typeof setTimeout> | undefined
          try {
            await Promise.race([bothStarted, new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error("Both independent transactions did not start")), 8000)
            })])
          } finally { clearTimeout(timer) }
          return callback(tx)
        }),
      } as unknown as PrismaClient
      return updatePresupuestoDraft({
        companyId: COMPANY_ID, presupuestoId: draft.id, expectedRevision: draft.revision,
        title: `${OWNER} winner ${variant.writer} ${runId}`, updatedById: actorId,
        priceListCode: `QA-${variant.writer}`, paymentTerms: `QA terms ${variant.writer}`,
        metadata: { writer: variant.writer, [`only${variant.writer}`]: true },
        commercial: { qaWriter: variant.writer, pricingMode: "ESTIMATIVE" },
        items: [{ sku: `QA-${variant.writer}`, description: `Exact-owned item ${variant.writer}`, quantity: variant.quantity,
          unitPrice: variant.price, discountPercent: variant.discountPercent, vatTreatment: "GRAVADO", vatRate: 21,
          metadata: { writer: variant.writer } }],
        prisma: transactionPort,
      })
    }))
    expect(identities).toHaveLength(2)
    expect(new Set(identities.map((identity) => identity.pid)).size).toBe(2)
    expect(new Set(identities.map((identity) => identity.xid)).size).toBe(2)
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    const winnerIndex = results.findIndex((result) => result.status === "fulfilled")
    const winner = variants[winnerIndex]
    const loser = variants[1 - winnerIndex]
    const rejection = results[1 - winnerIndex] as PromiseRejectedResult
    expect(rejection.reason).toMatchObject({ status: 409, code: "presupuesto_revision_conflict" })
    const row = await connections[0].presupuesto.findFirstOrThrow({ where: { id: draft.id, companyId: COMPANY_ID }, include: { items: true } })
    expect(row.surgeryId).toBe(SURGERY_ID)
    expect(row.state).toBe("Borrador")
    expect(row.versionNumber).toBe(1)
    expect(row.title).toBe(`${OWNER} winner ${winner.writer} ${runId}`)
    expect([row.subtotal, row.discountTotal, row.taxTotal, row.total].map((amount) => amount.toString())).toEqual(winner.expected)
    expect(row.metadata).toMatchObject({ qaOwner: OWNER, qaRunId: runId, writeRevision: 2, writer: winner.writer,
      priceListCode: `QA-${winner.writer}`, paymentTerms: `QA terms ${winner.writer}`, commercial: { qaWriter: winner.writer } })
    expect(row.metadata).not.toHaveProperty(`only${loser.writer}`)
    expect(row.items).toHaveLength(1)
    expect(row.items[0]).toMatchObject({ sku: `QA-${winner.writer}`, description: `Exact-owned item ${winner.writer}`, metadata: { writer: winner.writer } })
    expect(row.items[0].quantity.toString()).toBe(String(winner.quantity))
    expect(row.items[0].unitPrice.toString()).toBe(String(winner.price))
    expect(row.items[0].total.toString()).toBe(winner.expected[3])
    const audits = await connections[0].auditEvent.findMany({ where: { companyId: COMPANY_ID, entityId: draft.id, entityType: "Presupuesto" } })
    expect(audits.map((audit) => audit.action).sort()).toEqual(["presupuesto_created", "presupuesto_draft_updated"])
    console.log(JSON.stringify({ realPostgres: true, exactOwnedBudgetId: draft.id, qaRunId: runId,
      independentBackendPids: identities.map((identity) => identity.pid), accepted: 1, rejected: 1, finalRevision: 2, winner: winner.writer }))
    // Keep the exact-owned synthetic draft as evidence. No resets, broad deleteMany, user/role edits or fiscal operations.
  }, 45000)

  it("creates one real nonfiscal invoice draft and rejects duplicate source after executing its advisory lock", async () => {
    const qaOwner = "PRESUPUESTOS-CONNECTED-JOURNEY-FIXES-DEV-001"
    const qaRunId = randomUUID()
    const db = connections[0]
    const draft = await createPresupuesto({
      companyId: COMPANY_ID, surgeryId: SURGERY_ID, createdById: actorId, prisma: db,
      title: `${qaOwner} invoice PostgreSQL ${qaRunId}`, metadata: { qaOwner, qaRunId },
      items: [{ sku: "QA-INVOICE", description: "Exact-owned invoice synthetic item", quantity: 1, unitPrice: 100,
        vatTreatment: "GRAVADO", vatRate: 21, metadata: { qaOwner, qaRunId, originalSnapshot: "keep" } }],
    })
    const emitted = await emitPresupuesto({ companyId: COMPANY_ID, presupuestoId: draft.id, expectedRevision: draft.revision, updatedById: actorId, prisma: db })
    const approved = await updatePresupuestoState({ companyId: COMPANY_ID, presupuestoId: draft.id, command: "approve", expectedRevision: emitted.revision, updatedById: actorId, prisma: db })
    expect(approved.revision).toBe(3)
    const command = { companyId: COMPANY_ID, presupuestoId: draft.id, createdById: actorId, prisma: db }
    const created = await createInvoiceFromSource(command)
    expect(created).toMatchObject({ surgeryId: SURGERY_ID, presupuestoId: draft.id, state: "Borrador", visibleNumber: null, issuedAt: null })
    expect(created.total.toString()).toBe("121")
    await expect(createInvoiceFromSource({ ...command, prisma: connections[1] })).rejects.toMatchObject({ status: 409, code: "invoice_source_already_invoiced" })
    const rows = await db.invoice.findMany({ where: { companyId: COMPANY_ID, presupuestoId: draft.id }, include: { items: true } })
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(created.id)
    expect(rows[0].items).toHaveLength(1)
    expect(rows[0].items[0].metadata).toMatchObject({ presupuestoId: draft.id, presupuestoItemMetadata: { qaOwner, qaRunId, originalSnapshot: "keep" } })
    expect(rows[0].paidTotal.toString()).toBe("0")
    expect(rows[0].balance.toString()).toBe("121")
    expect(await db.auditEvent.count({ where: { companyId: COMPANY_ID, entityId: created.id, action: "invoice_created" } })).toBe(1)
    console.log(JSON.stringify({ realPostgresInvoice: true, exactOwnedBudgetId: draft.id, exactOwnedInvoiceId: created.id, qaRunId,
      state: "Borrador", duplicateStatus: 409, persistedInvoiceCount: 1, fiscalIssued: false }))
  }, 45000)
})
