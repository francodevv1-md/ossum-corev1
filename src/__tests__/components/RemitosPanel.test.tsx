import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RemitosPanel, type RemitosPanelRemito } from "@/components/expediente/RemitosPanel"
import { mapRemitoApiToPanelRemito } from "@/components/expediente/LogisticaTabContent"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { Surgery } from "@/types"

const fetchPrintCodes = vi.fn()
vi.mock("@/lib/api/remito-print-codes", () => ({ fetchRemitoPrintCodes: (...args: unknown[]) => fetchPrintCodes(...args) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const surgery = { id: "surgery-1", expedienteNumber: "CX-1", patient: "Paciente", institution: "Hospital" } as Surgery
const issued: RemitosPanelRemito = {
  apiId: "raw-remito-id",
  companyId: "company-1",
  remitoShortCode: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
  id: "R-0012",
  surgeryId: "surgery-1",
  destination: "Hospital",
  date: "2026-08-12T10:00:00.000Z",
  state: "Emitido",
  items: [{ stockItemId: "stock-1", name: "Placa", code: "SKU-1", sentQuantity: 1, returnedQuantity: 0, consumedQuantity: 0 }],
  detailItems: [{ code: "SNAP-1", name: "Componente snapshot", quantity: 2, unit: "unidad", lotNumber: "L-1", identifiedCode: "UNIT-1", groupLabel: "Caja / Fórmula 1" }],
}
const codes = {
  remitoShortCode: issued.remitoShortCode,
  internalQrDataUrl: "data:image/png;base64,INTERNAL",
  publicQrDataUrl: "data:image/png;base64,PUBLIC",
  code128Svg: "<svg></svg>",
  labels: { internal: "Internal OSSUM access", public: "Public verification" },
}

describe("RemitosPanel printing", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps Ficha codes into browser print only after the API resolves", async () => {
    let resolveCodes!: (value: typeof codes) => void
    fetchPrintCodes.mockReturnValue(new Promise((resolve) => { resolveCodes = resolve }))
    const write = vi.fn()
    const print = vi.fn()
    const open = vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print } as unknown as Window)
    render(<RemitosPanel surgery={surgery} remitos={[issued]} />)

    fireEvent.pointerDown(screen.getByRole("button", { name: /imprimir remito/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /remito a4/i }))
    expect(fetchPrintCodes).toHaveBeenCalledWith("company-1", issued.remitoShortCode)
    expect(open).toHaveBeenCalledOnce()
    resolveCodes(codes)

    await waitFor(() => expect(open).toHaveBeenCalledOnce())
    const html = write.mock.calls[0][0] as string
    expect(html).toContain("Verificar documento")
    expect(html).toContain("Componente snapshot")
    expect(html).toContain("Caja / Fórmula 1")
    expect(html).toContain('window.addEventListener("load"')
    expect(print).not.toHaveBeenCalled()
    expect(html).not.toContain(issued.apiId)
    expect(html).not.toMatch(/token/i)
  })

  it("preserves company and nullable short code through Logistica mapping", () => {
    const mapped = mapRemitoApiToPanelRemito({
      id: issued.apiId,
      companyId: issued.companyId,
      remitoShortCode: issued.remitoShortCode,
      surgeryId: issued.surgeryId,
      visibleNumber: 12,
      boxId: null,
      destinatarioSnapshot: { nombre: issued.destination },
      issuedAt: issued.date,
      deliveredAt: null,
      createdAt: issued.date,
      state: issued.state,
      items: [],
      detailItems: [{ groupLabel: "Caja / Fórmula 1", sku: "SNAP", description: "Snapshot", quantity: 1, unit: "unidad", lotNumber: null, serialNumber: null, expirationDate: null, identifiedCode: null }],
    } as unknown as RemitoApiRow, new Map())

    expect(mapped).toMatchObject({ companyId: issued.companyId, remitoShortCode: issued.remitoShortCode, detailItems: [expect.objectContaining({ name: "Snapshot", groupLabel: "Caja / Fórmula 1" })] })
  })

  it("blocks drafts and fails closed when issued codes are unavailable", async () => {
    const write = vi.fn()
    const close = vi.fn()
    const open = vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print: vi.fn(), close } as unknown as Window)
    const { rerender } = render(<RemitosPanel surgery={surgery} remitos={[{ ...issued, state: "Borrador", remitoShortCode: null }]} />)
    fireEvent.pointerDown(screen.getByRole("button", { name: /imprimir remito/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /remito a4/i }))
    expect(fetchPrintCodes).not.toHaveBeenCalled()

    fetchPrintCodes.mockRejectedValue(new Error("unavailable"))
    rerender(<RemitosPanel surgery={surgery} remitos={[issued]} />)
    fireEvent.pointerDown(screen.getByRole("button", { name: /imprimir remito/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /remito a4/i }))
    await waitFor(() => expect(fetchPrintCodes).toHaveBeenCalled())
    expect(open).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
    expect(write).not.toHaveBeenCalled()
  })
})
