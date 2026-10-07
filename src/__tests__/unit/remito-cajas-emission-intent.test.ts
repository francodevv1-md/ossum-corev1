import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildCajasRemitoEmissionIntent } from "@/lib/cajas-intent"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { BoxAssignmentDetail } from "@/lib/api/cajas-assignments"

const api = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn() }))
vi.mock("@/lib/api/cajas-assignments", () => ({ getBoxAssignmentApi: api.get, listSurgeryBoxAssignmentsApi: api.list }))

describe("Shared Cajas emission resolution", () => {
  let remito: RemitoApiRow
  let assignment: BoxAssignmentDetail
  beforeEach(() => {
    vi.resetAllMocks()
    remito = {
      id: "remito", companyId: "company", surgeryId: "surgery", metadata: { cajas: { assignmentId: "assignment" } },
      visibleNumber: null, branchId: "branch", issuedBranchId: "branch", documentType: "R", origin: "box", salidaReason: "cirugia",
      boxId: null, presupuestoId: null, destinatarioContactId: null, destinatarioSnapshot: null, shippingAddressSnapshot: null,
      transportSnapshot: null, packageCount: null, declaredValue: null, state: "Borrador", issuedAt: null, deliveredAt: null,
      returnedAt: null, createdById: null, updatedById: null, createdAt: "", updatedAt: "",
      items: [{ id: "item", itemId: "article", sku: "SKU", description: "Implant", quantity: "0.5", unit: "u", lotNumber: null,
        serialNumber: null, expirationDate: null, boxId: null, presupuestoItemId: null, returnedQuantity: null, metadata: null, createdAt: "", updatedAt: "" }],
    }
    assignment = { id: "assignment", companyId: "company", surgeryId: "surgery", isActive: true, preparation: { version: 3, lines: [{ id: "line", articleId: "article", sku: "SKU", isActive: true }] } } as BoxAssignmentDetail
    api.get.mockImplementation(async () => assignment)
    api.list.mockResolvedValue([])
  })

  it.each([{}, [], "assignment", { assignmentId: "" }, { assignmentId: 7 }])("rejects malformed persisted linkage %j without reads", async (cajas) => {
    remito.metadata = { cajas }
    await expect(buildCajasRemitoEmissionIntent("company", remito)).rejects.toThrow(/marker.*missing/)
    expect(api.get).not.toHaveBeenCalled(); expect(api.list).not.toHaveBeenCalled()
  })

  it.each(["inactive", "wrong ID", "wrong company", "wrong surgery"])('rejects %s assignment detail', async (failure) => {
    if (failure === "inactive") assignment.isActive = false
    if (failure === "wrong ID") assignment.id = "another-assignment"
    if (failure === "wrong company") assignment.companyId = "another-company"
    if (failure === "wrong surgery") assignment.surgeryId = "another-surgery"
    await expect(buildCajasRemitoEmissionIntent("company", remito)).rejects.toThrow(/unavailable/)
    expect(api.list).not.toHaveBeenCalled()
  })

  it("rejects a mismatched document company before reading linkage", async () => {
    await expect(buildCajasRemitoEmissionIntent("another-company", remito)).rejects.toThrow(/company.*match/)
    expect(api.get).not.toHaveBeenCalled(); expect(api.list).not.toHaveBeenCalled()
  })

  it("rejects duplicate preparation lines across distinct persisted Remito items", async () => {
    remito.items.push({ ...remito.items[0], id: "second-item" })
    await expect(buildCajasRemitoEmissionIntent("company", remito)).rejects.toThrow(/multiple items/)
  })

  it("does not replace an explicitly selected active ID with a different detail", async () => {
    remito.metadata = null; api.list.mockResolvedValue([{ id: "selected", isActive: true }])
    await expect(buildCajasRemitoEmissionIntent("company", remito)).rejects.toThrow(/Selected active.*unavailable/)
    expect(api.get).toHaveBeenCalledWith("company", "selected")
  })

  it("keeps errors from the authenticated assignment lookup", async () => {
    const rejected = new Error("Read unavailable"); api.get.mockRejectedValue(rejected)
    await expect(buildCajasRemitoEmissionIntent("company", remito)).rejects.toBe(rejected)
    expect(api.list).not.toHaveBeenCalled()
  })
})
