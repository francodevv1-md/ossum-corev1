import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest"

import { createContactApi, listContacts, updateContactApi } from "@/lib/api/contacts"
import { mapContactoToApiPayload } from "@/lib/api/contact-adapter"
import { ApiClientError } from "@/lib/api/client"
import { contactCreateSchema, type ContactCreateInput, type ContactUpdateInput } from "@/lib/validators/contact"

vi.mock("@/lib/auth/client", () => ({ getAccessToken: async () => "test-token" }))

const contact = {
  id: "contact-1", code: "C-0001", isCompany: false, firstName: "Ana", linkIsActive: true,
  roles: ["cliente"], groupSlugs: ["pacientes"], usualDiscount: null,
}

describe("contact HTTP client contract", () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: contact }), { status: 201 }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("uses the requested company and authenticated canonical response", async () => {
    const result = await createContactApi("company/A", { firstName: "Ana", roles: ["cliente"] })
    expect(result).toEqual(contact)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/companies/company%2FA/contacts")
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer test-token")
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("companyId")
  })

  it.each([
    { ...contact, id: undefined }, { ...contact, code: undefined },
    { ...contact, linkIsActive: "true" }, { ...contact, roles: ["doctor"] },
    { ...contact, usualDiscount: "10" },
  ])("rejects a malformed successful response instead of manufacturing a contact (%j)", async (data) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data }), { status: 201 }))
    await expect(createContactApi("company-1", { firstName: "Ana" })).rejects.toMatchObject({
      code: "invalid_contact_response", status: 502,
    })
  })

  it("validates list responses as arrays of scoped contacts", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [contact] })))
    await expect(listContacts("company-1", { includeInactive: true, take: 500 })).resolves.toEqual([contact])
    expect(fetchMock.mock.calls[0][0]).toContain("includeInactive=true&take=500")
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: {} })))
    await expect(listContacts("company-1")).rejects.toBeInstanceOf(ApiClientError)
  })

  it("preserves API rejection codes and PATCH targets", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "contact_not_found", message: "Not found" } }), { status: 404 }))
    await expect(updateContactApi("company-1", "contact/2", { isActive: false })).rejects.toMatchObject({ status: 404, code: "contact_not_found" })
    expect(fetchMock.mock.calls[0][0]).toBe("/api/companies/company-1/contacts/contact%2F2")
  })

  it("types create and update mappings separately and omits immutable codes from updates", () => {
    expectTypeOf(mapContactoToApiPayload({})).toEqualTypeOf<ContactCreateInput>()
    const update = mapContactoToApiPayload({ codigoContacto: "C-0001", nombre: "Ana" }, "update")
    expectTypeOf(update).toEqualTypeOf<ContactUpdateInput>()
    expect(update).not.toHaveProperty("codigo")
    expect(update).not.toHaveProperty("code")
    expect(contactCreateSchema.safeParse(mapContactoToApiPayload({ nombre: "  Ana   Pérez  " })).success).toBe(true)
  })
})
