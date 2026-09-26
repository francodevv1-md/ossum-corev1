import type { ReactNode } from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { describe, expect, it } from "vitest"

import InvoicePDFDocument, { formatInvoiceMoney, type InvoicePDFData } from "@/components/facturacion/InvoicePDFDocument"

const DATA: InvoicePDFData = {
  documentKind: "operational_invoice",
  fiscalStatus: "non_fiscal",
  documentNumber: "Factura-7",
  invoiceId: "invoice-1",
  issuedAt: "30/08/2026, 09:00",
  state: "Emitida",
  type: "FV",
  currency: "ARS",
  base: "manual",
  surgeryId: "surgery-1",
  items: [{ sku: "SKU", description: "Implante", quantity: "1", unit: "u", unitPrice: "100", discount: "0", tax: "21", total: "121" }],
  subtotal: "100",
  discountTotal: "0",
  taxTotal: "21",
  total: "121",
  paidTotal: "0",
  balance: "121",
}

function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(text).join(" ")
  if (node && typeof node === "object" && "props" in node) return text((node.props as { children?: ReactNode }).children)
  return ""
}

describe("InvoicePDFDocument", () => {
  it("formats money consistently for Argentina", () => {
    const formatted = formatInvoiceMoney("100.5", "ARS")
    expect(formatted).toContain("100,50")
    expect(formatted).not.toContain("100.5")
  })

  it("real-renders a valid PDF with explicit operational and non-fiscal labeling", async () => {
    const component = InvoicePDFDocument({ data: DATA })
    const visibleText = text(component)
    const buffer = await renderToBuffer(component)

    expect(visibleText).toContain("FACTURA OPERATIVA")
    expect(visibleText).toContain("DOCUMENTO NO FISCAL")
    expect(visibleText).toContain("SIN CAE")
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
    expect(buffer.length).toBeGreaterThan(1_000)
  })
})
