import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ApiAuthContext } from "@/lib/api/auth-context"
import { updateBackendSurgeryManagement, updateBackendSurgeryState, fetchBackendSurgery, addBackendSurgeryNote } from "@/lib/api/backend-surgeries"
import { fetchCoordinationView } from "@/lib/api/coordination-view"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import { validateSeguimientoCreateBody } from "@/lib/validators/seguimiento.validator"

const state = vi.hoisted(() => ({ prisma: {} as Record<string, unknown>, ctx: {} as ApiAuthContext }))
vi.mock("@/lib/prisma", () => ({ default: state.prisma }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: async () => state.ctx }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: async () => null }))
import { PATCH, GET } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/route"
import { GET as VIEW } from "@/app/api/companies/[companyId]/coordination/view/route"
import { PATCH as STATUS } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/status/route"

const companyId = "company-1"
const contact = (id: string) => ({ id, firstName: "Alex", lastName: id, email: `${id}@example.test`, legalName: null, isCompany: false, isActive: true, companyLinks: [{ companyId, role: "coordinator", isActive: true }] })
const contacts = [contact("old"), contact("new")]
const assignment = (id: string) => ({ id: `assignment-${id}`, contactId: id, role: "coordinator", isPrimary: true, createdAt: new Date(), contact: contact(id) })
function database() {
  let row = { id: "surgery-1", companyId, patientId: "patient", patient: { id: "patient", firstName: "Patient", lastName: "Test" }, doctor: null, institution: null, payer: null,
    cxStatus: "authorized", prepStatus: "preparing", surgeryDate: null as Date | null, surgeryTimeSpecified: null as boolean | null, materialShippingDate: null as Date | null, priority: "normal", archivedAt: null, createdAt: new Date(), updatedAt: new Date(), contactAssignments: [assignment("old")] }
  const db = {
    userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "membership" }), findMany: vi.fn().mockResolvedValue([]) },
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ firstName: "Actor", lastName: "Test", email: "actor@example.test" }) },
    contact: { findMany: vi.fn().mockResolvedValue(contacts) },
    contactCompanyLink: { findFirst: vi.fn(async ({ where }: { where: { companyId: string; contactId: string } }) => where.companyId === companyId && contacts.some(c => c.id === where.contactId) ? { contactId: where.contactId } : null) },
    surgery: {
      findFirst: vi.fn(async ({ where }: { where: { id?: string; OR?: Array<{ id?: string }>; companyId: string } }) => (where.id ?? where.OR?.[0]?.id) === row.id && where.companyId === companyId ? row : null),
      findMany: vi.fn(async ({ where, skip = 0, take = 50 }: { where: { companyId: string; contactAssignments?: { some: { contactId: string } } }; skip?: number; take?: number }) => {
        const target = where.contactAssignments?.some.contactId
        return (where.companyId === companyId && (!target || row.contactAssignments.some(a => a.contactId === target)) ? [row] : []).slice(skip, skip + take)
      }),
      updateMany: vi.fn(async ({ data }: { data: Partial<typeof row> }) => {
        row = { ...row, ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) }
        return { count: 1 }
      }),
    },
    surgeryContactAssignment: {
      findMany: vi.fn(async () => row.contactAssignments),
      deleteMany: vi.fn(async () => { row.contactAssignments = []; return { count: 1 } }),
      create: vi.fn(async ({ data }: { data: { contactId: string } }) => { const next = assignment(data.contactId); row.contactAssignments.push(next); return next }),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    internalNotification: { createMany: vi.fn() },
    $transaction: vi.fn(),
  }
  db.$transaction.mockImplementation(async callback => {
    const before = structuredClone(row)
    try { return await callback(db) } catch (error) { row = before; throw error }
  })
  Object.assign(state.prisma, db)
  return db
}

function actor(contactId = "old", role = "admin") {
  state.ctx = { companyId, actorUserId: "actor-1", role, canonicalRole: role, activeCompany: { id: companyId }, user: contact(contactId) } as unknown as ApiAuthContext
}

