import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  // Load runtime DB credentials before src/lib/prisma.ts is imported.
  // Vitest does not load .env files by default; Prisma CLI does.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv")
  dotenv.config({ path: ".env.local" })
  dotenv.config({ path: ".env" })
})

const { getApiAuthContext } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext,
}))

import prisma from "@/lib/prisma"
import { GET as listConsumos, POST as createConsumo } from "@/app/api/companies/[companyId]/consumos/route"
import { GET as getConsumo } from "@/app/api/companies/[companyId]/consumos/[consumoId]/route"
import { POST as emitirConsumo } from "@/app/api/companies/[companyId]/consumos/[consumoId]/emitir/route"
import { POST as validateConsumo } from "@/app/api/companies/[companyId]/consumos/[consumoId]/validate/route"

const PREFIX = `it-consumo-${Date.now()}`
const ORG_ID = `${PREFIX}-org`
const COMPANY_ID = `${PREFIX}-company`
const USER_ID = `${PREFIX}-user`
const PATIENT_ID = `${PREFIX}-patient`
const SURGERY_ID = `${PREFIX}-surgery`
let remitoId: string
let remitoItemId: string

const ADMIN_AUTH = {
  actorUserId: USER_ID,
  supabaseAuthId: `${PREFIX}-supabase`,
  companyId: COMPANY_ID,
  role: "admin",
  source: "dev-header" as const,
}

type ApiResponseBody<T = unknown> = {
  data?: T
  error?: { code?: string; message?: string }
}

async function bodyAsJson<T = unknown>(response: Response): Promise<ApiResponseBody<T>> {
  return JSON.parse(await response.text()) as ApiResponseBody<T>
}

function routeParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) } as never
}

async function cleanupBase() {
  await prisma.devolucionItem.deleteMany({ where: { devolucion: { companyId: COMPANY_ID } } })
  await prisma.devolucion.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.consumoItem.deleteMany({ where: { consumo: { companyId: COMPANY_ID } } })
  await prisma.consumo.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.remitoItem.deleteMany({ where: { remito: { companyId: COMPANY_ID } } })
  await prisma.remito.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.auditEvent.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.surgery.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.contactCompanyLink.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.contact.deleteMany({ where: { id: { startsWith: PREFIX } } })
  await prisma.userCompanyAccess.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.user.deleteMany({ where: { id: USER_ID } })
  await prisma.company.deleteMany({ where: { id: COMPANY_ID } })
  await prisma.organization.deleteMany({ where: { id: ORG_ID } })
}

async function seedBase() {
  await prisma.organization.create({ data: { id: ORG_ID, name: "Integration Test Org", slug: `${PREFIX}-org` } })
  await prisma.company.create({ data: { id: COMPANY_ID, organizationId: ORG_ID, name: "Integration Test Company" } })
  await prisma.user.create({
    data: {
      id: USER_ID,
      email: `${PREFIX}@ossum.test`,
      firstName: "Integration",
      lastName: "Tester",
      supabaseAuthId: `${PREFIX}-supabase`,
    },
  })
  await prisma.userCompanyAccess.create({ data: { userId: USER_ID, companyId: COMPANY_ID, role: "admin" } })
  await prisma.contact.create({ data: { id: PATIENT_ID, firstName: "Paciente", lastName: "Consumo" } })
  await prisma.contactCompanyLink.create({ data: { contactId: PATIENT_ID, companyId: COMPANY_ID, role: "patient" } })
  await prisma.surgery.create({
    data: {
      id: SURGERY_ID,
      companyId: COMPANY_ID,
      patientId: PATIENT_ID,
      visibleNumber: `${PREFIX}-CX`,
      cxStatus: "pending",
    },
  })
  const remito = await prisma.remito.create({
    data: {
      companyId: COMPANY_ID,
      surgeryId: SURGERY_ID,
      origin: "manual",
       state: "Entregado",
      items: {
        create: [{ sku: "SKU-CONS-1", description: "Implante consumo", quantity: "3", unit: "unidad" }],
      },
    },
    include: { items: true },
  })
  remitoId = remito.id
  remitoItemId = remito.items[0]!.id
}

describe("Consumo API integration (Supabase DEV DB)", () => {
  beforeAll(async () => {
    await cleanupBase()
    await seedBase()
  })

  afterAll(async () => {
    await cleanupBase()
    await prisma.$disconnect()
  })

  beforeEach(() => {
    getApiAuthContext.mockReset()
    getApiAuthContext.mockResolvedValue(ADMIN_AUTH)
  })

  it("creates, lists, gets, emits to Pendiente and validates a consumo", async () => {
    const createResponse = await createConsumo(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/consumos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgeryId: SURGERY_ID,
          remitoId,
          items: [
            {
              remitoItemId,
              sku: "SKU-CONS-1",
              description: "Implante consumo",
              requestedQuantity: 3,
              consumedQuantity: 2,
              unit: "unidad",
            },
          ],
        }),
      }),
      routeParams({ companyId: COMPANY_ID })
    )
    const created = await bodyAsJson<{ id: string; state: string; items: unknown[] }>(createResponse)
    expect(createResponse.status).toBe(201)
    expect(created.data?.state).toBe("Borrador")
    expect(created.data?.items).toHaveLength(1)

    const consumoId = created.data!.id

    const listResponse = await listConsumos(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/consumos?remitoId=${remitoId}`),
      routeParams({ companyId: COMPANY_ID })
    )
    const listed = await bodyAsJson<Array<{ id: string }>>(listResponse)
    expect(listResponse.status).toBe(200)
    expect(listed.data?.some((row) => row.id === consumoId)).toBe(true)

    const getResponse = await getConsumo(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/consumos/${consumoId}`),
      routeParams({ companyId: COMPANY_ID, consumoId })
    )
    expect(getResponse.status).toBe(200)

    const pendienteResponse = await emitirConsumo(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/consumos/${consumoId}/emitir`, { method: "POST" }),
      routeParams({ companyId: COMPANY_ID, consumoId })
    )
    const emitted = await bodyAsJson<{ state: string; visibleNumber: number | null }>(pendienteResponse)
    expect(pendienteResponse.status).toBe(200)
    expect(emitted.data?.state).toBe("Pendiente")
    expect(emitted.data?.visibleNumber).toBeTypeOf("number")

    const validateResponse = await validateConsumo(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/consumos/${consumoId}/validate`, { method: "POST" }),
      routeParams({ companyId: COMPANY_ID, consumoId })
    )
    const validated = await bodyAsJson<{ state: string; validatedAt: string | null }>(validateResponse)
    expect(validateResponse.status).toBe(200)
    expect(validated.data?.state).toBe("Validado")
    expect(validated.data?.validatedAt).toBeTruthy()
  })
})
