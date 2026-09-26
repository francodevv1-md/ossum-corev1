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
    prismaMock.__tx.contactCompanyLink.findUnique.mockReset()
    prismaMock.$transaction.mockClear()

    getApiAuthContext.mockResolvedValue(ADMIN_AUTH)
    createSurgery.mockResolvedValue({ id: "surgery-1", visibleNumber: "CX-0001" })
  })

  it("forwards the four explicit contact ids without resolving snapshots", async () => {
    const response = await POST(
      new Request("http://localhost/api/companies/company-1/surgeries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: "patient-1",
          doctorId: "doctor-1",
          institutionId: "institution-1",
          payerContactId: "payer-1",
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
        patientId: "patient-1",
        doctorId: "doctor-1",
        institutionId: "institution-1",
        payerContactId: "payer-1",
      })
    )
    expect(prismaMock.__tx.contact.create).not.toHaveBeenCalled()
  })

  it("rejects contact snapshots when a required real id is absent", async () => {
    const response = await POST(
      new Request("http://localhost/api/companies/company-1/surgeries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientContact: { nombre: "Paciente sin ID" },
          doctorId: "doctor-1",
          institutionId: "institution-1",
          payerContactId: "payer-1",
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1" }) }
    )

    const body = await bodyAsJson(response)

    expect(response.status).toBe(400)
    expect(body.error?.code).toBe("missing_patient_contact_id")
    expect(body.error?.message).toContain("patient contact ID")
    expect(createSurgery).not.toHaveBeenCalled()
  })

  it("parses materialShippingDate and coordinatorContactId before forwarding to createSurgery", async () => {
    const response = await POST(
      new Request("http://localhost/api/companies/company-1/surgeries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: "patient-1",
          doctorId: "doctor-1",
          institutionId: "institution-1",
          payerContactId: "payer-1",
          coordinatorContactId: "coordinator-1",
          materialShippingDate: "2026-07-08",
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1" }) }
    )

    expect(response.status).toBe(201)
    expect(createSurgery).toHaveBeenCalledTimes(1)
    const forwarded = createSurgery.mock.calls[0]?.[2] as Record<string, unknown>
    expect(forwarded.coordinatorContactId).toBe("coordinator-1")
    expect(forwarded.materialShippingDate).toBeInstanceOf(Date)
    expect((forwarded.materialShippingDate as Date).toISOString().slice(0, 10)).toBe("2026-07-08")
  })

  it("rejects materialShippingDate with an invalid format", async () => {
    const response = await POST(
      new Request("http://localhost/api/companies/company-1/surgeries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: "patient-1",
          doctorId: "doctor-1",
          institutionId: "institution-1",
          payerContactId: "payer-1",
          materialShippingDate: "08/07/2026",
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1" }) }
    )

    const body = await bodyAsJson(response)

    expect(response.status).toBe(400)
    expect(body.error?.code).toBe("invalid_date_field")
    expect(body.error?.message).toContain("materialShippingDate")
    expect(createSurgery).not.toHaveBeenCalled()
  })
})
