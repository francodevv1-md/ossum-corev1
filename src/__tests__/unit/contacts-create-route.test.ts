import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { GET, POST } from "@/app/api/companies/[companyId]/contacts/route"
import { GET as PREVIEW } from "@/app/api/companies/[companyId]/contacts/code-preview/route"
import { PATCH } from "@/app/api/companies/[companyId]/contacts/[contactId]/route"
import { forbidden, unauthorized } from "@/lib/api/errors"
import { createContactApi, getContactCodePreviewApi, listContacts } from "@/lib/api/contacts"
import { mapApiContactToContacto, mapContactoToApiPayload } from "@/lib/api/contact-adapter"
import { contactResponseSchema } from "@/lib/validators/contact"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    $transaction: vi.fn(),
    contactCompanyLink: { findMany: vi.fn(), findUnique: vi.fn() },
    auditEvent: { create: vi.fn() },
  },
}))
vi.mock("@/lib/prisma", () => ({ default: mocks.db }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: async () => "test-token" }))

type Row = Record<string, unknown> & { id: string; companyId: string; contactId: string; code: string; contact: Record<string, unknown> }
let rows: Row[]
let audits: Record<string, unknown>[]
let failAudit: boolean
let sequence: number
const context = (companyId = "company-A") => ({ params: Promise.resolve({ companyId }) })
const request = (body: unknown) => new Request("http://test/api/companies/company-A/contacts", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
})
const readContact = async (response: Response) => z.object({ data: contactResponseSchema }).parse(await response.json()).data
afterEach(() => vi.unstubAllGlobals())

beforeEach(() => {
  vi.clearAllMocks()
  rows = []
  audits = []
  failAudit = false
  sequence = 0
  mocks.auth.mockImplementation(async (_request, companyId) => ({ companyId, actorUserId: "actor-1", canonicalRole: "admin", role: "admin" }))
  const findLink = (records: Row[], where: { contactId_companyId: { companyId: string; contactId: string } }) => records.find(row =>
    row.companyId === where.contactId_companyId.companyId && row.contactId === where.contactId_companyId.contactId) ?? null
  mocks.db.contactCompanyLink.findUnique.mockImplementation(async ({ where }) => findLink(rows, where))
  mocks.db.contactCompanyLink.findMany.mockImplementation(async ({ where }) => rows.filter(row => row.companyId === where.companyId))
  mocks.db.auditEvent.create.mockImplementation(async ({ data }) => {
    if (failAudit) throw new Error("Synthetic audit failure")
    audits.push(data)
    return data
  })
  // Transaction double: staged writes commit only after the real service callback returns.
  // This verifies callback boundaries; it is not PostgreSQL integration certification.
  mocks.db.$transaction.mockImplementation(async (callback) => {
    const staged = structuredClone(rows)
    const stagedAudits = structuredClone(audits)
    let contact: Record<string, unknown>
    const tx = {
      contact: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          contact = { id: `contact-${++sequence}`, createdAt: "2026-10-07T00:00:00.000Z", updatedAt: "2026-10-07T00:00:00.000Z", addresses: [], groupMemberships: [], ...data }
          return contact
        },
      },
      contactCompanyLink: {
        findMany: async ({ where }: { where: { companyId: string } }) => staged.filter(row => row.companyId === where.companyId),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          if (staged.some(row => row.companyId === data.companyId && row.code === data.code)) throw { code: "P2002", meta: { target: ["companyId", "code"] } }
          const row = { ...data, id: `link-${sequence}`, contact } as Row
          staged.push(row)
          return row
        },
        findUnique: async ({ where }: { where: { contactId_companyId: { companyId: string; contactId: string } } }) => findLink(staged, where),
      },
      contactGroup: {
        findMany: async () => [],
        upsert: async ({ create }: { create: { companyId: string; slug: string } }) => ({ id: `${create.companyId}:${create.slug}`, slug: create.slug }),
      },
      contactGroupMembership: {
        deleteMany: async () => {},
        createMany: async ({ data }: { data: { groupId: string }[] }) => {
          contact.groupMemberships = data.map(item => ({ group: { slug: item.groupId.split(":")[1] } }))
        },
      },
      contactAddress: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          contact.addresses = [data]
          return data
        },
      },
      auditEvent: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          if (failAudit) throw new Error("Synthetic audit failure")
          stagedAudits.push(data)
          return data
        }),
      },
    }
    const result = await callback(tx)
    rows = staged
    audits = stagedAudits
    return result
  })
})

