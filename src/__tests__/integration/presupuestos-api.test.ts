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
import { GET as listPresupuestos, POST as createPresupuesto } from "@/app/api/companies/[companyId]/presupuestos/route"
import { GET as getPresupuesto } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/route"
import { POST as emitirPresupuesto } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/emitir/route"
import { POST as createPresupuestoVersion } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/versions/route"

const PREFIX = `it-presupuesto-${Date.now()}`
const ORG_ID = `${PREFIX}-org`
const COMPANY_ID = `${PREFIX}-company`
const USER_ID = `${PREFIX}-user`
const PATIENT_ID = `${PREFIX}-patient`
const SURGERY_ID = `${PREFIX}-surgery`

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
  await prisma.presupuestoItem.deleteMany({ where: { presupuesto: { companyId: COMPANY_ID } } })
  await prisma.presupuesto.deleteMany({ where: { companyId: COMPANY_ID } })
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
  await prisma.contact.create({ data: { id: PATIENT_ID, firstName: "Paciente", lastName: "Presupuesto" } })
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
}

describe("Presupuesto API integration (Supabase DEV DB)", () => {
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

  it("creates, lists, gets, emits and versions a presupuesto", async () => {
    const createResponse = await createPresupuesto(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/presupuestos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgeryId: SURGERY_ID,
          title: "Presupuesto integración",
          currency: "ARS",
          items: [
            {
              sku: "SKU-PR-1",
              description: "Implante presupuesto",
              quantity: 2,
              unit: "unidad",
              unitPrice: 1000,
              discount: 100,
              tax: 210,
            },
          ],
        }),
      }),
      routeParams({ companyId: COMPANY_ID })
    )
    const created = await bodyAsJson<{ id: string; state: string; revision: number; total: string; items: unknown[] }>(createResponse)
    expect(createResponse.status).toBe(201)
    expect(created.data?.state).toBe("Borrador")
    expect(created.data?.items).toHaveLength(1)
    expect(created.data?.total).toBe("2110")

    const presupuestoId = created.data!.id

    const listResponse = await listPresupuestos(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/presupuestos?surgeryId=${SURGERY_ID}`),
      routeParams({ companyId: COMPANY_ID })
    )
    const listed = await bodyAsJson<Array<{ id: string }>>(listResponse)
    expect(listResponse.status).toBe(200)
    expect(listed.data?.some((row) => row.id === presupuestoId)).toBe(true)

    const getResponse = await getPresupuesto(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/presupuestos/${presupuestoId}`),
      routeParams({ companyId: COMPANY_ID, presupuestoId })
    )
    expect(getResponse.status).toBe(200)

    const emitResponse = await emitirPresupuesto(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/presupuestos/${presupuestoId}/emitir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: created.data!.revision }),
      }),
      routeParams({ companyId: COMPANY_ID, presupuestoId })
    )
    const emitted = await bodyAsJson<{ state: string; revision: number; visibleNumber: number | null }>(emitResponse)
    expect(emitResponse.status).toBe(200)
    expect(emitted.data?.state).toBe("Emitido")
    expect(emitted.data?.visibleNumber).toBeTypeOf("number")

    const versionResponse = await createPresupuestoVersion(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/presupuestos/${presupuestoId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: emitted.data!.revision,
          items: [
            {
              sku: "SKU-PR-2",
              description: "Implante versión",
              quantity: 1,
              unit: "unidad",
              unitPrice: 1500,
            },
          ],
        }),
      }),
      routeParams({ companyId: COMPANY_ID, presupuestoId })
    )
    const version = await bodyAsJson<{ id: string; state: string; versionNumber: number; parentPresupuestoId: string | null }>(versionResponse)
    expect(versionResponse.status).toBe(201)
    expect(version.data?.state).toBe("Borrador")
    expect(version.data?.versionNumber).toBe(2)
    expect(version.data?.parentPresupuestoId).toBe(presupuestoId)
  })
})
