import { describe, expect, it } from "vitest"
import { computeOpTabCounts } from "@/components/cirugias/CirugiasOpTabs"
import type { Surgery } from "@/types"

describe("computeOpTabCounts", () => {
  const mockSurgeries: Partial<Surgery>[] = [
    {
      id: "s-1",
      state: "Sin autorizar",
      urgente: true,
      date: "2026-09-23",
      preparationState: "Sin preparar",
      prNumber: "",
      facturado: false,
    },
    {
      id: "s-2",
      state: "Sin autorizar",
      urgente: false,
      date: "",
      preparationState: "Entregado",
      prNumber: "PR-101",
      facturado: false,
    },
    {
      id: "s-3",
      state: "Realizada",
      urgente: false,
      date: "2026-09-20",
      preparationState: "Entregado",
      prNumber: "PR-102",
      facturado: false,
    },
    {
      id: "s-4",
      state: "Finalizada",
      urgente: false,
      date: "2026-09-19",
      preparationState: "Entregado",
      prNumber: "PR-103",
      facturado: true,
    },
    {
      id: "s-5",
      state: "Sin consumo",
      urgente: false,
      date: "2026-09-21",
      preparationState: "Entregado",
      prNumber: "PR-104",
      facturado: false,
    },
  ]

  it("accurately computes operational tab counters", () => {
    const counts = computeOpTabCounts(mockSurgeries as Surgery[])

    expect(counts.all).toBe(5)
    expect(counts.urgent).toBe(1) // s-1
    expect(counts.noCxDate).toBe(1) // s-2
    expect(counts.prepPending).toBe(1) // s-1
    expect(counts.attention).toBe(2) // s-1 (urgent, unauthorized) and s-2 (undated, unauthorized)
    expect(counts.withoutPr).toBe(1) // s-1
    expect(counts.withoutConsumption).toBe(1) // s-5
    expect(counts.withoutInvoice).toBe(1) // s-3 (Realizada & !facturado)
  })

  it("counts missing dates independently of authorization and preserves the actual states", () => {
    const surgeries = [
      { ...mockSurgeries[0], state: "Autorizada", date: "" },
      { ...mockSurgeries[0], state: "Pendiente", date: "" },
      { ...mockSurgeries[0], state: "Sin autorizar", date: "2026-10-06" },
    ] as Surgery[]
    const before = structuredClone(surgeries)
    expect(computeOpTabCounts(surgeries).noCxDate).toBe(2)
    expect(surgeries).toEqual(before)
  })
})
