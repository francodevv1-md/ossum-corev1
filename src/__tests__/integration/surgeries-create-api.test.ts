import { beforeEach, describe, expect, it, vi } from "vitest"

const { getApiAuthContext } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
}))

const prismaMock = vi.hoisted(() => {
  const tx = {
    contact: {
      create: vi.fn(),
    },
    contactCompanyLink: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    contactGroup: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    },
    contactGroupMembership: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    contactAddress: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
  }

  return {
    contactCompanyLink: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    __tx: tx,
  }
})

const { createSurgery, listSurgeriesByCompany } = vi.hoisted(() => ({
  createSurgery: vi.fn(),
  listSurgeriesByCompany: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext,
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/services/surgery.service", () => ({
  createSurgery,
  listSurgeriesByCompany,
}))

import { POST } from "@/app/api/companies/[companyId]/surgeries/route"

const ADMIN_AUTH = {
  actorUserId: "user-1",
  supabaseAuthId: "supabase-user-1",
  companyId: "company-1",
  role: "admin",
  source: "dev-header" as const,
}

async function bodyAsJson(response: Response) {
  return JSON.parse(await response.text()) as {
    data?: unknown
    error?: { code?: string; message?: string }
  }
}

describe("POST /api/companies/[companyId]/surgeries", () => {
  beforeEach(() => {
    getApiAuthContext.mockReset()
    createSurgery.mockReset()
    listSurgeriesByCompany.mockReset()
    prismaMock.contactCompanyLink.findUnique.mockReset()
    prismaMock.contactCompanyLink.findMany.mockReset()
    prismaMock.__tx.contact.create.mockReset()
    prismaMock.__tx.contactCompanyLink.create.mockReset()
    prismaMock.$transaction.mockClear()

    getApiAuthContext.mockResolvedValue(ADMIN_AUTH)
    createSurgery.mockResolvedValue({ id: "surgery-1", visibleNumber: "CX-0001" })
  })

  it("resolves frontend contact snapshots before creating the surgery", async () => {
    prismaMock.contactCompanyLink.findUnique.mockImplementation(async ({ where }: { where: { contactId_companyId: { contactId: string } } }) => {
      const contactId = where.contactId_companyId.contactId
      if (contactId === "db-patient-9") {
        return { id: "link-patient", isActive: true }
      }
      return null
    })

    prismaMock.contactCompanyLink.findMany.mockResolvedValue([
      {
        companyId: "company-1",
        contactId: "db-patient-9",
        role: "patient",
        isActive: true,
        contact: {
          id: "db-patient-9",
          firstName: "Paciente",
          lastName: "Uno",
          legalName: null,
          email: null,
          phone: null,
          documentType: "DNI",
          documentNumber: "30123456",
          contactType: "patient",
        },
      },
    ])

    prismaMock.__tx.contact.create.mockResolvedValue({ id: "db-doctor-new" })
    prismaMock.__tx.contactCompanyLink.create.mockResolvedValue({ id: "link-doctor" })
    prismaMock.__tx.contactCompanyLink.findUnique.mockResolvedValue({
      id: "link-doctor",
      contactId: "db-doctor-new",
      companyId: "company-1",
      code: "C-01",
      role: "doctor",
      roles: ["proveedor"],
      isActive: true,
      isPayer: false,
      vatCondition: null,
      paymentTerms: null,
      defaultPriceList: null,
      usualDiscount: null,
      doctorLicense: null,
      specialty: null,
      deliveryNotes: null,
      contact: {
        id: "db-doctor-new",
        firstName: "Dr",
        lastName: "House",
        legalName: null,
        tradeName: null,
        notes: null,
        isCompany: false,
        email: null,
        phone: null,
        documentType: null,
        documentNumber: null,
        contactType: null,
        addresses: [],
        groupMemberships: [],
      },
    })

    const response = await POST(
      new Request("http://localhost/api/companies/company-1/surgeries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibleNumber: "CX-0001",
          patientId: "frontend-patient-1",
          patientContact: {
            id: "frontend-patient-1",
            nombre: "Paciente Uno",
            dni: "30.123.456",
            tipoPersona: "fisica",
            groups: ["pacientes"],
          },
          doctorId: "frontend-doctor-1",
          doctorContact: {
            id: "frontend-doctor-1",
            nombre: "Dr House",
            tipoPersona: "fisica",
            groups: ["medicos"],
          },
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1" }) }
    )

    expect(response.status).toBe(201)
    expect(createSurgery).toHaveBeenCalledTimes(1)
    expect(createSurgery.mock.calls[0]?.[0]).toBe(prismaMock)
    expect(createSurgery.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ companyId: "company-1", actorUserId: "user-1" })
    )
    expect(createSurgery.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        patientId: "db-patient-9",
        doctorId: "db-doctor-new",
      })
    )
    expect(createSurgery.mock.calls[0]?.[2]).not.toHaveProperty("visibleNumber")
    expect(prismaMock.__tx.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Dr",
          lastName: "House",
        }),
      })
    )
    expect(prismaMock.__tx.contactCompanyLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          role: "doctor",
        }),
      })
    )
  })

  it("returns a clear 400 when a required frontend contact cannot be resolved", async () => {
    prismaMock.contactCompanyLink.findUnique.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost/api/companies/company-1/surgeries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibleNumber: "CX-0002",
          patientId: "frontend-patient-missing",
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1" }) }
    )

    const body = await bodyAsJson(response)

    expect(response.status).toBe(400)
    expect(body.error?.code).toBe("surgery_patient_contact_resolution_failed")
    expect(body.error?.message).toContain("Patient contact")
    expect(createSurgery).not.toHaveBeenCalled()
  })
})
