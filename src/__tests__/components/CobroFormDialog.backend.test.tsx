import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CobroFormDialog } from "@/components/cobros/CobroFormDialog"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import { formatDate } from "@/lib/formatters"

const invoice = {
  id: "invoice-real-42",
  visibleNumber: 17,
  companyId: "company-1",
  surgeryId: "surgery-1",
  balance: "100.50",
} as InvoiceApiRow

describe("CobroFormDialog backend flow", () => {
  const originalTimezone = process.env.TZ

  beforeAll(() => { process.env.TZ = "America/Argentina/Buenos_Aires" })
  afterEach(() => { vi.useRealTimers() })
  afterAll(() => { process.env.TZ = originalTimezone })

  it("rejects over-balance amounts and submits the real invoice id and amount", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <CobroFormDialog
        open
        invoice={invoice}
        onSubmit={onSubmit}
        onOpenChange={onOpenChange}
      />,
    )

    expect(screen.getByText("Registro operativo no fiscal")).toBeInTheDocument()
    expect(screen.getByLabelText("Importe recibido")).toHaveValue(100.5)

    fireEvent.change(screen.getByLabelText("Importe recibido"), { target: { value: "101" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }))

    expect(await screen.findByText("El importe no puede superar el saldo pendiente de la factura.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Importe recibido"), { target: { value: "60.25" } })
    fireEvent.change(screen.getByLabelText("Referencia interna"), { target: { value: "TRX-9" } })
    fireEvent.change(screen.getByLabelText("Notas"), { target: { value: "Pago confirmado" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: "invoice-real-42",
      surgeryId: "surgery-1",
      amount: "60.25",
      method: "transfer",
      receivedAt: expect.any(String),
      reference: "TRX-9",
      notes: "Pago confirmado",
    })))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("uses the local calendar day and submits local noon as an ISO instant", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-02T01:30:00.000Z"))
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CobroFormDialog open invoice={invoice} onSubmit={onSubmit} onOpenChange={vi.fn()} />)

    expect(screen.getByLabelText("Fecha del cobro")).toHaveValue("2026-09-01")
    fireEvent.change(screen.getByLabelText("Fecha del cobro"), { target: { value: "2026-09-01" } })
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" })) })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const receivedAt = onSubmit.mock.calls[0][0].receivedAt
    expect(receivedAt).toBe("2026-09-01T15:00:00.000Z")
    expect(formatDate(receivedAt)).toBe("01/09/2026")
  })

  it("compares Decimal(18,4) amounts exactly and preserves valid input", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <CobroFormDialog
        open
        invoice={{ ...invoice, balance: "99999999999999.9998" }}
        onSubmit={onSubmit}
        onOpenChange={vi.fn()}
      />,
    )

    const amount = screen.getByLabelText("Importe recibido")
    expect(amount).toHaveAttribute("step", "0.0001")
    fireEvent.change(amount, { target: { value: "99999999999999.9999" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }))
    expect(await screen.findByText("El importe no puede superar el saldo pendiente de la factura.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(amount, { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }))
    expect(await screen.findByText("El importe debe ser mayor que cero.")).toBeInTheDocument()

    fireEvent.change(amount, { target: { value: "99999999999999.9998" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: "invoice-real-42",
      amount: "99999999999999.9998",
    })))
  })

  it("rejects malformed calendar dates before submission", async () => {
    const onSubmit = vi.fn()
    render(<CobroFormDialog open invoice={invoice} onSubmit={onSubmit} onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Fecha del cobro"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }))

    expect(await screen.findByText("Seleccioná una fecha de cobro válida.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
