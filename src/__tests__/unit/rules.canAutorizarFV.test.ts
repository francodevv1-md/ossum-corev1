import { describe, it, expect } from "vitest"
import type { Surgery, Comprobante, Consumo, SurgeryDocumentChecklist, DocumentStatus, ConsumoState, ImputacionCobro } from "@/types"
import { getEstadoFacturacion, getEstadoFacturacionWithFV } from "@/lib/facturacion.utils"

// ═══════════════════════════════════════════════════════════════
// canAutorizarFV — Business rules for FV authorization
// Tested via getEstadoFacturacion / getEstadoFacturacionWithFV
// ═══════════════════════════════════════════════════════════════

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "CX-TEST",
    patient: "Paciente Test",
    patientDni: "12345678",
    surgeon: "Dr. Test",
    institution: "Hospital Test",
    institutionCity: "Ciudad",
    procedure: "Procedimiento",
    date: "2026-05-01",
    time: "10:00",
    state: "Realizada",
    client: "OSDE Binario",
    classification: "Prótesis de cadera",
    preparationState: "Retirado",
    facturado: false,
    autorizado: false,
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    ...overrides,
  }
}

describe("canAutorizarFV — Business rules via getEstadoFacturacion", () => {
  it("consumo pendiente → no facturable (autorizado_para_facturar)", () => {
    const surgery = makeSurgery({ autorizado: true, facturado: false })
    const docStatus: DocumentStatus = "Apta para facturar"
    const consumoState: ConsumoState | undefined = "Pendiente"

    const result = getEstadoFacturacion(surgery, docStatus, consumoState, true, [])
    expect(result).toBe("autorizado_para_facturar")
  })

  it("consumo validado + doc apta → facturable (listo_para_facturar)", () => {
    const surgery = makeSurgery({ autorizado: true, facturado: false })
    const docStatus: DocumentStatus = "Apta para facturar"
    const consumoState: ConsumoState | undefined = "Validado"

    const result = getEstadoFacturacion(surgery, docStatus, consumoState, true, [])
    expect(result).toBe("listo_para_facturar")
  })

  it("documentación incompleta → no listo para facturar (pendiente_sin_documentacion)", () => {
    const surgery = makeSurgery({ autorizado: true, facturado: false })
    const docStatus: DocumentStatus = "Incompleta"
    const consumoState: ConsumoState | undefined = "Validado"

    const result = getEstadoFacturacion(surgery, docStatus, consumoState, true, [])
    expect(result).toBe("pendiente_sin_documentacion")
  })

  it("no autorizado → sin_facturar regardless of other conditions", () => {
    const surgery = makeSurgery({ autorizado: false, facturado: false })
    const docStatus: DocumentStatus = "Apta para facturar"
    const consumoState: ConsumoState | undefined = "Validado"

    const result = getEstadoFacturacion(surgery, docStatus, consumoState, true, [])
    expect(result).toBe("sin_facturar")
  })

  it("consumo Facturado (already) + doc apta → listo_para_facturar", () => {
    const surgery = makeSurgery({ autorizado: true, facturado: false })
    const docStatus: DocumentStatus = "Apta para facturar"
    const consumoState: ConsumoState | undefined = "Facturado"

    const result = getEstadoFacturacion(surgery, docStatus, consumoState, true, [])
    expect(result).toBe("listo_para_facturar")
  })

  it("sin presupuesto y sin consumo validado → autorizado_para_facturar", () => {
    const surgery = makeSurgery({ autorizado: true, facturado: false })
    const docStatus: DocumentStatus = "Apta para facturar"
    const consumoState: ConsumoState | undefined = undefined

    const result = getEstadoFacturacion(surgery, docStatus, consumoState, false, [])
    expect(result).toBe("autorizado_para_facturar")
  })

  it("facturado sin cobros → factura_sin_cobrar (via WithFV)", () => {
    const surgery = makeSurgery({ facturado: true })
    const fv: Comprobante = {
      id: "COMP-TEST",
      surgeryId: "CX-TEST",
      type: "FV",
      number: "FV-2026-TEST",
      date: "2026-05-01",
      client: "OSDE Binario",
      amount: 1000000,
      toCollect: 1000000,
      concept: "Test",
      state: "Emitida",
    }

    const result = getEstadoFacturacionWithFV(
      surgery, "Apta para facturar", "Validado", true, fv, []
    )
    expect(result).toBe("factura_sin_cobrar")
  })

  it("facturado con cobro completo → factura_cobrada (via WithFV)", () => {
    const surgery = makeSurgery({ facturado: true })
    const fv: Comprobante = {
      id: "COMP-TEST",
      surgeryId: "CX-TEST",
      type: "FV",
      number: "FV-2026-TEST",
      date: "2026-05-01",
      client: "OSDE Binario",
      amount: 1000000,
      toCollect: 0,
      concept: "Test",
      state: "Emitida",
    }

    const result = getEstadoFacturacionWithFV(
      surgery, "Apta para facturar", "Validado", true, fv,
      [{ id: "IMP-1", cobroId: "COB-1", facturaId: "FV-2026-TEST", importeImputado: 1000000, fechaImputacion: "2026-05-05" }]
    )
    expect(result).toBe("factura_cobrada")
  })
})
