import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  hasCapability,
  getRoleCapabilities,
} from "@/lib/permissions/capabilities";
import { resolveCanonicalRole, CANONICAL_ROLES } from "@/lib/permissions/canonical-roles";
import { getApiAuthContext } from "@/lib/api/auth-context";

import {
  GET as getNecesidades,
  POST as createNecesidad,
} from "@/app/api/companies/[companyId]/compras/necesidades/route";
import {
  GET as getNecesidadDetail,
  PATCH as updateNecesidad,
  DELETE as cancelNecesidad,
} from "@/app/api/companies/[companyId]/compras/necesidades/[necesidadId]/route";
import { POST as convertToOc } from "@/app/api/companies/[companyId]/compras/necesidades/convert-to-oc/route";
import {
  GET as getOrdenesPago,
  POST as createOrdenPago,
} from "@/app/api/companies/[companyId]/compras/ordenes-pago/route";
import {
  GET as getOrdenPagoDetail,
} from "@/app/api/companies/[companyId]/compras/ordenes-pago/[ordenPagoId]/route";
import {
  POST as cancelOrdenPago,
} from "@/app/api/companies/[companyId]/compras/ordenes-pago/[ordenPagoId]/cancel/route";
import { GET as getMovimientos } from "@/app/api/companies/[companyId]/compras/movimientos/route";
import { GET as getForecast } from "@/app/api/companies/[companyId]/compras/forecast/route";

import * as necesidadService from "@/lib/services/necesidad-compra.service";
import * as ordenPagoService from "@/lib/services/orden-pago.service";
import * as comprasMovimientosService from "@/lib/services/compras-movimientos.service";
import * as comprasForecastService from "@/lib/services/compras-forecast.service";

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {},
}));

vi.mock("@/lib/services/necesidad-compra.service", () => ({
  listNecesidadesCompra: vi.fn(),
  getNecesidadCompra: vi.fn(),
  createNecesidadCompra: vi.fn(),
  updateNecesidadCompra: vi.fn(),
  cancelNecesidadCompra: vi.fn(),
  convertNecesidadesToOrdenCompra: vi.fn(),
}));

vi.mock("@/lib/services/orden-pago.service", () => ({
  listOrdenesPago: vi.fn(),
  getOrdenPago: vi.fn(),
  createOrdenPago: vi.fn(),
  cancelOrdenPago: vi.fn(),
}));

vi.mock("@/lib/services/compras-movimientos.service", () => ({
  listComprasMovimientos: vi.fn(),
}));

vi.mock("@/lib/services/compras-forecast.service", () => ({
  getComprasForecast: vi.fn(),
}));

