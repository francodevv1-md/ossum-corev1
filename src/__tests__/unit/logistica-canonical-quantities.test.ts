import { describe, expect, it } from "vitest"

import {
  buildCanonicalRemitoItemQuantities,
  mapRemitoApiToPanelRemito,
} from "@/components/expediente/LogisticaTabContent"
import {
  buildCanonicalConsumoItemQuantities,
  mapConsumoApiItemToPanelItem,
} from "@/components/expediente/ConsumoPanel"
import type { ConsumoApiItem } from "@/lib/api/consumos"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { TraceItemRow } from "@/lib/api/trazabilidad"

const traceItem: TraceItemRow = {
  id: "trace-item-1",
  remitoId: "remito-1",
  remitoItemId: "remito-item-1",
  consumoIds: ["consumo-1"],
  consumoItemIds: ["consumo-item-1"],
  devolucionIds: ["devolucion-1"],
  devolucionItemIds: ["devolucion-item-1"],
  itemId: "stock-item-1",
  sku: "TOR-4",
  description: "Tornillo 4.0",
  unit: "unidad",
  lot: null,
  serial: null,
  expiry: null,
  brand: null,
  department: null,
  sentQuantity: 10,
  consumedQuantity: 3,
  returnedQuantity: 5,
  pendingQuantity: 2,
  matchConfidence: "direct",
  status: "pending",
  sourceFlags: { hasRemito: true, hasConsumo: true, hasDevolucion: true, hasStockMovement: false },
  warnings: [],
}

const remito: RemitoApiRow = {
  id: "remito-1",
  visibleNumber: 1,
  companyId: "company-1",
  branchId: null,
  issuedBranchId: null,
  documentType: "R",
  surgeryId: "surgery-1",
  origin: "manual",
  salidaReason: "cirugia",
  boxId: null,
  presupuestoId: null,
  destinatarioContactId: null,
  destinatarioSnapshot: { nombre: "Hospital" },
  shippingAddressSnapshot: null,
  transportSnapshot: null,
  packageCount: null,
  declaredValue: null,
  state: "Parcialmente_devuelto",
  issuedAt: "2026-07-15T10:00:00.000Z",
  deliveredAt: null,
  returnedAt: null,
  createdById: null,
  updatedById: null,
  metadata: null,
  createdAt: "2026-07-15T10:00:00.000Z",
  updatedAt: "2026-07-15T10:00:00.000Z",
  items: [{
    id: "remito-item-1",
    itemId: "stock-item-1",
    sku: "TOR-4",
    description: "Tornillo 4.0",
    quantity: 10,
    unit: "unidad",
    boxId: null,
    presupuestoItemId: null,
    returnedQuantity: 0,
    lotNumber: null,
    serialNumber: null,
    expirationDate: null,
    metadata: { consumedQuantity: 99 },
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T10:00:00.000Z",
  }],
}

describe("Logistica canonical remito quantities", () => {
  it("uses canonical trace consumption and confirmed return instead of RemitoItem metadata", () => {
    const quantities = buildCanonicalRemitoItemQuantities([traceItem])
    const [item] = mapRemitoApiToPanelRemito(remito, quantities).items

    expect(item).toMatchObject({ sentQuantity: 10, consumedQuantity: 3, returnedQuantity: 5 })
    expect(item.sentQuantity - item.consumedQuantity - item.returnedQuantity).toBe(2)
  })

  it("does not derive consumption from RemitoItem metadata when trace has no matching row", () => {
    const [item] = mapRemitoApiToPanelRemito(remito, new Map()).items

    expect(item.consumedQuantity).toBe(0)
    expect(item.returnedQuantity).toBe(0)
  })

  it("uses the same trace row for the Consumo balance after a confirmed return", () => {
    const consumoItem: ConsumoApiItem = {
      id: "consumo-item-1",
      remitoItemId: "remito-item-1",
      sku: "TOR-4",
      description: "Tornillo 4.0",
      requestedQuantity: 10,
      consumedQuantity: 99,
      unit: "unidad",
      lotNumber: null,
      serialNumber: null,
      expirationDate: null,
      metadata: { returnedQuantity: 99 },
      createdAt: "2026-07-15T10:00:00.000Z",
      updatedAt: "2026-07-15T10:00:00.000Z",
    }

    const item = mapConsumoApiItemToPanelItem(
      consumoItem,
      buildCanonicalConsumoItemQuantities([traceItem])
    )

    expect(item).toMatchObject({ sentQuantity: 10, consumed: 3, returned: 5 })
    expect(item.sentQuantity! - item.consumed - item.returned).toBe(2)
  })
})
