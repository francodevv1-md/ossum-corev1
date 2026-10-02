import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import type { PrismaClient } from "@prisma/client"
import {
  createPresupuesto,
  updatePresupuestoDraft,
  emitPresupuesto,
  updatePresupuestoState,
  createPresupuestoVersion,
  deletePresupuesto,
  PresupuestoError,
} from "@/lib/services/presupuesto.service"

describe("protected presupuesto SQL lock order (not PostgreSQL concurrency proof)", () => {
  const base = { companyId: "lock-order-company", presupuestoId: "lock-order-budget", expectedRevision: 1 }
  const operations = [
    { name: "edit draft", run: (prisma: PrismaClient) => updatePresupuestoDraft({ ...base, prisma, items: [{ description: "Synthetic item", quantity: 1, unitPrice: 100 }] }) },
    { name: "emit", run: (prisma: PrismaClient) => emitPresupuesto({ ...base, prisma }) },
    { name: "transition state", run: (prisma: PrismaClient) => updatePresupuestoState({ ...base, prisma, command: "approve" }) },
    { name: "create version", run: (prisma: PrismaClient) => createPresupuestoVersion({ ...base, prisma, sourcePresupuestoId: base.presupuestoId }) },
    { name: "delete draft", run: (prisma: PrismaClient) => deletePresupuesto({ ...base, prisma }) },
  ]

  it.each(operations)("$name awaits tenant-scoped SELECT FOR UPDATE before the first presupuesto read", async ({ run }) => {
    const events: string[] = []
    const stopAfterFirstRead = new Error("Read reached after lock")
    const tx = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        expect(strings.join("?").replace(/\s+/g, " ").trim()).toBe('SELECT "id" FROM "presupuesto" WHERE "id" = ? AND "companyId" = ? FOR UPDATE')
        expect(values).toEqual([base.presupuestoId, base.companyId])
        events.push("lock-start")
        await Promise.resolve()
        events.push("lock-acquired")
        return [{ id: base.presupuestoId }]
      }),
      presupuesto: {
        findFirst: vi.fn(async () => {
          events.push("read")
          // No transaction queue/mutex: this assertion proves await/order, not a predetermined race winner.
          expect(events).toEqual(["lock-start", "lock-acquired", "read"])
          throw stopAfterFirstRead
        }),
      },
    }
    const prisma = { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } as unknown as PrismaClient
    await expect(run(prisma)).rejects.toBe(stopAfterFirstRead)
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
    expect(tx.presupuesto.findFirst).toHaveBeenCalledTimes(1)
    expect(events).toEqual(["lock-start", "lock-acquired", "read"])
  })
})

