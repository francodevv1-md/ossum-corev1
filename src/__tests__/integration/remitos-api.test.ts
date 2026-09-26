import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  // Load runtime DB credentials before src/lib/prisma.ts is imported.
  // Vitest does not load .env files by default; Prisma CLI does.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv")
  dotenv.config({ path: ".env.local" })
  dotenv.config({ path: ".env" })
})

const { getApiAuthContext, getRemitoIssuanceDependencies } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getRemitoIssuanceDependencies: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext,
}))

vi.mock("@/lib/remito-verification/issuance-runtime", () => ({
  getRemitoIssuanceDependencies,
}))

import prisma from "@/lib/prisma"
import { createRemitoTokenKeyring } from "@/lib/remito-verification/token"
import { installRemitoActivationRuntime } from "@/lib/remito-verification/activation"
import { GET as listRemitos, POST as createRemito } from "@/app/api/companies/[companyId]/remitos/route"
import { GET as getRemito, PATCH as updateRemitoDraft } from "@/app/api/companies/[companyId]/remitos/[remitoId]/route"
import { PATCH as updateRemitoState } from "@/app/api/companies/[companyId]/remitos/[remitoId]/state/route"
import { POST as emitirRemito } from "@/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route"
import { POST as registrarRemitoDevolucion } from "@/app/api/companies/[companyId]/remitos/[remitoId]/devolucion/route"

const PREFIX = `it-remito-${Date.now()}`
const ORG_ID = `${PREFIX}-org`
const COMPANY_ID = `${PREFIX}-company`
const BRANCH_ID = `${PREFIX}-branch`
const USER_ID = `${PREFIX}-user`
const PATIENT_ID = `${PREFIX}-patient`
const SURGERY_ID = `${PREFIX}-surgery`
const TEST_ISSUANCE_DEPENDENCIES = {
  keyring: createRemitoTokenKeyring({
    activeTokenKeyVersion: 1,
    keys: { "1": Buffer.alloc(32, 7).toString("base64url") },
  }),
}

installRemitoActivationRuntime({ flags: {
  remitoLocatorIssuanceWrites: true, remitoInternalScanRead: true,
  remitoPublicPublicationWrites: true, remitoPublicCompatibilityRead: true, remitoPrintCodes: false,
}, cohort: { companyIds: [COMPANY_ID], cohortStart: new Date(0) } })

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

async function seedBase() {
  await prisma.organization.create({ data: { id: ORG_ID, name: "Integration Test Org", slug: `${PREFIX}-org` } })
  await prisma.company.create({ data: {
    id: COMPANY_ID,
    organizationId: ORG_ID,
    name: "Integration Test Company",
    taxId: "30123456789",
  } })
  await prisma.branch.create({ data: { id: BRANCH_ID, companyId: COMPANY_ID, name: "Casa central" } })
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
  await prisma.contact.create({ data: { id: PATIENT_ID, firstName: "Paciente", lastName: "Remito" } })
  await prisma.contactCompanyLink.create({ data: { contactId: PATIENT_ID, companyId: COMPANY_ID, role: "patient" } })
  await prisma.surgery.create({
    data: {
      id: SURGERY_ID,
      companyId: COMPANY_ID,
      branchId: BRANCH_ID,
      patientId: PATIENT_ID,
      visibleNumber: `${PREFIX}-CX`,
      cxStatus: "pending",
    },
  })
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
  await prisma.branch.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.contactCompanyLink.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.contact.deleteMany({ where: { id: { startsWith: PREFIX } } })
  await prisma.userCompanyAccess.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.user.deleteMany({ where: { id: USER_ID } })
  await prisma.company.deleteMany({ where: { id: COMPANY_ID } })
  await prisma.organization.deleteMany({ where: { id: ORG_ID } })
}

