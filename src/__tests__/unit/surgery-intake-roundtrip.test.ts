import { describe, expect, it, vi } from "vitest"
import { createSurgery, listSurgeriesByCompany } from "@/lib/services/surgery.service"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import { encodeReschedulingDate } from "@/lib/surgery/rescheduling"
import { validateCreateSurgeryInput, type CreateSurgeryInput } from "@/lib/validators/surgery.validator"
import { resolveCompanyContactReference } from "@/lib/services/contact.service"

function database() {
  let saved: Record<string, unknown> | undefined
  const roles = new Map([["patient-1", "patient"], ["doctor-1", "doctor"], ["coordinator-1", "coordinator"], ["salesperson-1", "salesperson"], ["instrumentator-1", "instrumentator"]])
  const contact = (id: string) => ({ id, firstName: id, lastName: null, legalName: null, email: null, isActive: true, isCompany: false, companyLinks: [{ companyId: "company-1", role: roles.get(id), isActive: true }] })
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ maxNumber: "0" }]),
    userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
    contactCompanyLink: {
      findMany: vi.fn(async ({ where }: { where: { contactId: { in: string[] } } }) => where.contactId.in.filter(id => roles.has(id)).map(contactId => ({ contactId }))),
      findFirst: vi.fn(async ({ where }: { where: { contactId: string; role?: string } }) => roles.has(where.contactId) && (!where.role || roles.get(where.contactId) === where.role) ? { contactId: where.contactId, contact: contact(where.contactId) } : null),
    },
    surgery: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const nested = data.contactAssignments as { create: Array<{ contactId: string; role: string }> } | undefined
        saved = { ...data, id: "surgery-1", createdAt: new Date(), updatedAt: new Date(), patient: contact(String(data.patientId)), doctor: data.doctorId ? contact(String(data.doctorId)) : null,
          contactAssignments: (nested?.create ?? []).map((assignment, index) => ({ ...assignment, id: `assignment-${index}`, isPrimary: false, createdAt: new Date(), contact: contact(assignment.contactId) })) }
        return saved
      }),
      findMany: vi.fn(async () => saved ? [saved] : []),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async callback => callback(prisma))
  return prisma
}

const context = { companyId: "company-1", actorUserId: "user-1" }

