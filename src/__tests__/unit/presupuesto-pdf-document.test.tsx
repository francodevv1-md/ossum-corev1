import { renderToBuffer } from "@react-pdf/renderer"
import { describe, expect, it } from "vitest"

import PresupuestoPDFDocument, { type PresupuestoPDFData } from "@/components/presupuestos/PresupuestoPDFDocument"

const DATA: PresupuestoPDFData = {
  documentNumber: "P-0042", presupuestoId: "budget-1", state: "Emitido", versionNumber: 1,
  title: "Implantes para cirugía", currency: "ARS", surgeryLabel: "CX-0012", issuedAt: "30/08/2026",
  companyLabel: "Districorr DEV", branchLabel: "Central", clientLabel: "Paciente", payerLabel: "Pagador",
  responsibleLabel: "Usuario Responsable", documentDate: "30/08/2026",
  validUntil: "15/09/2026", createdAt: "29/08/2026", subtotal: "100000", discountTotal: "5000",
  taxTotal: "19950", total: "114950", paymentTerms: "Contado", priceListCode: "GENERAL",
  legend: "Commercial legend", notes: "Operational note", items: [{ sku: "SKU-1", description: "Implante quirúrgico", quantity: "2",
    unit: "unidad", unitPrice: "50000", discount: "5000", tax: "19950", total: "114950" }],
}

describe("PresupuestoPDFDocument", () => {
  it("renders an authoritative non-fiscal presupuesto as a real PDF buffer", async () => {
    const buffer = await renderToBuffer(<PresupuestoPDFDocument data={DATA} />)
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
    expect(buffer.length).toBeGreaterThan(1_000)
  })
})