describe("Remito API integration (Supabase DEV DB)", () => {
  beforeAll(async () => {
    await cleanupBase()
    await seedBase()
  })

  afterAll(async () => {
    // Issuance verification history is intentionally immutable/non-deletable.
    // This disposable DEV integration database retains the uniquely-prefixed fixture.
    await prisma.$disconnect()
  })

  beforeEach(() => {
    getApiAuthContext.mockReset()
    getApiAuthContext.mockResolvedValue(ADMIN_AUTH)
    getRemitoIssuanceDependencies.mockReset()
    getRemitoIssuanceDependencies.mockReturnValue(TEST_ISSUANCE_DEPENDENCIES)
  })

  it("creates, lists, transitions and registers a devolución for a remito", async () => {
    const createResponse = await createRemito(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/remitos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: BRANCH_ID,
          origin: "manual",
          salidaReason: "venta",
          destinatarioSnapshot: { nombre: "Clínica Test", direccion: "Calle 123" },
          items: [{ sku: "SKU-IT-1", description: "Implante integración", quantity: 2, unit: "unidad" }],
        }),
      }),
      routeParams({ companyId: COMPANY_ID })
    )

    const created = await bodyAsJson<{ id: string; state: string; items: Array<{ id: string }> }>(createResponse)
    expect(createResponse.status).toBe(201)
    expect(created.data?.state).toBe("Borrador")
    expect(created.data?.items).toHaveLength(1)

    const remitoId = created.data!.id
    const itemId = created.data!.items[0]!.id

    const patchResponse = await updateRemitoDraft(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/remitos/${remitoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { integration: true } }),
      }),
      routeParams({ companyId: COMPANY_ID, remitoId })
    )
    const patched = await bodyAsJson<{ state: string; metadata: { integration?: boolean } }>(patchResponse)
    expect(patchResponse.status).toBe(200)
    expect(patched.data?.state).toBe("Borrador")
    expect(patched.data?.metadata?.integration).toBe(true)

    const listResponse = await listRemitos(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/remitos`),
      routeParams({ companyId: COMPANY_ID })
    )
    const listed = await bodyAsJson<Array<{ id: string }>>(listResponse)
    expect(listResponse.status).toBe(200)
    expect(listed.data?.some((row) => row.id === remitoId)).toBe(true)

    const getResponse = await getRemito(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/remitos/${remitoId}`),
      routeParams({ companyId: COMPANY_ID, remitoId })
    )
    expect(getResponse.status).toBe(200)

    const emitResponse = await emitirRemito(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/remitos/${remitoId}/emitir`, { method: "POST" }),
      routeParams({ companyId: COMPANY_ID, remitoId })
    )
    const emitted = await bodyAsJson<{ state: string; visibleNumber: number | null; issuedAt: string | null }>(emitResponse)
    expect(emitResponse.status).toBe(200)
    expect(emitted.data?.state).toBe("Emitido")
    expect(emitted.data?.visibleNumber).toBeTypeOf("number")
    expect(emitted.data?.issuedAt).toBeTruthy()

    const deliveredResponse = await updateRemitoState(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/remitos/${remitoId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "Entregado" }),
      }),
      routeParams({ companyId: COMPANY_ID, remitoId })
    )
    const delivered = await bodyAsJson<{ state: string; deliveredAt: string | null }>(deliveredResponse)
    expect(deliveredResponse.status).toBe(200)
    expect(delivered.data?.state).toBe("Entregado")
    expect(delivered.data?.deliveredAt).toBeTruthy()

    const devoluciónResponse = await registrarRemitoDevolucion(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/remitos/${remitoId}/devolucion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ itemId, returnedQuantity: 2 }] }),
      }),
      routeParams({ companyId: COMPANY_ID, remitoId })
    )
    const devuelto = await bodyAsJson<{ state: string }>(devoluciónResponse)
    expect(devoluciónResponse.status).toBe(200)
    expect(devuelto.data?.state).toBe("Devuelto")
  })
})
