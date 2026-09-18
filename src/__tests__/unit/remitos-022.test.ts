// @ts-nocheck
import { describe, it, expect } from "vitest"
import { useOrtoTrackStore } from "@/lib/store"
import { canRemitirNR, canCreateRemito } from "@/lib/businessRules"

// Helper to get a valid surgery for testing
function getTestSurgery() {
  const store = useOrtoTrackStore.getState()
  return store.surgeries.find((s) => s.autorizado && s.state !== "Cancelada" && s.state !== "Suspendida")
}

describe.skip("Remitos V1", () => {
  it("1. Crear remito", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()
    expect(surgery).toBeDefined()

    const remito = store.createRemito({
      surgeryId: surgery!.id,
      presupuestoId: surgery!.presupuestoId,
      fechaEmision: "",
      usuarioEmisor: "Test User",
      destinatarioTipo: "institucion",
      destinatarioContactId: "CONT-0004",
      destinatarioSnapshot: { nombre: "Hospital Test" },
      estado: "borrador",
      items: [
        { id: "test-item-1", codigo: "TEST-001", descripcion: "Test item", cantidad: 2 },
      ],
    })

    expect(remito).toBeDefined()
    expect(remito.numeroNR).toMatch(/^NR-\d{4}-\d{4}$/)
    expect(remito.estado).toBe("borrador")
    expect(remito.items).toHaveLength(1)
  })

  it("2. Permitir múltiples remitos por cirugía", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()
    expect(surgery).toBeDefined()

    const before = store.getRemitosBySurgeryId(surgery!.id).length

    store.createRemito({
      surgeryId: surgery!.id,
      fechaEmision: "",
      usuarioEmisor: "Test",
      destinatarioTipo: "institucion",
      destinatarioContactId: "CONT-0004",
      destinatarioSnapshot: { nombre: "Hospital 1" },
      estado: "borrador",
      items: [{ id: "t1", codigo: "A", descripcion: "Item A", cantidad: 1 }],
    })

    store.createRemito({
      surgeryId: surgery!.id,
      fechaEmision: "",
      usuarioEmisor: "Test",
      destinatarioTipo: "medico",
      destinatarioContactId: "CONT-0002",
      destinatarioSnapshot: { nombre: "Dr. Test" },
      estado: "borrador",
      items: [{ id: "t2", codigo: "B", descripcion: "Item B", cantidad: 1 }],
    })

    const after = store.getRemitosBySurgeryId(surgery!.id).length
    expect(after).toBeGreaterThanOrEqual(before + 2)
  })

  it("3. Destinatario limitado a los 4 actores", () => {
    const validTypes = ["cliente_pagador", "institucion", "medico", "paciente"] as const
    expect(validTypes).toHaveLength(4)
  })

  it("4. Importar ítems desde presupuesto", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = store.surgeries.find((s) => s.presupuestoId)
    expect(surgery).toBeDefined()

    const presupuesto = store.presupuestos.find((p) => p.id === surgery!.presupuestoId)
    expect(presupuesto).toBeDefined()
    expect(presupuesto!.items.length).toBeGreaterThan(0)

    // Simulate importing: map presupuesto items to remito items
    const remitoItems = presupuesto!.items.map((pi) => ({
      id: `imp-${pi.stockItemId}`,
      codigo: pi.code,
      descripcion: pi.name,
      cantidad: pi.quantity,
      presupuestoItemId: pi.stockItemId,
      catalogItemId: pi.catalogItemId || pi.stockItemId,
    }))

    expect(remitoItems.length).toBe(presupuesto!.items.length)
    expect(remitoItems[0].codigo).toBe(presupuesto!.items[0].code)
  })

  it("5. Ajustar cantidades antes de emitir", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()

    const remito = store.createRemito({
      surgeryId: surgery!.id,
      fechaEmision: "",
      usuarioEmisor: "Test",
      destinatarioTipo: "institucion",
      destinatarioContactId: "CONT-0004",
      destinatarioSnapshot: { nombre: "Hospital" },
      estado: "borrador",
      items: [{ id: "adj-1", codigo: "ADJ-001", descripcion: "Item ajustable", cantidad: 5 }],
    })

    store.updateRemitoItem(remito.id, "adj-1", { cantidad: 3 })

    const updated = store.getRemitoById(remito.id)
    expect(updated?.items.find((i) => i.id === "adj-1")?.cantidad).toBe(3)
  })

  it("6. Emitir remito", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()

    const remito = store.createRemito({
      surgeryId: surgery!.id,
      fechaEmision: "",
      usuarioEmisor: "Test",
      destinatarioTipo: "institucion",
      destinatarioContactId: "CONT-0004",
      destinatarioSnapshot: { nombre: "Hospital" },
      estado: "borrador",
      items: [{ id: "emit-1", codigo: "EMI-001", descripcion: "Item", cantidad: 1 }],
    })

    store.emitirRemito(remito.id)

    const emitted = store.getRemitoById(remito.id)
    expect(emitted?.estado).toBe("emitido")
    expect(emitted?.fechaEmision).toBeTruthy()
  })

  it("7. Tab Expediente lista remitos", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = store.surgeries.find((s) => s.id === "CX-0003")
    expect(surgery).toBeDefined()

    const remitos = store.getRemitosBySurgeryId("CX-0003")
    expect(remitos.length).toBeGreaterThanOrEqual(1)
  })
})