describe("contact creation route and real service contracts", () => {
  it("scopes authenticated advisory preview, leaves GET arrays intact and does not reserve codes", async () => {
    await POST(request({ firstName: "First" }), context())
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => PREVIEW(new Request(new URL(input, "http://test"), init), context()))
    expect(await getContactCodePreviewApi("company-A")).toEqual({ lastCode: "C-0001", nextCode: "C-0002" })
    const other = await PREVIEW(new Request("http://test"), context("company-B"))
    expect(await other.json()).toEqual({ data: { lastCode: null, nextCode: "C-0001" } })
    expect(other.headers.get("Cache-Control")).toBe("no-store")
    expect(rows).toHaveLength(1)
    const next = await readContact(await POST(request({ firstName: "Second" }), context()))
    expect(next.code).toBe("C-0002")
    const listing = await GET(new Request("http://test"), context())
    expect((await listing.json()).data).toHaveLength(2)
  })
  it.each([
    unauthorized("Authentication required", "auth_required"),
    forbidden("Company access denied", "company_access_denied"),
  ])("rejects unauthenticated/foreign company preview before querying codes (%s)", async (error) => {
    mocks.auth.mockRejectedValueOnce(error)
    expect((await PREVIEW(new Request("http://test"), context("foreign"))).status).toBe(error.status)
    expect(mocks.db.contactCompanyLink.findMany).not.toHaveBeenCalled()
  })
  it("round-trips form fields through the actual client, POST/service, GET and frontend adapter", async () => {
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://test")
      const companyId = decodeURIComponent(url.pathname.split("/")[3])
      const req = new Request(url, init)
      return req.method === "POST" ? POST(req, context(companyId)) : GET(req, context(companyId))
    })
    const result = await createContactApi("company-A", mapContactoToApiPayload({
      tipoPersona: "juridica", nombre: "Hospital Norte", cuit: "30-12345678-9",
      roles: ["cliente", "proveedor"], groups: ["instituciones"], email: "hospital@example.test",
      domicilio: "Norte 42", localidad: "Resistencia", datosInstitucion: { observacionEntrega: "Recepción" },
      datosClientePagador: { esPagador: true, condicionIva: "Responsable Inscripto", descuentoHabitual: 7.5 },
    }))
    const listed = await listContacts("company-A")
    expect(listed).toHaveLength(1)
    expect(listed[0].id).toBe(result.id)
    expect(mapApiContactToContacto(listed[0])).toMatchObject({
      nombre: "Hospital Norte", tipoPersona: "juridica", codigoContacto: "C-0001", cuit: "30-12345678-9",
      roles: ["cliente", "proveedor"], groups: ["instituciones"], email: "hospital@example.test",
      domicilio: "Norte 42", localidad: "Resistencia", datosInstitucion: { observacionEntrega: "Recepción" },
      datosClientePagador: { esPagador: true, condicionIva: "Responsable Inscripto", descuentoHabitual: 7.5 },
    })
    expect(audits).toHaveLength(1)
  })

  it.each([
    { firstName: "Ana", lastName: "Pérez", roles: ["cliente"], groupSlugs: ["pacientes"] },
    { legalName: "Hospital Norte", isCompany: true, roles: ["cliente", "proveedor"], groupSlugs: ["instituciones"], mainAddress: { street: "Norte 42", city: "Resistencia" }, isPayer: true, usualDiscount: 7.5 },
  ])("creates one linked canonical contact and audit for %j", async (body) => {
    const response = await POST(request(body), context())
    expect(response.status).toBe(201)
    const data = await readContact(response)
    expect(data).toMatchObject({ code: "C-0001", roles: body.roles, groupSlugs: body.groupSlugs, linkIsActive: true })
    expect(rows).toHaveLength(1)
    expect(rows[0].companyId).toBe("company-A")
    expect(audits).toEqual([expect.objectContaining({ companyId: "company-A", userId: "actor-1", entityId: data.id, action: "created" })])
    expect(mocks.db.auditEvent.create).not.toHaveBeenCalled()
  })

  it("rolls back a creation if its audit fails instead of reporting a false failed save", async () => {
    failAudit = true
    const response = await POST(request({ firstName: "Ana" }), context())
    expect(response.status).toBe(500)
    expect(rows).toHaveLength(0)
    expect(audits).toHaveLength(0)
    failAudit = false
    const retry = await POST(request({ firstName: "Ana" }), context())
    expect(retry.status).toBe(201)
    expect(rows).toHaveLength(1)
  })

  it.each([{}, { firstName: "Ana", companyId: "company-B" }, { firstName: "Ana", isCompany: "false" }, { firstName: "Ana", phone: "1".repeat(81) }])("rejects invalid payloads before persistence (%j)", async (body) => {
    const response = await POST(request(body), context())
    expect(response.status).toBe(400)
    expect(mocks.db.$transaction).not.toHaveBeenCalled()
  })

  it("rejects malformed JSON and denied company membership without persistence", async () => {
    expect((await POST(new Request("http://test", { method: "POST", body: "{" }), context())).status).toBe(400)
    mocks.auth.mockRejectedValueOnce(forbidden("Company access denied", "company_access_denied"))
    expect((await POST(request({ firstName: "Ana" }), context("company-B"))).status).toBe(403)
    expect(mocks.db.$transaction).not.toHaveBeenCalled()
  })

  it("retains mutation role enforcement", async () => {
    mocks.auth.mockResolvedValueOnce({ companyId: "company-A", actorUserId: "actor-1", canonicalRole: "readonly", role: "readonly" })
    expect((await POST(request({ firstName: "Ana" }), context())).status).toBe(403)
    expect(mocks.db.$transaction).not.toHaveBeenCalled()
  })

  it("scopes list and code allocation by company and rejects editing another company's contact", async () => {
    const first = await readContact(await POST(request({ firstName: "Ana" }), context()))
    const second = await readContact(await POST(request({ firstName: "Bea" }), context("company-B")))
    expect(first.code).toBe("C-0001")
    expect(second.code).toBe("C-0001")
    const list = await GET(new Request("http://test?includeInactive=true"), context("company-B"))
    const listed = z.object({ data: contactResponseSchema.array() }).parse(await list.json()).data
    expect(listed.map(row => row.id)).toEqual([second.id])
    const patch = await PATCH(new Request("http://test", { method: "PATCH", body: JSON.stringify({ isActive: false }) }), {
      params: Promise.resolve({ companyId: "company-B", contactId: first.id }),
    })
    expect(patch.status).toBe(404)
  })

  it("rejects duplicate explicit codes without retaining an orphan contact or audit", async () => {
    expect((await POST(request({ firstName: "Ana", code: "C-0042" }), context())).status).toBe(201)
    expect((await POST(request({ firstName: "Bea", code: "C-0042" }), context())).status).toBe(409)
    expect(rows).toHaveLength(1)
    expect(audits).toHaveLength(1)
  })
})
