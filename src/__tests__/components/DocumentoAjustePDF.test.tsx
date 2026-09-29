import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DocumentoAjustePDF } from "@/components/pdf/documents/DocumentoAjustePDF"
import type { DocumentoAjuste } from "@/types/documentos-ajuste"

describe("DocumentoAjustePDF Fiscal Evidence & Invariants", () => {
  const baseDocumento: DocumentoAjuste = {
    id: "adj-test-01",
    visibleNumber: 15,
    tipo: "CREDITO",
    state: "Borrador",
    invoiceId: "inv-orig-100",
    invoiceNumber: "0001-00009901",
    surgeryId: "CX-2026-001",
    clientName: "Swiss Medical S.A.",
    modalidad: "TOTAL",
    motivo: "Devolución de material",
    observaciones: "Material devuelto en quirófano",
    total: "50000.0000",
    impacto: "-$ 50.000,00",
    issuedAt: null,
    createdAt: "2026-09-20T10:00:00.000Z",
    items: [
      {
        id: "item-1",
        description: "Set instrumental cadera",
        quantity: 1,
        unitPrice: "50000.0000",
        subtotal: "50000.0000",
      },
    ],
  }

  it("renders Borrador state with mandatory watermark and NO QR code", () => {
    const docBorrador: DocumentoAjuste = {
      ...baseDocumento,
      state: "Borrador",
      issuedAt: null,
      metadata: undefined,
    }

    const { container } = render(<DocumentoAjustePDF documento={docBorrador} />)

    // Marca visible obligatoria
    expect(
      screen.getByText("BORRADOR — SIN VALIDEZ OPERATIVA NI FISCAL")
    ).toBeInTheDocument()

    // No debe mostrar CAE ni QR
    expect(screen.queryByText(/CAE N°:/i)).not.toBeInTheDocument()
    const qrSvgs = container.querySelectorAll("svg")
    // Sin QR oficial
    expect(screen.queryByText("Comprobante Fiscal Autorizado")).not.toBeInTheDocument()
    expect(screen.getByText("Estado Borrador")).toBeInTheDocument()
  })

  it("renders Emitida sin CAE with mandatory operational disclaimer and NO QR code", () => {
    const docEmitidaSinCae: DocumentoAjuste = {
      ...baseDocumento,
      state: "Emitida",
      issuedAt: "2026-09-21T12:00:00.000Z",
      metadata: {
        fiscalState: "PENDING",
      },
    }

    render(<DocumentoAjustePDF documento={docEmitidaSinCae} />)

    // Leyenda visible obligatoria
    expect(
      screen.getByText(
        "CAE NO OBTENIDO — DOCUMENTO OPERATIVO. NO VÁLIDO COMO COMPROBANTE FISCAL"
      )
    ).toBeInTheDocument()

    // Comprobante operativo emitido
    expect(screen.getByText("Documento Operativo Emitido")).toBeInTheDocument()
    expect(screen.queryByText("Comprobante Fiscal Autorizado")).not.toBeInTheDocument()
    expect(screen.queryByText(/CAE N°:/i)).not.toBeInTheDocument()
  })

  it("renders Autorizado state with CAE, vencimiento, and official QR code", () => {
    const docAutorizado: DocumentoAjuste = {
      ...baseDocumento,
      state: "Emitida",
      issuedAt: "2026-09-22T14:30:00.000Z",
      metadata: {
        fiscalState: "AUTHORIZED",
        cae: "74328901234567",
        caeExpiresAt: "2026-10-02T00:00:00.000Z",
      },
    }

    render(<DocumentoAjustePDF documento={docAutorizado} />)

    // No debe tener leyendas de borrador ni de sin CAE
    expect(
      screen.queryByText("BORRADOR — SIN VALIDEZ OPERATIVA NI FISCAL")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/CAE NO OBTENIDO/i)
    ).not.toBeInTheDocument()

    // Debe mostrar comprobante fiscal autorizado con CAE
    expect(screen.getByText("Comprobante Fiscal Autorizado")).toBeInTheDocument()
    expect(screen.getByText("74328901234567")).toBeInTheDocument()
    expect(screen.getByText(/Vto\. CAE:/i)).toBeInTheDocument()
  })

  it("enforces NO QR if official fiscal evidence is missing or incomplete", () => {
    const docSinEvidencia: DocumentoAjuste = {
      ...baseDocumento,
      state: "Emitida",
      issuedAt: "2026-09-22T14:30:00.000Z",
      metadata: {
        cae: "", // vacío
      },
    }

    render(<DocumentoAjustePDF documento={docSinEvidencia} />)

    expect(screen.queryByText("Comprobante Fiscal Autorizado")).not.toBeInTheDocument()
    expect(
      screen.getByText("CAE NO OBTENIDO — DOCUMENTO OPERATIVO. NO VÁLIDO COMO COMPROBANTE FISCAL")
    ).toBeInTheDocument()
  })
})
