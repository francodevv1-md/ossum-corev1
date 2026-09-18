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
import { GET as listDevoluciones, POST as createDevolucion } from "@/app/api/companies/[companyId]/devoluciones/route"
import { GET as getDevolucion } from "@/app/api/companies/[companyId]/devoluciones/[devolucionId]/route"
import { PATCH as updateDevolucionState } from "@/app/api/companies/[companyId]/devoluciones/[devolucionId]/state/route"
import { POST as confirmDevolucion } from "@/app/api/companies/[companyId]/devoluciones/[devolucionId]/confirm/route"

const PREFIX = `it-devolucion-${Date.now()}`
const ORG_ID = `${PREFIX}-org`
const COMPANY_ID = `${PREFIX}-company`
const USER_ID = `${PREFIX}-user`
const PATIENT_ID = `${PREFIX}-patient`
const SURGERY_ID = `${PREFIX}-surgery`
let remitoId: string
let remitoItemId: string
let consumoId: string
let consumoItemId: string

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
  await prisma.contact.create({ data: { id: PATIENT_ID, firstName: "Paciente", lastName: "Devolucion" } })
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
      // A devolución can only be confirmed after the Remito was delivered.
      state: "Entregado",
      items: {
        create: [{ sku: "SKU-DEV-1", description: "Implante devolución", quantity: "2", unit: "unidad" }],
      },
    },
    include: { items: true },
  })
  remitoId = remito.id
  remitoItemId = remito.items[0]!.id
  const consumo = await prisma.consumo.create({
    data: {
      companyId: COMPANY_ID,
      surgeryId: SURGERY_ID,
      remitoId,
      state: "Validado",
      items: {
        create: [
          {
            remitoItemId,
            sku: "SKU-DEV-1",
            description: "Implante devolución",
            requestedQuantity: "2",
            consumedQuantity: "1",
            unit: "unidad",
          },
        ],
      },
    },
    include: { items: true },
  })
  consumoId = consumo.id
  consumoItemId = consumo.items[0]!.id
}

describe("Devolucion API integration (Supabase DEV DB)", () => {
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

  it("creates, lists, gets, moves to Pendiente and confirms a devolución", async () => {
    const createResponse = await createDevolucion(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgeryId: SURGERY_ID,
          remitoId,
          consumoId,
          reason: "Material no utilizado",
          items: [
            {
              remitoItemId,
              consumoItemId,
              sku: "SKU-DEV-1",
              description: "Implante devolución",
              returnedQuantity: 1,
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

    const devolucionId = created.data!.id

    const listResponse = await listDevoluciones(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones?remitoId=${remitoId}`),
      routeParams({ companyId: COMPANY_ID })
    )
    const listed = await bodyAsJson<Array<{ id: string }>>(listResponse)
    expect(listResponse.status).toBe(200)
    expect(listed.data?.some((row) => row.id === devolucionId)).toBe(true)

    const getResponse = await getDevolucion(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones/${devolucionId}`),
      routeParams({ companyId: COMPANY_ID, devolucionId })
    )
    expect(getResponse.status).toBe(200)

    const pendienteResponse = await updateDevolucionState(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones/${devolucionId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newState: "Pendiente" }),
      }),
      routeParams({ companyId: COMPANY_ID, devolucionId })
    )
    expect(pendienteResponse.status).toBe(200)

    const confirmResponse = await confirmDevolucion(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones/${devolucionId}/confirm`, { method: "POST" }),
      routeParams({ companyId: COMPANY_ID, devolucionId })
    )
    const confirmed = await bodyAsJson<{ state: string; validatedAt: string | null }>(confirmResponse)
    expect(confirmResponse.status).toBe(200)
    expect(confirmed.data?.state).toBe("Confirmada")
    expect(confirmed.data?.validatedAt).toBeTruthy()
  })

  it("does not apply a devolución when its Remito is not delivered", async () => {
    await prisma.remito.update({ where: { id: remitoId }, data: { state: "Emitido" } })

    const createResponse = await createDevolucion(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgeryId: SURGERY_ID,
          remitoId,
          consumoId,
          reason: "Remito no entregado",
          items: [
            {
              remitoItemId,
              consumoItemId,
              sku: "SKU-DEV-1",
              description: "Implante devolución",
              returnedQuantity: 1,
              unit: "unidad",
            },
          ],
        }),
      }),
      routeParams({ companyId: COMPANY_ID })
    )
    const created = await bodyAsJson<{ id: string }>(createResponse)
    expect(createResponse.status).toBe(201)

    const devolucionId = created.data!.id
    const pendienteResponse = await updateDevolucionState(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones/${devolucionId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newState: "Pendiente" }),
      }),
      routeParams({ companyId: COMPANY_ID, devolucionId })
    )
    expect(pendienteResponse.status).toBe(200)

    const confirmResponse = await confirmDevolucion(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/devoluciones/${devolucionId}/confirm`, { method: "POST" }),
      routeParams({ companyId: COMPANY_ID, devolucionId })
    )
    const rejected = await bodyAsJson(confirmResponse)
    expect(confirmResponse.status).toBe(409)
    expect(rejected.error).toEqual({
      code: "remito_devolucion_not_allowed",
      message: "Cannot confirm devolucion for the current remito state",
    })

    const persisted = await prisma.devolucion.findUniqueOrThrow({ where: { id: devolucionId } })
    const remito = await prisma.remito.findUniqueOrThrow({ where: { id: remitoId } })
    expect(persisted.state).toBe("Pendiente")
    expect(remito.state).toBe("Emitido")
  })
})
