import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { RemitoDraftDialog, type RemitoDraftDialogRequest } from "@/components/remitos/RemitoDraftDialog"
import type { RemitoApiRow, RemitoDevPresetAvailable } from "@/lib/api/remitos"

const devPreset: RemitoDevPresetAvailable = {
  available: true,
  branch: { id: "branch-dev", label: "Sucursal 1 · DEV" },
  example: {
    surgeryId: "surgery-dev",
    origin: "manual",
    salidaReason: "cirugia",
    recipientSnapshot: { nombre: "Paciente DEV" },
    shippingAddressSnapshot: { domicilio: "Entrega DEV" },
    transportSnapshot: null,
    packageCount: 1,
    declaredValue: null,
    metadata: { fixture: "DEV-only" },
    items: [
      { sku: "DEV-001", description: "Implante DEV A", quantity: "1", unit: "unidad", lotNumber: "L-001", serialNumber: "S-001", expirationDate: "2030-12-31" },
      { sku: "DEV-002", description: "Implante DEV B", quantity: "1", unit: "unidad", lotNumber: "L-002", serialNumber: "S-002", expirationDate: "2031-12-31" },
    ],
  },
}

const editRemito: RemitoApiRow = {
  id: "rem-1",
  visibleNumber: 12,
  companyId: "co-1",
  branchId: "suc-1",
  issuedBranchId: "suc-1",
  documentType: "remito",
  surgeryId: "cx-1",
  origin: "presupuesto",
  salidaReason: "cirugia",
  boxId: null,
  presupuestoId: "pr-1",
  destinatarioContactId: "ct-1",
  destinatarioSnapshot: { nombre: "Hospital Norte" },
  shippingAddressSnapshot: null,
  transportSnapshot: null,
  packageCount: null,
  declaredValue: null,
  state: "Borrador",
  issuedAt: null,
  deliveredAt: null,
  returnedAt: null,
  createdById: null,
  updatedById: null,
  metadata: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  items: [{ id: "line-1", itemId: null, sku: "SKU-1", description: "Implante", quantity: "2", unit: "unidad", boxId: null, presupuestoItemId: null, returnedQuantity: null, lotNumber: null, serialNumber: null, expirationDate: null, metadata: null, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }],
}

const traceableEditRemito: RemitoApiRow = {
  ...editRemito,
  destinatarioSnapshot: { nombre: "Hospital Norte", codigoContacto: "HN-42", cuitDni: "30-12345678-9", source: "presupuesto" },
  shippingAddressSnapshot: { domicilio: "Av. Norte 123", localidad: "Rosario", provincia: "Santa Fe", floor: "3A" },
  transportSnapshot: { nombre: "Logística Sur", trackingReference: "TRK-77" },
  metadata: { observaciones: "Entrega prioritaria", source: "operator", labels: ["frío"] },
  items: [{
    ...editRemito.items[0],
    itemId: "item-42",
    boxId: "box-42",
    presupuestoItemId: "pres-item-42",
    lotNumber: "LOT-42",
    serialNumber: "SER-42",
    expirationDate: "2027-08-09T00:00:00.000Z",
    metadata: { traceSource: "inventory", sterilized: true },
  }],
}

function renderDialog(request: RemitoDraftDialogRequest, overrides?: Partial<ComponentProps<typeof RemitoDraftDialog>>) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onSuccess = vi.fn()
  const onOpenChange = vi.fn()
  render(<RemitoDraftDialog open request={request} loading={false} onSubmit={onSubmit} onSuccess={onSuccess} onOpenChange={onOpenChange} {...overrides} />)
  return { onSubmit, onSuccess, onOpenChange }
}