describe("surgery intake persistence and cold read", () => {
  it.each(["", "00:00", "10:35", "23:59"])("round-trips Argentine day/time '%s', shipping, notes and real IDs", async time => {
    const prisma = database()
    await createSurgery(prisma as never, context, {
      patientId: "patient-1", doctorId: "doctor-1", notes: "  Clinical note\nsecond line  ",
      surgeryDate: new Date(encodeReschedulingDate("2026-10-07", time)), surgeryTimeSpecified: Boolean(time),
      materialShippingDate: new Date("2026-10-06T00:00:00Z"),
    } as CreateSurgeryInput)
    const read = await listSurgeriesByCompany(prisma as never, "company-1")
    const [ui] = mapApiSurgeryListToSurgeries(JSON.parse(JSON.stringify(read)))
    expect(ui).toMatchObject({ date: "2026-10-07", time, surgeryTimeSpecified: Boolean(time), fechaEnvioMaterial: "2026-10-06", notes: "  Clinical note\nsecond line  ", patientContactId: "patient-1", surgeonContactId: "doctor-1" })
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "surgery.created" }) }))
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" })
  })

  it("persists and projects all three assignment roles", async () => {
    const prisma = database()
    await createSurgery(prisma as never, context, { patientId: "patient-1", coordinatorContactId: "coordinator-1", salespersonContactId: "salesperson-1", instrumentatorContactId: "instrumentator-1" } as CreateSurgeryInput)
    const [ui] = mapApiSurgeryListToSurgeries(JSON.parse(JSON.stringify(await listSurgeriesByCompany(prisma as never, "company-1"))))
    expect(ui).toMatchObject({ coordinadorContactId: "coordinator-1", vendedorContactId: "salesperson-1", instrumentadorContactId: "instrumentator-1", vendedor: "salesperson-1", instrumentador: "instrumentator-1" })
    expect(prisma.surgery.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ contactAssignments: { create: [
      { role: "coordinator", contactId: "coordinator-1" }, { role: "salesperson", contactId: "salesperson-1" }, { role: "instrumentator", contactId: "instrumentator-1" },
    ] } }) }))
    expect(prisma.surgery.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ contactAssignments: expect.objectContaining({ where: { OR: [
      { role: "coordinator", contact: { isActive: true, isCompany: false, companyLinks: { some: { companyId: "company-1", isActive: true, role: "coordinator" } } } },
      { role: { in: ["salesperson", "instrumentator"] }, contact: { isActive: true, companyLinks: { some: { companyId: "company-1", isActive: true } } } },
    ] } }) }) }))
  })

  it("round-trips an unscheduled surgery with a shipping day", async () => {
    const prisma = database()
    await createSurgery(prisma as never, context, { patientId: "patient-1", surgeryDate: null, surgeryTimeSpecified: null, materialShippingDate: new Date("2026-10-06T00:00:00Z") })
    const [ui] = mapApiSurgeryListToSurgeries(JSON.parse(JSON.stringify(await listSurgeriesByCompany(prisma as never, "company-1"))))
    expect(ui).toMatchObject({ date: "", time: "", surgeryTimeSpecified: null, fechaEnvioMaterial: "2026-10-06" })
  })

  it("does not resurrect notes or IDs from existing UI state after authoritative nulls", () => {
    const [old] = mapApiSurgeryListToSurgeries([{ id: "surgery-1", patientId: "patient-1", doctorId: "doctor-1", notes: "old", salespersonContactId: "seller", instrumentatorContactId: "instrumentator" }])
    const [ui] = mapApiSurgeryListToSurgeries([{ id: "surgery-1", patientId: null, doctorId: null, notes: null, salespersonContactId: null, instrumentatorContactId: null }], [old])
    expect(ui.patientContactId).toBeUndefined()
    expect(ui.surgeonContactId).toBeUndefined()
    expect(ui.notes).toBeUndefined()
    expect(ui.vendedorContactId).toBeUndefined()
    expect(ui.instrumentadorContactId).toBeUndefined()
  })

  it("preserves omitted intake fields in scalar PATCH projections", () => {
    const [old] = mapApiSurgeryListToSurgeries([{ id: "surgery-1", patientId: "patient-1", doctorId: "doctor-1", notes: "Clinical note", salespersonContactId: "seller", salespersonName: "Seller", instrumentatorContactId: "instrumentator", instrumentatorName: "Instrumentator", surgeryDate: "2026-10-07T13:00:00Z", surgeryTimeSpecified: true }])
    const [ui] = mapApiSurgeryListToSurgeries([{ id: "surgery-1", surgeryDate: "2026-10-08T14:00:00Z" }], [old])
    expect(ui).toMatchObject({ patientContactId: "patient-1", surgeonContactId: "doctor-1", notes: "Clinical note", vendedorContactId: "seller", vendedor: "Seller", instrumentadorContactId: "instrumentator", instrumentador: "Instrumentator", date: "2026-10-08", time: "11:00", surgeryTimeSpecified: true })
    const [cleared] = mapApiSurgeryListToSurgeries([{ id: "surgery-1", salespersonContactId: null, salespersonName: null, instrumentatorContactId: null, instrumentatorName: null, surgeryTimeSpecified: null }], [old])
    expect(cleared.vendedor).toBeUndefined()
    expect(cleared.instrumentador).toBeUndefined()
    expect(cleared.surgeryTimeSpecified).toBeNull()
    expect(cleared.time).toBe("")
    const [unrelatedPatch] = mapApiSurgeryListToSurgeries([{ id: "surgery-1", notes: "Updated" }], [{ ...old, surgeryTimeSpecified: undefined }])
    expect(unrelatedPatch.date).toBe(old.date)
    expect(unrelatedPatch.time).toBe(old.time)
  })

  it("fails selected IDs without creating snapshot replacements", async () => {
    const prisma = { contactCompanyLink: { findUnique: vi.fn().mockResolvedValue(null) }, contact: { create: vi.fn() }, $transaction: vi.fn() }
    await expect(resolveCompanyContactReference(prisma as never, { companyId: "company-1", contactId: "wrong-id", role: "patient", required: true, fieldLabel: "Patient" })).rejects.toMatchObject({ code: "surgery_patient_contact_resolution_failed" })
    expect(prisma.contact.create).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it.each(["coordinatorContactId", "salespersonContactId", "instrumentatorContactId"])("rejects out-of-company %s before writing", async field => {
    const prisma = database()
    await expect(createSurgery(prisma as never, context, { patientId: "patient-1", [field]: "other-company-contact" })).rejects.toThrow("Contacts not linked")
    expect(prisma.surgery.create).not.toHaveBeenCalled()
    expect(prisma.auditEvent.create).not.toHaveBeenCalled()
  })

  it("does not persist a coordinator that the existing read eligibility would hide", async () => {
    const prisma = database()
    await expect(createSurgery(prisma as never, context, { patientId: "patient-1", coordinatorContactId: "salesperson-1" })).rejects.toMatchObject({ code: "invalid_surgery_coordinator" })
    expect(prisma.surgery.create).not.toHaveBeenCalled()
    expect(prisma.contactCompanyLink.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", contactId: "salesperson-1", isActive: true, role: "coordinator", contact: { isActive: true, isCompany: false } } }))
  })

  it.each([
    { surgeryTimeSpecified: true },
    { surgeryTimeSpecified: false, surgeryDate: null },
    { surgeryTimeSpecified: "true", surgeryDate: new Date("2026-10-07T03:00:00Z") },
    { surgeryTimeSpecified: false, surgeryDate: new Date("2026-10-07T12:00:00Z") },
    { materialShippingDate: new Date("invalid") },
  ])("rejects invalid precision/date combinations: %j", fields => {
    expect(() => validateCreateSurgeryInput({ patientId: "patient-1", ...fields } as CreateSurgeryInput)).toThrow()
  })
})