describe("PRESUPUESTOS Concurrency & Lost-Update Protection", () => {
  const companyId = "company-ossum-dev"
  const surgeryId = "surgery-cx-101"
  const actorA = "user-editor-a"
  const actorB = "user-editor-b"

  let dbPresupuesto: any = null

  // Keep the mock at the Prisma boundary, not the serialized HTTP boundary.
  const cloneRow = (value: any): any => {
    if (value instanceof Date) return new Date(value)
    if (value instanceof Prisma.Decimal) return new Prisma.Decimal(value)
    if (Array.isArray(value)) return value.map(cloneRow)
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneRow(entry)]))
    return value
  }

    let lockQueue: Promise<void> = Promise.resolve()

    const makePrismaMock = () => {
      lockQueue = Promise.resolve()
      const mock: any = {
        surgery: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === surgeryId && where.companyId === companyId) {
              return { id: surgeryId, companyId }
            }
            return null
          }),
        },
        presupuesto: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (dbPresupuesto && dbPresupuesto.id === where.id && dbPresupuesto.companyId === where.companyId) {
              return cloneRow(dbPresupuesto)
            }
            return null
          }),
          create: vi.fn().mockImplementation(async ({ data }) => {
            dbPresupuesto = {
              id: "pres-concurrency-1",
              visibleNumber: null,
              companyId: data.companyId,
              surgeryId: data.surgeryId ?? null,
              parentPresupuestoId: data.parentPresupuestoId ?? null,
              versionNumber: data.versionNumber ?? 1,
              state: data.state ?? "Borrador",
              title: data.title ?? null,
              currency: data.currency ?? "ARS",
              subtotal: data.subtotal,
              discountTotal: data.discountTotal,
              taxTotal: data.taxTotal,
              total: data.total,
              validUntil: data.validUntil ?? null,
              issuedAt: null,
              approvedAt: null,
              rejectedAt: null,
              createdById: data.createdById ?? null,
              updatedById: null,
              metadata: data.metadata ?? {},
              createdAt: new Date("2026-10-02T10:00:00Z"),
              updatedAt: new Date("2026-10-02T10:00:00Z"),
              items: (data.items?.create ?? []).map((it: any, idx: number) => ({
                id: `item-${idx + 1}`,
                sku: it.sku ?? null,
                description: it.description,
                quantity: it.quantity,
                unit: it.unit ?? null,
                unitPrice: it.unitPrice,
                discount: it.discount,
                tax: it.tax,
                total: it.total,
                vatTreatment: it.vatTreatment,
                vatRate: it.vatRate,
                metadata: it.metadata ?? null,
              })),
            }
            return cloneRow(dbPresupuesto)
          }),
          update: vi.fn().mockImplementation(async ({ where, data }) => {
            if (!dbPresupuesto || dbPresupuesto.id !== where.id) {
              throw new Error("Presupuesto not found")
            }
            dbPresupuesto = {
              ...dbPresupuesto,
              ...data,
              items: data.items?.create
                ? data.items.create.map((it: any, idx: number) => ({
                    id: `item-${idx + 1}`,
                    sku: it.sku ?? null,
                    description: it.description,
                    quantity: it.quantity,
                    unit: it.unit ?? null,
                    unitPrice: it.unitPrice,
                    discount: it.discount,
                    tax: it.tax,
                    total: it.total,
                    vatTreatment: it.vatTreatment,
                    vatRate: it.vatRate,
                    metadata: it.metadata ?? null,
                  }))
                : dbPresupuesto.items,
              updatedAt: new Date("2026-10-02T10:05:00Z"),
            }
            return cloneRow(dbPresupuesto)
          }),
          delete: vi.fn().mockImplementation(async ({ where }) => {
            if (dbPresupuesto && dbPresupuesto.id === where.id) {
              dbPresupuesto = null
              return { id: where.id }
            }
            throw new Error("Not found")
          }),
          aggregate: vi.fn().mockImplementation(async () => {
            return { _max: { versionNumber: dbPresupuesto?.versionNumber ?? 1 } }
          }),
        },
        presupuestoItem: {
          deleteMany: vi.fn().mockImplementation(async ({ where }) => {
            if (dbPresupuesto && dbPresupuesto.id === where.presupuestoId) {
              dbPresupuesto.items = []
            }
            return { count: 1 }
          }),
        },
        auditEvent: {
          create: vi.fn().mockResolvedValue({ id: "audit-1" }),
        },
        $executeRaw: vi.fn().mockResolvedValue(1),
        $queryRaw: vi.fn().mockResolvedValue([{ next: 101 }]),
        $transaction: vi.fn().mockImplementation(async (callback) => {
          let release: () => void = () => {}
          const nextLock = new Promise<void>((res) => {
            release = res
          })
          const prevLock = lockQueue
          lockQueue = lockQueue.then(() => nextLock)
          await prevLock
          try {
            return await callback(mock)
          } finally {
            release()
          }
        }),
      }
      return mock
    }

  let prismaMock: any

  beforeEach(() => {
    dbPresupuesto = null
    prismaMock = makePrismaMock()
  })

  it("reproduces lost-update sequence: Editor B submitting old expectedRevision is rejected after Editor A saves", async () => {
    // 1. Initial draft creation
    const draft = await createPresupuesto({
      companyId,
      surgeryId,
      title: "Initial Draft Title",
      items: [
        {
          sku: "STK-1",
          description: "Item 1",
          quantity: 1,
          unitPrice: 10000,
          vatTreatment: "GRAVADO",
          vatRate: 21,
        },
      ],
      createdById: actorA,
      prisma: prismaMock,
    })

    expect(draft.versionNumber).toBe(1)
    expect(draft.revision).toBe(1)

    // Both Editor A and Editor B read the same draft at revision 1
    const tokenReadByA = draft.revision
    const tokenReadByB = draft.revision
    expect(tokenReadByA).toBe(1)
    expect(tokenReadByB).toBe(1)

    // 2. Editor A saves changes with expectedRevision: 1
    const draftAfterA = await updatePresupuestoDraft({
      companyId,
      presupuestoId: draft.id,
      title: "Title updated by Editor A",
      expectedRevision: tokenReadByA,
      items: [
        {
          sku: "STK-1",
          description: "Item 1 — Modified by A",
          quantity: 2,
          unitPrice: 10000,
          vatTreatment: "GRAVADO",
          vatRate: 21,
        },
      ],
      updatedById: actorA,
      prisma: prismaMock,
    })

    // Commercial version remains 1, but mutation revision MUST advance to 2!
    expect(draftAfterA.versionNumber).toBe(1)
    expect(draftAfterA.revision).toBe(2)
    expect(draftAfterA.title).toBe("Title updated by Editor A")

    // 3. Editor B tries to save using their stale token (1)
    await expect(
      updatePresupuestoDraft({
        companyId,
        presupuestoId: draft.id,
        title: "Title updated by Editor B (STALE)",
        expectedRevision: tokenReadByB, // 1 (stale)
        items: [
          {
            sku: "STK-1",
            description: "Item 1 — Stale edit by B",
            quantity: 99,
            unitPrice: 10000,
            vatTreatment: "GRAVADO",
            vatRate: 21,
          },
        ],
        updatedById: actorB,
        prisma: prismaMock,
      })
    ).rejects.toThrowError(PresupuestoError)

    // 4. Verify Editor A's data was NOT overwritten
    expect(dbPresupuesto.title).toBe("Title updated by Editor A")
    expect(dbPresupuesto.items[0].description).toBe("Item 1 — Modified by A")
    expect(Number(dbPresupuesto.items[0].quantity)).toBe(2)
  })

  it("handles two overlapping/concurrent operations racing with the same token: exactly one succeeds and one is rejected with 409", async () => {
    const draft = await createPresupuesto({
      companyId,
      surgeryId,
      title: "Concurrent Race Draft",
      items: [{ description: "Base Item", quantity: 1, unitPrice: 10000 }],
      prisma: prismaMock,
    })

    const initialToken = draft.revision
    expect(initialToken).toBe(1)

    // Two mutations dispatched concurrently with the same token
    const opA = updatePresupuestoDraft({
      companyId,
      presupuestoId: draft.id,
      title: "Concurrent Winner A",
      expectedRevision: initialToken,
      items: [{ description: "Base Item", quantity: 2, unitPrice: 10000 }],
      updatedById: actorA,
      prisma: prismaMock,
    })

    const opB = updatePresupuestoDraft({
      companyId,
      presupuestoId: draft.id,
      title: "Concurrent Competitor B",
      expectedRevision: initialToken,
      items: [{ description: "Base Item", quantity: 3, unitPrice: 10000 }],
      updatedById: actorB,
      prisma: prismaMock,
    })

    const results = await Promise.allSettled([opA, opB])

    const fulfilled = results.filter((r) => r.status === "fulfilled")
    const rejected = results.filter((r) => r.status === "rejected")

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason
    expect(rejectionReason).toBeInstanceOf(PresupuestoError)
    expect(rejectionReason.status).toBe(409)
    expect(rejectionReason.code).toBe("presupuesto_revision_conflict")

    // The winning update incremented revision to 2
    const winningResult = (fulfilled[0] as PromiseFulfilledResult<any>).value
    expect(winningResult.revision).toBe(2)
    expect(dbPresupuesto.metadata.writeRevision).toBe(2)
  })

  it("enforces mandatory expectedRevision: omitting token throws 400 presupuesto_revision_required", async () => {
    const draft = await createPresupuesto({
      companyId,
      surgeryId,
      title: "Draft for token requirement",
      items: [{ description: "Item 1", quantity: 1, unitPrice: 5000 }],
      prisma: prismaMock,
    })

    await expect(
      updatePresupuestoDraft({
        companyId,
        presupuestoId: draft.id,
        title: "Edit with missing revision",
        expectedRevision: undefined as any,
        items: [{ description: "Item 1", quantity: 2, unitPrice: 5000 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({
      code: "presupuesto_revision_required",
      status: 400,
    })

    await expect(
      emitPresupuesto({
        companyId,
        presupuestoId: draft.id,
        expectedRevision: undefined as any,
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({
      code: "presupuesto_revision_required",
      status: 400,
    })

    await expect(
      updatePresupuestoState({
        companyId,
        presupuestoId: draft.id,
        command: "annul",
        expectedRevision: undefined as any,
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({
      code: "presupuesto_revision_required",
      status: 400,
    })
  })

  it("state transition invalidates competing stale edit", async () => {
    const draft = await createPresupuesto({
      companyId,
      surgeryId,
      title: "Draft to emit",
      items: [{ description: "Item 1", quantity: 1, unitPrice: 5000 }],
      prisma: prismaMock,
    })

    const initialToken = draft.revision // 1

    // Emit the draft (advances revision to 2)
    const emitted = await emitPresupuesto({
      companyId,
      presupuestoId: draft.id,
      expectedRevision: initialToken,
      prisma: prismaMock,
    })

    expect(emitted.state).toBe("Emitido")
    expect(emitted.revision).toBe(2)

    // Attempting to edit using stale token 1 must fail
    await expect(
      updatePresupuestoDraft({
        companyId,
        presupuestoId: draft.id,
        expectedRevision: initialToken,
        title: "Late edit",
        items: [{ description: "Item 1", quantity: 1, unitPrice: 5000 }],
        prisma: prismaMock,
      })
    ).rejects.toThrowError(PresupuestoError)
  })

  it("creates new commercial version with versionNumber + 1 and resets revision to 1", async () => {
    const draft = await createPresupuesto({
      companyId,
      surgeryId,
      title: "Draft V1",
      items: [{ description: "Item 1", quantity: 1, unitPrice: 5000 }],
      prisma: prismaMock,
    })

    const emitted = await emitPresupuesto({
      companyId,
      presupuestoId: draft.id,
      expectedRevision: draft.revision,
      prisma: prismaMock,
    })

    const approved = await updatePresupuestoState({
      companyId,
      presupuestoId: draft.id,
      command: "approve",
      expectedRevision: emitted.revision,
      prisma: prismaMock,
    })

    expect(approved.versionNumber).toBe(1)

    // Create version 2 from approved budget
    const v2 = await createPresupuestoVersion({
      companyId,
      sourcePresupuestoId: draft.id,
      expectedRevision: approved.revision,
      prisma: prismaMock,
    })

    expect(v2.versionNumber).toBe(2)
    expect(v2.revision).toBe(1)
    expect(v2.state).toBe("Borrador")
  })
})
