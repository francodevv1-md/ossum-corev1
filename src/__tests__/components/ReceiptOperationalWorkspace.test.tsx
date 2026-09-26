import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/client", () => ({ apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1", name: "Demo" } }) }))

import { ReceiptOperationalWorkspace } from "@/components/stock/ReceiptOperationalWorkspace"

const draftReceipt = (overrides = {}) => ({
  id: "receipt-1", status: "DRAFT", documentReference: "R-001",
  lines: [{ id: "line-1", lineNumber: 1, articleId: "a1", expectedQuantity: "1", requestedQuantity: "1", receivedQuantity: "0", expectedCode: "A-1", expectedDescription: "Implant", lotCode: null, serialNumber: null, expirationDate: null, resolutionStatus: "EXPECTED" }],
  ...overrides,
})

describe("ReceiptOperationalWorkspace", () => {
  beforeEach(() => apiFetch.mockReset())

  it("opens a contextual receipt without asking for the remittance number or PDF again", () => {
    render(<ReceiptOperationalWorkspace initialReceipt={draftReceipt()} backHref="/compras/remitos-proveedor?tab=recepciones" sourceLabel="Compras · R-001" />)
    expect(screen.getByRole("heading", { name: "Recepción de mercadería" })).toBeVisible()
    expect(screen.getByRole("link", { name: /Volver a Remitos de Proveedor/i })).toHaveAttribute("href", "/compras/remitos-proveedor?tab=recepciones")
    expect(screen.queryByLabelText(/Número de remito/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Archivo del remito/i)).not.toBeInTheDocument()
  })

  it("creates the OCR draft and enters scanning without a review step", async () => {
    apiFetch
      .mockResolvedValueOnce({ confidence: 0.96, warnings: [], extracted: { numero_remito: "R-001", proveedor_name: "Proveedor", items: [{ codigo: "A-1", descripcion: "Implant", cantidad: "1", lote: "", vencimiento: "" }] } })
      .mockResolvedValueOnce(draftReceipt())
    render(<ReceiptOperationalWorkspace />)
    const file = new File(["remito"], "remito.pdf", { type: "application/pdf" })
    fireEvent.change(screen.getByLabelText(/Archivo del remito/i), { target: { files: [file] } })
    fireEvent.click(screen.getByRole("button", { name: /Leer remito con OCR/i }))
    expect(await screen.findByTestId("receipt-id")).toHaveTextContent("receipt-1")
    expect(screen.getByText("Preparada")).toBeVisible()
    expect(screen.queryByText(/Revisar remito esperado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Iniciar recepción/i)).not.toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })

  it("uses HID Enter for the same scan resolver and restores scanner focus", async () => {
    apiFetch.mockResolvedValueOnce({ event: { id: "scan-1", rawValue: "A-1", resolutionStatus: "RESOLVED" }, status: "RESOLVED", candidates: [{ id: "a1", sku: "A-1", description: "Implant" }], line: { ...draftReceipt().lines[0], receivedQuantity: "1", resolutionStatus: "RESOLVED" } })
    render(<ReceiptOperationalWorkspace initialReceipt={draftReceipt()} />)
    const scanner = screen.getByLabelText("Producto")
    fireEvent.change(scanner, { target: { value: "A-1" } })
    fireEvent.keyDown(scanner, { key: "Enter" })
    expect(await screen.findByText(/recibido 1 de 1/i)).toBeVisible()
    expect(apiFetch.mock.calls[0][0]).toContain("/receipts/receipt-1/scan")
    await waitFor(() => expect(scanner).toHaveFocus())
  })

  it("starts an empty draft through the compact manual fallback", async () => {
    apiFetch.mockResolvedValueOnce({ id: "receipt-manual", status: "DRAFT", lines: [] })
    render(<ReceiptOperationalWorkspace />)
    fireEvent.change(screen.getByLabelText(/Número de remito/i), { target: { value: "MAN-1" } })
    fireEvent.click(screen.getByRole("button", { name: /Cargar sin remito/i }))
    expect(await screen.findByTestId("receipt-id")).toHaveTextContent("receipt-manual")
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ documentReference: "MAN-1" })
  })

  it("prompts only for the next trace field and confirms only after the resolved unit", async () => {
    apiFetch
      .mockResolvedValueOnce({ event: { id: "scan-1", rawValue: "GTIN", resolutionStatus: "PENDING_TRACE" }, status: "PENDING_TRACE", nextAction: "lot", candidates: [{ id: "a1", sku: "A-1", description: "Implant" }], line: { ...draftReceipt().lines[0], receivedQuantity: "0", resolutionStatus: "PENDING_TRACE" } })
      .mockResolvedValueOnce({ event: { id: "scan-1", rawValue: "LOT-1", resolutionStatus: "RESOLVED", lotCode: "LOT-1" }, status: "RESOLVED", nextAction: "ready", line: { ...draftReceipt().lines[0], receivedQuantity: "1", resolutionStatus: "RESOLVED" } })
      .mockResolvedValueOnce({ ...draftReceipt(), status: "CONFIRMED", lines: [] })
    render(<ReceiptOperationalWorkspace initialReceipt={draftReceipt()} />)
    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "GTIN" } })
    fireEvent.keyDown(screen.getByLabelText("Producto"), { key: "Enter" })
    expect((await screen.findAllByText(/Escaneá el lote/i))[0]).toBeVisible()
    expect(screen.getByLabelText("Lote")).toBeVisible()
    expect(screen.getByRole("button", { name: /Confirmar recepción/i })).toBeDisabled()
    const scanner = screen.getByLabelText("Lote")
    fireEvent.change(scanner, { target: { value: "LOT-1" } })
    fireEvent.keyDown(scanner, { key: "Enter" })
    expect(await screen.findByText(/recibido 1 de 1/i)).toBeVisible()
    expect(apiFetch.mock.calls[1][0]).toContain("/scans/scan-1/capture")
    expect(screen.getByText("1 unidad(es)")).toBeVisible()
    await waitFor(() => expect(scanner).toHaveFocus())
    fireEvent.click(screen.getByRole("button", { name: /Confirmar recepción/i }))
    expect(await screen.findByText("Confirmada")).toBeVisible()
    expect(apiFetch.mock.calls[2][0]).toContain("/receipts/receipt-1")
  })

  it("keeps unknown scans visible and blocks confirmation after a later scan", async () => {
    apiFetch
      .mockResolvedValueOnce({ event: { id: "scan-pending", rawValue: "UNKNOWN", resolutionStatus: "PENDING" }, status: "PENDING", candidates: [] })
      .mockResolvedValueOnce({ event: { id: "scan-2", rawValue: "A-1", resolutionStatus: "RESOLVED" }, status: "RESOLVED", line: { ...draftReceipt().lines[0], receivedQuantity: "1", resolutionStatus: "RESOLVED" } })
    render(<ReceiptOperationalWorkspace initialReceipt={draftReceipt()} />)
    const scanner = screen.getByLabelText("Producto")
    fireEvent.change(scanner, { target: { value: "UNKNOWN" } })
    fireEvent.keyDown(scanner, { key: "Enter" })
    expect(await screen.findByText("Código no registrado — pendiente")).toBeVisible()
    fireEvent.change(scanner, { target: { value: "A-1" } })
    fireEvent.keyDown(scanner, { key: "Enter" })
    expect(await screen.findByText(/recibido 1 de 1/i)).toBeVisible()
    expect(screen.getByText("Código no registrado — pendiente")).toBeVisible()
    expect(screen.getByRole("button", { name: /Confirmar recepción/i })).toBeDisabled()
  })

  it("resolves a pending scan from a human-readable candidate", async () => {
    apiFetch
      .mockResolvedValueOnce({ event: { id: "scan-pending", rawValue: "UNKNOWN", resolutionStatus: "PENDING" }, status: "PENDING", candidates: [{ id: "a1", sku: "A-1", description: "Implant" }] })
      .mockResolvedValueOnce({ event: { id: "scan-pending", rawValue: "UNKNOWN", resolutionStatus: "RESOLVED" }, status: "RESOLVED", line: { ...draftReceipt().lines[0], receivedQuantity: "1", resolutionStatus: "RESOLVED" } })
    render(<ReceiptOperationalWorkspace initialReceipt={draftReceipt()} />)
    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "UNKNOWN" } })
    fireEvent.keyDown(screen.getByLabelText("Producto"), { key: "Enter" })
    fireEvent.click(await screen.findByRole("button", { name: "A-1 · Implant" }))
    await waitFor(() => expect(apiFetch.mock.calls[1][0]).toContain("/scans/scan-pending/resolve"))
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({ articleId: "a1" })
    expect(screen.queryByText("Seleccioná el artículo correspondiente")).not.toBeInTheDocument()
  })

  it("removes technical registration controls and autofocuses the scanner", async () => {
    render(<ReceiptOperationalWorkspace initialReceipt={draftReceipt()} />)
    const scanner = screen.getByLabelText("Producto")
    await waitFor(() => expect(scanner).toHaveFocus())
    expect(screen.queryByRole("button", { name: /Registrar/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Artículo existente/i)).not.toBeInTheDocument()
  })

  it("restores a guided trace blocker when a reception is reopened", async () => {
    render(<ReceiptOperationalWorkspace initialReceipt={draftReceipt({
      pendingScans: [{ event: { id: "scan-trace", rawValue: "GTIN", resolutionStatus: "PENDING_TRACE" }, status: "PENDING_TRACE", nextAction: "lot", line: draftReceipt().lines[0] }],
    })} />)

    expect(screen.getByLabelText("Lote")).toBeVisible()
    expect(screen.getByRole("button", { name: /Confirmar recepción/i })).toBeDisabled()
  })
})