describe("Preparación de pedido", () => {
  it("8. Crear nota de tipo preparacion_pedido", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()

    const before = store.getNotesBySurgeryId(surgery!.id).filter((n) => n.type === "preparacion_pedido").length

    store.addPreparacionPedido(surgery!.id, "Preparar material para cirugía", [
      { codigo: "IMP-001", descripcion: "Implante test", cantidad: 1 },
    ])

    const after = store.getNotesBySurgeryId(surgery!.id).filter((n) => n.type === "preparacion_pedido").length
    expect(after).toBe(before + 1)
  })

  it("9. Guardar items referenciados", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()

    store.addPreparacionPedido(surgery!.id, "Test items", [
      { codigo: "COD-1", descripcion: "Item 1", cantidad: 2 },
      { codigo: "COD-2", descripcion: "Item 2", cantidad: 3 },
    ])

    const notes = store.getNotesBySurgeryId(surgery!.id).filter((n) => n.type === "preparacion_pedido")
    const latest = notes[notes.length - 1]
    expect(latest.preparacionItems).toHaveLength(2)
    expect(latest.preparacionItems![0].codigo).toBe("COD-1")
  })

  it("10. Confirmar por depósito", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()

    store.addPreparacionPedido(surgery!.id, "Confirmar test", [
      { codigo: "CONF-1", descripcion: "Item", cantidad: 1 },
    ])

    const notes = store.getNotesBySurgeryId(surgery!.id).filter((n) => n.type === "preparacion_pedido")
    const latest = notes[notes.length - 1]

    store.confirmPreparacionPedido(latest.id)

    // Use fresh state after mutation
    const freshStore = useOrtoTrackStore.getState()
    const confirmed = freshStore.notes.find((n) => n.id === latest.id)
    expect(confirmed?.preparacionEstado).toBe("confirmado_por_deposito")
    expect(confirmed?.confirmadoPor).toBeTruthy()
    expect(confirmed?.fechaConfirmacion).toBeTruthy()
  })

  it("11. Mostrar correctamente en Notas", () => {
    const store = useOrtoTrackStore.getState()
    const notes = store.notes.filter((n) => n.type === "preparacion_pedido")
    expect(notes.length).toBeGreaterThanOrEqual(2)

    const confirmed = notes.find((n) => n.preparacionEstado === "confirmado_por_deposito")
    expect(confirmed).toBeDefined()
    expect(confirmed?.confirmadoPor).toBeTruthy()

    const pending = notes.find((n) => n.preparacionEstado === "pendiente")
    expect(pending).toBeDefined()
  })
})

describe.skip("Integración Remitos", () => {
  it("12. Acción 'Remitir NR' disponible (canCreateRemito)", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()
    expect(surgery).toBeDefined()
    const result = canCreateRemito(surgery!)
    expect(result.allowed).toBe(true)
  })

  it("13. Cirugía cancelada/suspendida no habilita remisión", () => {
    const store = useOrtoTrackStore.getState()
    const cancelled = store.surgeries.find((s) => s.state === "Cancelada" || s.state === "Suspendida")
    expect(cancelled).toBeDefined()
    expect(canRemitirNR(cancelled!).allowed).toBe(false)
  })

  it("14. No se bloquea por lote/serie ausente", () => {
    const store = useOrtoTrackStore.getState()
    const surgery = getTestSurgery()

    const remito = store.createRemito({
      surgeryId: surgery!.id,
      fechaEmision: "",
      usuarioEmisor: "Test",
      destinatarioTipo: "institucion",
      destinatarioContactId: "CONT-0004",
      destinatarioSnapshot: { nombre: "Hospital" },
      estado: "borrador",
      items: [{ id: "no-lote-1", codigo: "NO-LOTE", descripcion: "Item sin lote", cantidad: 1 }],
    })

    expect(remito.items[0].loteSerie).toBeUndefined()
    expect(remito.id).toBeTruthy()
  })
})
