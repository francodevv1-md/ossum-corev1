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
import { GET as listInvoices, POST as createInvoice } from "@/app/api/companies/[companyId]/invoices/route"
import { GET as getInvoice } from "@/app/api/companies/[companyId]/invoices/[invoiceId]/route"
import { POST as emitInvoice } from "@/app/api/companies/[companyId]/invoices/[invoiceId]/emitir/route"
import { GET as listPayments, POST as createPayment } from "@/app/api/companies/[companyId]/payments/route"
import { GET as getPayment } from "@/app/api/companies/[companyId]/payments/[paymentId]/route"
import { POST as cancelPayment } from "@/app/api/companies/[companyId]/payments/[paymentId]/cancel/route"

const PREFIX = `it-invoice-payment-${Date.now()}`
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
  await prisma.paymentImputation.deleteMany({ where: { payment: { companyId: COMPANY_ID } } })
  await prisma.payment.deleteMany({ where: { companyId: COMPANY_ID } })
  await prisma.invoiceItem.deleteMany({ where: { invoice: { companyId: COMPANY_ID } } })
  await prisma.invoice.deleteMany({ where: { companyId: COMPANY_ID } })
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
  await prisma.contact.create({ data: { id: PATIENT_ID, firstName: "Paciente", lastName: "Invoice" } })
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

describe("Invoices + Payments API integration (Supabase DEV DB)", () => {
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

  it("creates and emits an operational invoice, then imputes and cancels a payment by invoiceId", async () => {
    const createInvoiceResponse = await createInvoice(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgeryId: SURGERY_ID,
          base: "manual",
          type: "FV",
          currency: "ARS",
          items: [
            {
              sku: "SKU-FV-1",
              description: "Factura integración",
              quantity: 1,
              unit: "unidad",
              unitPrice: 1000,
              tax: 210,
            },
          ],
        }),
      }),
      routeParams({ companyId: COMPANY_ID })
    )
    const invoiceCreated = await bodyAsJson<{ id: string; state: string; total: string; balance: string }>(createInvoiceResponse)
    expect(createInvoiceResponse.status).toBe(201)
    expect(invoiceCreated.data?.state).toBe("Borrador")
    expect(invoiceCreated.data?.total).toBe("1210")

    const invoiceId = invoiceCreated.data!.id

    const emitResponse = await emitInvoice(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/invoices/${invoiceId}/emitir`, { method: "POST" }),
      routeParams({ companyId: COMPANY_ID, invoiceId })
    )
    const emitted = await bodyAsJson<{ state: string; visibleNumber: number | null }>(emitResponse)
    expect(emitResponse.status).toBe(200)
    expect(emitted.data?.state).toBe("Emitida")
    expect(emitted.data?.visibleNumber).toBeTypeOf("number")

    const listResponse = await listInvoices(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/invoices?surgeryId=${SURGERY_ID}`),
      routeParams({ companyId: COMPANY_ID })
    )
    const listed = await bodyAsJson<Array<{ id: string }>>(listResponse)
    expect(listResponse.status).toBe(200)
    expect(listed.data?.some((row) => row.id === invoiceId)).toBe(true)

    const createPaymentResponse = await createPayment(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgeryId: SURGERY_ID,
          method: "transfer",
          currency: "ARS",
          amount: 1210,
          imputations: [{ invoiceId, amount: 1210 }],
        }),
      }),
      routeParams({ companyId: COMPANY_ID })
    )
    const paymentCreated = await bodyAsJson<{ id: string; state: string; visibleNumber: number | null; imputations: unknown[] }>(createPaymentResponse)
    expect(createPaymentResponse.status).toBe(201)
    expect(paymentCreated.data?.state).toBe("Registrado")
    expect(paymentCreated.data?.visibleNumber).toBeTypeOf("number")
    expect(paymentCreated.data?.imputations).toHaveLength(1)

    const paymentId = paymentCreated.data!.id

    const paidInvoiceResponse = await getInvoice(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/invoices/${invoiceId}`),
      routeParams({ companyId: COMPANY_ID, invoiceId })
    )
    const paidInvoice = await bodyAsJson<{ state: string; paidTotal: string; balance: string }>(paidInvoiceResponse)
    expect(paidInvoiceResponse.status).toBe(200)
    expect(paidInvoice.data?.state).toBe("Cobrada")
    expect(paidInvoice.data?.paidTotal).toBe("1210")
    expect(paidInvoice.data?.balance).toBe("0")

    const listPaymentsResponse = await listPayments(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/payments?surgeryId=${SURGERY_ID}`),
      routeParams({ companyId: COMPANY_ID })
    )
    const payments = await bodyAsJson<Array<{ id: string }>>(listPaymentsResponse)
    expect(listPaymentsResponse.status).toBe(200)
    expect(payments.data?.some((row) => row.id === paymentId)).toBe(true)

    const getPaymentResponse = await getPayment(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/payments/${paymentId}`),
      routeParams({ companyId: COMPANY_ID, paymentId })
    )
    expect(getPaymentResponse.status).toBe(200)

    const cancelResponse = await cancelPayment(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/payments/${paymentId}/cancel`, { method: "POST" }),
      routeParams({ companyId: COMPANY_ID, paymentId })
    )
    const cancelled = await bodyAsJson<{ state: string }>(cancelResponse)
    expect(cancelResponse.status).toBe(200)
    expect(cancelled.data?.state).toBe("Anulado")

    const reopenedInvoiceResponse = await getInvoice(
      new Request(`http://localhost/api/companies/${COMPANY_ID}/invoices/${invoiceId}`),
      routeParams({ companyId: COMPANY_ID, invoiceId })
    )
    const reopenedInvoice = await bodyAsJson<{ state: string; paidTotal: string; balance: string }>(reopenedInvoiceResponse)
    expect(reopenedInvoiceResponse.status).toBe(200)
    expect(reopenedInvoice.data?.state).toBe("Emitida")
    expect(reopenedInvoice.data?.paidTotal).toBe("0")
    expect(reopenedInvoice.data?.balance).toBe("1210")
  })
})