describe("RemitoDraftDialog", () => {
  it("opens a typed create request with explicit caller prefill", () => {
    renderDialog({ mode: "create", initialContext: { branchId: "suc-cx", surgeryId: "cx-44", destinatarioNombre: "Clínica Sur" } })

    expect(screen.getByRole("heading", { name: "Nuevo borrador de remito" })).toBeInTheDocument()
    expect(screen.getByLabelText(/Sucursal de salida/)).toHaveValue("suc-cx")
    expect(screen.getByDisplayValue("cx-44")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Clínica Sur")).toBeInTheDocument()
  })

  it("uses the visible Radix title without emitting a DialogContent accessibility warning", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    renderDialog({ mode: "create" })

    const dialog = screen.getByRole("dialog")
    const title = screen.getByRole("heading", { name: "Nuevo borrador de remito" })
    expect(title).toBeVisible()
    expect(dialog).toHaveAttribute("aria-labelledby", title.id)
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("DialogContent requires a DialogTitle"))
    consoleError.mockRestore()
  })

  it("keeps the header and footer fixed around the bounded scroll body", () => {
    renderDialog({ mode: "create" })

    expect(screen.getByRole("dialog")).toHaveClass("flex", "flex-col", "overflow-hidden")
    expect(screen.getByTestId("remito-dialog-header")).toHaveClass("shrink-0")
    expect(screen.getByTestId("remito-dialog-body")).toHaveClass("min-h-0", "flex-1", "overflow-y-auto")
    expect(screen.getByTestId("remito-dialog-footer")).toHaveClass("shrink-0")
  })

  it("locks edit origin and omits it from the PATCH payload", async () => {
    const { onSubmit } = renderDialog({ mode: "edit", remito: editRemito })

    expect(screen.getByLabelText("Cómo se armó *")).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("origin")
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ branchId: "suc-1", surgeryId: "cx-1", items: [{ description: "Implante", quantity: "2" }] })
  })

  it("preserves non-editable item links, metadata, and unrepresented snapshot keys on edit", async () => {
    const { onSubmit } = renderDialog({ mode: "edit", remito: traceableEditRemito })

    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Implante ajustado" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      destinatarioSnapshot: { nombre: "Hospital Norte", codigoContacto: "HN-42", cuitDni: "30-12345678-9", source: "presupuesto" },
      shippingAddressSnapshot: { domicilio: "Av. Norte 123", localidad: "Rosario", provincia: "Santa Fe", floor: "3A" },
      transportSnapshot: { nombre: "Logística Sur", trackingReference: "TRK-77" },
      metadata: { observaciones: "Entrega prioritaria", source: "operator", labels: ["frío"] },
      items: [{
        itemId: "item-42",
        boxId: "box-42",
        presupuestoItemId: "pres-item-42",
        sku: "SKU-1",
        description: "Implante ajustado",
        lotNumber: "LOT-42",
        serialNumber: "SER-42",
        expirationDate: "2027-08-09",
        metadata: { traceSource: "inventory", sterilized: true },
      }],
    })
  })

  it("uses native form submission so Enter follows the normal submit flow", async () => {
    const request: RemitoDraftDialogRequest = { mode: "create", initialContext: { branchId: "suc-1", items: [{ description: "Caja", quantity: "1" }] } }
    const { onSubmit } = renderDialog(request)
    const submitButton = screen.getByRole("button", { name: "Guardar borrador" })
    const form = submitButton.closest("form")

    expect(submitButton).toHaveAttribute("type", "submit")
    expect(form).not.toBeNull()
    fireEvent.submit(form!)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it("gives every table field an accessible row-specific name", () => {
    renderDialog({ mode: "create" })

    expect(screen.getByRole("textbox", { name: "SKU del renglón 1" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Descripción del renglón 1" })).toBeInTheDocument()
    expect(screen.getByRole("spinbutton", { name: "Cantidad del renglón 1" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Unidad del renglón 1" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Lote del renglón 1" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Serie o GTIN del renglón 1" })).toBeInTheDocument()
    expect(screen.getByLabelText("Vencimiento del renglón 1")).toBeInTheDocument()
  })

  it("keeps the wide operational table in a labeled horizontal scroll region", () => {
    renderDialog({ mode: "create" })

    const scrollRegion = screen.getByRole("region", { name: "Renglones del remito" })
    expect(scrollRegion).toHaveAttribute("tabindex", "0")
    expect(scrollRegion).toHaveClass("overflow-x-auto")
    expect(scrollRegion.querySelector("table")).toHaveClass("min-w-[980px]")
  })

  it("shows field-level errors and focuses the first invalid required field", async () => {
    renderDialog({ mode: "create" })

    fireEvent.change(screen.getByLabelText(/Cantidad del renglón 1/), { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))

    expect(screen.getByText("Indicá la sucursal de salida.")).toBeInTheDocument()
    expect(screen.getByText("La descripción es obligatoria.")).toBeInTheDocument()
    expect(screen.getByText("La cantidad debe ser mayor que cero.")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText(/Sucursal de salida/)).toHaveFocus())
  })

  it("requests close on Escape and restores the opener focus after closing", async () => {
    const opener = document.createElement("button")
    document.body.appendChild(opener)
    opener.focus()
    const onOpenChange = vi.fn()
    const request: RemitoDraftDialogRequest = { mode: "create" }
    const { rerender } = render(<RemitoDraftDialog open request={request} loading={false} onSubmit={vi.fn()} onOpenChange={onOpenChange} />)

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    rerender(<RemitoDraftDialog open={false} request={request} loading={false} onSubmit={vi.fn()} onOpenChange={onOpenChange} />)

    await waitFor(() => expect(opener).toHaveFocus())
    opener.remove()
  })

  it("exposes the loading state without allowing a duplicate submit", () => {
    renderDialog({ mode: "create", initialContext: { branchId: "suc-1", items: [{ description: "Caja", quantity: "1", sku: "", unit: "unidad", lotNumber: "", serialNumber: "", expirationDate: "" }] } }, { loading: true })

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled()
    expect(screen.getByText("Guardando borrador…")).toBeInTheDocument()
    expect(document.querySelector(".motion-reduce\\:animate-none")).toBeInTheDocument()
  })

  it("calls the success refresh callback after a successful create", async () => {
    const request: RemitoDraftDialogRequest = { mode: "create", initialContext: { branchId: "suc-1", items: [{ description: "Caja", quantity: "1", sku: "", unit: "unidad", lotNumber: "", serialNumber: "", expirationDate: "" }] } }
    const { onSubmit, onSuccess } = renderDialog(request)

    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(request))
    expect(screen.getByText("Borrador guardado. Actualizando listado…")).toBeInTheDocument()
  })

  it("ignores and hides the DEV preset while editing", () => {
    const first = render(<RemitoDraftDialog open request={{ mode: "create" }} loading={false} onSubmit={vi.fn()} onOpenChange={vi.fn()} devPreset={{ available: false }} />)
    expect(screen.queryByRole("button", { name: "Cargar ejemplo DEV" })).not.toBeInTheDocument()
    first.unmount()

    renderDialog({ mode: "edit", remito: editRemito }, { devPreset })
    expect(screen.queryByRole("button", { name: "Cargar ejemplo DEV" })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Sucursal de salida/)).toHaveValue("suc-1")
  })

  it("preserves an explicit caller branch when the DEV preset is available", async () => {
    renderDialog({ mode: "create", initialContext: { branchId: "suc-cx" } }, { devPreset })

    await waitFor(() => expect(screen.getByRole("button", { name: "Cargar ejemplo DEV" })).toBeInTheDocument())
    expect(screen.getByLabelText(/Sucursal de salida/)).toHaveValue("suc-cx")
  })

  it("shows the resolved DEV branch label while retaining its technical ID for submit", async () => {
    const { onSubmit } = renderDialog({ mode: "create" }, { devPreset })

    await waitFor(() => expect(screen.getByLabelText("Sucursal de salida seleccionada")).toHaveTextContent("Sucursal 1 · DEV"))
    expect(screen.queryByDisplayValue("branch-dev")).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Descripción del renglón 1" })).toHaveValue("")
    fireEvent.click(screen.getByRole("button", { name: "Cargar ejemplo DEV" }))
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ branchId: "branch-dev", issuedBranchId: "branch-dev" })))
  })

  it("loads the non-persisted DEV example only after explicit opt-in", () => {
    renderDialog({ mode: "create" }, { devPreset })

    fireEvent.click(screen.getByRole("button", { name: "Cargar ejemplo DEV" }))

    expect(screen.getByDisplayValue("surgery-dev")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Paciente DEV")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Descripción del renglón 1" })).toHaveValue("Implante DEV A")
    expect(screen.getByRole("textbox", { name: "Descripción del renglón 2" })).toHaveValue("Implante DEV B")
  })

  it("requires confirmation before replacing user edits with the DEV example", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderDialog({ mode: "create" }, { devPreset })
    fireEvent.click(screen.getByRole("button", { name: "Cambiar" }))
    fireEvent.change(screen.getByLabelText(/Sucursal de salida/), { target: { value: "branch-user" } })

    fireEvent.click(screen.getByRole("button", { name: "Cargar ejemplo DEV" }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(screen.getByLabelText(/Sucursal de salida/)).toHaveValue("branch-user")
    confirmSpy.mockRestore()
  })

  it("never lets a late DEV response overwrite user edits", async () => {
    const { rerender } = render(<RemitoDraftDialog open request={{ mode: "create" }} loading={false} onSubmit={vi.fn()} onOpenChange={vi.fn()} devPreset={null} />)
    fireEvent.change(screen.getByLabelText(/Sucursal de salida/), { target: { value: "branch-user" } })

    rerender(<RemitoDraftDialog open request={{ mode: "create" }} loading={false} onSubmit={vi.fn()} onOpenChange={vi.fn()} devPreset={devPreset} />)

    await waitFor(() => expect(screen.getByRole("button", { name: "Cargar ejemplo DEV" })).toBeInTheDocument())
    expect(screen.getByLabelText(/Sucursal de salida/)).toHaveValue("branch-user")
  })
})