describe("Purchases RBAC Security & Canonical Capabilities", () => {
  const companyParams = Promise.resolve({ companyId: "company-1" });
  const necesidadParams = Promise.resolve({ companyId: "company-1", necesidadId: "nec-100" });
  const ordenPagoParams = Promise.resolve({ companyId: "company-1", ordenPagoId: "op-100" });

  describe("1. Canonical Purchases Capabilities Matrix", () => {
    it("grants purchases:read to all canonical roles", () => {
      for (const role of CANONICAL_ROLES) {
        expect(hasCapability(role, "purchases:read")).toBe(true);
      }
    });

    it("grants purchases:mutate to admin, coordinator, logistics only", () => {
      expect(hasCapability("admin", "purchases:mutate")).toBe(true);
      expect(hasCapability("coordinator", "purchases:mutate")).toBe(true);
      expect(hasCapability("logistics", "purchases:mutate")).toBe(true);

      expect(hasCapability("billing", "purchases:mutate")).toBe(false);
      expect(hasCapability("commercial", "purchases:mutate")).toBe(false);
      expect(hasCapability("technician", "purchases:mutate")).toBe(false);
      expect(hasCapability("viewer", "purchases:mutate")).toBe(false);
    });

    it("grants purchases:critical to admin and coordinator only", () => {
      expect(hasCapability("admin", "purchases:critical")).toBe(true);
      expect(hasCapability("coordinator", "purchases:critical")).toBe(true);

      expect(hasCapability("logistics", "purchases:critical")).toBe(false);
      expect(hasCapability("billing", "purchases:critical")).toBe(false);
      expect(hasCapability("viewer", "purchases:critical")).toBe(false);
    });

    it("grants billing:mutate to admin and billing only (for supplier payments)", () => {
      expect(hasCapability("admin", "billing:mutate")).toBe(true);
      expect(hasCapability("billing", "billing:mutate")).toBe(true);

      expect(hasCapability("logistics", "billing:mutate")).toBe(false);
      expect(hasCapability("coordinator", "billing:mutate")).toBe(false);
      expect(hasCapability("viewer", "billing:mutate")).toBe(false);
    });

    it("enforces deny-by-default on unknown, null, or empty roles", () => {
      expect(hasCapability("hacker", "purchases:read")).toBe(false);
      expect(hasCapability("hacker", "purchases:mutate")).toBe(false);
      expect(hasCapability(null, "purchases:read")).toBe(false);
      expect(hasCapability(undefined, "purchases:mutate")).toBe(false);
      expect(hasCapability("", "billing:mutate")).toBe(false);
    });
  });

  describe("2. Server-side Route Guards Enforcement", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("1. viewer receives 403 when creating or cancelling a necesidad", async () => {
      vi.mocked(getApiAuthContext).mockResolvedValue({
        companyId: "company-1",
        actorUserId: "user-viewer",
        role: "viewer",
      } as any);

      // POST create necesidad
      const createReq = new Request("http://localhost/api/companies/company-1/compras/necesidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Tornillos corticales", quantity: 10 }),
      });
      const createRes = await createNecesidad(createReq, { params: companyParams });
      expect(createRes.status).toBe(403);
      const createJson = await createRes.json();
      expect(createJson.error.code).toBe("capability_denied");

      // DELETE cancel necesidad
      const cancelReq = new Request("http://localhost/api/companies/company-1/compras/necesidades/nec-100", {
        method: "DELETE",
      });
      const cancelRes = await cancelNecesidad(cancelReq, { params: necesidadParams });
      expect(cancelRes.status).toBe(403);
      const cancelJson = await cancelRes.json();
      expect(cancelJson.error.code).toBe("capability_denied");
    });

    it("2. logistics can mutate necesidades and convert them to Orden de Compra", async () => {
      vi.mocked(getApiAuthContext).mockResolvedValue({
        companyId: "company-1",
        actorUserId: "user-logistics",
        role: "logistics",
      } as any);

      vi.mocked(necesidadService.createNecesidadCompra).mockResolvedValueOnce({
        id: "nec-1",
        name: "Clavo intramedular",
        quantity: "5",
      } as any);

      const createReq = new Request("http://localhost/api/companies/company-1/compras/necesidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Clavo intramedular", quantity: 5 }),
      });
      const createRes = await createNecesidad(createReq, { params: companyParams });
      expect(createRes.status).toBe(201);

      // Convert to OC
      vi.mocked(necesidadService.convertNecesidadesToOrdenCompra).mockResolvedValueOnce({
        ordenCompra: { id: "oc-1" },
        convertedNecesidadIds: ["nec-1"],
      } as any);

      const convertReq = new Request(
        "http://localhost/api/companies/company-1/compras/necesidades/convert-to-oc",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            necesidadIds: ["nec-1"],
            proveedorId: "prov-1",
            proveedorName: "Proveedor Quirúrgico SA",
          }),
        }
      );
      const convertRes = await convertToOc(convertReq, { params: companyParams });
      expect(convertRes.status).toBe(201);
    });

    it("3. billing can create and annul an Orden de Pago", async () => {
      vi.mocked(getApiAuthContext).mockResolvedValue({
        companyId: "company-1",
        actorUserId: "user-billing",
        role: "billing",
      } as any);

      vi.mocked(ordenPagoService.createOrdenPago).mockResolvedValueOnce({
        id: "op-1",
        visibleNumber: 1,
        total: "15000",
      } as any);

      const createReq = new Request("http://localhost/api/companies/company-1/compras/ordenes-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId: "prov-1",
          proveedorName: "Proveedor SA",
          total: 15000,
        }),
      });
      const createRes = await createOrdenPago(createReq, { params: companyParams });
      expect(createRes.status).toBe(201);

      // Cancel OP
      vi.mocked(ordenPagoService.cancelOrdenPago).mockResolvedValueOnce({
        id: "op-1",
        state: "Anulada",
      } as any);

      const cancelReq = new Request(
        "http://localhost/api/companies/company-1/compras/ordenes-pago/op-100/cancel",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: "Error de comprobante" }),
        }
      );
      const cancelRes = await cancelOrdenPago(cancelReq, { params: ordenPagoParams });
      expect(cancelRes.status).toBe(200);
    });

    it("4. logistics receives 403 on create and cancel Orden de Pago", async () => {
      vi.mocked(getApiAuthContext).mockResolvedValue({
        companyId: "company-1",
        actorUserId: "user-logistics",
        role: "logistics",
      } as any);

      // Create OP
      const createReq = new Request("http://localhost/api/companies/company-1/compras/ordenes-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId: "prov-1",
          proveedorName: "Proveedor SA",
          total: 5000,
        }),
      });
      const createRes = await createOrdenPago(createReq, { params: companyParams });
      expect(createRes.status).toBe(403);
      const createJson = await createRes.json();
      expect(createJson.error.code).toBe("capability_denied");

      // Cancel OP
      const cancelReq = new Request(
        "http://localhost/api/companies/company-1/compras/ordenes-pago/op-100/cancel",
        {
          method: "POST",
        }
      );
      const cancelRes = await cancelOrdenPago(cancelReq, { params: ordenPagoParams });
      expect(cancelRes.status).toBe(403);
      const cancelJson = await cancelRes.json();
      expect(cancelJson.error.code).toBe("capability_denied");
    });

    it("5. unknown role receives 403 on all purchases endpoints (deny-by-default)", async () => {
      vi.mocked(getApiAuthContext).mockResolvedValue({
        companyId: "company-1",
        actorUserId: "user-intruder",
        role: "unauthorized_role",
      } as any);

      // GET necesidades
      const getReq = new Request("http://localhost/api/companies/company-1/compras/necesidades");
      const getRes = await getNecesidades(getReq, { params: companyParams });
      expect(getRes.status).toBe(403);

      // GET movimientos
      const movReq = new Request("http://localhost/api/companies/company-1/compras/movimientos");
      const movRes = await getMovimientos(movReq, { params: companyParams });
      expect(movRes.status).toBe(403);

      // GET forecast
      const forecastReq = new Request("http://localhost/api/companies/company-1/compras/forecast");
      const forecastRes = await getForecast(forecastReq, { params: companyParams });
      expect(forecastRes.status).toBe(403);

      // POST create necesidad
      const createReq = new Request("http://localhost/api/companies/company-1/compras/necesidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", quantity: 1 }),
      });
      const createRes = await createNecesidad(createReq, { params: companyParams });
      expect(createRes.status).toBe(403);
    });
  });
});
