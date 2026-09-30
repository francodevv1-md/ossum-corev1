import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CanonicalRole } from "@/lib/permissions/canonical-roles"
import { GET as getNecesidades, POST as postNecesidades } from "@/app/api/companies/[companyId]/compras/necesidades/route"
import { GET as getOrdenesPago, POST as postOrdenesPago } from "@/app/api/companies/[companyId]/compras/ordenes-pago/route"
import { POST as confirmReceipt } from "@/app/api/companies/[companyId]/receipts/[receiptId]/confirm/route"
import { GET as getComparativa } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/comparativa/route"
import * as authContext from "@/lib/api/auth-context"
import * as necesidadService from "@/lib/services/necesidad-compra.service"
import * as ordenPagoService from "@/lib/services/orden-pago.service"
import * as receiptService from "@/lib/services/receipt.service"
import * as comparativaService from "@/lib/services/comparativa.service"
import { notFound } from "@/lib/api/errors"

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: {},
}))

vi.mock("@/lib/services/necesidad-compra.service", () => ({
  listNecesidadesCompra: vi.fn(),
  createNecesidadCompra: vi.fn(),
}))

vi.mock("@/lib/services/orden-pago.service", () => ({
  listOrdenesPago: vi.fn(),
  createOrdenPago: vi.fn(),
}))

vi.mock("@/lib/services/receipt.service", () => ({
  listReceipts: vi.fn(),
  createReceiptDraft: vi.fn(),
  confirmReceipt: vi.fn(),
}))

vi.mock("@/lib/services/comparativa.service", () => ({
  getSurgeryComparativa: vi.fn(),
}))

