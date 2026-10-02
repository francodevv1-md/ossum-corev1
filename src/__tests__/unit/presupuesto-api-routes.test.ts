import { describe, expect, it, vi, beforeEach } from "vitest"
import { GET as listPresupuestosRoute, POST as createPresupuestoRoute } from "@/app/api/companies/[companyId]/presupuestos/route"
import {
  GET as getPresupuestoRoute,
  PATCH as updatePresupuestoRoute,
  DELETE as deletePresupuestoRoute,
} from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/route"
import { PATCH as transitionStateRoute } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/state/route"
import { POST as emitirRoute } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/emitir/route"
import { POST as versionRoute } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/versions/route"
import * as presupuestoService from "@/lib/services/presupuesto.service"

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext: vi.fn().mockResolvedValue({
    companyId: "company-1",
    actorUserId: "user-1",
    role: "admin",
    canonicalRole: "admin",
    rawRole: "admin",
    organizationId: "org-1",
  }),
}))

vi.mock("@/lib/prisma", () => ({
  default: {},
}))

vi.mock("@/lib/services/presupuesto.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/presupuesto.service")>()
  return {
    ...actual,
    listPresupuestos: vi.fn(),
    createPresupuesto: vi.fn(),
    getPresupuesto: vi.fn(),
    updatePresupuestoDraft: vi.fn(),
    deletePresupuesto: vi.fn(),
    emitirPresupuesto: vi.fn(),
    updatePresupuestoState: vi.fn(),
    createPresupuestoVersion: vi.fn(),
  }
})

describe("Presupuestos API Routes", () => {
  const companyParams = Promise.resolve({ companyId: "company-1" })
  const presupuestoParams = Promise.resolve({ companyId: "company-1", presupuestoId: "pres-100" })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/companies/:companyId/presupuestos", () => {
    it("returns serialized presupuestos list", async () => {
      vi.mocked(presupuestoService.listPresupuestos).mockResolvedValueOnce([
        {
          id: "pres-1",
          companyId: "company-1",
          state: "Emitido",
          slot: "CURRENT",
          revision: 1,
          items: [],
        } as any,
      ])

      const req = new Request("http://localhost/api/companies/company-1/presupuestos?state=Emitido")
      const res = await listPresupuestosRoute(req, { params: companyParams })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveLength(1)
      expect(json.data[0].id).toBe("pres-1")
    })
  })

  describe("POST /api/companies/:companyId/presupuestos", () => {
    it("creates a new presupuesto", async () => {
      vi.mocked(presupuestoService.createPresupuesto).mockResolvedValueOnce({
        id: "pres-new",
        companyId: "company-1",
        state: "Borrador",
        slot: "DRAFT",
        revision: 1,
        items: [],
      } as any)

      const body = {
        title: "Nuevo Presupuesto",
        items: [{ description: "Articulo 1", quantity: 1, unitPrice: 1000 }],
      }
      const req = new Request("http://localhost/api/companies/company-1/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const res = await createPresupuestoRoute(req, { params: companyParams })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.data.id).toBe("pres-new")
    })
  })

  describe("GET /api/companies/:companyId/presupuestos/:presupuestoId", () => {
    it("returns single presupuesto detail", async () => {
      vi.mocked(presupuestoService.getPresupuesto).mockResolvedValueOnce({
        id: "pres-100",
        companyId: "company-1",
        state: "Emitido",
        slot: "CURRENT",
        revision: 1,
        items: [],
      } as any)

      const req = new Request("http://localhost/api/companies/company-1/presupuestos/pres-100")
      const res = await getPresupuestoRoute(req, { params: presupuestoParams })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.id).toBe("pres-100")
    })
  })

  describe("PATCH /api/companies/:companyId/presupuestos/:presupuestoId", () => {
    it("updates draft presupuesto with items and expectedRevision", async () => {
      vi.mocked(presupuestoService.updatePresupuestoDraft).mockResolvedValueOnce({
        id: "pres-100",
        companyId: "company-1",
        state: "Borrador",
        slot: "DRAFT",
        revision: 1,
        title: "Updated Title",
        items: [],
      } as any)

      const body = {
        title: "Updated Title",
        expectedRevision: 1,
        items: [{ description: "Item 1", quantity: 2, unitPrice: 500 }],
      }
      const req = new Request("http://localhost/api/companies/company-1/presupuestos/pres-100", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const res = await updatePresupuestoRoute(req, { params: presupuestoParams })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.title).toBe("Updated Title")
    })
  })

  describe("PATCH /api/companies/:companyId/presupuestos/:presupuestoId/state", () => {
    it("transitions state using command 'approve' and expectedRevision", async () => {
      vi.mocked(presupuestoService.updatePresupuestoState).mockResolvedValueOnce({
        id: "pres-100",
        companyId: "company-1",
        state: "Aprobado",
        slot: "CURRENT",
        revision: 1,
        items: [],
      } as any)

      const body = {
        command: "approve",
        expectedRevision: 1,
      }
      const req = new Request("http://localhost/api/companies/company-1/presupuestos/pres-100/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const res = await transitionStateRoute(req, { params: presupuestoParams })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.state).toBe("Aprobado")
      expect(presupuestoService.updatePresupuestoState).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "approve",
          expectedRevision: 1,
        })
      )
    })
  })

  describe("POST /api/companies/:companyId/presupuestos/:presupuestoId/emitir", () => {
    it("emits presupuesto and assigns visible number", async () => {
      vi.mocked(presupuestoService.emitirPresupuesto).mockResolvedValueOnce({
        id: "pres-100",
        visibleNumber: 10,
        companyId: "company-1",
        state: "Emitido",
        slot: "CURRENT",
        revision: 1,
        items: [],
      } as any)

      const body = { expectedRevision: 1 }
      const req = new Request("http://localhost/api/companies/company-1/presupuestos/pres-100/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const res = await emitirRoute(req, { params: presupuestoParams })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.state).toBe("Emitido")
      expect(json.data.visibleNumber).toBe(10)
    })
  })

  describe("POST /api/companies/:companyId/presupuestos/:presupuestoId/versions", () => {
    it("creates a new version from previous version", async () => {
      vi.mocked(presupuestoService.createPresupuestoVersion).mockResolvedValueOnce({
        id: "pres-101",
        parentPresupuestoId: "pres-100",
        versionNumber: 2,
        companyId: "company-1",
        state: "Borrador",
        slot: "DRAFT",
        revision: 2,
        items: [],
      } as any)

      const body = { expectedRevision: 1 }
      const req = new Request("http://localhost/api/companies/company-1/presupuestos/pres-100/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const res = await versionRoute(req, { params: presupuestoParams })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.data.id).toBe("pres-101")
      expect(json.data.versionNumber).toBe(2)
      expect(json.data.state).toBe("Borrador")
    })
  })

  describe("DELETE /api/companies/:companyId/presupuestos/:presupuestoId", () => {
    it("deletes a draft", async () => {
      vi.mocked(presupuestoService.deletePresupuesto).mockResolvedValueOnce({
        id: "pres-100",
        deleted: true,
      } as any)

      const req = new Request("http://localhost/api/companies/company-1/presupuestos/pres-100", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: 1 }),
      })
      const res = await deletePresupuestoRoute(req, { params: presupuestoParams })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.deleted).toBe(true)
    })
  })
})