describe("coordination actual client → route → service → isolated transaction", () => {
  beforeEach(() => {
    actor()
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const request = new Request(`http://localhost${url}`, init)
      if (url.includes("/coordination/view")) return VIEW(request, { params: Promise.resolve({ companyId }) })
      if (url.endsWith("/status")) return STATUS(request, { params: Promise.resolve({ companyId, surgeryId: "surgery-1" }) })
      if (url.endsWith("/seguimiento")) {
        const data = validateSeguimientoCreateBody(await request.json(), { companyId })
        return Response.json({ data })
      }
      const surgeryId = decodeURIComponent(url.split("/").at(-1)!)
      const params = { params: Promise.resolve({ companyId, surgeryId }) }
      return init.method === "PATCH" ? PATCH(request, params) : GET(request, params)
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it("moves exact IDs between same-first-name personal queues and global, preserving precision and preparation", async () => {
    const db = database()
    expect((await fetchCoordinationView(companyId, { surface: "personal" })).surgeries).toHaveLength(1)
    await updateBackendSurgeryManagement(companyId, "surgery-1", { coordinatorContactId: "new", surgeryDate: "2099-10-07T03:00:00Z", surgeryTimeSpecified: false })
    expect((await fetchCoordinationView(companyId, { surface: "personal" })).surgeries).toHaveLength(0)
    actor("new")
    const personal = await fetchCoordinationView(companyId, { surface: "personal" })
    const global = await fetchCoordinationView(companyId, { surface: "global" })
    const direct = await fetchBackendSurgery(companyId, "surgery-1")
    expect(personal.surgeries).toEqual(global.surgeries)
    for (const rows of [personal.surgeries, global.surgeries, [direct]]) {
      expect(mapApiSurgeryListToSurgeries(rows)[0]).toMatchObject({ coordinadorContactId: "new", date: "2099-10-07", time: "", surgeryTimeSpecified: false, preparationState: "En preparación" })
    }
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ coordinatorAssignment: { previousContactIds: ["old"], contactId: "new" } }) }) }))
  })

  it("rejects foreign contacts, ineligible roles and unresolved identities without phantom assignments", async () => {
    const db = database()
    await expect(updateBackendSurgeryManagement(companyId, "surgery-1", { coordinatorContactId: "foreign" })).rejects.toMatchObject({ status: 400, code: "invalid_surgery_coordinator" })
    expect(db.surgery.updateMany).not.toHaveBeenCalled()
    actor("old", "operator")
    await expect(updateBackendSurgeryManagement(companyId, "surgery-1", { coordinatorContactId: "new" })).rejects.toMatchObject({ status: 403 })
    actor("unknown")
    const personal = await fetchCoordinationView(companyId, { surface: "personal" })
    expect(personal.context.personalResolution?.status).toBe("unresolved")
    expect(personal.surgeries).toEqual([])
  })

  it("rolls assignment back if audit fails", async () => {
    const db = database()
    db.auditEvent.create.mockRejectedValueOnce(new Error("Audit failed"))
    await expect(updateBackendSurgeryManagement(companyId, "surgery-1", { coordinatorContactId: "new" })).rejects.toThrow()
    expect(mapApiSurgeryListToSurgeries([await fetchBackendSurgery(companyId, "surgery-1")])[0].coordinadorContactId).toBe("old")
  })

  it("sends canonical note type and metadata through the real seguimiento validator", async () => {
    const note = await addBackendSurgeryNote(companyId, "surgery-1", { content: "Coordination note", noteType: "Coordinación", priority: "Alta", isUrgent: true })
    expect(note).toMatchObject({ entryType: "note", evidenceRef: { noteType: "coordinacion", priority: "alta", highlighted: true } })
  })

  it("uses canonical status truth without mutating preparation or inventing transit", async () => {
    database()
    const saved = await updateBackendSurgeryState(companyId, "surgery-1", "Programada")
    expect(saved).toMatchObject({ cxStatus: "scheduled", prepStatus: "preparing" })
    const global = await fetchCoordinationView(companyId, { surface: "global" })
    const personal = await fetchCoordinationView(companyId, { surface: "personal" })
    expect(global.surgeries).toEqual(personal.surgeries)
    expect(mapApiSurgeryListToSurgeries(global.surgeries)[0]).toMatchObject({ state: "Pendiente", preparationState: "En preparación" })
  })
})