describe("ERP Backend - Smoke API Endpoints (4 Golden Gates)", () => {
  const companyId = "company-tenant-alpha"
  const companyParams = Promise.resolve({ companyId })

  function mockAuth(role: CanonicalRole = "admin") {
    return {
      companyId,
      actorUserId: `user-${role}`,
      role,
      canonicalRole: role,
      rawRole: role,
      supabaseAuthId: null,
      user: { id: `user-${role}`, email: `${role}@test.com`, firstName: "Test", lastName: "User" },
      activeCompany: { id: companyId, name: "Districorr DEV" },
      source: "dev-header" as const,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("/api/companies/[companyId]/compras/necesidades", () => {
    it("Gate 1 - Happy path: GET returns 200 with list and POST returns 201 with created record", async () => {
      vi.mocked(authContext.getApiAuthContext).mockResolvedValue(mockAuth("admin"))
      vi.mocked(necesidadService.listNecesidadesCompra).mockResolvedValueOnce([
        { id: "nec-1", code: "ART-1" } as any,
      ])
      vi.mocked(necesidadService.createNecesidadCompra).mockResolvedValueOnce({
        id: "nec-new",
        code: "ART-1",
      } as any)

      // GET
      const getReq = new Request(`http://localhost/api/companies/${companyId}/compras/necesidades`)
      const getRes = await getNecesidades(getReq, { params: companyParams })
      expect(getRes.status).toBe(200)
      const getJson = await getRes.json()
      expect(getJson.data).toHaveLength(1)

      // POST
      const postReq = new Request(`http://localhost/api/companies/${companyId}/compras/necesidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "ART-1",
          name: "Clavo femoral",
          quantity: 2,
          priority: "alta",
          origin: "manual",
        }),
      })
      const postRes = await postNecesidades(postReq, { params: companyParams })
      expect(postRes.status).toBe(201)
      const postJson = await postRes.json()
      expect(postJson.data.id).toBe("nec-new")
    })

    it("Gate 2 - Payload inválido: POST returns 400 for bad JSON or validation schema errors", async () => {
      vi.mocked(authContext.getApiAuthContext).mockResolvedValue(mockAuth("admin"))

      // Bad JSON
      const badJsonReq = new Request(`http://localhost/api/companies/${companyId}/compras/necesidades`, {
        method: "POST",
        body: "invalid{json",
      })
      const badJsonRes = await postNecesidades(badJsonReq, { params: companyParams })
      expect(badJsonRes.status).toBe(400)

      // Schema invalid (missing name, quantity negative)
      const invalidSchemaReq = new Request(`http://localhost/api/companies/${companyId}/compras/necesidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "ART-1",
          quantity: -5,
        }),
      })
      const invalidSchemaRes = await postNecesidades(invalidSchemaReq, { params: companyParams })
      expect(invalidSchemaRes.status).toBe(400)
    })

    it("Gate 3 - Sin capability: returns 403 when role lacks purchases:mutate", async () => {
      vi.mocked(authContext.getApiAuthContext).mockResolvedValue(mockAuth("viewer"))

      const req = new Request(`http://localhost/api/companies/${companyId}/compras/necesidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "ART-1",
          name: "Clavo",
          quantity: 1,
          origin: "manual",
        }),
      })

      const res = await postNecesidades(req, { params: companyParams })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error.code).toBe("capability_denied")
    })
  })

  describe("/api/companies/[companyId]/compras/ordenes-pago", () => {
    it("Gate 3 - Role Segregation: logistics cannot mutate Ordenes de Pago (403)", async () => {
      vi.mocked(authContext.getApiAuthContext).mockResolvedValue(mockAuth("logistics"))

      const req = new Request(`http://localhost/api/companies/${companyId}/compras/ordenes-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId: "supp-1",
          proveedorName: "BioImplantes SA",
          method: "transfer",
          total: 1000,
          imputaciones: [{ facturaCompraId: "inv-1", amount: 1000 }],
        }),
      })

      const res = await postOrdenesPago(req, { params: companyParams })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error.code).toBe("capability_denied")
    })

    it("Gate 1 - Billing role can create Orden de Pago (201)", async () => {
      vi.mocked(authContext.getApiAuthContext).mockResolvedValue(mockAuth("billing"))
      vi.mocked(ordenPagoService.createOrdenPago).mockResolvedValueOnce({
        id: "op-101",
        opNumber: "OP-0001-00000001",
      } as any)

      const req = new Request(`http://localhost/api/companies/${companyId}/compras/ordenes-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId: "supp-1",
          proveedorName: "BioImplantes SA",
          method: "transfer",
          total: 1000,
          imputaciones: [{ facturaCompraId: "inv-1", amount: 1000 }],
        }),
      })

      const res = await postOrdenesPago(req, { params: companyParams })
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.data.id).toBe("op-101")
    })
  })

  describe("/api/companies/[companyId]/receipts/[receiptId]/confirm", () => {
    it("Gate 4 - Recurso ajeno/inexistente: returns 404 when receipt does not exist", async () => {
      vi.mocked(authContext.getApiAuthContext).mockResolvedValue(mockAuth("admin"))
      vi.mocked(receiptService.confirmReceipt).mockRejectedValueOnce(
        notFound("Receipt not found", "receipt_not_found")
      )

      const req = new Request(`http://localhost/api/companies/${companyId}/receipts/rec-unknown/confirm`, {
        method: "POST",
      })

      const res = await confirmReceipt(req, {
        params: Promise.resolve({ companyId, receiptId: "rec-unknown" }),
      })

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error.code).toBe("receipt_not_found")
    })
  })

  describe("/api/companies/[companyId]/surgeries/[surgeryId]/comparativa", () => {
    it("Gate 1 & Gate 4 - Returns 200 on valid surgery and 404 when surgery is not found", async () => {
      vi.mocked(authContext.getApiAuthContext).mockResolvedValue(mockAuth("coordinator"))

      // 200 Happy Path
      vi.mocked(comparativaService.getSurgeryComparativa).mockResolvedValueOnce({
        surgeryId: "surg-1",
        items: [],
        resumen: { totalPresupuestado: 0, totalRemitido: 0, totalConsumido: 0, totalDevuelto: 0, desviosDetectados: 0 },
      } as any)

      const req = new Request(`http://localhost/api/companies/${companyId}/surgeries/surg-1/comparativa`)
      const res = await getComparativa(req, {
        params: Promise.resolve({ companyId, surgeryId: "surg-1" }),
      })
      expect(res.status).toBe(200)

      // 404 Not Found
      vi.mocked(comparativaService.getSurgeryComparativa).mockRejectedValueOnce(
        notFound("Surgery not found", "surgery_not_found")
      )

      const notFoundReq = new Request(`http://localhost/api/companies/${companyId}/surgeries/surg-fake/comparativa`)
      const notFoundRes = await getComparativa(notFoundReq, {
        params: Promise.resolve({ companyId, surgeryId: "surg-fake" }),
      })
      expect(notFoundRes.status).toBe(404)
    })
  })
})
