"use client"

import { useState, useEffect } from "react"
import type { DocumentoAjuste, DocumentoAjusteItem } from "@/types/documentos-ajuste"
import { formatDecimalCurrency, parseDecimalScale4 } from "./decimal-money"

export const INITIAL_DOCUMENTOS_AJUSTE: DocumentoAjuste[] = [
  {
    id: "adj-001",
    visibleNumber: 1,
    tipo: "CREDITO",
    state: "Emitida",
    invoiceId: "inv-mock-001",
    invoiceNumber: "0001-00009901",
    surgeryId: "CX-2026-0814",
    clientName: "Swiss Medical S.A.",
    modalidad: "PARCIAL",
    motivo: "Devolución de material",
    observaciones: "Devolución de 1 Set Instrumental no utilizado en quirófano",
    total: "45000.0000",
    impacto: "-$ 45.000,00",
    issuedAt: "2026-09-12T14:30:00.000Z",
    createdAt: "2026-09-12T14:20:00.000Z",
    metadata: {
      fiscalState: "AUTHORIZED",
      fiscalDisplayState: "SIMULATED",
      cae: "74328901234567",
      caeExpiresAt: "2026-09-22T00:00:00.000Z",
    },
    items: [
      {
        id: "item-adj-1",
        description: "Set Instrumental Titano (Devolución)",
        quantity: 1,
        unitPrice: "45000.0000",
        subtotal: "45000.0000",
        adjustedQuantity: 1,
        adjustedAmount: "45000.0000",
      },
    ],
  },
  {
    id: "adj-002",
    visibleNumber: 1,
    tipo: "DEBITO",
    state: "Emitida",
    invoiceId: "inv-mock-002",
    invoiceNumber: "0001-00009902",
    surgeryId: "CX-2026-0815",
    clientName: "OSDE Binario",
    modalidad: "MANUAL",
    motivo: "Intereses por mora",
    observaciones: "Interés devengado por mora de 30 días s/ saldo vencido",
    total: "12500.0000",
    impacto: "+$ 12.500,00",
    issuedAt: "2026-09-15T10:00:00.000Z",
    createdAt: "2026-09-15T09:45:00.000Z",
    metadata: {
      fiscalState: "AUTHORIZED",
      fiscalDisplayState: "SIMULATED",
      cae: "74328901239999",
      caeExpiresAt: "2026-09-25T00:00:00.000Z",
    },
    items: [
      {
        id: "item-adj-2",
        description: "Interés resarcitorio mora 30 días",
        quantity: 1,
        unitPrice: "12500.0000",
        subtotal: "12500.0000",
        adjustedQuantity: 1,
        adjustedAmount: "12500.0000",
      },
    ],
  },
  {
    id: "adj-003",
    visibleNumber: null,
    tipo: "CREDITO",
    state: "Borrador",
    invoiceId: "inv-mock-001",
    invoiceNumber: "0001-00009901",
    surgeryId: "CX-2026-0814",
    clientName: "Swiss Medical S.A.",
    modalidad: "MANUAL",
    motivo: "Bonificación comercial",
    observaciones: "Descuento por volumen de cirugías acordado",
    total: "20000.0000",
    impacto: "-$ 20.000,00",
    issuedAt: null,
    createdAt: "2026-09-20T11:15:00.000Z",
    items: [
      {
        id: "item-adj-3",
        description: "Bonificación comercial 5%",
        quantity: 1,
        unitPrice: "20000.0000",
        subtotal: "20000.0000",
        adjustedQuantity: 1,
        adjustedAmount: "20000.0000",
      },
    ],
  },
]

// Singleton en memoria durante la sesión del navegador
let globalDocumentos: DocumentoAjuste[] = [...INITIAL_DOCUMENTOS_AJUSTE]
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function useDocumentosAjuste() {
  const [documentos, setDocumentos] = useState<DocumentoAjuste[]>(globalDocumentos)

  useEffect(() => {
    const handleUpdate = () => {
      setDocumentos([...globalDocumentos])
    }
    listeners.add(handleUpdate)
    return () => {
      listeners.delete(handleUpdate)
    }
  }, [])

  const addDocumento = (nuevo: Omit<DocumentoAjuste, "id" | "createdAt">): DocumentoAjuste => {
    const isCredit = nuevo.tipo === "CREDITO"
    const totalFormatted = formatDecimalCurrency(nuevo.total)
    const impacto = isCredit ? `-${totalFormatted}` : `+${totalFormatted}`

    const doc: DocumentoAjuste = {
      ...nuevo,
      id: `adj-${Date.now()}`,
      impacto,
      createdAt: new Date().toISOString(),
    }

    globalDocumentos = [doc, ...globalDocumentos]
    notify()
    return doc
  }

  const getDocumentosForInvoice = (invoiceId: string) => {
    return documentos.filter((d) => d.invoiceId === invoiceId)
  }

  const getNetImpactForInvoice = (invoiceId: string): string => {
    const docs = getDocumentosForInvoice(invoiceId).filter((d) => d.state === "Emitida")
    let net = BigInt(0)
    for (const d of docs) {
      const parsed = parseDecimalScale4(d.total) ?? BigInt(0)
      if (d.tipo === "CREDITO") {
        net -= parsed
      } else {
        net += parsed
      }
    }
    return (Number(net) / 10000).toString()
  }

  return {
    documentos,
    addDocumento,
    getDocumentosForInvoice,
    getNetImpactForInvoice,
  }
}
