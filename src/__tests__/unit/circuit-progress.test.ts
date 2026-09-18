import { describe, expect, it, vi } from "vitest"
import { getCircuitProgress } from "@/lib/circuit-progress"
import type { Surgery } from "@/types"

const baseSurgery: Surgery = {
  id: "cx-1",
  patient: "Paciente",
  patientDni: "12345678",
  surgeon: "Cirujano",
  institution: "Institución",
  institutionCity: "CABA",
  procedure: "Procedimiento",
  date: "2026-06-25",
  time: "09:00",
  state: "Pendiente",
  client: "Cliente",
  classification: "Otro",
  preparationState: "Sin preparar",
  facturado: false,
  autorizado: false,
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [],
}

describe("getCircuitProgress", () => {
  it("returns 7 ordered stages and marks the first incomplete stage as current", () => {
    const stages = getCircuitProgress(
      baseSurgery,
      vi.fn(() => [{ id: "pr-1" }] as any[]),
      vi.fn(() => []),
      vi.fn(() => undefined),
      vi.fn(() => "Incompleta"),
      vi.fn(() => ({ totalFacturado: 0, totalCobrado: 0, saldoPendiente: 0, facturas: [] })),
    )

    expect(stages).toHaveLength(7)
    expect(stages.map((stage) => stage.key)).toEqual(["cx", "pr", "nr", "consumo", "doc", "fact", "cobro"])
    expect(stages[0]).toMatchObject({ key: "cx", done: true, current: false })
    expect(stages[1]).toMatchObject({ key: "pr", done: true, current: false })
    expect(stages[2]).toMatchObject({ key: "nr", done: false, current: true })
  })

  it("marks helper-backed stages as done when data exists", () => {
    const stages = getCircuitProgress(
      { ...baseSurgery, facturado: true },
      vi.fn(() => [{ id: "pr-1" }] as any[]),
      vi.fn(() => [{ id: "nr-1" }] as any[]),
      vi.fn(() => ({ id: "cons-1" } as any)),
      vi.fn(() => "Completa"),
      vi.fn(() => ({ totalFacturado: 100, totalCobrado: 50, saldoPendiente: 50, facturas: [] })),
    )

    expect(stages.find((stage) => stage.key === "pr")?.done).toBe(true)
    expect(stages.find((stage) => stage.key === "nr")?.done).toBe(true)
    expect(stages.find((stage) => stage.key === "consumo")?.done).toBe(true)
    expect(stages.find((stage) => stage.key === "doc")?.done).toBe(true)
    expect(stages.find((stage) => stage.key === "fact")?.done).toBe(true)
    expect(stages.find((stage) => stage.key === "cobro")?.done).toBe(true)
    expect(stages.some((stage) => stage.current)).toBe(false)
  })

  it("treats 'Apta para facturar' as completed documentation", () => {
    const stages = getCircuitProgress(
      baseSurgery,
      vi.fn(() => []),
      vi.fn(() => []),
      vi.fn(() => undefined),
      vi.fn(() => "Apta para facturar"),
      vi.fn(() => ({ totalFacturado: 0, totalCobrado: 0, saldoPendiente: 0, facturas: [] })),
    )

    expect(stages.find((stage) => stage.key === "doc")?.done).toBe(true)
  })

  it("stays pure by using injected helper functions only", () => {
    const getPresupuestosBySurgeryId = vi.fn(() => [])
    const getRemitosBySurgeryId = vi.fn(() => [])
    const getConsumoBySurgeryId = vi.fn(() => undefined)
    const getDocStatus = vi.fn(() => "Incompleta")
    const getResumenCobranzaBySurgeryId = vi.fn(() => ({ totalFacturado: 0, totalCobrado: 0, saldoPendiente: 0, facturas: [] }))

    getCircuitProgress(
      baseSurgery,
      getPresupuestosBySurgeryId,
      getRemitosBySurgeryId,
      getConsumoBySurgeryId,
      getDocStatus,
      getResumenCobranzaBySurgeryId,
    )

    expect(getPresupuestosBySurgeryId).toHaveBeenCalledWith(baseSurgery.id)
    expect(getRemitosBySurgeryId).toHaveBeenCalledWith(baseSurgery.id)
    expect(getConsumoBySurgeryId).toHaveBeenCalledWith(baseSurgery.id)
    expect(getDocStatus).toHaveBeenCalledWith(baseSurgery.id)
    expect(getResumenCobranzaBySurgeryId).toHaveBeenCalledWith(baseSurgery.id)
  })
})
